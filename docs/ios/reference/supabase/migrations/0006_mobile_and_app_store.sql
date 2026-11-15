-- 0006_mobile_and_app_store.sql
-- Makes the database safe to talk to directly from a mobile client, and adds
-- App Store subscription state.
--
-- Until now plan limits (profiles, sessions) were enforced only in the Next.js
-- server actions. A phone talks to PostgREST with the user's own JWT, so the
-- limits have to live in Postgres or they are not limits. This migration:
--   1. grants table privileges explicitly (Data API default grants are opt-in
--      on newer Supabase projects),
--   2. adds App Store columns beside the Stripe ones (each writer owns its own
--      columns, so neither can clobber the other),
--   3. defines ONE entitlement rule in SQL (user_is_pro) used by the triggers
--      and by my_entitlement(), mirrored by getPlan() on the web,
--   4. enforces plan limits with triggers,
--   5. adds create_session_with_results() so a test and its results are saved
--      in one transaction,
--   6. adds input-size constraints that used to exist only in zod.
-- Idempotent: safe to run twice.

-- ---------------------------------------------------------------- 1. grants
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles, public.test_sessions, public.test_results, public.life_events,
  public.custom_ranges, public.unit_preferences, public.biomarkers
  to authenticated;
grant select, insert, delete on public.watched_biomarkers to authenticated;
grant select on public.subscriptions to authenticated;
-- Signed-out clients get nothing. RLS already denies them; this removes the
-- privilege as well.
revoke all on
  public.profiles, public.test_sessions, public.test_results, public.life_events,
  public.custom_ranges, public.unit_preferences, public.biomarkers,
  public.watched_biomarkers, public.subscriptions, public.stripe_events
  from anon;

