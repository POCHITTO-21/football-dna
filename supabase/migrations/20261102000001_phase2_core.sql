-- FOOTBALL DNA Phase 2: アカウント・診断履歴・非公開共有リンク
-- 方針:
--   * 本人は自分のレコードだけを読める/書ける（RLS）。
--   * 共有リンクはトークンのハッシュのみ保存。初期状態は無効、本人が明示的に有効化、失効・削除可。
--   * 未成年（高校生以下）は保護者確認済み(consent_status='guardian_confirmed')の場合のみ公開共有可。
--   * service role は使わない設計（公開閲覧は SECURITY DEFINER 関数で必要最小限の列だけ返す）。
--   * チーム関連テーブル・コーチ向けRLSは Phase 3 のマイグレーションで追加する。

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 12),
  age_band text check (age_band in ('elem_low','elem_high','junior_high','high_school','18_29','30_49','50_plus','no_answer')),
  consent_status text not null default 'none'
    check (consent_status in ('none','self','guardian_pending','guardian_confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 保護者確認の状態は本人が自由に書き換えられないようにする（Phase 3 の同意フローでサーバー側から更新）
create or replace function public.protect_consent_status()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.consent_status not in ('none','self') then
      new.consent_status := 'none';
    end if;
  elsif new.consent_status is distinct from old.consent_status
        and current_user not in ('service_role', 'postgres')
        and new.consent_status not in ('none','self') then
    new.consent_status := old.consent_status;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_protect_consent
  before insert or update on public.profiles
  for each row execute function public.protect_consent_status();

-- 新規ユーザー作成時にプロフィール行を作る
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_minor_age_band(band text)
returns boolean language sql immutable as $$
  select coalesce(band in ('elem_low','elem_high','junior_high','high_school'), true)
$$;

-- ---------------------------------------------------------------- 設問マスター（公開読み取りのみ）
create table public.question_sets (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  published_at timestamptz
);

create table public.questions (
  id text not null,
  question_set_id uuid not null references public.question_sets (id) on delete cascade,
  axis text not null check (axis in ('DRB','PAS','FIN','DEF','TAC','MOB','DUEL','TEAM')),
  text text not null,
  kids_text text not null,
  display_order int not null,
  primary key (question_set_id, id),
  unique (question_set_id, display_order)
);

-- ---------------------------------------------------------------- 診断
create table public.diagnosis_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  guest_token_hash text,
  question_set_version text not null,
  scoring_version text not null,
  status text not null default 'completed' check (status in ('in_progress','completed')),
  created_at timestamptz not null default now(),
  check (user_id is not null or guest_token_hash is not null)
);
create index on public.diagnosis_sessions (user_id, created_at desc);

create table public.answers (
  session_id uuid not null references public.diagnosis_sessions (id) on delete cascade,
  question_id text not null check (question_id ~ '^Q[0-9]{2}$'),
  value smallint not null check (value between 1 and 4),
  primary key (session_id, question_id)
);

create table public.results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.diagnosis_sessions (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  type_id text not null check (type_id ~ '^T[0-9]{2}$'),
  composite_type_id text check (composite_type_id is null or composite_type_id ~ '^T[0-9]{2}$'),
  axis_scores jsonb not null,
  position_scores jsonb not null,
  top_positions text[] not null,
  -- 本人が入力した基本情報のスナップショット（氏名などは含まない）
  profile_snapshot jsonb not null default '{}'::jsonb,
  -- 採点関数の出力全体（表示用スナップショット。ロジック更新で過去結果が変わらないように保存）
  detail jsonb not null default '{}'::jsonb,
  type_config_version text not null,
  position_config_version text not null,
  created_at timestamptz not null default now()
);
create index on public.results (user_id, created_at desc);

-- ---------------------------------------------------------------- 共有リンク
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.results (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  enabled boolean not null default false,
  include_nickname boolean not null default false,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- 未成年は保護者確認済みでないと有効化できない
create or replace function public.guard_share_link()
returns trigger language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if new.enabled then
    select * into p from public.profiles where id = new.user_id;
    if p.id is null or (public.is_minor_age_band(p.age_band) and p.consent_status <> 'guardian_confirmed') then
      raise exception 'share_not_allowed_for_minor_without_guardian_consent' using errcode = 'P0001';
    end if;
    if new.revoked_at is not null then
      raise exception 'share_link_revoked' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger share_links_guard
  before insert or update on public.share_links
  for each row execute function public.guard_share_link();

-- 公開閲覧: トークンから、共有用の最小限の情報だけ返す（profile_snapshot や回答は返さない）
create or replace function public.get_shared_result(token text)
returns table (type_id text, composite_type_id text, axis_scores jsonb, top_positions text[], nickname text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.type_id, r.composite_type_id, r.axis_scores, r.top_positions,
         case when s.include_nickname then p.display_name else null end,
         r.created_at
  from public.share_links s
  join public.results r on r.id = s.result_id
  join public.profiles p on p.id = s.user_id
  where s.token_hash = encode(digest(token, 'sha256'), 'hex')
    and s.enabled
    and s.revoked_at is null
    and (s.expires_at is null or s.expires_at > now())
    and (not public.is_minor_age_band(p.age_band) or p.consent_status = 'guardian_confirmed')
  limit 1
$$;

revoke all on function public.get_shared_result(text) from public;
grant execute on function public.get_shared_result(text) to anon, authenticated;

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.question_sets enable row level security;
alter table public.questions enable row level security;
alter table public.diagnosis_sessions enable row level security;
alter table public.answers enable row level security;
alter table public.results enable row level security;
alter table public.share_links enable row level security;

create policy "profiles: own read" on public.profiles for select using (id = auth.uid());
create policy "profiles: own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: own delete" on public.profiles for delete using (id = auth.uid());

create policy "question_sets: public read" on public.question_sets for select using (published_at is not null);
create policy "questions: public read" on public.questions for select using (
  exists (select 1 from public.question_sets qs where qs.id = question_set_id and qs.published_at is not null)
);

create policy "sessions: own read" on public.diagnosis_sessions for select using (user_id = auth.uid());
create policy "sessions: own insert" on public.diagnosis_sessions for insert with check (user_id = auth.uid());
create policy "sessions: own delete" on public.diagnosis_sessions for delete using (user_id = auth.uid());

create policy "answers: own read" on public.answers for select using (
  exists (select 1 from public.diagnosis_sessions s where s.id = session_id and s.user_id = auth.uid())
);
create policy "answers: own insert" on public.answers for insert with check (
  exists (select 1 from public.diagnosis_sessions s where s.id = session_id and s.user_id = auth.uid())
);

create policy "results: own read" on public.results for select using (user_id = auth.uid());
create policy "results: own insert" on public.results for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.diagnosis_sessions s where s.id = session_id and s.user_id = auth.uid())
);
create policy "results: own delete" on public.results for delete using (user_id = auth.uid());

create policy "share_links: own read" on public.share_links for select using (user_id = auth.uid());
create policy "share_links: own insert" on public.share_links for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.results r where r.id = result_id and r.user_id = auth.uid())
);
create policy "share_links: own update" on public.share_links for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "share_links: own delete" on public.share_links for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------- アカウント削除（本人のみ）
-- auth.users を削除すると on delete cascade で全データが消える。service role 不要。
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
