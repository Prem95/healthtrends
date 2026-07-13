-- 0004_unit_preferences.sql
-- Per-user display-unit choice for a biomarker (e.g. show glucose in mmol/L
-- instead of the canonical mg/dL). A viewing preference only — stored values
-- stay canonical. Scoped to the user, shared across all their profiles.

create table if not exists public.unit_preferences (
  user_id      uuid not null references auth.users (id) on delete cascade,
  biomarker_id text not null references public.biomarkers (id) on delete cascade,
  display_unit text not null,
  updated_at   timestamptz not null default now(),
  primary key (user_id, biomarker_id)
);

alter table public.unit_preferences enable row level security;
alter table public.unit_preferences force row level security;

-- The user owns exactly their own rows for every operation (upsert needs both
-- insert and update).
create policy unit_prefs_select on public.unit_preferences
  for select to authenticated using (user_id = auth.uid());
create policy unit_prefs_insert on public.unit_preferences
  for insert to authenticated with check (user_id = auth.uid());
create policy unit_prefs_update on public.unit_preferences
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy unit_prefs_delete on public.unit_preferences
  for delete to authenticated using (user_id = auth.uid());