-- ------------------------------------------------- 2. App Store subscription
alter table public.subscriptions
  add column if not exists app_store_original_transaction_id text,
  add column if not exists app_store_product_id text,
  add column if not exists app_store_status text,
  add column if not exists app_store_expires_at timestamptz,
  add column if not exists app_store_auto_renew boolean,
  add column if not exists app_store_environment text,
  add column if not exists app_store_updated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_app_store_status_check') then
    alter table public.subscriptions add constraint subscriptions_app_store_status_check
      check (app_store_status in ('active', 'grace', 'billing_retry', 'expired', 'revoked'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_app_store_environment_check') then
    alter table public.subscriptions add constraint subscriptions_app_store_environment_check
      check (app_store_environment in ('Production', 'Sandbox'));
  end if;
end $$;

-- One Apple subscription belongs to exactly one bbiom account.
create unique index if not exists subscriptions_app_store_otid_key
  on public.subscriptions (app_store_original_transaction_id)
  where app_store_original_transaction_id is not null;

-- Audit trail of App Store Server Notifications (service role only).
create table if not exists public.app_store_notifications (
  id                      text primary key,           -- notificationUUID
  notification_type       text not null,
  subtype                 text,
  original_transaction_id text,
  environment             text,
  received_at             timestamptz not null default now()
);
alter table public.app_store_notifications enable row level security;
alter table public.app_store_notifications force row level security;
revoke all on public.app_store_notifications from anon, authenticated;
grant select, insert on public.app_store_notifications to service_role;
grant select, insert, update, delete on public.subscriptions to service_role;

-- The only writer of App Store state. Called by the Edge Functions with the
-- secret key after they have asked Apple for the truth; never by a client.
--   p_user_id            the signed-in caller (iap-confirm), or null when the
--                        call comes from an App Store Server Notification
--   p_app_account_token  the UUID we attached at purchase (= the buyer's user id)
-- Returns { "result": "applied" | "conflict" | "ignored" | "unknown_user", "user_id": uuid }.
create or replace function public.apply_app_store_subscription(
  p_user_id                 uuid,
  p_app_account_token       uuid,
  p_original_transaction_id text,
  p_product_id              text,
  p_status                  text,
  p_expires_at              timestamptz,
  p_auto_renew              boolean,
  p_environment             text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner   uuid;
  v_target  uuid;
  v_current public.subscriptions%rowtype;
begin
  if p_original_transaction_id is null or btrim(p_original_transaction_id) = '' then
    raise exception 'original_transaction_id_required' using errcode = 'P0001';
  end if;

  select user_id into v_owner
  from public.subscriptions
  where app_store_original_transaction_id = p_original_transaction_id;

  if p_user_id is not null then
    -- A purchase made for one account cannot be claimed by another.
    if v_owner is not null and v_owner <> p_user_id then
      return jsonb_build_object('result', 'conflict', 'user_id', v_owner);
    end if;
    if p_app_account_token is not null and p_app_account_token <> p_user_id then
      return jsonb_build_object('result', 'conflict', 'user_id', p_app_account_token);
    end if;
    v_target := p_user_id;
  else
    v_target := coalesce(
      v_owner,
      (select id from auth.users where id = p_app_account_token)
    );
    if v_target is null then
      return jsonb_build_object('result', 'unknown_user', 'user_id', null);
    end if;
  end if;

  -- Never let news about an old, dead subscription overwrite a live one.
  select * into v_current from public.subscriptions where user_id = v_target;
  if found
     and v_current.app_store_original_transaction_id is not null
     and v_current.app_store_original_transaction_id <> p_original_transaction_id
     and v_current.app_store_status in ('active', 'grace')
     and p_status not in ('active', 'grace') then
    return jsonb_build_object('result', 'ignored', 'user_id', v_target);
  end if;

  insert into public.subscriptions as s
    (user_id, app_store_original_transaction_id, app_store_product_id, app_store_status,
     app_store_expires_at, app_store_auto_renew, app_store_environment, app_store_updated_at)
  values
    (v_target, p_original_transaction_id, p_product_id, p_status,
     p_expires_at, p_auto_renew, p_environment, now())
  on conflict (user_id) do update set
    app_store_original_transaction_id = excluded.app_store_original_transaction_id,
    app_store_product_id  = excluded.app_store_product_id,
    app_store_status      = excluded.app_store_status,
    app_store_expires_at  = excluded.app_store_expires_at,
    app_store_auto_renew  = excluded.app_store_auto_renew,
    app_store_environment = excluded.app_store_environment,
    app_store_updated_at  = now();

  return jsonb_build_object('result', 'applied', 'user_id', v_target);
end;
$$;
revoke all on function public.apply_app_store_subscription(uuid, uuid, text, text, text, timestamptz, boolean, text)
  from public, anon, authenticated;
grant execute on function public.apply_app_store_subscription(uuid, uuid, text, text, text, timestamptz, boolean, text)
  to service_role;

-- ------------------------------------------------------ 3. entitlement rule
-- The single definition of "is this user on Pro". Keep getPlan() in
-- src/lib/entitlements.ts in step with this.
--   Stripe:    plan = 'pro' and (active | trialing | past_due, or still inside
--              a paid period that was cancelled)
--   App Store: active or in billing grace period. A one-day allowance covers a
--              renewal whose notification has not arrived yet.
create or replace function public.user_is_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_user_id
      and (
        (
          s.plan = 'pro'
          and (
            s.status in ('active', 'trialing', 'past_due')
            or (s.current_period_end is not null and s.current_period_end > now())
          )
        )
        or (
          s.app_store_status in ('active', 'grace')
          and (s.app_store_expires_at is null or s.app_store_expires_at > now() - interval '1 day')
        )
      )
  );
$$;
revoke all on function public.user_is_pro(uuid) from public, anon, authenticated;

-- What the signed-in user is entitled to, for the app to render. Read-only
-- and derived: there is nothing here a client can write.
create or replace function public.my_entitlement()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as uid),
  sub as (
    select s.* from public.subscriptions s, me where s.user_id = me.uid
  ),
  flags as (
    select
      coalesce((
        select s.plan = 'pro' and (
          s.status in ('active', 'trialing', 'past_due')
          or (s.current_period_end is not null and s.current_period_end > now())
        ) from sub s
      ), false) as stripe_active,
      coalesce((
        select s.app_store_status in ('active', 'grace')
          and (s.app_store_expires_at is null or s.app_store_expires_at > now() - interval '1 day')
        from sub s
      ), false) as app_store_active
  )
  select jsonb_build_object(
    'plan', case when f.stripe_active or f.app_store_active then 'pro' else 'free' end,
    'source', case
      when f.app_store_active then 'app_store'
      when f.stripe_active then 'stripe'
      else null end,
    'stripeActive', f.stripe_active,
    'appStoreActive', f.app_store_active,
    'appStoreStatus', (select app_store_status from sub),
    'appStoreAutoRenew', (select app_store_auto_renew from sub),
    'appStoreProductId', (select app_store_product_id from sub),
    'expiresAt', case
      when f.app_store_active then (select app_store_expires_at from sub)
      when f.stripe_active then (select current_period_end from sub)
      else null end,
    'maxProfiles', case when f.stripe_active or f.app_store_active then 6 else 1 end,
    'maxSessions', case when f.stripe_active or f.app_store_active then null else 20 end,
    'profileCount', (select count(*) from public.profiles p, me where p.user_id = me.uid),
    'sessionCount', (
      select count(*)
      from public.test_sessions ts
      join public.profiles p on p.id = ts.profile_id, me
      where p.user_id = me.uid
    )
  )
  from flags f;
$$;
revoke all on function public.my_entitlement() from public, anon;
grant execute on function public.my_entitlement() to authenticated;

-- ---------------------------------------------------------- 4. plan limits
-- Free: 1 profile, 20 tests in total. Pro: 6 profiles, unlimited tests.
-- Raised as SQLSTATE P0001 with a machine-readable message the clients match.
create or replace function public.enforce_profile_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_max   integer;
begin
  -- Serialise inserts per user so two concurrent requests cannot both pass.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 1));
  select count(*) into v_count from public.profiles where user_id = new.user_id;
  v_max := case when public.user_is_pro(new.user_id) then 6 else 1 end;
  if v_count >= v_max then
    raise exception 'profile_limit'
      using errcode = 'P0001',
            detail = format('This plan allows %s profile(s).', v_max);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_limit on public.profiles;
