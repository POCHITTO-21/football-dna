-- FOOTBALL DNA Phase 3: 指導者・チーム管理、招待、保護者同意、権限、監査ログ
-- 方針:
--   * service role は使わない。書き込みはすべて SECURITY DEFINER 関数で、呼び出し者の権限を確認してから行う。
--   * 指導者（owner/coach）が見られる選手の診断結果は「参加承認済み」かつ「本人が共有を選んだ」選手だけ。
--     未成年（年代が18歳以上でない人）は、さらに保護者の同意がある場合だけ。
--   * 保護者は、子ども本人が発行した確認リンクから保護者として登録される（子どもの同意が起点）。
--   * 年代は自己申告。年代を偽る利用は技術的に防げないため、運用ルール・利用規約でも補う。

-- ---------------------------------------------------------------- 年代の判定（厳しめに変更）
-- 18歳以上の年代を選んだ人以外（未設定・「回答しない」を含む）は保護者の同意が必要な扱いにする。
create or replace function public.is_minor_age_band(band text)
returns boolean language sql immutable as $$
  select coalesce(band not in ('18_29','30_49','50_plus'), true)
$$;

create or replace function public.is_adult_user(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = uid and not public.is_minor_age_band(p.age_band))
$$;

-- ---------------------------------------------------------------- テーブル
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);
create index on public.teams (owner_id);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner','coach','player','guardian')),
  -- チーム内で表示する名前（本人が参加時に入力）。プロフィールの個人情報は指導者に見せない。
  member_name text not null check (char_length(btrim(member_name)) between 1 and 20),
  status text not null default 'pending' check (status in ('pending','active')),
  -- 診断結果を指導者に見せることへの同意
  --   none: 見せない / self: 本人（18歳以上）が同意 / guardian_pending: 本人は希望、保護者の確認待ち
  --   guardian_confirmed: 保護者が同意
  consent_status text not null default 'none'
    check (consent_status in ('none','self','guardian_pending','guardian_confirmed')),
  consent_guardian_id uuid references auth.users (id) on delete set null,
  consented_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);
create index on public.team_members (user_id);

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  code_hash text not null unique,
  role text not null default 'player' check (role in ('coach','player')),
  expires_at timestamptz not null,
  max_uses int not null check (max_uses between 1 and 100),
  uses int not null default 0 check (uses >= 0),
  revoked_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.team_invites (team_id, created_at desc);

