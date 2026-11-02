-- Phase 3 のチーム・招待・同意・権限のテスト（失敗すると例外で停止）
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on
\o /dev/null
-- o: オーナー(成人) k: コーチ(成人) p: 選手(成人) c: 選手(中学生) g: 保護者(成人) x: 部外者(成人) y: 高校生
insert into auth.users values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000a3'), ('00000000-0000-0000-0000-0000000000a4'),
  ('00000000-0000-0000-0000-0000000000a5'), ('00000000-0000-0000-0000-0000000000a6'),
  ('00000000-0000-0000-0000-0000000000a7');
update public.profiles set age_band = '30_49' where id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a6');
update public.profiles set age_band = '18_29' where id = '00000000-0000-0000-0000-0000000000a3';
update public.profiles set age_band = 'junior_high', display_name = 'たろう' where id = '00000000-0000-0000-0000-0000000000a4';
update public.profiles set age_band = 'high_school' where id = '00000000-0000-0000-0000-0000000000a7';
-- g は年代未設定（保護者登録時に入力する）

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, false);
  execute 'set role authenticated';
end $$;

-- 例外が起きることを確認する（pattern は SQLERRM の LIKE パターン）
create or replace function pg_temp.expect_error(stmt text, pattern text, label text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlerrm like pattern then return; end if;
    raise exception 'FAIL (%): unexpected error %', label, sqlerrm;
  end;
  raise exception 'FAIL (%): no error', label;
end $$;

create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FAIL: %', label; end if;
end $$;

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;

-- 選手 p と c が診断結果を保存しておく
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
insert into public.diagnosis_sessions (id, user_id, question_set_version, scoring_version) values ('11000000-0000-0000-0000-0000000000a3', auth.uid(), 'q', 's');
insert into public.results (session_id, user_id, type_id, axis_scores, position_scores, top_positions, type_config_version, position_config_version)
  values ('11000000-0000-0000-0000-0000000000a3', auth.uid(), 'T02', '{}', '[]', '{ST,SS,AM}', 't', 'p');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
insert into public.diagnosis_sessions (id, user_id, question_set_version, scoring_version) values ('11000000-0000-0000-0000-0000000000a4', auth.uid(), 'q', 's');
insert into public.results (session_id, user_id, type_id, axis_scores, position_scores, top_positions, type_config_version, position_config_version)
  values ('11000000-0000-0000-0000-0000000000a4', auth.uid(), 'T05', '{}', '[]', '{CB,DM,RB}', 't', 'p');
-- 未成年はチームを作れない
select pg_temp.expect_error($$select public.create_team('U15', 'たろう')$$, 'coach_must_be_adult', 'minor creates team');
-- 直接 INSERT もできない
select pg_temp.expect_error($$insert into public.teams (owner_id, name) values (auth.uid(), 'x')$$, '%permission denied%', 'direct team insert');
reset role;

-- オーナー o がチームを作り、選手用・コーチ用の招待を作る
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into ids values ('team', public.create_team('FC テスト', '山田コーチ'));
insert into ids values ('inv_player', public.create_team_invite((select v from ids where k = 'team'), encode(extensions.digest('PLAYERCODE', 'sha256'), 'hex'), 'player', 24, 10));
insert into ids values ('inv_coach', public.create_team_invite((select v from ids where k = 'team'), encode(extensions.digest('COACHCODE', 'sha256'), 'hex'), 'coach', 24, 1));
select pg_temp.expect_error($$select public.create_team_invite((select v from ids where k = 'team'), 'nothex', 'player', 24, 10)$$, 'invalid_input', 'bad hash');
select pg_temp.expect_error($$select public.create_team_invite((select v from ids where k = 'team'), repeat('a', 64), 'player', 24 * 31, 10)$$, 'invalid_input', 'expiry too long');
select pg_temp.expect_error($$select public.leave_team((select v from ids where k = 'team'))$$, 'owner_cannot_leave', 'owner leaves');
reset role;

-- 部外者 x はチームも招待も見えず、招待を作れない
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a6');
select pg_temp.check((select count(*) from public.teams) = 0, 'outsider sees team');
select pg_temp.check((select count(*) from public.team_invites) = 0, 'outsider sees invites');
select pg_temp.expect_error($$select public.create_team_invite((select v from ids where k = 'team'), repeat('b', 64), 'player', 24, 10)$$, 'forbidden', 'outsider creates invite');
select pg_temp.expect_error($$select public.redeem_team_invite('WRONGCODE', 'x')$$, 'invite_invalid', 'wrong code');
reset role;

-- コーチ k がコーチ招待で参加申請 → オーナーが承認
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select public.redeem_team_invite('COACHCODE', '佐藤コーチ');
select pg_temp.expect_error($$select public.redeem_team_invite('COACHCODE', '佐藤コーチ')$$, 'already_member', 'double join');
-- 承認前のコーチはメンバー一覧を見られない
select pg_temp.expect_error($$select * from public.team_member_list((select v from ids where k = 'team'))$$, 'forbidden', 'pending coach lists members');
reset role;
-- コーチ招待は1回まで
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a6');
select pg_temp.expect_error($$select public.redeem_team_invite('COACHCODE', 'x')$$, 'invite_invalid', 'max uses');
reset role;
-- 高校生はコーチ招待で参加できない
update public.team_invites set uses = 0 where id = (select v from ids where k = 'inv_coach');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a7');
select pg_temp.expect_error($$select public.redeem_team_invite('COACHCODE', 'y')$$, 'coach_must_be_adult', 'minor coach');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select public.review_team_member((select id from public.team_members where user_id = '00000000-0000-0000-0000-0000000000a2'), true);
reset role;

-- 選手 p, c が参加申請
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select public.redeem_team_invite('PLAYERCODE', '鈴木');
select pg_temp.check((select count(*) from public.teams) = 1, 'pending member sees team name');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select public.redeem_team_invite('PLAYERCODE', 'たろう');
-- 本人が同意状態を直接書き換えることはできない
select pg_temp.expect_error($$update public.team_members set consent_status = 'guardian_confirmed', status = 'active' where user_id = auth.uid()$$, '%permission denied%', 'direct consent update');
reset role;

-- コーチ k が承認。コーチはコーチの申請を承認できない
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.check((select count(*) from public.team_member_list((select v from ids where k = 'team')) where status = 'pending') = 2, 'coach sees 2 pending');
select public.review_team_member(id, true) from public.team_members where status = 'pending' and role = 'player';
select pg_temp.expect_error($$select public.remove_team_member((select id from public.team_members where role = 'owner'))$$, 'forbidden', 'coach removes owner');
-- 同意がないので結果は見えない
select pg_temp.check((select count(*) from public.results) = 0, 'coach sees results without consent');
reset role;

-- 選手同士は他のメンバーを見られない・承認できない
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select pg_temp.check((select count(*) from public.team_members) = 1, 'player sees only own membership');
select pg_temp.expect_error($$select * from public.team_member_list((select v from ids where k = 'team'))$$, 'forbidden', 'player lists members');
select pg_temp.expect_error($$select public.create_team_invite((select v from ids where k = 'team'), repeat('c', 64), 'player', 24, 10)$$, 'forbidden', 'player creates invite');
select pg_temp.check((select count(*) from public.audit_events where team_id is not null and actor_id <> auth.uid()) = 0, 'player reads team audit');
-- 成人の選手 p が共有に同意 → self
select pg_temp.check(public.set_team_share((select v from ids where k = 'team'), true) = 'self', 'adult consent self');
reset role;

-- 未成年 c が共有を希望 → 保護者確認待ち
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select pg_temp.check(public.set_team_share((select v from ids where k = 'team'), true) = 'guardian_pending', 'minor consent pending');
reset role;

-- コーチは p の結果だけ見える
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.check((select count(*) from public.results) = 1, 'coach sees 1 result');
select pg_temp.check((select user_id from public.results) = '00000000-0000-0000-0000-0000000000a3', 'coach sees adult result');
select pg_temp.check((select count(*) from public.answers) = 0, 'coach sees answers');
select pg_temp.check((select needs_guardian from public.team_member_list((select v from ids where k = 'team')) where member_name = 'たろう'), 'needs_guardian flag');
-- コーチは結果を書き換え・削除できない
delete from public.results;
update public.results set type_id = 'T01';
reset role;
select pg_temp.check((select type_id from public.results where user_id = '00000000-0000-0000-0000-0000000000a3') = 'T02', 'coach modified result');
-- 部外者からは見えない
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a6');
select pg_temp.check((select count(*) from public.results) = 0, 'outsider sees results');
reset role;

-- 保護者確認: c がリンクを発行し、g が承認
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select public.create_guardian_request(encode(extensions.digest('GUARDIAN-TOKEN', 'sha256'), 'hex'));
select pg_temp.expect_error($$select public.accept_guardian_request('GUARDIAN-TOKEN', '30_49')$$, 'guardian_must_be_adult', 'child accepts own request');
reset role;
-- 高校生は保護者になれない
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a7');
select pg_temp.expect_error($$select public.accept_guardian_request('GUARDIAN-TOKEN', '30_49')$$, 'guardian_must_be_adult', 'minor guardian');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a5');
select pg_temp.expect_error($$select public.accept_guardian_request('GUARDIAN-TOKEN', 'junior_high')$$, 'guardian_must_be_adult', 'guardian declares minor band');
select pg_temp.expect_error($$select public.accept_guardian_request('WRONG', '30_49')$$, 'guardian_request_invalid', 'wrong guardian token');
select public.accept_guardian_request('GUARDIAN-TOKEN', '30_49');
reset role;
select pg_temp.check((select consent_status from public.profiles where id = '00000000-0000-0000-0000-0000000000a4') = 'guardian_confirmed', 'child account confirmed');
select pg_temp.check((select age_band from public.profiles where id = '00000000-0000-0000-0000-0000000000a5') = '30_49', 'guardian age band saved');
-- 同じリンクは2回使えない
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a6');
select pg_temp.expect_error($$select public.accept_guardian_request('GUARDIAN-TOKEN', '30_49')$$, 'guardian_request_invalid', 'reuse guardian token');
-- 保護者でない人は同意できない
select pg_temp.expect_error($$select public.guardian_set_team_share((select v from ids where k = 'team'), true)$$, 'forbidden', 'non-guardian approves');
select pg_temp.check((select count(*) from public.guardian_overview()) = 0, 'outsider guardian overview');
reset role;

-- 保護者 g が子どものチーム共有に同意 → コーチから見える
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a5');
select pg_temp.check((select count(*) from public.guardian_overview()) = 1, 'guardian sees child membership');
select pg_temp.check((select consent_status from public.guardian_overview()) = 'guardian_pending', 'guardian sees pending');
-- 保護者は子どもの診断結果そのものは見られない（チームのコーチではないため）
select pg_temp.check((select count(*) from public.results) = 0, 'guardian sees child results');
select public.guardian_set_team_share((select member_id from public.guardian_overview()), true);
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.check((select count(*) from public.results) = 2, 'coach sees minor result after guardian consent');
reset role;

-- 子ども本人が共有をやめれば、保護者同意があっても見えなくなる
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select pg_temp.check(public.set_team_share((select v from ids where k = 'team'), false) = 'none', 'child withdraws');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.check((select count(*) from public.results) = 1, 'coach still sees minor after withdraw');
reset role;
-- 子どもが希望していないと保護者だけでは同意できない
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a5');
select pg_temp.expect_error($$select public.guardian_set_team_share((select member_id from public.guardian_overview()), true)$$, 'child_has_not_requested', 'guardian forces share');
reset role;
-- 再希望 → 保護者が同意 → 保護者の登録解除で同意も取り消される
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select public.set_team_share((select v from ids where k = 'team'), true);
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a5');
select public.guardian_set_team_share((select member_id from public.guardian_overview()), true);
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select public.remove_guardian_link('00000000-0000-0000-0000-0000000000a5', auth.uid());
select pg_temp.check((select consent_status from public.team_members where user_id = auth.uid()) = 'none', 'unlink clears team consent');
select pg_temp.check((select consent_status from public.profiles where id = auth.uid()) = 'none', 'unlink clears account consent');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.check((select count(*) from public.results) = 1, 'coach sees minor after unlink');
reset role;

-- 成人が年代を未成年に変えると、同意 self は無効になる
update public.profiles set age_band = 'high_school' where id = '00000000-0000-0000-0000-0000000000a3';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.check((select count(*) from public.results) = 0, 'self consent valid after age change');
reset role;
update public.profiles set age_band = '18_29' where id = '00000000-0000-0000-0000-0000000000a3';

-- 招待の期限切れ・失効
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.expect_error($$select public.revoke_team_invite((select v from ids where k = 'inv_coach'))$$, 'forbidden', 'coach revokes coach invite');
select public.revoke_team_invite((select v from ids where k = 'inv_player'));
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a6');
select pg_temp.expect_error($$select public.redeem_team_invite('PLAYERCODE', 'x')$$, 'invite_invalid', 'revoked invite');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into ids values ('inv_exp', public.create_team_invite((select v from ids where k = 'team'), encode(extensions.digest('EXPIRED', 'sha256'), 'hex'), 'player', 1, 10));
reset role;
update public.team_invites set expires_at = now() - interval '1 second' where id = (select v from ids where k = 'inv_exp');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a6');
select pg_temp.expect_error($$select public.redeem_team_invite('EXPIRED', 'x')$$, 'invite_invalid', 'expired invite');
-- 監査ログを記録できるのは指導者だけ
select pg_temp.expect_error($$select public.log_team_access((select v from ids where k = 'team'), 'csv_export', null)$$, 'forbidden', 'outsider logs');
reset role;

-- 監査ログ: コーチは読める、記録が残っている
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select public.log_team_access((select v from ids where k = 'team'), 'csv_export', null);
select pg_temp.expect_error($$select public.log_team_access((select v from ids where k = 'team'), 'anything', null)$$, 'invalid_input', 'bad audit action');
select pg_temp.check((select count(*) from public.audit_events where action = 'csv_export') = 1, 'csv audit');
select pg_temp.check((select count(*) from public.audit_events where action = 'member_approved') = 3, 'approval audit');
select pg_temp.check((select count(*) from public.audit_events where action = 'consent_guardian_confirmed') = 2, 'consent audit');
-- 直接書き込みはできない
select pg_temp.expect_error($$insert into public.audit_events (team_id, action) values ((select v from ids where k = 'team'), 'x')$$, '%permission denied%', 'direct audit insert');
-- コーチはチームを削除できない
select pg_temp.expect_error($$select public.delete_team((select v from ids where k = 'team'))$$, 'forbidden', 'coach deletes team');
-- 選手を除外できる
select public.remove_team_member((select id from public.team_members where user_id = '00000000-0000-0000-0000-0000000000a3'));
select pg_temp.check((select count(*) from public.results) = 0, 'removed player still visible');
reset role;

-- 選手 c が退会
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
select public.leave_team((select v from ids where k = 'team'));
select pg_temp.check((select count(*) from public.teams) = 0, 'left member sees team');
reset role;

-- オーナーがチームを削除
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select public.delete_team((select v from ids where k = 'team'));
select pg_temp.check((select count(*) from public.teams) = 0, 'team deleted');
select pg_temp.check((select count(*) from public.audit_events where action = 'team_deleted') = 1, 'delete audit kept');
reset role;
select pg_temp.check((select count(*) from public.team_members) = 0, 'members cascade');

-- 「回答しない」は保護者確認が必要な扱い
select pg_temp.check(public.is_minor_age_band('no_answer'), 'no_answer treated as minor');
select pg_temp.check(public.is_minor_age_band(null), 'null treated as minor');
select pg_temp.check(not public.is_minor_age_band('50_plus'), '50_plus adult');

\o
\echo 'phase3 RLS tests passed'
