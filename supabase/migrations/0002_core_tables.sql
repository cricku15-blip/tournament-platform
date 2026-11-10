-- 0002_core_tables.sql
-- People, places, sports, and the admin-configurable price tables.

create table public.cities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  state       text,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.sports (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  config      jsonb not null default '{}'::jsonb,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Organizer tournament fee tiers (amounts are set by the admin, never hard-coded in the app)
create table public.pricing_tiers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  min_teams     int  not null check (min_teams >= 1),
  max_teams     int  not null,
  amount_paise  int  not null check (amount_paise >= 0),
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  version       int not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (max_teams >= min_teams),
  constraint pricing_tiers_no_overlap
    exclude using gist (int4range(min_teams, max_teams, '[]') with &&) where (is_active)
);

-- Player monthly subscription plan
create table public.player_plans (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  amount_paise     int  not null check (amount_paise >= 0),
  razorpay_plan_id text,
  description      text,
  benefits         jsonb not null default '[]'::jsonb,
  grace_days       int  not null default 0 check (grace_days >= 0),
  is_active        boolean not null default true,
  version          int not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  username       text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  avatar_url     text,
  bio            text check (char_length(bio) <= 240),
  phone          text,                       -- PRIVATE. never exposed through views
  date_of_birth  date,
  city_id        uuid references public.cities(id),
  is_admin       boolean not null default false,
  status         public.user_status not null default 'active',
  onboarded_at   timestamptz,
  show_age       boolean not null default false,
  show_city      boolean not null default true,
  show_stats     boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index profiles_city_idx on public.profiles(city_id);

create table public.player_sport_profiles (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  sport_id   uuid not null references public.sports(id) on delete cascade,
  details    jsonb not null default '{}'::jsonb,   -- role, batting hand, bowling style, position, foot, jersey pref
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, sport_id)
);

create table public.city_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  city_name  text not null,
  email      text,
  status     text not null default 'open',
  created_at timestamptz not null default now()
);