create trigger profiles_enforce_limit
  before insert on public.profiles
  for each row execute function public.enforce_profile_limit();

create or replace function public.enforce_session_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_count integer;
begin
  select user_id into v_owner from public.profiles where id = new.profile_id;
  if v_owner is null then
    return new;  -- the foreign key / RLS check rejects it
  end if;
  if public.user_is_pro(v_owner) then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_owner::text, 2));
  select count(*) into v_count
  from public.test_sessions ts
  join public.profiles p on p.id = ts.profile_id
  where p.user_id = v_owner;
  if v_count >= 20 then
    raise exception 'session_limit'
      using errcode = 'P0001',
            detail = 'The Free plan includes 20 tests in total.';
  end if;
  return new;
end;
$$;

drop trigger if exists test_sessions_enforce_limit on public.test_sessions;
create trigger test_sessions_enforce_limit
  before insert on public.test_sessions
  for each row execute function public.enforce_session_limit();

-- ------------------------------------------- 5. save a test in one statement
-- SECURITY INVOKER: every insert below is still checked by RLS as the caller.
-- p_results is an array of
--   { "biomarker_id": text, "value": number (canonical unit), "entered_unit": text,
--     "lab_range": { "min"?: number, "max"?: number } | null,
--     "flag_on_report": "H" | "L" | null, "note": text | null }
create or replace function public.create_session_with_results(
  p_profile_id uuid,
  p_date       date,
  p_lab_name   text default null,
  p_ordered_by text default null,
  p_fasting    boolean default null,
  p_notes      text default null,
  p_results    jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  if p_results is null or jsonb_typeof(p_results) <> 'array' then
    raise exception 'invalid_results' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_results) > 200 then
    raise exception 'too_many_results' using errcode = 'P0001';
  end if;
  if p_date > current_date + 1 then
    raise exception 'date_in_future' using errcode = 'P0001';
  end if;

  insert into public.test_sessions (profile_id, date, lab_name, ordered_by, fasting, notes)
  values (
    p_profile_id, p_date,
    nullif(btrim(p_lab_name), ''), nullif(btrim(p_ordered_by), ''),
    p_fasting, nullif(btrim(p_notes), '')
  )
  returning id into v_session_id;

  insert into public.test_results
    (session_id, biomarker_id, value, entered_unit, lab_range, flag_on_report, note)
  select
    v_session_id,
    r->>'biomarker_id',
    (r->>'value')::numeric,
    r->>'entered_unit',
    case when jsonb_typeof(r->'lab_range') = 'object' then r->'lab_range' else null end,
    nullif(r->>'flag_on_report', ''),
    nullif(btrim(r->>'note'), '')
  from jsonb_array_elements(p_results) as r;

  return v_session_id;
end;
$$;
revoke all on function public.create_session_with_results(uuid, date, text, text, boolean, text, jsonb)
  from public, anon;
grant execute on function public.create_session_with_results(uuid, date, text, text, boolean, text, jsonb)
  to authenticated;

-- ------------------------------------------------------ 6. input constraints
-- NOT VALID: applied to every new or changed row, without failing the
-- migration on rows that already exist.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_name_len') then
    alter table public.profiles add constraint profiles_name_len
      check (char_length(btrim(name)) between 1 and 80) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'test_sessions_text_len') then
    alter table public.test_sessions add constraint test_sessions_text_len
      check (
        (lab_name is null or char_length(lab_name) <= 120)
        and (ordered_by is null or char_length(ordered_by) <= 120)
        and (notes is null or char_length(notes) <= 2000)
        and date >= date '1900-01-01'
      ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'test_results_sane') then
    alter table public.test_results add constraint test_results_sane
      check (
        value not in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
        and char_length(entered_unit) between 1 and 32
        and (note is null or char_length(note) <= 500)
      ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'life_events_label_len') then
    alter table public.life_events add constraint life_events_label_len
      check (char_length(btrim(label)) between 1 and 120) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'biomarkers_text_len') then
    alter table public.biomarkers add constraint biomarkers_text_len
      check (char_length(btrim(name)) between 1 and 80 and char_length(canonical_unit) between 1 and 32)
      not valid;
  end if;
end $$;