create table public.guardian_requests (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.guardian_requests (child_id);

create table public.guardian_links (
  guardian_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (guardian_id, child_id),
  check (guardian_id <> child_id)
);
create index on public.guardian_links (child_id);

create table public.audit_events (
  id bigint generated always as identity primary key,
  team_id uuid references public.teams (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  target_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_events (team_id, created_at desc);

-- ---------------------------------------------------------------- 権限の判定（RLS から使うため SECURITY DEFINER）
-- 呼び出し者のチームでの役割（承認済みのみ）。メンバーでなければ null。
create or replace function public.team_role(p_team uuid)
returns text language sql stable security definer set search_path = public as $$
  select m.role from public.team_members m
  where m.team_id = p_team and m.user_id = auth.uid() and m.status = 'active'
$$;

create or replace function public.is_team_member(p_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members m where m.team_id = p_team and m.user_id = auth.uid())
$$;

-- 選手の同意が有効か（未成年は保護者同意が必要。年代を後から変えても判定し直す）
create or replace function public.member_consent_valid(m public.team_members)
returns boolean language sql stable security definer set search_path = public as $$
  select m.status = 'active' and m.role = 'player' and (
    m.consent_status = 'guardian_confirmed'
    or (m.consent_status = 'self' and public.is_adult_user(m.user_id))
  )
$$;

-- 呼び出し者（指導者）が、その利用者の診断結果を見てよいか
create or replace function public.coach_can_view_user(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.team_members staff
    join public.team_members pl on pl.team_id = staff.team_id
    where staff.user_id = auth.uid() and staff.status = 'active' and staff.role in ('owner','coach')
      and pl.user_id = p_user and public.member_consent_valid(pl)
  )
$$;

create or replace function public.log_event(p_team uuid, p_action text, p_target uuid, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_events (team_id, actor_id, target_user_id, action, detail)
  values (p_team, auth.uid(), p_target, p_action, coalesce(p_detail, '{}'::jsonb))
$$;
revoke all on function public.log_event(uuid, text, uuid, jsonb) from public, anon, authenticated;

create or replace function public.require_login()
returns uuid language plpgsql stable as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  return auth.uid();
end $$;

-- ---------------------------------------------------------------- RLS
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.guardian_requests enable row level security;
alter table public.guardian_links enable row level security;
alter table public.audit_events enable row level security;

create policy "teams: members read" on public.teams for select using (public.is_team_member(id));
create policy "teams: owner rename" on public.teams for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 選手は自分の行だけ。指導者はチーム全員の行（名前・状態・同意状態）を見られる。
create policy "team_members: own or staff read" on public.team_members for select using (
  user_id = auth.uid() or public.team_role(team_id) in ('owner','coach')
);
create policy "team_invites: staff read" on public.team_invites for select using (public.team_role(team_id) in ('owner','coach'));
create policy "guardian_requests: child read" on public.guardian_requests for select using (child_id = auth.uid());
create policy "guardian_links: parties read" on public.guardian_links for select using (
  guardian_id = auth.uid() or child_id = auth.uid()
);
create policy "audit_events: staff or self read" on public.audit_events for select using (
  (team_id is not null and public.team_role(team_id) in ('owner','coach')) or actor_id = auth.uid()
);

-- 指導者は、同意済みの選手の診断結果だけ読める（書き込み・削除は不可）
create policy "results: coach read consented" on public.results for select using (
  user_id is not null and public.coach_can_view_user(user_id)
);

-- ---------------------------------------------------------------- 操作（すべて関数経由）
create or replace function public.create_team(p_name text, p_member_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := public.require_login(); tid uuid;
begin
  if not public.is_adult_user(uid) then
    raise exception 'coach_must_be_adult' using errcode = 'P0001';
  end if;
  if (select count(*) from public.teams where owner_id = uid) >= 20 then
    raise exception 'too_many_teams' using errcode = 'P0001';
  end if;
  insert into public.teams (owner_id, name) values (uid, btrim(p_name)) returning id into tid;
  insert into public.team_members (team_id, user_id, role, member_name, status, approved_at)
    values (tid, uid, 'owner', btrim(p_member_name), 'active', now());
  perform public.log_event(tid, 'team_created', uid);
  return tid;
end $$;

create or replace function public.delete_team(p_team uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public.require_login();
begin
  if public.team_role(p_team) is distinct from 'owner' then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  perform public.log_event(p_team, 'team_deleted', null, jsonb_build_object('name', (select name from public.teams where id = p_team)));
  delete from public.teams where id = p_team;
end $$;

-- 招待コードの作成（コードはアプリ側で生成し、ハッシュだけを渡す）
create or replace function public.create_team_invite(p_team uuid, p_code_hash text, p_role text, p_expires_hours int, p_max_uses int)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := public.require_login(); r text := public.team_role(p_team); iid uuid;
begin
  if r is null or r not in ('owner','coach') then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if p_role = 'coach' and r <> 'owner' then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if p_role not in ('coach','player') then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if p_expires_hours is null or p_expires_hours < 1 or p_expires_hours > 24 * 30 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_code_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  insert into public.team_invites (team_id, code_hash, role, expires_at, max_uses, created_by)
    values (p_team, p_code_hash, p_role, now() + make_interval(hours => p_expires_hours), p_max_uses, uid)
    returning id into iid;
  perform public.log_event(p_team, 'invite_created', null,
    jsonb_build_object('invite_id', iid, 'role', p_role, 'max_uses', p_max_uses, 'expires_hours', p_expires_hours));
  return iid;
end $$;

create or replace function public.revoke_team_invite(p_invite uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public.require_login(); inv public.team_invites;
begin
  select * into inv from public.team_invites where id = p_invite;
  if inv.id is null or public.team_role(inv.team_id) is null or public.team_role(inv.team_id) not in ('owner','coach')
     or (inv.role = 'coach' and public.team_role(inv.team_id) <> 'owner') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  update public.team_invites set revoked_at = coalesce(revoked_at, now()) where id = p_invite;
  perform public.log_event(inv.team_id, 'invite_revoked', null, jsonb_build_object('invite_id', p_invite));
end $$;

-- 招待コードで参加を申請（指導者の承認待ちになる）
create or replace function public.redeem_team_invite(p_code text, p_member_name text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := public.require_login(); inv public.team_invites;
begin
  select * into inv from public.team_invites
    where code_hash = encode(digest(p_code, 'sha256'), 'hex') for update;
  if inv.id is not null and exists (select 1 from public.team_members where team_id = inv.team_id and user_id = uid) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
  if inv.id is null or inv.revoked_at is not null or inv.expires_at <= now() or inv.uses >= inv.max_uses then
    raise exception 'invite_invalid' using errcode = 'P0001';
  end if;
  if inv.role = 'coach' and not public.is_adult_user(uid) then
    raise exception 'coach_must_be_adult' using errcode = 'P0001';
  end if;
  update public.team_invites set uses = uses + 1 where id = inv.id;
  insert into public.team_members (team_id, user_id, role, member_name)
    values (inv.team_id, uid, inv.role, btrim(p_member_name));
  perform public.log_event(inv.team_id, 'join_requested', uid, jsonb_build_object('role', inv.role, 'invite_id', inv.id));
  return inv.team_id;
end $$;

-- 参加申請の承認・却下
create or replace function public.review_team_member(p_member uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public.require_login(); m public.team_members; r text;
begin
  select * into m from public.team_members where id = p_member for update;
  r := public.team_role(m.team_id);
  if m.id is null or r is null or r not in ('owner','coach') or m.status <> 'pending'
     or (m.role <> 'player' and r <> 'owner') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_approve then
    update public.team_members set status = 'active', approved_at = now() where id = p_member;
    perform public.log_event(m.team_id, 'member_approved', m.user_id, jsonb_build_object('role', m.role));
  else
    delete from public.team_members where id = p_member;
    perform public.log_event(m.team_id, 'member_rejected', m.user_id, jsonb_build_object('role', m.role));
  end if;
end $$;

-- メンバーの除外（オーナーは除外できない。コーチの除外はオーナーのみ）
create or replace function public.remove_team_member(p_member uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public.require_login(); m public.team_members; r text;
begin
  select * into m from public.team_members where id = p_member;
  r := public.team_role(m.team_id);
  if m.id is null or m.role = 'owner' or r is null or r not in ('owner','coach')
     or (m.role <> 'player' and r <> 'owner') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  delete from public.team_members where id = p_member;
  perform public.log_event(m.team_id, 'member_removed', m.user_id, jsonb_build_object('role', m.role));
end $$;

-- 自分からチームを退会（オーナーはチーム削除のみ）
create or replace function public.leave_team(p_team uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public.require_login(); m public.team_members;
begin
  select * into m from public.team_members where team_id = p_team and user_id = uid;
  if m.id is null then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if m.role = 'owner' then raise exception 'owner_cannot_leave' using errcode = 'P0001'; end if;
  delete from public.team_members where id = m.id;
  perform public.log_event(p_team, 'member_left', uid);
end $$;

-- 選手本人が「指導者に診断結果を見せる」を選ぶ／やめる
create or replace function public.set_team_share(p_team uuid, p_share boolean)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := public.require_login(); m public.team_members; next_status text;
begin
  select * into m from public.team_members where team_id = p_team and user_id = uid and role = 'player' for update;
  if m.id is null then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if not p_share then
    next_status := 'none';
  elsif public.is_adult_user(uid) then
    next_status := 'self';
  elsif m.consent_status = 'guardian_confirmed' then
    next_status := 'guardian_confirmed';
  else
    next_status := 'guardian_pending';
  end if;
  update public.team_members
    set consent_status = next_status,
        consent_guardian_id = case when next_status = 'guardian_confirmed' then consent_guardian_id end,
        consented_at = case when next_status in ('self','guardian_confirmed') then coalesce(consented_at, now()) end
    where id = m.id;
  if next_status is distinct from m.consent_status then
    perform public.log_event(p_team, 'consent_' || next_status, uid);
  end if;
  return next_status;
end $$;

-- 保護者確認リンクの発行（子ども本人。コードはアプリ側で生成し、ハッシュだけを渡す）
create or replace function public.create_guardian_request(p_code_hash text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := public.require_login(); rid uuid;
begin
  if p_code_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if (select count(*) from public.guardian_requests where child_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too_many_requests' using errcode = 'P0001';
  end if;
  -- 古い未使用リンクは無効にする（常に最新の1本だけ有効）
  update public.guardian_requests set expires_at = least(expires_at, now()) where child_id = uid and used_at is null;
  insert into public.guardian_requests (child_id, code_hash, expires_at)
    values (uid, p_code_hash, now() + interval '7 days') returning id into rid;
  return rid;
end $$;

-- 保護者が確認リンクを開いて承認する。保護者自身の年代（18歳以上）も登録する。
create or replace function public.accept_guardian_request(p_code text, p_age_band text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := public.require_login(); req public.guardian_requests; cur text;
begin
  if p_age_band is null or p_age_band not in ('18_29','30_49','50_plus') then
    raise exception 'guardian_must_be_adult' using errcode = 'P0001';
  end if;
  select age_band into cur from public.profiles where id = uid;
  if cur in ('elem_low','elem_high','junior_high','high_school') then
    raise exception 'guardian_must_be_adult' using errcode = 'P0001';
  end if;
  select * into req from public.guardian_requests
    where code_hash = encode(digest(p_code, 'sha256'), 'hex') for update;
  if req.id is null or req.used_at is not null or req.expires_at <= now() then
    raise exception 'guardian_request_invalid' using errcode = 'P0001';
  end if;
  if req.child_id = uid then raise exception 'guardian_self' using errcode = 'P0001'; end if;
  update public.profiles set age_band = p_age_band where id = uid;
  update public.guardian_requests set used_at = now() where id = req.id;
  insert into public.guardian_links (guardian_id, child_id) values (uid, req.child_id) on conflict do nothing;
  -- 子どものアカウントを「保護者確認済み」にする（公開共有リンクも使えるようになる）
  update public.profiles set consent_status = 'guardian_confirmed' where id = req.child_id;
  perform public.log_event(null, 'guardian_linked', req.child_id);
  return req.child_id;
end $$;

-- 保護者の登録を解除（保護者・子どものどちらからでも）
create or replace function public.remove_guardian_link(p_guardian uuid, p_child uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public.require_login();
begin
  if uid not in (p_guardian, p_child) then raise exception 'forbidden' using errcode = 'P0001'; end if;
  delete from public.guardian_links where guardian_id = p_guardian and child_id = p_child;
  if not found then raise exception 'forbidden' using errcode = 'P0001'; end if;
  -- この保護者が出したチームへの同意は取り消す
  update public.team_members set consent_status = 'none', consent_guardian_id = null, consented_at = null
    where user_id = p_child and consent_guardian_id = p_guardian;
  if not exists (select 1 from public.guardian_links where child_id = p_child) then
    update public.profiles set consent_status = 'none' where id = p_child and consent_status = 'guardian_confirmed';
    -- 公開中の共有リンクも止める
    update public.share_links set enabled = false where user_id = p_child and enabled
      and public.is_minor_age_band((select age_band from public.profiles where id = p_child));
  end if;
  perform public.log_event(null, 'guardian_unlinked', p_child);
end $$;

-- 保護者が、子どものチームへの結果共有に同意する／取り消す
create or replace function public.guardian_set_team_share(p_member uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := public.require_login(); m public.team_members;
begin
  select * into m from public.team_members where id = p_member for update;
  if m.id is null or m.role <> 'player'
     or not exists (select 1 from public.guardian_links where guardian_id = uid and child_id = m.user_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_approve then
    -- 子ども本人が共有を希望している場合だけ同意できる
    if m.consent_status not in ('guardian_pending','guardian_confirmed') then
      raise exception 'child_has_not_requested' using errcode = 'P0001';
    end if;
    update public.team_members
      set consent_status = 'guardian_confirmed', consent_guardian_id = uid, consented_at = now()
      where id = p_member;
    perform public.log_event(m.team_id, 'consent_guardian_confirmed', m.user_id);
  else
    update public.team_members
      set consent_status = case when m.consent_status = 'none' then 'none' else 'guardian_pending' end,
          consent_guardian_id = null, consented_at = null
      where id = p_member;
    perform public.log_event(m.team_id, 'consent_guardian_withdrawn', m.user_id);
  end if;
end $$;

-- 保護者向け: 子どもとそのチーム参加状況の一覧
create or replace function public.guardian_overview()
returns table (child_id uuid, child_name text, member_id uuid, team_name text, member_name text,
               member_status text, consent_status text)
language sql stable security definer set search_path = public as $$
  select g.child_id, p.display_name, m.id, t.name, m.member_name, m.status, m.consent_status
  from public.guardian_links g
  join public.profiles p on p.id = g.child_id
  left join public.team_members m on m.user_id = g.child_id and m.role = 'player'
  left join public.teams t on t.id = m.team_id
  where g.guardian_id = auth.uid()
  order by g.created_at, t.name
$$;

-- 指導者向け: メンバー一覧（年代そのものは返さず「保護者同意が必要か」だけ返す）
create or replace function public.team_member_list(p_team uuid)
returns table (id uuid, user_id uuid, role text, member_name text, status text, consent_status text,
               needs_guardian boolean, can_view boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.team_role(p_team) is null or public.team_role(p_team) not in ('owner','coach') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  return query
    select m.id, m.user_id, m.role, m.member_name, m.status, m.consent_status,
           (m.role = 'player' and not public.is_adult_user(m.user_id)),
           public.member_consent_valid(m), m.created_at
    from public.team_members m
    where m.team_id = p_team
    order by m.status desc, m.role, m.member_name;
end $$;

-- 指導者の操作の記録（CSV出力・個人結果の閲覧）
create or replace function public.log_team_access(p_team uuid, p_action text, p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_login();
  if public.team_role(p_team) is null or public.team_role(p_team) not in ('owner','coach') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_action not in ('csv_export','member_results_viewed') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  perform public.log_event(p_team, p_action, p_target);
end $$;

-- ---------------------------------------------------------------- 権限（GRANT）
grant select on public.teams, public.team_members, public.team_invites, public.guardian_requests,
  public.guardian_links, public.audit_events to authenticated;
grant update (name) on public.teams to authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'public.is_adult_user(uuid)', 'public.team_role(uuid)', 'public.is_team_member(uuid)',
    'public.member_consent_valid(public.team_members)', 'public.coach_can_view_user(uuid)',
    'public.create_team(text, text)', 'public.delete_team(uuid)',
    'public.create_team_invite(uuid, text, text, int, int)', 'public.revoke_team_invite(uuid)',
    'public.redeem_team_invite(text, text)', 'public.review_team_member(uuid, boolean)',
    'public.remove_team_member(uuid)', 'public.leave_team(uuid)', 'public.set_team_share(uuid, boolean)',
    'public.create_guardian_request(text)', 'public.accept_guardian_request(text, text)',
    'public.remove_guardian_link(uuid, uuid)', 'public.guardian_set_team_share(uuid, boolean)',
    'public.guardian_overview()', 'public.team_member_list(uuid)', 'public.log_team_access(uuid, text, uuid)',
    'public.require_login()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
