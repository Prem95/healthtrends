-- 0005_custom_ranges.sql
-- A profile's own reference range for a biomarker, overriding the catalog
-- default. Priority at read time: a lab range printed on a specific report >
-- this custom range > catalog default (by sex). Bounds are canonical units;
-- at least one bound must be present.

create table if not exists public.custom_ranges (
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  biomarker_id text not null references public.biomarkers (id) on delete cascade,
  min          numeric,
  max          numeric,
  updated_at   timestamptz not null default now(),
  primary key (profile_id, biomarker_id),
  constraint custom_ranges_has_bound check (min is not null or max is not null),
  constraint custom_ranges_order check (min is null or max is null or min <= max)
);

alter table public.custom_ranges enable row level security;
alter table public.custom_ranges force row level security;

-- Owned through the profile chain, same as every other health-data table.
create policy custom_ranges_select on public.custom_ranges
  for select to authenticated using (public.owns_profile(profile_id));
create policy custom_ranges_insert on public.custom_ranges
  for insert to authenticated with check (public.owns_profile(profile_id));
create policy custom_ranges_update on public.custom_ranges
  for update to authenticated using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy custom_ranges_delete on public.custom_ranges
  for delete to authenticated using (public.owns_profile(profile_id));
