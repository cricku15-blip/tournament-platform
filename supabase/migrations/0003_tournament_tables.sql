-- 0003_tournament_tables.sql
-- Tournaments, teams, invites, applications, pool, squads, announcements.

create table public.tournaments (
  id                       uuid primary key default gen_random_uuid(),
  organizer_id             uuid not null references public.profiles(id),
  name                     text not null check (char_length(name) between 4 and 80),
  slug                     text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sport_id                 uuid not null references public.sports(id),
  city_id                  uuid not null references public.cities(id),
  venue_name               text,
  venue_address            text,
  start_date               date,
  end_date                 date,
  format                   public.tournament_format not null default 'league',
  team_count               int not null default 4 check (team_count >= 3),
  league_legs              smallint not null default 1 check (league_legs in (1,2)),
  playoff_style            text,
  third_place_match        boolean not null default false,
  seeding_method           text not null default 'random' check (seeding_method in ('random','manual')),
  rules                    jsonb not null default '{}'::jsonb,   -- overs, points, tie-breakers, durations...
  squad_mode               public.squad_mode not null default 'direct',
  squad_min                int,
  squad_max                int,
  player_pool_cap          int,
  team_entry               public.team_entry not null default 'invite',
  team_deadline            timestamptz,
  player_deadline          timestamptz,
  allow_player_applications boolean not null default true,
  squad_lock_deadline      timestamptz,
  custom_questions         jsonb not null default '[]'::jsonb,
  visibility               public.visibility not null default 'public',
  show_contact             boolean not null default false,
  contact_phone            text,
  contact_email            text,
  entry_fee_info           text,                -- display only; the platform never collects entry fees
  prizes                   jsonb not null default '[]'::jsonb,
  individual_awards        text[] not null default '{}',
  rules_text               text,
  description_short        text check (char_length(description_short) <= 240),
  description_full         text,
  banner_url               text,
  logo_url                 text,
  status                   public.tournament_status not null default 'draft',
  pricing_tier_id          uuid references public.pricing_tiers(id),
  cancelled_reason         text,
  published_at             timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (squad_max is null or squad_min is null or squad_max >= squad_min)
);
create index tournaments_city_status_idx on public.tournaments(city_id, status);
create index tournaments_organizer_idx   on public.tournaments(organizer_id);
create index tournaments_sport_idx       on public.tournaments(sport_id);

create table public.slug_redirects (
  old_slug      text primary key,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  created_at    timestamptz not null default now()
);

create table public.auction_settings (
  tournament_id    uuid primary key references public.tournaments(id) on delete cascade,
  mode             text not null default 'live' check (mode in ('live','simple')),
  purse            int  not null default 1000 check (purse > 0),
  categories       jsonb not null default '[]'::jsonb,
  base_prices      jsonb not null default '{}'::jsonb,       -- {"Batter": 20, "Bowler": 20}
  increment_slabs  jsonb not null default '[{"from":0,"to":100,"step":5},{"from":100,"to":300,"step":10},{"from":300,"to":null,"step":25}]'::jsonb,
  reserve_rule     boolean not null default true,
  category_limits  jsonb not null default '{}'::jsonb,
  sequence_mode    text not null default 'random' check (sequence_mode in ('random','category','manual')),
  unsold_round     boolean not null default false,
  scheduled_at     timestamptz,
  status           public.auction_status not null default 'not_scheduled',
  pool_locked      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.teams (
  id                  uuid primary key default gen_random_uuid(),
  tournament_id       uuid not null references public.tournaments(id) on delete cascade,
  name                text not null check (char_length(name) between 2 and 50),
  slug                text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_url            text,
  color_primary       text,
  color_secondary     text,
  description         text,
  home_ground         text,
  manager_id          uuid references public.profiles(id),
  manager_phone       text,                -- PRIVATE
  expected_squad_size int,
  notes               text,                -- PRIVATE (application notes)
  status              public.team_status not null default 'invited',
  squad_locked        boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (tournament_id, slug)
);
create unique index teams_unique_name_per_tournament on public.teams(tournament_id, lower(name));
create unique index teams_one_team_per_manager on public.teams(tournament_id, manager_id) where manager_id is not null;
create index teams_manager_idx on public.teams(manager_id);

create table public.team_invites (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  code          text not null unique default replace(gen_random_uuid()::text, '-', ''),
  invited_by    uuid references public.profiles(id),
  expires_at    timestamptz not null default (now() + interval '14 days'),
  used_by       uuid references public.profiles(id),
  used_at       timestamptz,
  status        public.invite_status not null default 'pending',
  created_at    timestamptz not null default now()
);

create table public.player_applications (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        public.application_status not null default 'pending',
  role          text,
  experience    text check (experience in ('beginner','intermediate','advanced')),
  details       jsonb not null default '{}'::jsonb,
  contact_phone text,
  answers       jsonb not null default '{}'::jsonb,
  notes         text check (char_length(notes) <= 300),
  reviewed_by   uuid references public.profiles(id),
  reviewed_at   timestamptz,
  reject_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tournament_id, user_id)
);
create index player_apps_user_idx on public.player_applications(user_id);

create table public.pool_players (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  category      text,
  base_price    int not null default 0 check (base_price >= 0),
  sequence_no   int,
  lot_status    public.lot_status not null default 'upcoming',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create table public.squad_members (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  jersey_no     int check (jersey_no between 0 and 999),
  source        public.squad_source not null default 'direct',
  price         int check (price >= 0),           -- virtual auction points
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tournament_id, user_id)                 -- one team per player per tournament
);
create unique index squad_unique_jersey on public.squad_members(team_id, jersey_no) where jersey_no is not null;
create index squad_team_idx on public.squad_members(team_id);

create table public.announcements (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  title         text not null,
  body          text not null check (char_length(body) <= 1000),
  is_pinned     boolean not null default false,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
