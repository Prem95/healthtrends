-- mobile_test.sql
-- Asserts what migration 0006 promises: plan limits hold at the database,
-- the entitlement rule reads both Stripe and App Store state, the atomic
-- save works and is still bound by RLS, and clients cannot write
-- subscription state.
--
-- Run against a LOCAL database only:
--   supabase db reset
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/mobile_test.sql
-- Everything happens inside one transaction that is rolled back.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local')
on conflict (id) do nothing;

create or replace function _become(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end; $$;

create or replace function _become_admin() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end; $$;

-- Runs p_sql and requires it to fail with a message matching p_like.
create or replace function _expect_error(p_sql text, p_like text) returns void language plpgsql as $$
declare
  v_failed boolean := false;
  v_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    v_failed := true;
    v_msg := sqlerrm;
  end;
  if not v_failed then
    raise exception 'expected failure (%), but it succeeded: %', p_like, p_sql;
  end if;
  if v_msg not like p_like then
    raise exception 'expected failure like "%", got "%"', p_like, v_msg;
  end if;
end; $$;

create or replace function _assert(p_ok boolean, p_what text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception 'ASSERT FAILED: %', p_what; end if;
end; $$;

grant execute on function _become(uuid), _become_admin(), _expect_error(text, text), _assert(boolean, text)
  to authenticated;

-- ------------------------------------------------------------ profile limit
select _become('00000000-0000-0000-0000-00000000000a');

insert into public.profiles (id, user_id, name, sex)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Alice', 'F');

select _expect_error(
  $q$insert into public.profiles (user_id, name, sex) values ('00000000-0000-0000-0000-00000000000a', 'Second', 'M')$q$,
  'profile_limit');

select _expect_error(
  $q$insert into public.profiles (user_id, name, sex) values ('00000000-0000-0000-0000-00000000000b', 'Not mine', 'M')$q$,
  '%row-level security%');

-- ------------------------------------------------------- atomic save + RLS
select _assert(
  (select public.create_session_with_results(
     'aaaaaaaa-0000-0000-0000-000000000001', date '2026-01-15', '  Harbour Lab ', null, true, '',
     '[{"biomarker_id":"ldl-cholesterol","value":120,"entered_unit":"mg/dL","lab_range":{"max":130},"flag_on_report":null,"note":null},
       {"biomarker_id":"hba1c","value":5.4,"entered_unit":"%","lab_range":null,"flag_on_report":"","note":"  fasting  "}]'::jsonb
   )) is not null,
  'create_session_with_results returns the new id');

select _assert((select count(*) from public.test_sessions) = 1, 'one session saved');
select _assert((select count(*) from public.test_results) = 2, 'two results saved');
select _assert((select lab_name from public.test_sessions) = 'Harbour Lab', 'lab name trimmed');
select _assert((select notes from public.test_sessions) is null, 'empty notes stored as null');
select _assert(
  (select lab_range from public.test_results where biomarker_id = 'hba1c') is null,
  'JSON null lab_range stored as SQL null');
select _assert(
  (select (lab_range->>'max')::numeric from public.test_results where biomarker_id = 'ldl-cholesterol') = 130,
  'lab range kept');
select _assert(
  (select note from public.test_results where biomarker_id = 'hba1c') = 'fasting', 'note trimmed');

-- A failing result rolls the whole save back (unknown biomarker).
select _expect_error(
  $q$select public.create_session_with_results('aaaaaaaa-0000-0000-0000-000000000001', date '2026-02-01', null, null, null, null,
     '[{"biomarker_id":"does-not-exist","value":1,"entered_unit":"x"}]'::jsonb)$q$,
  '%foreign key%');
select _assert((select count(*) from public.test_sessions) = 1, 'failed save left no session behind');

select _expect_error(
  $q$select public.create_session_with_results('aaaaaaaa-0000-0000-0000-000000000001', current_date + 30)$q$,
  'date_in_future');

-- User B cannot save into A's profile, and sees none of A's rows.
select _become('00000000-0000-0000-0000-00000000000b');
select _expect_error(
  $q$select public.create_session_with_results('aaaaaaaa-0000-0000-0000-000000000001', date '2026-01-20')$q$,
  '%row-level security%');
select _assert((select count(*) from public.test_sessions) = 0, 'B sees none of A''s sessions');
select _assert((select count(*) from public.test_results) = 0, 'B sees none of A''s results');

-- ------------------------------------------------------------ session limit
select _become('00000000-0000-0000-0000-00000000000a');
insert into public.test_sessions (profile_id, date)
  select 'aaaaaaaa-0000-0000-0000-000000000001', date '2025-01-01' + g
  from generate_series(1, 19) g;
select _assert((select count(*) from public.test_sessions) = 20, 'free plan reaches 20 tests');

select _expect_error(
  $q$insert into public.test_sessions (profile_id, date) values ('aaaaaaaa-0000-0000-0000-000000000001', date '2026-03-01')$q$,
  'session_limit');
select _expect_error(
  $q$select public.create_session_with_results('aaaaaaaa-0000-0000-0000-000000000001', date '2026-03-01')$q$,
  'session_limit');

select _assert((public.my_entitlement()->>'plan') = 'free', 'entitlement: free');
select _assert((public.my_entitlement()->>'sessionCount')::int = 20, 'entitlement: session count');
select _assert((public.my_entitlement()->>'maxSessions')::int = 20, 'entitlement: free session cap');

-- Clients cannot grant themselves Pro.
select _expect_error(
  $q$insert into public.subscriptions (user_id, plan, status) values ('00000000-0000-0000-0000-00000000000a', 'pro', 'active')$q$,
  '%');
select _expect_error($q$select public.user_is_pro('00000000-0000-0000-0000-00000000000a')$q$, '%permission denied%');

-- ---------------------------------------------------- App Store entitlement
select _become_admin();
insert into public.subscriptions
  (user_id, plan, status, app_store_original_transaction_id, app_store_product_id,
   app_store_status, app_store_expires_at, app_store_auto_renew, app_store_environment)
values
  ('00000000-0000-0000-0000-00000000000a', 'free', 'active', '2000000000000001', 'com.bbiom.app.pro.monthly',
   'active', now() + interval '20 days', true, 'Sandbox');

select _become('00000000-0000-0000-0000-00000000000a');
select _assert((public.my_entitlement()->>'plan') = 'pro', 'entitlement: pro via App Store');
select _assert((public.my_entitlement()->>'source') = 'app_store', 'entitlement: source app_store');
select _assert((public.my_entitlement()->'maxSessions') = 'null'::jsonb, 'entitlement: unlimited tests');
insert into public.test_sessions (profile_id, date) values ('aaaaaaaa-0000-0000-0000-000000000001', date '2026-03-01');
insert into public.profiles (user_id, name, sex) values ('00000000-0000-0000-0000-00000000000a', 'Mum', 'F');
select _assert((select count(*) from public.profiles) = 2, 'pro can add a second profile');

-- A client still cannot change its own subscription row (no privilege at all).
select _expect_error(
  $q$update public.subscriptions set app_store_expires_at = now() + interval '10 years'$q$,
  '%permission denied%');
select _expect_error($q$delete from public.subscriptions$q$, '%permission denied%');
select _become_admin();

-- Billing grace period still counts; billing retry and expiry do not.
update public.subscriptions set app_store_status = 'grace' where user_id = '00000000-0000-0000-0000-00000000000a';
select _assert(public.user_is_pro('00000000-0000-0000-0000-00000000000a'), 'grace period keeps Pro');
update public.subscriptions set app_store_status = 'billing_retry' where user_id = '00000000-0000-0000-0000-00000000000a';
select _assert(not public.user_is_pro('00000000-0000-0000-0000-00000000000a'), 'billing retry drops Pro');
update public.subscriptions set app_store_status = 'active', app_store_expires_at = now() - interval '2 days'
  where user_id = '00000000-0000-0000-0000-00000000000a';
select _assert(not public.user_is_pro('00000000-0000-0000-0000-00000000000a'), 'a lapsed App Store subscription drops Pro');
update public.subscriptions set app_store_expires_at = now() - interval '2 hours'
  where user_id = '00000000-0000-0000-0000-00000000000a';
select _assert(public.user_is_pro('00000000-0000-0000-0000-00000000000a'), 'one-day allowance for a late renewal notice');

-- Over the limit after a downgrade: data stays, new rows are refused.
update public.subscriptions set app_store_status = 'expired' where user_id = '00000000-0000-0000-0000-00000000000a';
select _become('00000000-0000-0000-0000-00000000000a');
select _assert((select count(*) from public.test_sessions) = 21, 'downgrade keeps existing tests readable');
select _expect_error(
  $q$insert into public.test_sessions (profile_id, date) values ('aaaaaaaa-0000-0000-0000-000000000001', date '2026-04-01')$q$,
  'session_limit');

-- -------------------------------------------------------- Stripe entitlement
select _become_admin();
update public.subscriptions set plan = 'pro', status = 'active' where user_id = '00000000-0000-0000-0000-00000000000a';
select _assert(public.user_is_pro('00000000-0000-0000-0000-00000000000a'), 'Stripe active = Pro');
update public.subscriptions set status = 'canceled', current_period_end = now() + interval '5 days'
  where user_id = '00000000-0000-0000-0000-00000000000a';
select _assert(public.user_is_pro('00000000-0000-0000-0000-00000000000a'), 'Stripe cancelled but paid-up = Pro');
update public.subscriptions set current_period_end = now() - interval '1 minute'
  where user_id = '00000000-0000-0000-0000-00000000000a';
select _assert(not public.user_is_pro('00000000-0000-0000-0000-00000000000a'), 'Stripe period over = Free');
select _become('00000000-0000-0000-0000-00000000000a');
select _assert((public.my_entitlement()->>'plan') = 'free', 'entitlement back to free');

-- One Apple subscription cannot be attached to two accounts.
select _become_admin();
select _expect_error(
  $q$insert into public.subscriptions (user_id, app_store_original_transaction_id) values ('00000000-0000-0000-0000-00000000000b', '2000000000000001')$q$,
  '%subscriptions_app_store_otid_key%');

-- ------------------------------------------- apply_app_store_subscription()
-- Clients cannot call it.
select _become('00000000-0000-0000-0000-00000000000b');
select _expect_error(
  $q$select public.apply_app_store_subscription('00000000-0000-0000-0000-00000000000b', null, '2000000000000009',
     'com.bbiom.app.pro.monthly', 'active', now() + interval '30 days', true, 'Sandbox')$q$,
  '%permission denied%');

select _become_admin();
-- B buys: applied to B, Stripe columns untouched.
select _assert(
  (public.apply_app_store_subscription('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b',
     '2000000000000002', 'com.bbiom.app.pro.yearly', 'active', now() + interval '300 days', true, 'Production')->>'result') = 'applied',
  'purchase applied to the buyer');
select _assert(public.user_is_pro('00000000-0000-0000-0000-00000000000b'), 'buyer is Pro');
select _assert(
  (select plan from public.subscriptions where user_id = '00000000-0000-0000-0000-00000000000b') = 'free',
  'Stripe plan column left alone');

-- A tries to claim B's subscription (restore on another account): conflict.
select _assert(
  (public.apply_app_store_subscription('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b',
     '2000000000000002', 'com.bbiom.app.pro.yearly', 'active', now() + interval '300 days', true, 'Production')->>'result') = 'conflict',
  'another account cannot claim it');
-- A purchase made for B (app account token) cannot be confirmed by A even before B's row exists.
select _assert(
  (public.apply_app_store_subscription('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b',
     '2000000000000777', 'com.bbiom.app.pro.yearly', 'active', now() + interval '300 days', true, 'Production')->>'result') = 'conflict',
  'app account token must match the caller');

-- A server notification (no caller): resolved by transaction id, then by token.
select _assert(
  (public.apply_app_store_subscription(null, null,
     '2000000000000002', 'com.bbiom.app.pro.yearly', 'grace', now() + interval '3 days', true, 'Production')->>'user_id')
    = '00000000-0000-0000-0000-00000000000b',
  'notification resolved by original transaction id');
select _assert(
  (select app_store_status from public.subscriptions where user_id = '00000000-0000-0000-0000-00000000000b') = 'grace',
  'notification updated the status');
select _assert(
  (public.apply_app_store_subscription(null, '99999999-0000-0000-0000-000000000000',
     '2000000000000555', 'com.bbiom.app.pro.monthly', 'active', now() + interval '30 days', true, 'Production')->>'result') = 'unknown_user',
  'notification for nobody we know is reported, not stored');

-- News about an old dead subscription does not overwrite a live one.
select public.apply_app_store_subscription(null, null,
  '2000000000000002', 'com.bbiom.app.pro.yearly', 'active', now() + interval '300 days', true, 'Production');
select _assert(
  (public.apply_app_store_subscription('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b',
     '2000000000000003', 'com.bbiom.app.pro.monthly', 'expired', now() - interval '90 days', false, 'Production')->>'result') = 'ignored',
  'stale subscription ignored');
select _assert(
  (select app_store_original_transaction_id from public.subscriptions where user_id = '00000000-0000-0000-0000-00000000000b') = '2000000000000002',
  'live subscription kept');
-- ...but an expiry of the live one is applied.
select public.apply_app_store_subscription(null, null,
  '2000000000000002', 'com.bbiom.app.pro.yearly', 'expired', now() - interval '1 hour', false, 'Production');
select _assert(not public.user_is_pro('00000000-0000-0000-0000-00000000000b'), 'expiry applied');

-- ---------------------------------------------------------- input constraints
select _become('00000000-0000-0000-0000-00000000000b');
select _expect_error(
  $q$insert into public.profiles (user_id, name, sex) values ('00000000-0000-0000-0000-00000000000b', '   ', 'M')$q$,
  '%profiles_name_len%');
insert into public.profiles (id, user_id, name, sex)
  values ('bbbbbbbb-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Bob', 'M');
select _expect_error(
  $q$select public.create_session_with_results('bbbbbbbb-0000-0000-0000-000000000001', date '2026-01-01', null, null, null, null,
     '[{"biomarker_id":"hba1c","value":"NaN","entered_unit":"%"}]'::jsonb)$q$,
  '%test_results_sane%');
select _expect_error(
  $q$select public.create_session_with_results('bbbbbbbb-0000-0000-0000-000000000001', date '2026-01-01', repeat('x', 121))$q$,
  '%test_sessions_text_len%');

-- Signed-out clients have no privileges at all.
select set_config('role', 'anon', true);
select set_config('request.jwt.claims', '', true);
select _expect_error($q$select count(*) from public.profiles$q$, '%permission denied%');
select _expect_error($q$select public.my_entitlement()$q$, '%permission denied%');

select _become_admin();
select 'mobile_test.sql: all assertions passed' as result;

rollback;
