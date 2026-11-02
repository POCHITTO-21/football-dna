-- Phase 2 の RLS / 共有リンク / 未成年ガードのテスト（失敗すると例外で停止）
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000c');
-- a: 成人, b: 成人(他人), c: 中学生
update public.profiles set age_band = '18_29', display_name = 'エース' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set age_band = '30_49' where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set age_band = 'junior_high' where id = '00000000-0000-0000-0000-00000000000c';

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, false);
  execute 'set role authenticated';
end $$;

-- ユーザーaとcが診断を保存
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.diagnosis_sessions (id, user_id, question_set_version, scoring_version)
  values ('10000000-0000-0000-0000-00000000000a', auth.uid(), 'q', 's');
insert into public.answers values ('10000000-0000-0000-0000-00000000000a', 'Q01', 4);
insert into public.results (id, session_id, user_id, type_id, axis_scores, position_scores, top_positions, type_config_version, position_config_version)
  values ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', auth.uid(), 'T03', '{}', '[]', '{RW,LW,AM}', 't', 'p');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.diagnosis_sessions (id, user_id, question_set_version, scoring_version)
  values ('10000000-0000-0000-0000-00000000000c', auth.uid(), 'q', 's');
insert into public.results (id, session_id, user_id, type_id, axis_scores, position_scores, top_positions, type_config_version, position_config_version)
  values ('20000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-00000000000c', auth.uid(), 'T01', '{}', '[]', '{CM,AM,DM}', 't', 'p');
-- 本人が保護者確認済みに書き換えようとしても無視される
update public.profiles set consent_status = 'guardian_confirmed' where id = auth.uid();
do $$ begin
  if (select consent_status from public.profiles where id = auth.uid()) <> 'none' then
    raise exception 'FAIL: user could self-assign guardian consent';
  end if;
end $$;
-- 未成年は共有を有効化できない
do $$ begin
  begin
    insert into public.share_links (result_id, user_id, token_hash, enabled)
      values ('20000000-0000-0000-0000-00000000000c', auth.uid(), 'x', true);
    raise exception 'FAIL: minor enabled share link';
  exception when sqlstate 'P0001' then
    if sqlerrm not like 'share_not_allowed%' then raise; end if;
  end;
end $$;
reset role;

-- 他人(b)からは a の結果・回答・セッションが見えず、削除も書き込みもできない
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  if (select count(*) from public.results) <> 0 then raise exception 'FAIL: other user can read results'; end if;
  if (select count(*) from public.answers) <> 0 then raise exception 'FAIL: other user can read answers'; end if;
  if (select count(*) from public.diagnosis_sessions) <> 0 then raise exception 'FAIL: other user can read sessions'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL: other user can read profiles'; end if;
  delete from public.results where id = '20000000-0000-0000-0000-00000000000a';
  begin
    insert into public.share_links (result_id, user_id, token_hash) values ('20000000-0000-0000-0000-00000000000a', auth.uid(), 'y');
    raise exception 'FAIL: other user created share link for foreign result';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.results (session_id, user_id, type_id, axis_scores, position_scores, top_positions, type_config_version, position_config_version)
      values ('10000000-0000-0000-0000-00000000000a', auth.uid(), 'T01', '{}', '[]', '{}', 't', 'p');
    raise exception 'FAIL: other user attached result to foreign session';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.results where id = '20000000-0000-0000-0000-00000000000a') <> 1 then
    raise exception 'FAIL: other user deleted result';
  end if;
end $$;

-- a が共有リンクを作成（初期は無効）→ 公開取得できない → 有効化 → 取得できる → 失効 → 取得できない
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.share_links (id, result_id, user_id, token_hash)
  values ('30000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', auth.uid(), encode(digest('secret-token', 'sha256'), 'hex'));
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ begin
  if (select count(*) from public.get_shared_result('secret-token')) <> 0 then raise exception 'FAIL: disabled link is readable'; end if;
  if (select count(*) from public.results) <> 0 then raise exception 'FAIL: anon can read results table'; end if;
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
update public.share_links set enabled = true where id = '30000000-0000-0000-0000-00000000000a';
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ declare r record; begin
  select * into r from public.get_shared_result('secret-token');
  if r.type_id <> 'T03' then raise exception 'FAIL: enabled link not readable'; end if;
  if r.nickname is not null then raise exception 'FAIL: nickname exposed without opt-in'; end if;
  if (select count(*) from public.get_shared_result('wrong-token')) <> 0 then raise exception 'FAIL: wrong token readable'; end if;
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
update public.share_links set include_nickname = true where id = '30000000-0000-0000-0000-00000000000a';
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ begin
  if (select nickname from public.get_shared_result('secret-token')) <> 'エース' then raise exception 'FAIL: nickname opt-in not applied'; end if;
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
update public.share_links set revoked_at = now(), enabled = false where id = '30000000-0000-0000-0000-00000000000a';
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ begin
  if (select count(*) from public.get_shared_result('secret-token')) <> 0 then raise exception 'FAIL: revoked link readable'; end if;
end $$;
reset role;
-- 期限切れ
update public.share_links set revoked_at = null, enabled = true, expires_at = now() - interval '1 minute' where id = '30000000-0000-0000-0000-00000000000a';
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ begin
  if (select count(*) from public.get_shared_result('secret-token')) <> 0 then raise exception 'FAIL: expired link readable'; end if;
end $$;
reset role;

-- アカウント削除で関連データがすべて消える
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  if exists (select 1 from public.results where user_id = '00000000-0000-0000-0000-00000000000a')
     or exists (select 1 from public.share_links where user_id = '00000000-0000-0000-0000-00000000000a')
     or exists (select 1 from public.answers where session_id = '10000000-0000-0000-0000-00000000000a')
     or exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000a') then
    raise exception 'FAIL: cascade delete incomplete';
  end if;
end $$;

-- delete_my_account: 未ログインでは失敗、ログイン中は本人だけ消える
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ begin
  begin
    perform public.delete_my_account();
    raise exception 'FAIL: anon could call delete_my_account';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.delete_my_account();
reset role;
do $$ begin
  if exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000000c') then raise exception 'FAIL: account not deleted'; end if;
  if not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000000b') then raise exception 'FAIL: other account deleted'; end if;
end $$;

-- 設問 seed: 公開読み取りでき、書き込みはできない
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ begin
  if (select count(*) from public.questions) <> 40 then raise exception 'FAIL: seeded questions not readable'; end if;
  begin
    insert into public.question_sets (version) values ('evil');
    raise exception 'FAIL: anon can write question_sets';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'ALL RLS TESTS PASSED' as result;
