-- 0002_rls.sql
-- Row Level Security. Enabled on EVERY table. Every health-data row must chain
-- to auth.uid() through the profile that owns it. Built-in biomarkers are
-- world-readable / nobody-writable. Subscriptions are SELECT-own-only; all
-- writes happen server-side with the service-role key (which bypasses RLS).

-- Helper: does the current user own this profile? SECURITY DEFINER so the check
-- does not recurse through profiles' own RLS policy.
create or replace function public.owns_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_profile_id and user_id = auth.uid()
  );
$$;
revoke all on function public.owns_profile(uuid) from public;
grant execute on function public.owns_profile(uuid) to authenticated;

-- Enable RLS everywhere.
alter table public.profiles           enable row level security;
alter table public.biomarkers         enable row level security;
alter table public.test_sessions      enable row level security;
alter table public.test_results       enable row level security;
alter table public.life_events        enable row level security;
alter table public.watched_biomarkers enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.stripe_events      enable row level security;

-- Force RLS even for table owners (defense in depth; service role still bypasses).
alter table public.profiles           force row level security;
alter table public.biomarkers         force row level security;
alter table public.test_sessions      force row level security;
alter table public.test_results       force row level security;
alter table public.life_events        force row level security;
alter table public.watched_biomarkers force row level security;
alter table public.subscriptions      force row level security;
alter table public.stripe_events      force row level security;

-- ---------------- profiles ----------------
create policy profiles_select on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy profiles_insert on public.profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy profiles_update on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_delete on public.profiles
  for delete to authenticated using (user_id = auth.uid());

-- ---------------- biomarkers ----------------
-- Read: built-ins (user_id null) by anyone authenticated; custom by owner.
create policy biomarkers_select on public.biomarkers
  for select to authenticated using (user_id is null or user_id = auth.uid());
-- Write: only your own CUSTOM markers. Built-ins can never be written.
create policy biomarkers_insert on public.biomarkers
  for insert to authenticated
  with check (user_id = auth.uid() and is_custom = true);
create policy biomarkers_update on public.biomarkers
  for update to authenticated
  using (user_id = auth.uid() and is_custom = true)
  with check (user_id = auth.uid() and is_custom = true);
create policy biomarkers_delete on public.biomarkers
  for delete to authenticated
  using (user_id = auth.uid() and is_custom = true);

-- ---------------- test_sessions ----------------
create policy sessions_select on public.test_sessions
  for select to authenticated using (public.owns_profile(profile_id));
create policy sessions_insert on public.test_sessions
  for insert to authenticated with check (public.owns_profile(profile_id));
create policy sessions_update on public.test_sessions
  for update to authenticated using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy sessions_delete on public.test_sessions
  for delete to authenticated using (public.owns_profile(profile_id));

-- ---------------- test_results (chains via session → profile → user) ----------------
create policy results_select on public.test_results
  for select to authenticated using (
    exists (
      select 1 from public.test_sessions s
      where s.id = session_id and public.owns_profile(s.profile_id)
    )
  );
create policy results_insert on public.test_results
  for insert to authenticated with check (
    exists (
      select 1 from public.test_sessions s
      where s.id = session_id and public.owns_profile(s.profile_id)
    )
  );
create policy results_update on public.test_results
  for update to authenticated using (
    exists (
      select 1 from public.test_sessions s
      where s.id = session_id and public.owns_profile(s.profile_id)
    )
  ) with check (
    exists (
      select 1 from public.test_sessions s
      where s.id = session_id and public.owns_profile(s.profile_id)
    )
  );
create policy results_delete on public.test_results
  for delete to authenticated using (
    exists (
      select 1 from public.test_sessions s
      where s.id = session_id and public.owns_profile(s.profile_id)
    )
  );

-- ---------------- life_events ----------------
create policy events_select on public.life_events
  for select to authenticated using (public.owns_profile(profile_id));
create policy events_insert on public.life_events
  for insert to authenticated with check (public.owns_profile(profile_id));
create policy events_update on public.life_events
  for update to authenticated using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy events_delete on public.life_events
  for delete to authenticated using (public.owns_profile(profile_id));

-- ---------------- watched_biomarkers ----------------
create policy watched_select on public.watched_biomarkers
  for select to authenticated using (public.owns_profile(profile_id));
create policy watched_insert on public.watched_biomarkers
  for insert to authenticated with check (public.owns_profile(profile_id));
create policy watched_delete on public.watched_biomarkers
  for delete to authenticated using (public.owns_profile(profile_id));

-- ---------------- subscriptions ----------------
-- Users can read only their own row. No INSERT/UPDATE/DELETE policies exist for
-- authenticated => the anon/authenticated clients can never write. The webhook
-- handler uses the service-role key, which bypasses RLS.
create policy subscriptions_select on public.subscriptions
  for select to authenticated using (user_id = auth.uid());

-- ---------------- stripe_events ----------------
-- No policies for authenticated => service-role only. (RLS enabled with zero
-- policies denies all access to non-bypassing roles.)
