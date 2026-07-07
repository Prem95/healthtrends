-- rls_test.sql
-- Asserts RLS isolation: user A cannot read user B's rows (returns ZERO rows,
-- not an error), built-in biomarkers are readable but not writable, and
-- subscriptions are not writable by an authenticated user.
--
-- Run against a local shadow/test database ONLY (never production):
--   supabase db reset            # applies migrations to the local db
--   psql "$LOCAL_DB_URL" -f supabase/tests/rls_test.sql
--
-- It simulates two users by setting request.jwt.claims + role, the same way
-- Supabase presents an authenticated request to Postgres.

begin;

-- Seed two auth users directly (test-only shortcut; app uses Supabase Auth).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local')
on conflict (id) do nothing;

-- Helper to become a given user (authenticated role + jwt sub claim).
create or replace function _become(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end; $$;

-- --- As user A: create a profile + session + result ---
select _become('00000000-0000-0000-0000-00000000000a');

insert into public.profiles (id, user_id, name, sex)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Alice', 'F');

insert into public.test_sessions (id, profile_id, date)
  values ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-01-15');

insert into public.test_results (session_id, biomarker_id, value, entered_unit)
  values ('aaaaaaaa-0000-0000-0000-000000000002', 'ldl-cholesterol', 120, 'mg/dL');

-- A can see A's own data.
do $$
declare n int;
begin
  select count(*) into n from public.profiles;
  assert n = 1, format('A should see 1 profile, saw %s', n);
  select count(*) into n from public.test_results;
  assert n = 1, format('A should see 1 result, saw %s', n);
end $$;

-- --- Switch to user B ---
select _become('00000000-0000-0000-0000-00000000000b');

-- B must NOT see A's rows (zero rows, not error), even querying by explicit id.
do $$
declare n int;
begin
  select count(*) into n from public.profiles
    where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  assert n = 0, format('B must not see A profile, saw %s', n);

  select count(*) into n from public.test_sessions
    where id = 'aaaaaaaa-0000-0000-0000-000000000002';
  assert n = 0, format('B must not see A session, saw %s', n);

  select count(*) into n from public.test_results
    where session_id = 'aaaaaaaa-0000-0000-0000-000000000002';
  assert n = 0, format('B must not see A result, saw %s', n);
end $$;

-- B cannot insert a session into A's profile (RLS with-check blocks it).
do $$
begin
  begin
    insert into public.test_sessions (profile_id, date)
      values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-02-01');
    raise exception 'B inserted a session into A profile — RLS FAILED';
  exception when insufficient_privilege or check_violation then
    -- expected: RLS blocked the write
    null;
  end;
end $$;

-- Built-in biomarkers are readable by any authenticated user...
do $$
declare n int;
begin
  select count(*) into n from public.biomarkers where user_id is null;
  assert n > 0, 'built-in biomarkers should be readable';
end $$;

-- ...but not writable (insert of a built-in / update of one must fail).
do $$
begin
  begin
    update public.biomarkers set name = 'hacked' where id = 'ldl-cholesterol';
    -- update silently affecting 0 rows is also acceptable isolation; assert it changed nothing
    if found then
      raise exception 'B updated a built-in biomarker — RLS FAILED';
    end if;
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- Subscriptions: authenticated user cannot write (no write policy exists).
do $$
begin
  begin
    insert into public.subscriptions (user_id, plan) values ('00000000-0000-0000-0000-00000000000b', 'pro');
    raise exception 'B wrote a subscription row — RLS FAILED';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- If we got here, all assertions passed.
select 'RLS TESTS PASSED' as result;

rollback;
