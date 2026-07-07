-- 0001_init.sql
-- HealthTrends schema. Mirrors the canonical data model (product PRD §9.2 /
-- SaaS PRD §4.1). All health data is scoped to a user via the profile chain.

create extension if not exists "pgcrypto";

-- Enum-ish constraints kept as text + check for portability.

create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  sex           text not null default 'OTHER' check (sex in ('M', 'F', 'OTHER')),
  date_of_birth date,
  created_at    timestamptz not null default now()
);
create index if not exists profiles_user_id_idx on public.profiles (user_id);

-- Biomarker catalog. Built-ins have user_id IS NULL; custom markers belong to a user.
create table if not exists public.biomarkers (
  id             text primary key,
  name           text not null,
  aliases        text[] not null default '{}',
  category       text not null default 'OTHER'
                   check (category in ('LIPIDS','GLUCOSE','THYROID','CBC','LIVER','KIDNEY','VITAMINS','IRON','HORMONES','OTHER')),
  canonical_unit text not null,
  alt_units      jsonb not null default '[]'::jsonb,   -- [{ "unit": "mmol/L", "toCanonical": 38.67 }]
  default_ranges jsonb not null default '[]'::jsonb,   -- [{ "sex": "M", "min": 40 }, ...]
  is_custom      boolean not null default false,
  archived       boolean not null default false,
  user_id        uuid references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now()
);
create index if not exists biomarkers_user_id_idx on public.biomarkers (user_id);
create index if not exists biomarkers_category_idx on public.biomarkers (category);

create table if not exists public.test_sessions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  date       date not null,               -- collection date (no time component)
  lab_name   text,
  ordered_by text,
  fasting    boolean,
  notes      text,
  created_at timestamptz not null default now()
);
create index if not exists test_sessions_profile_id_idx on public.test_sessions (profile_id);
create index if not exists test_sessions_date_idx on public.test_sessions (date);

create table if not exists public.test_results (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.test_sessions (id) on delete cascade,
  biomarker_id text not null references public.biomarkers (id) on delete restrict,
  value        numeric not null,          -- ALWAYS canonical unit
  entered_unit text not null,
  lab_range    jsonb,                     -- { "min": 0, "max": 100 } canonical; overrides catalog
  flag_on_report text check (flag_on_report in ('H', 'L')),
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists test_results_session_id_idx on public.test_results (session_id);
create index if not exists test_results_biomarker_id_idx on public.test_results (biomarker_id);

create table if not exists public.life_events (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  date       date not null,
  label      text not null,
  created_at timestamptz not null default now()
);
create index if not exists life_events_profile_id_idx on public.life_events (profile_id);

-- Watched biomarkers pinned to the dashboard (per profile).
create table if not exists public.watched_biomarkers (
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  biomarker_id text not null references public.biomarkers (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (profile_id, biomarker_id)
);

create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text not null default 'free' check (plan in ('free', 'pro')),
  status                 text not null default 'active',
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_customer_idx on public.subscriptions (stripe_customer_id);

-- Idempotency ledger for Stripe webhooks (store processed event IDs).
create table if not exists public.stripe_events (
  id           text primary key,          -- Stripe event id (evt_...)
  type         text not null,
  processed_at timestamptz not null default now()
);
