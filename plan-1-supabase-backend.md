# Plan 1: Supabase backend (schema, scripts, Edge Functions)

**Owner of all database and server-side work.** Plans 2 to 10 build the web app on top of what this plan creates. Nothing in plans 2 to 10 should need a new table; if one does, add a new numbered migration (never edit an applied one).

**Read first:** `RULES.md` (scale and engineering rules) and `tournament-platform-web-spec.md` sections 3, 17, 20, 22, 23.

**How Claude Code should use this plan**
1. Work through Parts A to G in order. Tick each `[ ]` when done.
2. Every SQL block in Part B is a migration file. Save it with the exact path shown, in order, then apply it. Do not merge or reorder files.
3. Every code block in Part D is an Edge Function file. Save it with the exact path shown.
4. Do not invent tables, columns, or prices. Prices in the seed data are **placeholders** and must be changed by the owner before real payments.
5. After each part, run the checks in that part. If one fails, fix it before moving on.

**What this plan produces**
- 15 SQL migrations: types, tables, helper functions, triggers, row level security, public views, server functions ("the referee"), storage, indexes, seed data, stats views.
- 8 Edge Functions: tournament order, subscription create/cancel, Razorpay webhook, refunds, invoices, email, fixtures.
- Scripts: verification SQL, make-admin SQL, deploy script, env template.

**Design facts you must keep true** (see spec section 1.4)
- Roles are relationships, not account types. Admin is `profiles.is_admin` (set only by the owner).
- Browsing is global; applying is limited to the user's city (`apply_as_player` enforces it).
- Applying needs an active subscription; a lapsed subscription never removes existing registrations.
- The platform charges only: organizer tier fee (one-time order) and player monthly subscription. Entry fees and auction money are outside the platform. Auction points are virtual.
- All money amounts are integers in paise and are computed on the server from `pricing_tiers` / `player_plans`.

---

## Part A: Project setup

- [ ] **A1. Create the Supabase project** at supabase.com (region closest to your users; for India choose Mumbai (ap-south-1) if offered). Save the database password in a password manager.
- [ ] **A2. Install tools:** Node 20+, the Supabase CLI (`npm i -g supabase` or via `npx supabase`), Docker Desktop (only needed for local development).
- [ ] **A3. In the repo root run:**
```bash
supabase init
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
```
- [ ] **A4. Create the folders:** `supabase/migrations/`, `supabase/functions/_shared/`, `scripts/`.
- [ ] **A5. Create `.env.example` (Part E) and a real `.env.local` (never commit it).**
- [ ] **A6. Decide environments.** Use two Supabase projects: `dev` (free is fine) and `prod`. All migrations are applied to dev first. Never test payments against prod with live keys.

**Check A:** `supabase status` (local) or the dashboard shows the project is healthy.

---

## Part B: Migrations

Apply with `supabase db push` (applies every file in `supabase/migrations/` in order) or paste each file into **Dashboard > SQL Editor** in numeric order. Pasting is fine for the first run.

Notes for the person running them:
- Migration 0007 turns on **row level security** for every table. After it, the browser can read nothing unless a policy allows it. That is intentional.
- Migration 0014 contains **placeholder prices** (tiers and the player plan). Edit them before launch.
- Migration 0014's `alter publication ... add table` runs once; do not run it twice.
- pg_cron scheduling is a separate manual step (Part C) because the extension must be enabled in the dashboard first.

### Migration 0001: Enums and utilities

- [ ] Save as `supabase/migrations/0001_enums_and_utils.sql` and apply.

```sql
-- 0001_enums_and_utils.sql
-- Enumerated types and tiny shared utilities.

create type public.user_status        as enum ('active','suspended','banned');
create type public.tournament_status  as enum ('draft','paid','registration_open','registration_closed','auction','squads_locked','live','completed','cancelled');
create type public.tournament_format  as enum ('league','knockout','league_playoffs');
create type public.squad_mode         as enum ('auction','direct');
create type public.team_entry         as enum ('invite','open','both');
create type public.visibility         as enum ('public','unlisted');
create type public.team_status        as enum ('invited','pending','approved','rejected','withdrawn');
create type public.application_status as enum ('pending','approved','rejected','withdrawn');
create type public.invite_status      as enum ('pending','accepted','revoked','expired');
create type public.squad_source       as enum ('auction','direct','invite');
create type public.lot_status         as enum ('upcoming','on_block','sold','unsold');
create type public.auction_status     as enum ('not_scheduled','scheduled','live','paused','completed');
create type public.match_status       as enum ('scheduled','live','completed','postponed','cancelled','abandoned','walkover');
create type public.payment_status     as enum ('created','paid','failed','refunded');
create type public.subscription_status as enum ('created','active','past_due','cancelled','expired');
create type public.refund_status      as enum ('requested','approved','processed','rejected');
create type public.report_status      as enum ('open','reviewing','resolved','dismissed');

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
```

### Migration 0002: Core tables (cities, sports, prices, profiles)

- [ ] Save as `supabase/migrations/0002_core_tables.sql` and apply.

```sql
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
```

### Migration 0003: Tournament tables

- [ ] Save as `supabase/migrations/0003_tournament_tables.sql` and apply.

```sql
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
```

### Migration 0004: Auction, matches, stats and standings tables

- [ ] Save as `supabase/migrations/0004_auction_match_tables.sql` and apply.

```sql
-- 0004_auction_match_tables.sql

create table public.auction_lots (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references public.tournaments(id) on delete cascade,
  player_id       uuid not null references public.profiles(id),
  status          public.lot_status not null default 'upcoming',
  bidding_open    boolean not null default false,
  opened_at       timestamptz,
  closed_at       timestamptz,
  current_bid     int,
  current_team_id uuid references public.teams(id),
  sold_price      int,
  sold_team_id    uuid references public.teams(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tournament_id, player_id)
);

create table public.bids (
  id            uuid primary key default gen_random_uuid(),
  lot_id        uuid not null references public.auction_lots(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id       uuid not null references public.teams(id),
  amount        int  not null check (amount > 0),
  placed_by     uuid references public.profiles(id),
  placed_at     timestamptz not null default now(),
  is_undone     boolean not null default false,
  undone_by     uuid references public.profiles(id),
  undo_reason   text
);

create table public.team_purses (
  team_id       uuid primary key references public.teams(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  total         int not null check (total >= 0),
  spent         int not null default 0 check (spent >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.auction_events (
  id            bigint generated always as identity primary key,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  type          text not null,
  payload       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create table public.matches (
  id                  uuid primary key default gen_random_uuid(),
  tournament_id       uuid not null references public.tournaments(id) on delete cascade,
  stage               text not null default 'league',
  round_no            int,
  match_no            int,
  team_a_id           uuid references public.teams(id),
  team_b_id           uuid references public.teams(id),
  label_a             text,
  label_b             text,
  next_match_id       uuid references public.matches(id) on delete set null,
  next_slot           text check (next_slot in ('a','b')),
  loser_next_match_id uuid references public.matches(id) on delete set null,
  loser_next_slot     text check (loser_next_slot in ('a','b')),
  scheduled_at        timestamptz,
  venue               text,
  status              public.match_status not null default 'scheduled',
  result_type         text check (result_type in ('win','tie','draw','no_result','abandoned','walkover')),
  winner_team_id      uuid references public.teams(id),
  result_text         text,
  player_of_match_id  uuid references public.profiles(id),
  score_a             jsonb not null default '{}'::jsonb,
  score_b             jsonb not null default '{}'::jsonb,
  toss                jsonb,
  notes               text,
  fixture_published   boolean not null default false,
  result_published_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.cricket_batting (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  innings smallint not null check (innings in (1,2,3,4)),
  team_id uuid references public.teams(id),
  player_id uuid not null references public.profiles(id),
  runs int not null default 0, balls int not null default 0,
  fours int not null default 0, sixes int not null default 0,
  dismissal text, bowler_id uuid references public.profiles(id), fielder_id uuid references public.profiles(id),
  unique (match_id, innings, player_id)
);
create table public.cricket_bowling (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  innings smallint not null check (innings in (1,2,3,4)),
  team_id uuid references public.teams(id),
  player_id uuid not null references public.profiles(id),
  balls_bowled int not null default 0,
  maidens int not null default 0, runs int not null default 0, wickets int not null default 0,
  wides int not null default 0, no_balls int not null default 0,
  unique (match_id, innings, player_id)
);
create table public.cricket_fielding (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id),
  catches int not null default 0, run_outs int not null default 0, stumpings int not null default 0,
  unique (match_id, player_id)
);
create table public.football_lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  player_id uuid not null references public.profiles(id),
  is_starter boolean not null default true,
  unique (match_id, player_id)
);
create table public.football_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  type text not null check (type in ('goal','own_goal','penalty_goal','yellow','red','sub')),
  team_id uuid references public.teams(id),
  player_id uuid references public.profiles(id),
  assist_player_id uuid references public.profiles(id),
  minute int check (minute between 0 and 200),
  meta jsonb not null default '{}'::jsonb
);

create table public.standings (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  played int not null default 0, won int not null default 0, lost int not null default 0,
  tied int not null default 0, drawn int not null default 0, no_result int not null default 0,
  points int not null default 0,
  runs_for int not null default 0, balls_for int not null default 0,
  runs_against int not null default 0, balls_against int not null default 0,
  nrr numeric(8,3),
  gf int not null default 0, ga int not null default 0, gd int not null default 0,
  position int,
  updated_at timestamptz not null default now(),
  primary key (tournament_id, team_id)
);
```

### Migration 0005: Money, chat, notifications, reports tables

- [ ] Save as `supabase/migrations/0005_money_community_tables.sql` and apply.

```sql
-- 0005_money_community_tables.sql
-- Platform's own fees (organizer tier fee, player subscription) + chat, notifications, reports, ops.

create table public.tournament_payments (
  id                  uuid primary key default gen_random_uuid(),
  tournament_id       uuid not null references public.tournaments(id) on delete cascade,
  organizer_id        uuid not null references public.profiles(id),
  tier_id             uuid not null references public.pricing_tiers(id),
  kind                text not null default 'initial' check (kind in ('initial','upgrade')),
  target_team_count   int,
  amount_paise        int not null check (amount_paise >= 0),
  tax_paise           int not null default 0,
  total_paise         int not null,
  currency            text not null default 'INR',
  status              public.payment_status not null default 'created',
  razorpay_order_id   text unique,
  razorpay_payment_id text,
  invoice_url         text,
  failure_reason      text,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles(id) on delete cascade,
  plan_id                  uuid not null references public.player_plans(id),
  razorpay_subscription_id text unique,
  status                   public.subscription_status not null default 'created',
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  grace_until              timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table public.subscription_payments (
  id                  uuid primary key default gen_random_uuid(),
  subscription_id     uuid not null references public.subscriptions(id) on delete cascade,
  user_id             uuid not null references public.profiles(id) on delete cascade,
  amount_paise        int not null,
  status              public.payment_status not null default 'created',
  razorpay_payment_id text unique,
  receipt_url         text,
  paid_at             timestamptz,
  created_at          timestamptz not null default now()
);

create table public.refunds (
  id                 uuid primary key default gen_random_uuid(),
  payment_type       text not null check (payment_type in ('tournament','subscription')),
  payment_id         uuid not null,
  requested_by       uuid references public.profiles(id),
  reason             text,
  status             public.refund_status not null default 'requested',
  razorpay_refund_id text,
  reviewed_by        uuid references public.profiles(id),
  reject_reason      text,
  processed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.webhook_events (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null,
  event_id     text not null,
  type         text,
  payload      jsonb,
  processed_at timestamptz,
  error        text,
  created_at   timestamptz not null default now(),
  unique (provider, event_id)
);

create table public.chat_messages (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id       uuid not null references public.profiles(id),
  body          text not null check (char_length(body) between 1 and 500),
  reply_to      uuid references public.chat_messages(id) on delete set null,
  is_deleted    boolean not null default false,
  deleted_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);
create table public.chat_mutes (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  muted_until   timestamptz not null,
  muted_by      uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create table public.notification_settings (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  prefs      jsonb not null default '{}'::jsonb,   -- {"auction":{"inapp":true,"email":true}, ...}
  updated_at timestamptz not null default now()
);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('chat_message','profile','tournament','team','other')),
  target_id   uuid,
  reason      text not null,
  snapshot    jsonb not null default '{}'::jsonb,
  status      public.report_status not null default 'open',
  resolved_by uuid references public.profiles(id),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) <= 100),
  email      text not null check (char_length(email) <= 200),
  topic      text not null,
  message    text not null check (char_length(message) <= 2000),
  status     text not null default 'new',
  created_at timestamptz not null default now()
);
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,
  target_type text,
  target_id   uuid,
  before      jsonb,
  after       jsonb,
  reason      text,
  created_at  timestamptz not null default now()
);
create table public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
```

### Migration 0006: Helper functions, guards and counters (triggers)

- [ ] Save as `supabase/migrations/0006_helpers_triggers.sql` and apply.

```sql
-- 0006_helpers_triggers.sql
-- Helper functions used by RLS, plus guard/counter triggers.
-- All helpers are STABLE + SECURITY DEFINER so policies can call them without recursion.

alter table public.tournaments
  add column approved_team_count   int not null default 0,
  add column approved_player_count int not null default 0;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = uid), false);
$$;

create or replace function public.tournament_is_published(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tournaments t where t.id = tid and t.status not in ('draft','paid'));
$$;

create or replace function public.is_tournament_organizer(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tournaments t where t.id = tid and t.organizer_id = auth.uid());
$$;

create or replace function public.is_team_manager(team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teams t where t.id = team and t.manager_id = auth.uid());
$$;

create or replace function public.is_tournament_member(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.tournaments t where t.id = tid and t.organizer_id = auth.uid())
    or exists (select 1 from public.teams t where t.tournament_id = tid and t.manager_id = auth.uid() and t.status = 'approved')
    or exists (select 1 from public.player_applications a where a.tournament_id = tid and a.user_id = auth.uid() and a.status = 'approved')
    or exists (select 1 from public.squad_members s where s.tournament_id = tid and s.user_id = auth.uid())
  );
$$;

create or replace function public.has_active_subscription(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid and (
      s.status = 'active'
      or (s.status = 'cancelled' and s.current_period_end > now())
      or (s.status = 'past_due'  and s.grace_until > now())
    )
  );
$$;

create or replace function public.match_tournament(mid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select tournament_id from public.matches where id = mid;
$$;

create or replace function public.match_result_public(mid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches m
    where m.id = mid and m.result_published_at is not null and public.tournament_is_published(m.tournament_id)
  );
$$;

create or replace function public.tier_for_team_count(n int)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.pricing_tiers where is_active and n between min_teams and max_teams limit 1;
$$;

create or replace function public.slugify(t text)
returns text language sql immutable as $$
  select trim(both '-' from lower(regexp_replace(coalesce(t,''), '[^a-zA-Z0-9]+', '-', 'g')));
$$;

grant execute on function
  public.is_admin(uuid), public.tournament_is_published(uuid), public.is_tournament_organizer(uuid),
  public.is_team_manager(uuid), public.is_tournament_member(uuid), public.has_active_subscription(uuid),
  public.match_tournament(uuid), public.match_result_public(uuid), public.tier_for_team_count(int),
  public.slugify(text)
to anon, authenticated, service_role;

-- Internal helpers (never callable from the client)
create or replace function public._notify(p_user uuid, p_type text, p_title text, p_body text default null, p_link text default null, p_data jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id, type, title, body, link, data) values (p_user, p_type, p_title, p_body, p_link, p_data);
$$;

create or replace function public._audit(p_action text, p_target_type text, p_target_id uuid, p_before jsonb, p_after jsonb, p_reason text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_log(actor_id, action, target_type, target_id, before, after, reason)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_before, p_after, p_reason);
$$;

create or replace function public._broadcast(p_topic text, p_event text, p_payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(p_payload, p_event, p_topic, false);   -- public channel; auction is publicly watchable
exception when others then
  null;  -- never break a transaction because realtime is unavailable
end $$;

revoke all on function public._notify(uuid,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public._audit(text,text,uuid,jsonb,jsonb,text) from public, anon, authenticated;
revoke all on function public._broadcast(text,text,jsonb) from public, anon, authenticated;

-- New auth user -> profile row
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users cannot make themselves admin or un-ban themselves
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_admin := old.is_admin;
    new.status   := old.status;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Tournament guard: status, owner and paid-for fields change only through server functions
create or replace function public.tournaments_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_bypass boolean := coalesce(current_setting('app.bypass_guard', true), '') = '1';
        v_client boolean := auth.uid() is not null and not public.is_admin() and not v_bypass;
begin
  if tg_op = 'INSERT' then
    if v_client then
      new.status := 'draft'; new.organizer_id := auth.uid(); new.published_at := null; new.cancelled_reason := null;
    end if;
    new.pricing_tier_id := public.tier_for_team_count(new.team_count);
    if new.pricing_tier_id is null then raise exception 'no_pricing_tier_for_team_count'; end if;
    return new;
  end if;

  if v_client then
    if new.organizer_id is distinct from old.organizer_id then raise exception 'locked_field: organizer_id'; end if;
    if new.status is distinct from old.status then raise exception 'locked_field: status'; end if;
    if new.published_at is distinct from old.published_at then raise exception 'locked_field: published_at'; end if;
    if old.status <> 'draft' then
      if new.sport_id      is distinct from old.sport_id      then raise exception 'locked_field: sport'; end if;
      if new.city_id       is distinct from old.city_id       then raise exception 'locked_field: city'; end if;
      if new.squad_mode    is distinct from old.squad_mode    then raise exception 'locked_field: squad_mode'; end if;
      if new.team_count    is distinct from old.team_count    then raise exception 'locked_field: team_count'; end if;
      if new.pricing_tier_id is distinct from old.pricing_tier_id then raise exception 'locked_field: tier'; end if;
    end if;
  end if;
  if old.status = 'draft' and new.team_count is distinct from old.team_count then
    new.pricing_tier_id := public.tier_for_team_count(new.team_count);
    if new.pricing_tier_id is null then raise exception 'no_pricing_tier_for_team_count'; end if;
  end if;
  return new;
end $$;
create trigger tournaments_guard_trg before insert or update on public.tournaments
  for each row execute function public.tournaments_guard();

-- Keep old links working when a published tournament's slug changes
create or replace function public.tournaments_slug_redirect()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.slug is distinct from old.slug and old.status not in ('draft','paid') then
    insert into public.slug_redirects(old_slug, tournament_id) values (old.slug, new.id) on conflict (old_slug) do nothing;
  end if;
  return null;
end $$;
create trigger tournaments_slug_redirect_trg after update of slug on public.tournaments
  for each row execute function public.tournaments_slug_redirect();

-- Teams guard: managers may edit only the team profile, never status/owner/lock
create or replace function public.teams_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_bypass boolean := coalesce(current_setting('app.bypass_guard', true), '') = '1';
        v_status public.tournament_status;
begin
  if auth.uid() is null or v_bypass or public.is_admin() or public.is_tournament_organizer(old.tournament_id) then
    return new;
  end if;
  if new.status is distinct from old.status or new.tournament_id is distinct from old.tournament_id
     or new.manager_id is distinct from old.manager_id or new.squad_locked is distinct from old.squad_locked then
    raise exception 'locked_field';
  end if;
  select status into v_status from public.tournaments where id = old.tournament_id;
  if new.name is distinct from old.name and v_status not in ('draft','paid','registration_open') then
    raise exception 'team_name_locked';
  end if;
  return new;
end $$;
create trigger teams_guard_trg before update on public.teams
  for each row execute function public.teams_guard();

-- Squad size cap (covers direct adds and auction sales)
create or replace function public.check_squad_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_max int; v_count int;
begin
  select squad_max into v_max from public.tournaments where id = new.tournament_id;
  if v_max is not null then
    select count(*) into v_count from public.squad_members where team_id = new.team_id;
    if v_count >= v_max then raise exception 'squad_full'; end if;
  end if;
  return new;
end $$;
create trigger squad_limit_trg before insert on public.squad_members
  for each row execute function public.check_squad_limit();

-- Denormalised counters (cheap public lists at scale)
create or replace function public.refresh_team_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_tid uuid := case when tg_op = 'DELETE' then old.tournament_id else new.tournament_id end;
begin
  update public.tournaments set approved_team_count =
    (select count(*) from public.teams where tournament_id = v_tid and status = 'approved') where id = v_tid;
  return null;
end $$;
create trigger teams_count_trg after insert or update of status or delete on public.teams
  for each row execute function public.refresh_team_count();

create or replace function public.refresh_player_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_tid uuid := case when tg_op = 'DELETE' then old.tournament_id else new.tournament_id end;
begin
  update public.tournaments set approved_player_count =
    (select count(*) from public.player_applications where tournament_id = v_tid and status = 'approved') where id = v_tid;
  return null;
end $$;
create trigger apps_count_trg after insert or update of status or delete on public.player_applications
  for each row execute function public.refresh_player_count();

-- updated_at on every table that has the column
do $$
declare r record;
begin
  for r in
    select c.table_name from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'updated_at' and t.table_type = 'BASE TABLE'
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                   'set_updated_at_' || r.table_name, r.table_name);
  end loop;
end $$;
```

### Migration 0007: Row level security policies

- [ ] Save as `supabase/migrations/0007_rls_policies.sql` and apply.

```sql
-- 0007_rls_policies.sql
-- Default deny. Every policy wraps auth.uid() as (select auth.uid()) so Postgres evaluates it once per query.

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- Reference data
create policy cities_read  on public.cities  for select using (is_active or public.is_admin());
create policy cities_admin on public.cities  for all using (public.is_admin()) with check (public.is_admin());
create policy sports_read  on public.sports  for select using (is_active or public.is_admin());
create policy sports_admin on public.sports  for all using (public.is_admin()) with check (public.is_admin());
create policy tiers_read   on public.pricing_tiers for select using (is_active or public.is_admin());
create policy tiers_admin  on public.pricing_tiers for all using (public.is_admin()) with check (public.is_admin());
create policy plans_read   on public.player_plans for select using (is_active or public.is_admin());
create policy plans_admin  on public.player_plans for all using (public.is_admin()) with check (public.is_admin());
create policy settings_read  on public.site_settings for select using (true);
create policy settings_admin on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

-- Profiles (public data is exposed ONLY through the public_profiles view)
create policy profiles_self_read   on public.profiles for select using (id = (select auth.uid()) or public.is_admin());
create policy profiles_self_insert on public.profiles for insert with check (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update using (id = (select auth.uid()) or public.is_admin()) with check (id = (select auth.uid()) or public.is_admin());
create policy psp_read   on public.player_sport_profiles for select using (true);
create policy psp_write  on public.player_sport_profiles for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy city_req_insert on public.city_requests for insert with check ((select auth.uid()) is not null);
create policy city_req_admin  on public.city_requests for select using (public.is_admin());

-- Tournaments (public reads go through public_tournaments view)
create policy t_read on public.tournaments for select
  using (organizer_id = (select auth.uid()) or public.is_admin() or public.is_tournament_member(id));
create policy t_insert on public.tournaments for insert with check (organizer_id = (select auth.uid()));
create policy t_update on public.tournaments for update
  using (organizer_id = (select auth.uid()) or public.is_admin())
  with check (organizer_id = (select auth.uid()) or public.is_admin());
create policy t_delete on public.tournaments for delete
  using ((organizer_id = (select auth.uid()) and status = 'draft') or public.is_admin());
create policy slug_redirect_read on public.slug_redirects for select using (true);

create policy as_read  on public.auction_settings for select
  using (public.tournament_is_published(tournament_id) or public.is_tournament_organizer(tournament_id) or public.is_admin());
create policy as_write on public.auction_settings for all
  using (public.is_tournament_organizer(tournament_id) or public.is_admin())
  with check (public.is_tournament_organizer(tournament_id) or public.is_admin());

-- Teams (public reads through public_teams view; base table has phone numbers)
create policy teams_read on public.teams for select
  using (manager_id = (select auth.uid()) or public.is_tournament_organizer(tournament_id) or public.is_admin());
create policy teams_org_write on public.teams for all
  using (public.is_tournament_organizer(tournament_id) or public.is_admin())
  with check (public.is_tournament_organizer(tournament_id) or public.is_admin());
create policy teams_mgr_update on public.teams for update
  using (manager_id = (select auth.uid())) with check (manager_id = (select auth.uid()));

create policy invites_read on public.team_invites for select
  using (public.is_tournament_organizer(tournament_id) or public.is_admin());

create policy apps_read on public.player_applications for select
  using (user_id = (select auth.uid()) or public.is_tournament_organizer(tournament_id) or public.is_admin());

create policy pool_read on public.pool_players for select
  using (public.tournament_is_published(tournament_id) or public.is_tournament_organizer(tournament_id) or public.is_admin());
create policy pool_write on public.pool_players for all
  using (public.is_tournament_organizer(tournament_id) or public.is_admin())
  with check (public.is_tournament_organizer(tournament_id) or public.is_admin());

create policy squad_read on public.squad_members for select
  using (public.tournament_is_published(tournament_id) or public.is_tournament_organizer(tournament_id) or public.is_admin());
create policy squad_org_write on public.squad_members for all
  using (public.is_tournament_organizer(tournament_id) or public.is_admin())
  with check (public.is_tournament_organizer(tournament_id) or public.is_admin());

create policy ann_read on public.announcements for select
  using (public.tournament_is_published(tournament_id) or public.is_tournament_organizer(tournament_id) or public.is_admin());
create policy ann_write on public.announcements for all
  using (public.is_tournament_organizer(tournament_id) or public.is_admin())
  with check (public.is_tournament_organizer(tournament_id) or public.is_admin());

-- Auction (read-only for clients; all writes are via security-definer functions)
create policy lots_read on public.auction_lots for select using (public.tournament_is_published(tournament_id) or public.is_admin());
create policy bids_read on public.bids for select using (public.tournament_is_published(tournament_id) or public.is_admin());
create policy purses_read on public.team_purses for select using (public.tournament_is_published(tournament_id) or public.is_admin());
create policy aevents_read on public.auction_events for select using (public.tournament_is_published(tournament_id) or public.is_admin());

-- Matches and stats
create policy matches_read on public.matches for select
  using ((public.tournament_is_published(tournament_id) and fixture_published)
         or public.is_tournament_organizer(tournament_id) or public.is_admin());
create policy matches_write on public.matches for all
  using (public.is_tournament_organizer(tournament_id) or public.is_admin())
  with check (public.is_tournament_organizer(tournament_id) or public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['cricket_batting','cricket_bowling','cricket_fielding','football_lineups','football_events'] loop
    execute format('create policy %I on public.%I for select using (public.match_result_public(match_id) or public.is_tournament_organizer(public.match_tournament(match_id)) or public.is_admin())', t||'_read', t);
    execute format('create policy %I on public.%I for all using (public.is_tournament_organizer(public.match_tournament(match_id)) or public.is_admin()) with check (public.is_tournament_organizer(public.match_tournament(match_id)) or public.is_admin())', t||'_write', t);
  end loop;
end $$;

create policy standings_read on public.standings for select using (public.tournament_is_published(tournament_id) or public.is_admin());

-- Money (read own; no client writes)
create policy tpay_read on public.tournament_payments for select using (organizer_id = (select auth.uid()) or public.is_admin());
create policy subs_read on public.subscriptions for select using (user_id = (select auth.uid()) or public.is_admin());
create policy spay_read on public.subscription_payments for select using (user_id = (select auth.uid()) or public.is_admin());
create policy refunds_read on public.refunds for select using (requested_by = (select auth.uid()) or public.is_admin());
create policy refunds_insert on public.refunds for insert with check (requested_by = (select auth.uid()) and status = 'requested');
create policy refunds_admin on public.refunds for update using (public.is_admin()) with check (public.is_admin());
-- webhook_events: no policies = only the service role can touch it

-- Chat
create policy chat_read on public.chat_messages for select
  using (public.is_tournament_member(tournament_id) or public.is_admin());
create policy mutes_read on public.chat_mutes for select
  using (user_id = (select auth.uid()) or public.is_tournament_organizer(tournament_id) or public.is_admin());

-- Notifications, reports, contact, audit
create policy notif_read   on public.notifications for select using (user_id = (select auth.uid()));
create policy notif_update on public.notifications for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notif_delete on public.notifications for delete using (user_id = (select auth.uid()));
create policy nset_all on public.notification_settings for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy reports_insert on public.reports for insert with check (reporter_id = (select auth.uid()));
create policy reports_read   on public.reports for select using (reporter_id = (select auth.uid()) or public.is_admin());
create policy reports_admin  on public.reports for update using (public.is_admin()) with check (public.is_admin());
create policy contact_insert on public.contact_messages for insert with check (true);
create policy contact_admin  on public.contact_messages for select using (public.is_admin());
create policy contact_admin_u on public.contact_messages for update using (public.is_admin()) with check (public.is_admin());
create policy audit_read on public.audit_log for select using (public.is_admin());
```

### Migration 0008: Public views

- [ ] Save as `supabase/migrations/0008_views.sql` and apply.

```sql
-- 0008_views.sql
-- Public read surfaces. Views run with owner rights (they bypass RLS) and expose ONLY safe columns.

create or replace view public.public_profiles as
select p.id, p.full_name, p.username, p.avatar_url, p.bio,
       case when p.show_city then p.city_id end as city_id,
       case when p.show_age and p.date_of_birth is not null then date_part('year', age(p.date_of_birth))::int end as age,
       p.show_stats
from public.profiles p
where p.onboarded_at is not null and p.status = 'active';

create or replace view public.public_tournaments as
select t.id, t.name, t.slug, t.sport_id, s.slug as sport_slug, s.name as sport_name,
       t.city_id, c.name as city_name, c.slug as city_slug,
       t.venue_name, t.venue_address, t.start_date, t.end_date, t.format, t.team_count, t.league_legs,
       t.playoff_style, t.third_place_match, t.rules, t.squad_mode, t.squad_min, t.squad_max, t.team_entry,
       t.team_deadline, t.player_deadline, t.allow_player_applications, t.custom_questions, t.visibility,
       case when t.show_contact then t.contact_phone end as contact_phone,
       case when t.show_contact then t.contact_email end as contact_email,
       t.entry_fee_info, t.prizes, t.individual_awards, t.rules_text, t.description_short, t.description_full,
       t.banner_url, t.logo_url, t.status, t.cancelled_reason, t.published_at,
       t.approved_team_count, t.approved_player_count,
       t.organizer_id, p.full_name as organizer_name, p.avatar_url as organizer_avatar
from public.tournaments t
join public.sports s on s.id = t.sport_id
join public.cities c on c.id = t.city_id
join public.profiles p on p.id = t.organizer_id
where t.status not in ('draft','paid');

create or replace view public.public_teams as
select tm.id, tm.tournament_id, tm.name, tm.slug, tm.logo_url, tm.color_primary, tm.color_secondary,
       tm.description, tm.home_ground, tm.manager_id, tm.squad_locked,
       (select count(*) from public.squad_members sm where sm.team_id = tm.id) as squad_size
from public.teams tm
where tm.status = 'approved' and public.tournament_is_published(tm.tournament_id);

grant select on public.public_profiles, public.public_tournaments, public.public_teams to anon, authenticated;
```

### Migration 0009: Server functions: registration, teams, squads, payments

- [ ] Save as `supabase/migrations/0009_rpc_registration.sql` and apply.

```sql
-- 0009_rpc_registration.sql
-- Server-side "referee" functions for profiles, applications, teams, invites, squads, payments.
-- Error codes are the exception MESSAGE (e.g. 'city_mismatch'); the web app maps them to friendly text.

create or replace function public.change_city(p_city_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.cities where id = p_city_id and is_active) then raise exception 'city_not_found'; end if;
  update public.profiles set city_id = p_city_id where id = auth.uid();
end $$;

create or replace function public.apply_as_player(
  p_tournament_id uuid, p_role text, p_experience text,
  p_contact_phone text default null, p_notes text default null,
  p_answers jsonb default '{}'::jsonb, p_details jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_p public.profiles; v_t public.tournaments; v_existing public.player_applications; v_id uuid; v_count int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_p from public.profiles where id = v_uid;
  if v_p.status <> 'active' or v_p.onboarded_at is null then raise exception 'profile_incomplete'; end if;
  select * into v_t from public.tournaments where id = p_tournament_id;
  if not found or v_t.status <> 'registration_open' then raise exception 'registration_closed'; end if;
  if not v_t.allow_player_applications then raise exception 'applications_disabled'; end if;
  if v_t.player_deadline is not null and now() > v_t.player_deadline then raise exception 'registration_closed'; end if;
  if v_p.city_id is distinct from v_t.city_id then raise exception 'city_mismatch'; end if;
  if not public.has_active_subscription(v_uid) then raise exception 'subscription_required'; end if;
  if exists (select 1 from public.squad_members where tournament_id = p_tournament_id and user_id = v_uid) then raise exception 'already_in_squad'; end if;
  if v_t.player_pool_cap is not null then
    select count(*) into v_count from public.player_applications where tournament_id = p_tournament_id and status in ('pending','approved');
    if v_count >= v_t.player_pool_cap then raise exception 'pool_full'; end if;
  end if;

  select * into v_existing from public.player_applications where tournament_id = p_tournament_id and user_id = v_uid for update;
  if found then
    if v_existing.status <> 'withdrawn' then raise exception 'already_applied'; end if;
    update public.player_applications set status = 'pending', role = p_role, experience = p_experience, contact_phone = p_contact_phone,
      notes = p_notes, answers = p_answers, details = p_details, reviewed_by = null, reviewed_at = null, reject_reason = null
    where id = v_existing.id returning id into v_id;
  else
    insert into public.player_applications(tournament_id, user_id, role, experience, contact_phone, notes, answers, details)
    values (p_tournament_id, v_uid, p_role, p_experience, p_contact_phone, p_notes, p_answers, p_details) returning id into v_id;
  end if;
  perform public._notify(v_t.organizer_id, 'player_applied', 'New player application', v_p.full_name || ' applied to ' || v_t.name,
                         '/organizer/tournaments/' || v_t.id || '?tab=applications');
  return v_id;
end $$;

create or replace function public.withdraw_application(p_application_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a public.player_applications; t public.tournaments;
begin
  select * into a from public.player_applications where id = p_application_id for update;
  if not found or a.user_id <> auth.uid() then raise exception 'forbidden'; end if;
  if a.status not in ('pending','approved') then raise exception 'cannot_withdraw'; end if;
  select * into t from public.tournaments where id = a.tournament_id;
  if exists (select 1 from public.squad_members where tournament_id = a.tournament_id and user_id = a.user_id) then raise exception 'already_in_squad'; end if;
  if exists (select 1 from public.auction_settings where tournament_id = a.tournament_id and pool_locked) then raise exception 'pool_locked'; end if;
  update public.player_applications set status = 'withdrawn' where id = a.id;
  delete from public.pool_players where tournament_id = a.tournament_id and user_id = a.user_id and lot_status = 'upcoming';
end $$;

create or replace function public.review_application(p_application_id uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare a public.player_applications; t public.tournaments; v_base int;
begin
  select * into a from public.player_applications where id = p_application_id for update;
  if not found then raise exception 'not_found'; end if;
  select * into t from public.tournaments where id = a.tournament_id;
  if not (t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'forbidden'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_decision'; end if;
  if a.status <> 'pending' then raise exception 'already_reviewed'; end if;
  if p_decision = 'approved' and exists (select 1 from public.auction_settings where tournament_id = t.id and pool_locked) then raise exception 'pool_locked'; end if;
  update public.player_applications
     set status = p_decision::public.application_status, reviewed_by = auth.uid(), reviewed_at = now(),
         reject_reason = case when p_decision = 'rejected' then p_reason end
   where id = a.id;
  if p_decision = 'approved' and t.squad_mode = 'auction' then
    select coalesce((s.base_prices ->> a.role)::int, 0) into v_base from public.auction_settings s where s.tournament_id = t.id;
    insert into public.pool_players(tournament_id, user_id, category, base_price)
    values (t.id, a.user_id, a.role, coalesce(v_base, 0)) on conflict (tournament_id, user_id) do nothing;
  end if;
  perform public._notify(a.user_id, 'application_' || p_decision,
    case p_decision when 'approved' then 'Application approved' else 'Application not approved' end,
    t.name, '/player/applications');
end $$;

create or replace function public.publish_tournament(p_tournament_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found or not (t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'forbidden'; end if;
  if t.status <> 'paid' or not exists (select 1 from public.tournament_payments where tournament_id = t.id and status = 'paid') then
    raise exception 'payment_required';
  end if;
  if t.venue_name is null or t.start_date is null or t.end_date is null or t.description_short is null or t.squad_min is null or t.squad_max is null then
    raise exception 'tournament_incomplete';
  end if;
  if t.squad_mode = 'auction' then
    insert into public.auction_settings(tournament_id) values (t.id) on conflict do nothing;
  end if;
  perform set_config('app.bypass_guard', '1', true);
  update public.tournaments set status = 'registration_open', published_at = now() where id = t.id;
end $$;

create or replace function public.cancel_tournament(p_tournament_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments; r record;
begin
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found or not (t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'forbidden'; end if;
  if t.status in ('completed','cancelled') then raise exception 'invalid_status'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'reason_required'; end if;
  perform set_config('app.bypass_guard', '1', true);
  update public.tournaments set status = 'cancelled', cancelled_reason = p_reason where id = t.id;
  for r in select distinct u from (
      select manager_id as u from public.teams where tournament_id = t.id and manager_id is not null
      union select user_id from public.player_applications where tournament_id = t.id and status = 'approved') x
  loop
    perform public._notify(r.u, 'tournament_cancelled', 'Tournament cancelled', t.name || ': ' || p_reason, '/tournaments/' || t.slug);
  end loop;
  perform public._audit('tournament_cancelled', 'tournament', t.id, null, jsonb_build_object('reason', p_reason), p_reason);
end $$;

-- ---------- Teams and invites ----------
create or replace function public.create_team_invite(p_team_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare tm public.teams; v_code text;
begin
  select * into tm from public.teams where id = p_team_id;
  if not found or not (public.is_tournament_organizer(tm.tournament_id) or public.is_admin()) then raise exception 'forbidden'; end if;
  if tm.manager_id is not null then raise exception 'team_has_manager'; end if;
  update public.team_invites set status = 'revoked' where team_id = p_team_id and status = 'pending';
  insert into public.team_invites(team_id, tournament_id, invited_by) values (tm.id, tm.tournament_id, auth.uid()) returning code into v_code;
  return v_code;
end $$;

create or replace function public.accept_team_invite(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare i public.team_invites; tm public.teams; t public.tournaments;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into i from public.team_invites where code = p_code for update;
  if not found or i.status <> 'pending' then raise exception 'invite_invalid'; end if;
  if i.expires_at < now() then update public.team_invites set status = 'expired' where id = i.id; raise exception 'invite_invalid'; end if;
  select * into tm from public.teams where id = i.team_id for update;
  if tm.manager_id is not null then raise exception 'invite_invalid'; end if;
  select * into t from public.tournaments where id = tm.tournament_id;
  if t.status in ('completed','cancelled') then raise exception 'invite_invalid'; end if;
  begin
    perform set_config('app.bypass_guard', '1', true);
    update public.teams set manager_id = auth.uid(), status = 'approved' where id = tm.id;
  exception when unique_violation then
    raise exception 'already_manager_in_tournament';
  end;
  update public.team_invites set status = 'accepted', used_by = auth.uid(), used_at = now() where id = i.id;
  perform public._notify(t.organizer_id, 'manager_joined', 'Manager accepted invite', tm.name || ' now has a manager', '/organizer/tournaments/' || t.id || '?tab=teams');
  return tm.id;
end $$;

create or replace function public.apply_with_team(
  p_tournament_id uuid, p_name text, p_logo_url text default null, p_color_primary text default null, p_color_secondary text default null,
  p_home_ground text default null, p_manager_phone text default null, p_expected_squad_size int default null, p_notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare t public.tournaments; v_slug text; v_id uuid; v_count int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into t from public.tournaments where id = p_tournament_id;
  if not found or t.status <> 'registration_open' then raise exception 'registration_closed'; end if;
  if t.team_entry not in ('open','both') then raise exception 'team_applications_disabled'; end if;
  if t.team_deadline is not null and now() > t.team_deadline then raise exception 'registration_closed'; end if;
  select count(*) into v_count from public.teams where tournament_id = t.id and status in ('invited','pending','approved');
  if v_count >= t.team_count then raise exception 'tournament_full'; end if;
  v_slug := public.slugify(p_name);
  if v_slug = '' then raise exception 'invalid_name'; end if;
  if exists (select 1 from public.teams where tournament_id = t.id and slug = v_slug) then v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4); end if;
  begin
    insert into public.teams(tournament_id, name, slug, logo_url, color_primary, color_secondary, home_ground, manager_id, manager_phone, expected_squad_size, notes, status)
    values (t.id, p_name, v_slug, p_logo_url, p_color_primary, p_color_secondary, p_home_ground, auth.uid(), p_manager_phone, p_expected_squad_size, p_notes, 'pending')
    returning id into v_id;
  exception when unique_violation then
    raise exception 'team_name_or_manager_exists';
  end;
  perform public._notify(t.organizer_id, 'team_applied', 'New team application', p_name, '/organizer/tournaments/' || t.id || '?tab=teams');
  return v_id;
end $$;

create or replace function public.review_team(p_team_id uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare tm public.teams;
begin
  select * into tm from public.teams where id = p_team_id for update;
  if not found or not (public.is_tournament_organizer(tm.tournament_id) or public.is_admin()) then raise exception 'forbidden'; end if;
  if tm.status <> 'pending' then raise exception 'already_reviewed'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_decision'; end if;
  perform set_config('app.bypass_guard', '1', true);
  update public.teams set status = p_decision::public.team_status where id = tm.id;
  if tm.manager_id is not null then
    perform public._notify(tm.manager_id, 'team_' || p_decision, 'Team application ' || p_decision, tm.name || coalesce(': ' || p_reason, ''), '/manager/teams/' || tm.id);
  end if;
end $$;

-- ---------- Squads (direct mode) ----------
create or replace function public.add_squad_player(p_team_id uuid, p_user_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare tm public.teams; t public.tournaments; v_city uuid; v_id uuid;
begin
  select * into tm from public.teams where id = p_team_id;
  if not found then raise exception 'not_found'; end if;
  select * into t from public.tournaments where id = tm.tournament_id;
  if not (tm.manager_id = auth.uid() or t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'forbidden'; end if;
  if t.squad_mode <> 'direct' then raise exception 'not_direct_mode'; end if;
  if tm.status <> 'approved' then raise exception 'team_not_approved'; end if;
  if tm.squad_locked then raise exception 'squad_locked'; end if;
  if t.status not in ('registration_open','registration_closed') then raise exception 'squad_changes_closed'; end if;
  select city_id into v_city from public.profiles where id = p_user_id and status = 'active';
  if not found then raise exception 'player_not_found'; end if;
  -- OPEN DECISION #5 in the spec: delete the next line if direct adds may come from any city
  if v_city is distinct from t.city_id then raise exception 'city_mismatch'; end if;
  begin
    insert into public.squad_members(team_id, tournament_id, user_id, source) values (tm.id, t.id, p_user_id, 'direct') returning id into v_id;
  exception when unique_violation then raise exception 'player_already_in_a_team';
  end;
  perform public._notify(p_user_id, 'added_to_team', 'You were added to a team', tm.name || ' in ' || t.name, '/player/tournaments');
  return v_id;
end $$;

create or replace function public.remove_squad_player(p_member_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m public.squad_members; tm public.teams; t public.tournaments;
begin
  select * into m from public.squad_members where id = p_member_id;
  if not found then raise exception 'not_found'; end if;
  select * into tm from public.teams where id = m.team_id;
  select * into t from public.tournaments where id = m.tournament_id;
  if not (tm.manager_id = auth.uid() or t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'forbidden'; end if;
  if m.source = 'auction' and not (t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'auction_squad_locked'; end if;
  if tm.squad_locked and not (t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'squad_locked'; end if;
  delete from public.squad_members where id = m.id;
end $$;

create or replace function public.set_jersey_number(p_member_id uuid, p_jersey int)
returns void language plpgsql security definer set search_path = public as $$
declare m public.squad_members; tm public.teams;
begin
  select * into m from public.squad_members where id = p_member_id;
  if not found then raise exception 'not_found'; end if;
  select * into tm from public.teams where id = m.team_id;
  if not (tm.manager_id = auth.uid() or public.is_tournament_organizer(m.tournament_id) or public.is_admin()) then raise exception 'forbidden'; end if;
  begin
    update public.squad_members set jersey_no = p_jersey where id = m.id;
  exception when unique_violation then raise exception 'jersey_taken';
  end;
end $$;

create or replace function public.set_squad_lock(p_team_id uuid, p_lock boolean)
returns void language plpgsql security definer set search_path = public as $$
declare tm public.teams; t public.tournaments; v_count int; v_org boolean;
begin
  select * into tm from public.teams where id = p_team_id for update;
  if not found then raise exception 'not_found'; end if;
  select * into t from public.tournaments where id = tm.tournament_id;
  v_org := t.organizer_id = auth.uid() or public.is_admin();
  if not (tm.manager_id = auth.uid() or v_org) then raise exception 'forbidden'; end if;
  if not p_lock and not v_org then raise exception 'only_organizer_can_unlock'; end if;
  if p_lock then
    select count(*) into v_count from public.squad_members where team_id = tm.id;
    if v_count < coalesce(t.squad_min, 0) then raise exception 'squad_too_small'; end if;
  end if;
  perform set_config('app.bypass_guard', '1', true);
  update public.teams set squad_locked = p_lock where id = tm.id;
end $$;

-- ---------- Payments (service role only; called by Edge Functions) ----------
create or replace function public.confirm_tournament_payment(p_order_id text, p_payment_id text)
returns void language plpgsql security definer set search_path = public as $$
declare p public.tournament_payments;
begin
  select * into p from public.tournament_payments where razorpay_order_id = p_order_id for update;
  if not found then raise exception 'payment_not_found'; end if;
  if p.status = 'paid' then return; end if;            -- idempotent
  update public.tournament_payments set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now() where id = p.id;
  perform set_config('app.bypass_guard', '1', true);
  if p.kind = 'initial' then
    update public.tournaments set status = 'paid' where id = p.tournament_id and status = 'draft';
  else
    update public.tournaments set team_count = p.target_team_count, pricing_tier_id = p.tier_id where id = p.tournament_id;
  end if;
  perform public._notify(p.organizer_id, 'payment_confirmed', 'Payment confirmed', 'You can now publish your tournament.', '/organizer/tournaments/' || p.tournament_id);
end $$;

revoke all on function public.confirm_tournament_payment(text,text) from public, anon, authenticated;
grant execute on function public.confirm_tournament_payment(text,text) to service_role;

-- Client-callable functions: signed-in users only
do $$
declare f text;
begin
  foreach f in array array[
    'change_city(uuid)','apply_as_player(uuid,text,text,text,text,jsonb,jsonb)','withdraw_application(uuid)',
    'review_application(uuid,text,text)','publish_tournament(uuid)','cancel_tournament(uuid,text)',
    'create_team_invite(uuid)','accept_team_invite(text)',
    'apply_with_team(uuid,text,text,text,text,text,text,int,text)','review_team(uuid,text,text)',
    'add_squad_player(uuid,uuid)','remove_squad_player(uuid)','set_jersey_number(uuid,int)','set_squad_lock(uuid,boolean)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
```

### Migration 0010: Server functions: tournament flow, results, standings, chat

- [ ] Save as `supabase/migrations/0010_rpc_tournament_flow.sql` and apply.

```sql
-- 0010_rpc_tournament_flow.sql
-- Status transitions, pool locking, results, standings, announcements, chat, reports.

create or replace function public._require_organizer(p_tid uuid)
returns public.tournaments language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  select * into t from public.tournaments where id = p_tid for update;
  if not found then raise exception 'not_found'; end if;
  if not (t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'forbidden'; end if;
  return t;
end $$;
revoke all on function public._require_organizer(uuid) from public, anon, authenticated;

create or replace function public._notify_members(p_tid uuid, p_type text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id, type, title, body, link)
  select u, p_type, p_title, p_body, p_link from (
    select manager_id as u from public.teams where tournament_id = p_tid and status = 'approved' and manager_id is not null
    union select user_id from public.player_applications where tournament_id = p_tid and status = 'approved'
    union select user_id from public.squad_members where tournament_id = p_tid
  ) x where u is not null;
$$;
revoke all on function public._notify_members(uuid,text,text,text,text) from public, anon, authenticated;

create or replace function public.close_registration(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  t := public._require_organizer(p_tid);
  if t.status <> 'registration_open' then raise exception 'invalid_status'; end if;
  perform set_config('app.bypass_guard','1',true);
  update public.tournaments set status = 'registration_closed' where id = t.id;
end $$;

create or replace function public.reopen_registration(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  t := public._require_organizer(p_tid);
  if t.status <> 'registration_closed' then raise exception 'invalid_status'; end if;
  if exists (select 1 from public.auction_settings where tournament_id = t.id and (pool_locked or status <> 'not_scheduled'))
     or exists (select 1 from public.matches where tournament_id = t.id) then raise exception 'cannot_reopen'; end if;
  perform set_config('app.bypass_guard','1',true);
  update public.tournaments set status = 'registration_open' where id = t.id;
end $$;

create or replace function public.lock_squads(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments; v_bad int;
begin
  t := public._require_organizer(p_tid);
  if t.squad_mode = 'auction' then
    if t.status <> 'auction' or not exists (select 1 from public.auction_settings where tournament_id = t.id and status = 'completed') then raise exception 'auction_not_completed'; end if;
  elsif t.status <> 'registration_closed' then raise exception 'invalid_status'; end if;
  select count(*) into v_bad from public.teams tm
   where tm.tournament_id = t.id and tm.status = 'approved'
     and (select count(*) from public.squad_members sm where sm.team_id = tm.id) < coalesce(t.squad_min, 0);
  if v_bad > 0 then raise exception 'squads_incomplete'; end if;
  perform set_config('app.bypass_guard','1',true);
  update public.teams set squad_locked = true where tournament_id = t.id;
  update public.tournaments set status = 'squads_locked' where id = t.id;
  perform public._notify_members(t.id, 'squads_locked', 'Squads are locked', t.name, '/tournaments/' || t.slug);
end $$;

create or replace function public.go_live(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  t := public._require_organizer(p_tid);
  if t.status <> 'squads_locked' then raise exception 'invalid_status'; end if;
  if not exists (select 1 from public.matches where tournament_id = t.id and fixture_published) then raise exception 'fixtures_not_published'; end if;
  perform set_config('app.bypass_guard','1',true);
  update public.tournaments set status = 'live' where id = t.id;
end $$;

create or replace function public.complete_tournament(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  t := public._require_organizer(p_tid);
  if t.status <> 'live' then raise exception 'invalid_status'; end if;
  perform set_config('app.bypass_guard','1',true);
  update public.tournaments set status = 'completed' where id = t.id;
  perform public._notify_members(t.id, 'tournament_completed', 'Tournament completed', t.name, '/tournaments/' || t.slug);
end $$;

create or replace function public.lock_pool(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments; s public.auction_settings;
begin
  t := public._require_organizer(p_tid);
  if t.squad_mode <> 'auction' then raise exception 'not_auction_mode'; end if;
  if t.status not in ('registration_open','registration_closed') then raise exception 'invalid_status'; end if;
  select * into s from public.auction_settings where tournament_id = t.id for update;
  if not found then raise exception 'auction_not_configured'; end if;
  if s.pool_locked then raise exception 'pool_locked'; end if;
  if not exists (select 1 from public.pool_players where tournament_id = t.id) then raise exception 'pool_empty'; end if;

  update public.pool_players p set sequence_no = r.rn
  from (select id, row_number() over (order by
          case when s.sequence_mode = 'manual' then coalesce(sequence_no, 2147483647) end,
          case when s.sequence_mode = 'category' then category end,
          random()) as rn
        from public.pool_players where tournament_id = t.id) r
  where p.id = r.id;

  insert into public.auction_lots(tournament_id, player_id)
  select tournament_id, user_id from public.pool_players where tournament_id = t.id
  on conflict (tournament_id, player_id) do nothing;

  insert into public.team_purses(team_id, tournament_id, total)
  select id, tournament_id, s.purse from public.teams where tournament_id = t.id and status = 'approved'
  on conflict (team_id) do nothing;

  update public.auction_settings set pool_locked = true where tournament_id = t.id;
end $$;

-- ---------- Results and standings ----------
create or replace function public.recompute_standings(p_tournament_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments; v_sport text; v_pts jsonb; v_win int; v_tie int; v_draw int; v_nr int;
begin
  select * into t from public.tournaments where id = p_tournament_id;
  select slug into v_sport from public.sports where id = t.sport_id;
  v_pts  := coalesce(t.rules->'points', '{}'::jsonb);
  v_win  := coalesce((v_pts->>'win')::int,  case when v_sport = 'cricket' then 2 else 3 end);
  v_tie  := coalesce((v_pts->>'tie')::int, 1);
  v_draw := coalesce((v_pts->>'draw')::int, 1);
  v_nr   := coalesce((v_pts->>'no_result')::int, 1);

  delete from public.standings where tournament_id = p_tournament_id;
  with sides as (
    select m.team_a_id as team_id, m.winner_team_id, m.result_type, m.score_a as sf, m.score_b as sa
      from public.matches m where m.tournament_id = p_tournament_id and m.stage = 'league' and m.result_published_at is not null
    union all
    select m.team_b_id, m.winner_team_id, m.result_type, m.score_b, m.score_a
      from public.matches m where m.tournament_id = p_tournament_id and m.stage = 'league' and m.result_published_at is not null
  ), agg as (
    select team_id, count(*) as played,
      count(*) filter (where result_type in ('win','walkover') and winner_team_id = team_id) as won,
      count(*) filter (where result_type in ('win','walkover') and winner_team_id <> team_id) as lost,
      count(*) filter (where result_type = 'tie') as tied,
      count(*) filter (where result_type = 'draw') as drawn,
      count(*) filter (where result_type in ('no_result','abandoned')) as nr,
      coalesce(sum((sf->>'runs')::int), 0) as runs_for,
      coalesce(sum(coalesce((sf->>'balls_nrr')::int, (sf->>'balls')::int)), 0) as balls_for,
      coalesce(sum((sa->>'runs')::int), 0) as runs_against,
      coalesce(sum(coalesce((sa->>'balls_nrr')::int, (sa->>'balls')::int)), 0) as balls_against,
      coalesce(sum((sf->>'goals')::int), 0) as gf, coalesce(sum((sa->>'goals')::int), 0) as ga
    from sides group by team_id
  )
  insert into public.standings (tournament_id, team_id, played, won, lost, tied, drawn, no_result, points,
                                runs_for, balls_for, runs_against, balls_against, nrr, gf, ga, gd)
  select tm.tournament_id, tm.id, coalesce(a.played,0), coalesce(a.won,0), coalesce(a.lost,0), coalesce(a.tied,0), coalesce(a.drawn,0), coalesce(a.nr,0),
         coalesce(a.won,0)*v_win + coalesce(a.tied,0)*v_tie + coalesce(a.drawn,0)*v_draw + coalesce(a.nr,0)*v_nr,
         coalesce(a.runs_for,0), coalesce(a.balls_for,0), coalesce(a.runs_against,0), coalesce(a.balls_against,0),
         case when v_sport = 'cricket' and coalesce(a.balls_for,0) > 0 and coalesce(a.balls_against,0) > 0
              then round((a.runs_for::numeric / (a.balls_for / 6.0)) - (a.runs_against::numeric / (a.balls_against / 6.0)), 3) end,
         coalesce(a.gf,0), coalesce(a.ga,0), coalesce(a.gf,0) - coalesce(a.ga,0)
  from public.teams tm left join agg a on a.team_id = tm.id
  where tm.tournament_id = p_tournament_id and tm.status = 'approved';

  update public.standings s set position = r.rn
  from (select team_id, row_number() over (order by points desc,
          case when v_sport = 'cricket' then nrr end desc nulls last,
          case when v_sport = 'cricket' then won else gd end desc,
          case when v_sport = 'cricket' then 0 else gf end desc) as rn
        from public.standings where tournament_id = p_tournament_id) r
  where s.tournament_id = p_tournament_id and s.team_id = r.team_id;
end $$;
revoke all on function public.recompute_standings(uuid) from public, anon, authenticated;

create or replace function public.publish_match_result(p_match_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m public.matches; t public.tournaments; v_was boolean; v_loser uuid; nm public.matches;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'not_found'; end if;
  t := public._require_organizer(m.tournament_id);
  if t.status not in ('live','squads_locked') then raise exception 'invalid_status'; end if;
  if m.team_a_id is null or m.team_b_id is null then raise exception 'teams_not_set'; end if;
  if m.result_type is null then raise exception 'result_required'; end if;
  if m.result_type in ('win','walkover') and m.winner_team_id is null then raise exception 'winner_required'; end if;
  v_was := m.result_published_at is not null;

  if m.winner_team_id is not null then
    v_loser := case when m.winner_team_id = m.team_a_id then m.team_b_id else m.team_a_id end;
    if m.next_match_id is not null then
      select * into nm from public.matches where id = m.next_match_id for update;
      if nm.result_published_at is not null
         and (case m.next_slot when 'a' then nm.team_a_id else nm.team_b_id end) is distinct from m.winner_team_id then
        raise exception 'next_match_already_played';
      end if;
      update public.matches set team_a_id = case when m.next_slot = 'a' then m.winner_team_id else team_a_id end,
                                team_b_id = case when m.next_slot = 'b' then m.winner_team_id else team_b_id end
       where id = m.next_match_id;
    end if;
    if m.loser_next_match_id is not null then
      update public.matches set team_a_id = case when m.loser_next_slot = 'a' then v_loser else team_a_id end,
                                team_b_id = case when m.loser_next_slot = 'b' then v_loser else team_b_id end
       where id = m.loser_next_match_id;
    end if;
  end if;

  update public.matches set result_published_at = now(), fixture_published = true,
         status = case when result_type = 'walkover' then 'walkover'::public.match_status else 'completed'::public.match_status end
   where id = m.id;
  if m.stage = 'league' then perform public.recompute_standings(t.id); end if;
  if v_was then
    perform public._audit('result_edited', 'match', m.id, to_jsonb(m), (select to_jsonb(x) from public.matches x where x.id = m.id));
  end if;
end $$;

create or replace function public.set_match_live(p_match_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m public.matches;
begin
  select * into m from public.matches where id = p_match_id;
  if not found then raise exception 'not_found'; end if;
  perform public._require_organizer(m.tournament_id);
  if m.team_a_id is null or m.team_b_id is null then raise exception 'teams_not_set'; end if;
  update public.matches set status = 'live' where id = m.id and result_published_at is null;
end $$;

-- ---------- Announcements ----------
create or replace function public.post_announcement(p_tid uuid, p_title text, p_body text, p_pin boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare t public.tournaments; v_id uuid;
begin
  t := public._require_organizer(p_tid);
  if p_pin then update public.announcements set is_pinned = false where tournament_id = t.id; end if;
  insert into public.announcements(tournament_id, title, body, is_pinned, created_by) values (t.id, p_title, p_body, p_pin, auth.uid()) returning id into v_id;
  perform public._notify_members(t.id, 'announcement', p_title, left(p_body, 140), '/tournaments/' || t.slug);
  return v_id;
end $$;

-- ---------- Chat ----------
create or replace function public.post_chat_message(p_tid uuid, p_body text, p_reply_to uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_body text := trim(p_body);
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not (public.is_tournament_member(p_tid) or public.is_admin()) then raise exception 'not_a_member'; end if;
  if v_body is null or char_length(v_body) < 1 or char_length(v_body) > 500 then raise exception 'invalid_message'; end if;
  if exists (select 1 from public.chat_mutes where tournament_id = p_tid and user_id = auth.uid() and muted_until > now()) then raise exception 'muted'; end if;
  if exists (select 1 from public.chat_messages where tournament_id = p_tid and user_id = auth.uid() and created_at > now() - interval '3 seconds') then raise exception 'slow_mode'; end if;
  insert into public.chat_messages(tournament_id, user_id, body, reply_to) values (p_tid, auth.uid(), v_body, p_reply_to) returning id into v_id;
  return v_id;
end $$;

create or replace function public.delete_chat_message(p_message_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.chat_messages;
begin
  select * into c from public.chat_messages where id = p_message_id;
  if not found then raise exception 'not_found'; end if;
  if not (c.user_id = auth.uid() or public.is_tournament_organizer(c.tournament_id) or public.is_admin()) then raise exception 'forbidden'; end if;
  update public.chat_messages set is_deleted = true, deleted_by = auth.uid(), body = '[deleted]' where id = c.id;
end $$;

create or replace function public.mute_chat_user(p_tid uuid, p_user uuid, p_minutes int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_tournament_organizer(p_tid) or public.is_admin()) then raise exception 'forbidden'; end if;
  if p_user = auth.uid() then raise exception 'cannot_mute_self'; end if;
  insert into public.chat_mutes(tournament_id, user_id, muted_until, muted_by)
  values (p_tid, p_user, now() + make_interval(mins => greatest(p_minutes, 1)), auth.uid())
  on conflict (tournament_id, user_id) do update set muted_until = excluded.muted_until, muted_by = excluded.muted_by;
end $$;

create or replace function public.report_content(p_target_type text, p_target_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_snap jsonb := '{}'::jsonb; v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_target_type = 'chat_message' then select to_jsonb(c) into v_snap from public.chat_messages c where c.id = p_target_id;
  elsif p_target_type = 'tournament' then select jsonb_build_object('name', name, 'slug', slug) into v_snap from public.tournaments where id = p_target_id;
  elsif p_target_type = 'profile' then select jsonb_build_object('username', username, 'name', full_name) into v_snap from public.profiles where id = p_target_id;
  end if;
  insert into public.reports(reporter_id, target_type, target_id, reason, snapshot) values (auth.uid(), p_target_type, p_target_id, left(p_reason, 500), coalesce(v_snap,'{}')) returning id into v_id;
  return v_id;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'close_registration(uuid)','reopen_registration(uuid)','lock_squads(uuid)','go_live(uuid)','complete_tournament(uuid)','lock_pool(uuid)',
    'publish_match_result(uuid)','set_match_live(uuid)','post_announcement(uuid,text,text,boolean)',
    'post_chat_message(uuid,text,uuid)','delete_chat_message(uuid)','mute_chat_user(uuid,uuid,int)','report_content(text,uuid,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
```

### Migration 0011: Server functions: live auction engine

- [ ] Save as `supabase/migrations/0011_rpc_auction.sql` and apply.

```sql
-- 0011_rpc_auction.sql
-- Live auction engine. Every bid is validated here, inside one transaction, with row locks.
-- Realtime: each state change inserts into auction_events AND broadcasts on topic 'auction:<tournament_id>'.

create or replace function public._auction_event(p_tid uuid, p_type text, p_payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.auction_events(tournament_id, type, payload) values (p_tid, p_type, p_payload);
  perform public._broadcast('auction:' || p_tid::text, p_type, p_payload);
end $$;
revoke all on function public._auction_event(uuid,text,jsonb) from public, anon, authenticated;

create or replace function public.next_bid_amount(p_lot_id uuid)
returns int language plpgsql stable security definer set search_path = public as $$
declare l public.auction_lots; s public.auction_settings; v_base int; v_step int;
begin
  select * into l from public.auction_lots where id = p_lot_id;
  if not found then return null; end if;
  select * into s from public.auction_settings where tournament_id = l.tournament_id;
  select base_price into v_base from public.pool_players where tournament_id = l.tournament_id and user_id = l.player_id;
  if l.current_bid is null then return greatest(coalesce(v_base, 0), 1); end if;
  select (slab->>'step')::int into v_step
    from jsonb_array_elements(s.increment_slabs) slab
   where l.current_bid >= (slab->>'from')::int and ((slab->>'to') is null or l.current_bid < (slab->>'to')::int)
   order by (slab->>'from')::int desc limit 1;
  return l.current_bid + coalesce(v_step, 1);
end $$;
grant execute on function public.next_bid_amount(uuid) to anon, authenticated;

create or replace function public.schedule_auction(p_tid uuid, p_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments; s public.auction_settings;
begin
  t := public._require_organizer(p_tid);
  select * into s from public.auction_settings where tournament_id = t.id for update;
  if not found or not s.pool_locked then raise exception 'pool_not_locked'; end if;
  if s.status not in ('not_scheduled','scheduled') then raise exception 'invalid_status'; end if;
  update public.auction_settings set scheduled_at = p_at, status = 'scheduled' where tournament_id = t.id;
  perform public._notify_members(t.id, 'auction_scheduled', 'Auction scheduled', t.name || ' auction on ' || to_char(p_at at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI am'), '/tournaments/' || t.slug || '/auction');
end $$;

create or replace function public.start_auction(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments; s public.auction_settings; v_noman int;
begin
  t := public._require_organizer(p_tid);
  select * into s from public.auction_settings where tournament_id = t.id for update;
  if not found or not s.pool_locked then raise exception 'pool_not_locked'; end if;
  if s.status not in ('not_scheduled','scheduled') then raise exception 'invalid_status'; end if;
  if t.status <> 'registration_closed' then raise exception 'registration_must_be_closed'; end if;
  if (select count(*) from public.team_purses where tournament_id = t.id) < 2 then raise exception 'need_two_teams'; end if;
  select count(*) into v_noman from public.teams where tournament_id = t.id and status = 'approved' and manager_id is null;
  if v_noman > 0 then raise exception 'teams_without_manager'; end if;
  perform set_config('app.bypass_guard','1',true);
  update public.tournaments set status = 'auction' where id = t.id;
  update public.auction_settings set status = 'live' where tournament_id = t.id;
  perform public._auction_event(t.id, 'auction_started', '{}'::jsonb);
  perform public._notify_members(t.id, 'auction_live', 'Auction is live', t.name, '/tournaments/' || t.slug || '/auction/live');
end $$;

create or replace function public.pause_auction(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_organizer(p_tid);
  update public.auction_settings set status = 'paused' where tournament_id = p_tid and status = 'live';
  perform public._auction_event(p_tid, 'auction_paused', '{}'::jsonb);
end $$;

create or replace function public.resume_auction(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_organizer(p_tid);
  update public.auction_settings set status = 'live' where tournament_id = p_tid and status = 'paused';
  perform public._auction_event(p_tid, 'auction_resumed', '{}'::jsonb);
end $$;

create or replace function public.select_lot(p_tid uuid, p_player_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare l public.auction_lots; pp public.pool_players; v_name text;
begin
  perform public._require_organizer(p_tid);
  if not exists (select 1 from public.auction_settings where tournament_id = p_tid and status = 'live') then raise exception 'auction_not_live'; end if;
  if exists (select 1 from public.auction_lots where tournament_id = p_tid and status = 'on_block') then raise exception 'lot_already_on_block'; end if;
  select * into l from public.auction_lots where tournament_id = p_tid and player_id = p_player_id for update;
  if not found or l.status not in ('upcoming','unsold') then raise exception 'lot_not_available'; end if;
  update public.auction_lots set status = 'on_block', bidding_open = false, opened_at = now(), closed_at = null,
         current_bid = null, current_team_id = null where id = l.id;
  update public.pool_players set lot_status = 'on_block' where tournament_id = p_tid and user_id = p_player_id returning * into pp;
  select full_name into v_name from public.profiles where id = p_player_id;
  perform public._auction_event(p_tid, 'lot_selected', jsonb_build_object('lot_id', l.id, 'player_id', p_player_id, 'player_name', v_name,
            'category', pp.category, 'base_price', pp.base_price, 'next_bid', greatest(pp.base_price,1)));
  return l.id;
end $$;

create or replace function public.open_bidding(p_lot_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l public.auction_lots;
begin
  select * into l from public.auction_lots where id = p_lot_id for update;
  if not found then raise exception 'not_found'; end if;
  perform public._require_organizer(l.tournament_id);
  if l.status <> 'on_block' then raise exception 'lot_not_on_block'; end if;
  if not exists (select 1 from public.auction_settings where tournament_id = l.tournament_id and status = 'live') then raise exception 'auction_not_live'; end if;
  update public.auction_lots set bidding_open = true where id = l.id;
  perform public._auction_event(l.tournament_id, 'bidding_opened', jsonb_build_object('lot_id', l.id, 'next_bid', public.next_bid_amount(l.id)));
end $$;

create or replace function public.announce_lot(p_lot_id uuid, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
declare l public.auction_lots;
begin
  if p_kind not in ('going_once','going_twice') then raise exception 'invalid_kind'; end if;
  select * into l from public.auction_lots where id = p_lot_id;
  if not found then raise exception 'not_found'; end if;
  perform public._require_organizer(l.tournament_id);
  perform public._auction_event(l.tournament_id, p_kind, jsonb_build_object('lot_id', l.id));
end $$;

create or replace function public.place_bid(p_lot_id uuid, p_expected_amount int)
returns void language plpgsql security definer set search_path = public as $$
declare l public.auction_lots; t public.tournaments; s public.auction_settings; tm public.teams; pu public.team_purses;
        v_amount int; v_remaining int; v_owned int; v_cat text; v_limit int; v_owned_cat int; v_min_base int; v_need int; v_bid_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into l from public.auction_lots where id = p_lot_id for update;       -- serialises concurrent bids on this lot
  if not found then raise exception 'not_found'; end if;
  select * into s from public.auction_settings where tournament_id = l.tournament_id;
  if s.status = 'paused' then raise exception 'auction_paused'; end if;
  if s.status <> 'live' or l.status <> 'on_block' or not l.bidding_open then raise exception 'bidding_closed'; end if;
  select * into t from public.tournaments where id = l.tournament_id;
  select * into tm from public.teams where tournament_id = l.tournament_id and manager_id = auth.uid() and status = 'approved';
  if not found then raise exception 'not_a_bidder'; end if;
  select * into pu from public.team_purses where team_id = tm.id for update;

  v_amount := public.next_bid_amount(l.id);
  if p_expected_amount is distinct from v_amount then raise exception 'bid_changed'; end if;
  if l.current_team_id = tm.id then raise exception 'already_highest'; end if;
  v_remaining := pu.total - pu.spent;
  if v_amount > v_remaining then raise exception 'insufficient_purse'; end if;

  select count(*) into v_owned from public.squad_members where team_id = tm.id;
  if t.squad_max is not null and v_owned >= t.squad_max then raise exception 'squad_full'; end if;

  select category into v_cat from public.pool_players where tournament_id = l.tournament_id and user_id = l.player_id;
  v_limit := (s.category_limits ->> v_cat)::int;
  if v_limit is not null then
    select count(*) into v_owned_cat from public.squad_members sm
      join public.pool_players pp on pp.tournament_id = sm.tournament_id and pp.user_id = sm.user_id
     where sm.team_id = tm.id and pp.category = v_cat;
    if v_owned_cat >= v_limit then raise exception 'category_limit'; end if;
  end if;

  if s.reserve_rule then
    select coalesce(min(base_price), 0) into v_min_base from public.pool_players where tournament_id = l.tournament_id;
    v_need := v_min_base * greatest(coalesce(t.squad_min, 0) - v_owned - 1, 0);
    if v_remaining - v_amount < v_need then raise exception 'reserve_rule'; end if;
  end if;

  insert into public.bids(lot_id, tournament_id, team_id, amount, placed_by) values (l.id, l.tournament_id, tm.id, v_amount, auth.uid()) returning id into v_bid_id;
  update public.auction_lots set current_bid = v_amount, current_team_id = tm.id where id = l.id;
  perform public._auction_event(l.tournament_id, 'bid_placed', jsonb_build_object('lot_id', l.id, 'bid_id', v_bid_id, 'team_id', tm.id,
            'team_name', tm.name, 'amount', v_amount, 'next_bid', public.next_bid_amount(l.id)));
end $$;

create or replace function public.undo_last_bid(p_lot_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare l public.auction_lots; b public.bids; prev public.bids;
begin
  select * into l from public.auction_lots where id = p_lot_id for update;
  if not found then raise exception 'not_found'; end if;
  perform public._require_organizer(l.tournament_id);
  if coalesce(trim(p_reason),'') = '' then raise exception 'reason_required'; end if;
  if l.status <> 'on_block' then raise exception 'lot_not_on_block'; end if;
  select * into b from public.bids where lot_id = l.id and not is_undone order by placed_at desc, id desc limit 1;
  if not found then raise exception 'no_bid_to_undo'; end if;
  update public.bids set is_undone = true, undone_by = auth.uid(), undo_reason = p_reason where id = b.id;
  select * into prev from public.bids where lot_id = l.id and not is_undone order by placed_at desc, id desc limit 1;
  update public.auction_lots set current_bid = prev.amount, current_team_id = prev.team_id where id = l.id;
  perform public._auction_event(l.tournament_id, 'bid_undone', jsonb_build_object('lot_id', l.id, 'bid_id', b.id, 'current_bid', prev.amount,
            'team_id', prev.team_id, 'next_bid', public.next_bid_amount(l.id)));
  perform public._audit('bid_undone', 'bid', b.id, to_jsonb(b), null, p_reason);
end $$;

create or replace function public.close_lot_sold(p_lot_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l public.auction_lots; tm public.teams;
begin
  select * into l from public.auction_lots where id = p_lot_id for update;
  if not found then raise exception 'not_found'; end if;
  perform public._require_organizer(l.tournament_id);
  if l.status <> 'on_block' then raise exception 'lot_not_on_block'; end if;
  if l.current_bid is null then raise exception 'no_bids'; end if;
  select * into tm from public.teams where id = l.current_team_id;
  update public.auction_lots set status = 'sold', bidding_open = false, closed_at = now(), sold_price = l.current_bid, sold_team_id = l.current_team_id where id = l.id;
  update public.pool_players set lot_status = 'sold' where tournament_id = l.tournament_id and user_id = l.player_id;
  insert into public.squad_members(team_id, tournament_id, user_id, source, price) values (l.current_team_id, l.tournament_id, l.player_id, 'auction', l.current_bid);
  update public.team_purses set spent = spent + l.current_bid where team_id = l.current_team_id;
  perform public._auction_event(l.tournament_id, 'lot_sold', jsonb_build_object('lot_id', l.id, 'player_id', l.player_id, 'team_id', tm.id, 'team_name', tm.name, 'price', l.current_bid));
  perform public._notify(l.player_id, 'auction_sold', 'You were picked!', tm.name || ' picked you for ' || l.current_bid || ' points', '/player/tournaments');
end $$;

create or replace function public.close_lot_unsold(p_lot_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l public.auction_lots;
begin
  select * into l from public.auction_lots where id = p_lot_id for update;
  if not found then raise exception 'not_found'; end if;
  perform public._require_organizer(l.tournament_id);
  if l.status <> 'on_block' then raise exception 'lot_not_on_block'; end if;
  update public.auction_lots set status = 'unsold', bidding_open = false, closed_at = now(), current_bid = null, current_team_id = null where id = l.id;
  update public.pool_players set lot_status = 'unsold' where tournament_id = l.tournament_id and user_id = l.player_id;
  perform public._auction_event(l.tournament_id, 'lot_unsold', jsonb_build_object('lot_id', l.id, 'player_id', l.player_id));
end $$;

create or replace function public.end_auction(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  t := public._require_organizer(p_tid);
  if exists (select 1 from public.auction_lots where tournament_id = t.id and status = 'on_block') then raise exception 'lot_on_block'; end if;
  update public.auction_lots set status = 'unsold' where tournament_id = t.id and status = 'upcoming';
  update public.pool_players set lot_status = 'unsold' where tournament_id = t.id and lot_status = 'upcoming';
  update public.auction_settings set status = 'completed' where tournament_id = t.id and status in ('live','paused');
  perform public._auction_event(t.id, 'auction_ended', '{}'::jsonb);
  perform public._notify_members(t.id, 'auction_completed', 'Auction completed', t.name, '/tournaments/' || t.slug || '/auction');
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'schedule_auction(uuid,timestamptz)','start_auction(uuid)','pause_auction(uuid)','resume_auction(uuid)','select_lot(uuid,uuid)',
    'open_bidding(uuid)','announce_lot(uuid,text)','place_bid(uuid,int)','undo_last_bid(uuid,text)','close_lot_sold(uuid)',
    'close_lot_unsold(uuid)','end_auction(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
```

### Migration 0012: Storage buckets and policies

- [ ] Save as `supabase/migrations/0012_storage.sql` and apply.

```sql
-- 0012_storage.sql
-- Buckets: avatars, team-logos, tournament-banners (public read), invoices (private).
-- Upload path rule: <auth.uid()>/<filename>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',            'avatars',            true,  5242880, array['image/jpeg','image/png','image/webp']),
  ('team-logos',         'team-logos',         true,  2097152, array['image/jpeg','image/png','image/webp']),
  ('tournament-banners', 'tournament-banners', true,  5242880, array['image/jpeg','image/png','image/webp']),
  ('invoices',           'invoices',           false, 2097152, array['application/pdf','text/html'])
on conflict (id) do nothing;

create policy "public read images" on storage.objects for select
  using (bucket_id in ('avatars','team-logos','tournament-banners'));

create policy "users upload own images" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','team-logos','tournament-banners') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users update own images" on storage.objects for update to authenticated
  using (bucket_id in ('avatars','team-logos','tournament-banners') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete own images" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars','team-logos','tournament-banners') and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "owner reads own invoices" on storage.objects for select to authenticated
  using (bucket_id = 'invoices' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
-- invoices are written only by the service role (Edge Function)
```

### Migration 0013: Indexes

- [ ] Save as `supabase/migrations/0013_indexes.sql` and apply.

```sql
-- 0013_indexes.sql
-- Indexes for every foreign key and every hot query path (sized for 10-15k users and growth).

create extension if not exists pg_trgm with schema extensions;

create index tournaments_public_idx     on public.tournaments (city_id, status, start_date) where status not in ('draft','paid');
create index tournaments_status_idx     on public.tournaments (status, start_date);
create index tournaments_name_trgm      on public.tournaments using gin (name extensions.gin_trgm_ops);
create index profiles_name_trgm         on public.profiles using gin (full_name extensions.gin_trgm_ops);
create index teams_tournament_status_idx on public.teams (tournament_id, status);
create index team_invites_team_idx      on public.team_invites (team_id, status);
create index team_invites_tournament_idx on public.team_invites (tournament_id);
create index player_apps_tournament_idx on public.player_applications (tournament_id, status, created_at desc);
create index pool_tournament_idx        on public.pool_players (tournament_id, lot_status, sequence_no);
create index pool_user_idx              on public.pool_players (user_id);
create index squad_tournament_idx       on public.squad_members (tournament_id);
create index squad_user_idx             on public.squad_members (user_id);
create index announcements_tournament_idx on public.announcements (tournament_id, created_at desc);
create index lots_tournament_idx        on public.auction_lots (tournament_id, status);
create index lots_player_idx            on public.auction_lots (player_id);
create index bids_lot_idx               on public.bids (lot_id, placed_at desc);
create index bids_tournament_idx        on public.bids (tournament_id);
create index bids_team_idx              on public.bids (team_id);
create index purses_tournament_idx      on public.team_purses (tournament_id);
create index auction_events_tid_idx     on public.auction_events (tournament_id, id);
create index matches_tournament_idx     on public.matches (tournament_id, stage, scheduled_at);
create index matches_team_a_idx         on public.matches (team_a_id);
create index matches_team_b_idx         on public.matches (team_b_id);
create index cricket_bat_match_idx      on public.cricket_batting (match_id);
create index cricket_bat_player_idx     on public.cricket_batting (player_id);
create index cricket_bowl_match_idx     on public.cricket_bowling (match_id);
create index cricket_bowl_player_idx    on public.cricket_bowling (player_id);
create index cricket_field_player_idx   on public.cricket_fielding (player_id);
create index football_lineups_match_idx on public.football_lineups (match_id);
create index football_events_match_idx  on public.football_events (match_id);
create index football_events_player_idx on public.football_events (player_id);
create index chat_tournament_idx        on public.chat_messages (tournament_id, created_at desc);
create index notifications_user_idx     on public.notifications (user_id, created_at desc);
create index notifications_unread_idx   on public.notifications (user_id) where read_at is null;
create index subs_user_idx              on public.subscriptions (user_id, status);
create index spay_user_idx              on public.subscription_payments (user_id, created_at desc);
create index tpay_tournament_idx        on public.tournament_payments (tournament_id);
create index tpay_organizer_idx         on public.tournament_payments (organizer_id);
create index reports_status_idx         on public.reports (status, created_at desc);
create index audit_created_idx          on public.audit_log (created_at desc);
create index audit_target_idx           on public.audit_log (target_type, target_id);
create index webhook_created_idx        on public.webhook_events (created_at);
create index psp_sport_idx              on public.player_sport_profiles (sport_id);
```

### Migration 0014: Seed data, realtime, housekeeping function

- [ ] Save as `supabase/migrations/0014_seed_realtime_cron.sql` and apply.

```sql
-- 0014_seed_realtime_cron.sql

-- ---------- Seed data ----------
insert into public.cities (name, state, slug, sort_order) values
  ('Raipur','Chhattisgarh','raipur',1), ('Bhilai','Chhattisgarh','bhilai',2), ('Durg','Chhattisgarh','durg',3),
  ('Bilaspur','Chhattisgarh','bilaspur',4), ('Korba','Chhattisgarh','korba',5), ('Rajnandgaon','Chhattisgarh','rajnandgaon',6)
on conflict (slug) do nothing;

insert into public.sports (slug, name, config) values
('cricket','Cricket', $json${
  "squad": {"players_per_side_default": 11, "players_per_side_min": 6, "players_per_side_max": 11, "squad_max_limit": 25},
  "roles": ["Batter","Bowler","All-rounder","Wicket-keeper"],
  "profile_fields": [
    {"key":"batting_hand","label":"Batting hand","type":"select","options":["Right","Left"]},
    {"key":"bowling_style","label":"Bowling style","type":"select","options":["Right-arm fast","Right-arm medium","Right-arm off spin","Right-arm leg spin","Left-arm fast","Left-arm medium","Left-arm orthodox","Left-arm wrist spin","None"]}
  ],
  "match_formats": [
    {"key":"t10","label":"T10","overs":10},{"key":"t20","label":"T20","overs":20},
    {"key":"odi","label":"50 overs","overs":50},{"key":"custom","label":"Custom overs","overs":null}
  ],
  "ball_types": ["Tennis ball","Leather","Other"],
  "points": {"win":2,"tie":1,"no_result":1,"loss":0},
  "tiebreakers": ["nrr","head_to_head","wins"],
  "default_categories": ["Batter","Bowler","All-rounder","Wicket-keeper"],
  "leaderboards": ["most_runs","highest_score","most_wickets","best_bowling","best_strike_rate","best_economy","most_sixes","most_catches"]
}$json$::jsonb),
('football','Football', $json${
  "squad": {"players_per_side_default": 11, "players_per_side_min": 5, "players_per_side_max": 11, "squad_max_limit": 25},
  "roles": ["Goalkeeper","Defender","Midfielder","Forward"],
  "profile_fields": [
    {"key":"preferred_foot","label":"Preferred foot","type":"select","options":["Right","Left","Both"]}
  ],
  "match_formats": [
    {"key":"11","label":"11-a-side","half_minutes":45},{"key":"9","label":"9-a-side","half_minutes":30},
    {"key":"7","label":"7-a-side","half_minutes":25},{"key":"5","label":"5-a-side","half_minutes":15}
  ],
  "points": {"win":3,"draw":1,"loss":0},
  "tiebreakers": ["goal_difference","goals_for","head_to_head","fair_play"],
  "default_categories": ["Goalkeeper","Defender","Midfielder","Forward"],
  "leaderboards": ["top_scorers","most_assists","yellow_cards","red_cards","clean_sheets"]
}$json$::jsonb)
on conflict (slug) do nothing;

-- !!! PLACEHOLDER PRICES. Change in Admin > Pricing (or here) BEFORE you open real payments. !!!
insert into public.pricing_tiers (name, min_teams, max_teams, amount_paise, sort_order) values
  ('3 to 4 teams', 3, 4,  50000, 1),
  ('5 to 6 teams', 5, 6, 100000, 2),
  ('7 to 8 teams', 7, 8, 150000, 3);

insert into public.player_plans (name, amount_paise, description, benefits, grace_days) values
  ('Player monthly', 9900, 'Apply to any auction or tournament in your city',
   '["Apply to any auction or tournament in your city","Public player profile and stats","Cancel any time"]'::jsonb, 3);

insert into public.site_settings (key, value) values
  ('tax',     '{"percent": 18, "prices_include_tax": false}'),
  ('flags',   '{"live_auction": true, "chat": true, "open_team_applications": true}'),
  ('banner',  '{"enabled": false, "text": "", "color": "info"}'),
  ('contact', '{"email": "support@example.com"}'),
  ('faq',     '[]')
on conflict (key) do nothing;

-- ---------- Realtime (Postgres Changes) ----------
-- The auction itself uses Broadcast (see _broadcast). These tables use Postgres Changes; RLS still applies.
alter publication supabase_realtime add table public.chat_messages, public.notifications, public.auction_events, public.auction_lots, public.team_purses;

-- ---------- Scheduled housekeeping ----------
create or replace function public.expire_stale_data()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.team_invites set status = 'expired' where status = 'pending' and expires_at < now();
  update public.tournaments set status = 'registration_closed'
   where status = 'registration_open' and (team_deadline is not null or player_deadline is not null)
     and coalesce(team_deadline, '-infinity') < now() and coalesce(player_deadline, '-infinity') < now();
  update public.subscriptions set status = 'expired'
   where (status = 'cancelled' and current_period_end < now()) or (status = 'past_due' and coalesce(grace_until, '-infinity') < now());
  delete from public.chat_mutes where muted_until < now() - interval '7 days';
  delete from public.webhook_events where created_at < now() - interval '90 days' and processed_at is not null;
end $$;
revoke all on function public.expire_stale_data() from public, anon, authenticated;
```

### Migration 0015: Leaderboard and career stats views

- [ ] Save as `supabase/migrations/0015_stats_views.sql` and apply.

```sql
-- 0015_stats_views.sql
-- Leaderboards and career stats. Views run with owner rights and only count PUBLISHED results of PUBLISHED tournaments.
-- If these get slow at scale, convert to materialized views refreshed by publish_match_result (see RULES.md section 2).

alter table public.football_lineups add column position text;   -- 'Goalkeeper','Defender','Midfielder','Forward' (needed for clean sheets)

create or replace view public.tournament_batting_stats as
select m.tournament_id, b.player_id,
       count(distinct b.match_id) as matches,
       sum(b.runs)  as runs,  sum(b.balls) as balls, sum(b.fours) as fours, sum(b.sixes) as sixes,
       max(b.runs)  as highest_score,
       count(*) filter (where b.dismissal is not null and b.dismissal <> 'Not out') as dismissals,
       case when sum(b.balls) > 0 then round(sum(b.runs) * 100.0 / sum(b.balls), 2) end as strike_rate
from public.cricket_batting b
join public.matches m on m.id = b.match_id
where m.result_published_at is not null and public.tournament_is_published(m.tournament_id)
group by m.tournament_id, b.player_id;

create or replace view public.tournament_bowling_stats as
select m.tournament_id, w.player_id,
       count(distinct w.match_id) as matches,
       sum(w.balls_bowled) as balls_bowled, sum(w.maidens) as maidens, sum(w.runs) as runs_conceded, sum(w.wickets) as wickets,
       case when sum(w.balls_bowled) > 0 then round(sum(w.runs) * 6.0 / sum(w.balls_bowled), 2) end as economy,
       (array_agg(w.wickets::text || '/' || w.runs::text order by w.wickets desc, w.runs asc))[1] as best_figures
from public.cricket_bowling w
join public.matches m on m.id = w.match_id
where m.result_published_at is not null and public.tournament_is_published(m.tournament_id)
group by m.tournament_id, w.player_id;

create or replace view public.tournament_fielding_stats as
select m.tournament_id, f.player_id, sum(f.catches) as catches, sum(f.run_outs) as run_outs, sum(f.stumpings) as stumpings
from public.cricket_fielding f
join public.matches m on m.id = f.match_id
where m.result_published_at is not null and public.tournament_is_published(m.tournament_id)
group by m.tournament_id, f.player_id;

create or replace view public.tournament_football_stats as
with pub as (
  select id, tournament_id, team_a_id, team_b_id, score_a, score_b from public.matches
  where result_published_at is not null and public.tournament_is_published(tournament_id)
), ev as (
  select p.tournament_id, e.player_id,
         count(*) filter (where e.type in ('goal','penalty_goal')) as goals,
         count(*) filter (where e.type = 'yellow') as yellow_cards,
         count(*) filter (where e.type = 'red')    as red_cards
  from public.football_events e join pub p on p.id = e.match_id where e.player_id is not null group by p.tournament_id, e.player_id
), asst as (
  select p.tournament_id, e.assist_player_id as player_id, count(*) as assists
  from public.football_events e join pub p on p.id = e.match_id
  where e.assist_player_id is not null and e.type in ('goal','penalty_goal') group by p.tournament_id, e.assist_player_id
), mp as (
  select p.tournament_id, l.player_id, count(*) as matches
  from public.football_lineups l join pub p on p.id = l.match_id group by p.tournament_id, l.player_id
), cs as (
  select p.tournament_id, l.player_id, count(*) as clean_sheets
  from public.football_lineups l join pub p on p.id = l.match_id
  where l.is_starter and l.position = 'Goalkeeper'
    and ((l.team_id = p.team_a_id and coalesce((p.score_b->>'goals')::int, 0) = 0)
      or (l.team_id = p.team_b_id and coalesce((p.score_a->>'goals')::int, 0) = 0))
  group by p.tournament_id, l.player_id
), base as (
  select tournament_id, player_id from mp union select tournament_id, player_id from ev union select tournament_id, player_id from asst
)
select base.tournament_id, base.player_id,
       coalesce(mp.matches, 0) as matches, coalesce(ev.goals, 0) as goals, coalesce(asst.assists, 0) as assists,
       coalesce(ev.yellow_cards, 0) as yellow_cards, coalesce(ev.red_cards, 0) as red_cards, coalesce(cs.clean_sheets, 0) as clean_sheets
from base
left join mp   using (tournament_id, player_id)
left join ev   using (tournament_id, player_id)
left join asst using (tournament_id, player_id)
left join cs   using (tournament_id, player_id);

create or replace view public.player_cricket_career as
select player_id, sum(matches) as matches, sum(runs) as runs, sum(balls) as balls, sum(fours) as fours, sum(sixes) as sixes, max(highest_score) as highest_score
from public.tournament_batting_stats group by player_id;

create or replace view public.player_bowling_career as
select player_id, sum(matches) as matches, sum(wickets) as wickets, sum(runs_conceded) as runs_conceded, sum(balls_bowled) as balls_bowled
from public.tournament_bowling_stats group by player_id;

create or replace view public.player_football_career as
select player_id, sum(matches) as matches, sum(goals) as goals, sum(assists) as assists, sum(yellow_cards) as yellow_cards,
       sum(red_cards) as red_cards, sum(clean_sheets) as clean_sheets
from public.tournament_football_stats group by player_id;

grant select on public.tournament_batting_stats, public.tournament_bowling_stats, public.tournament_fielding_stats,
                public.tournament_football_stats, public.player_cricket_career, public.player_bowling_career,
                public.player_football_career to anon, authenticated;
```

**Check B (run `scripts/verify-db.sql` from Part E):**
- [ ] No public table has RLS disabled.
- [ ] `select count(*) from public.cities` returns 6, `sports` returns 2, `pricing_tiers` returns 3, `player_plans` returns 1.
- [ ] Every function listed in Part F exists.

---

## Part C: After the migrations (manual dashboard steps)

- [ ] **C1. Auth > URL Configuration:** Site URL = your production URL; Redirect URLs = `http://localhost:3000/auth/callback`, your preview URL pattern, and `https://<your-domain>/auth/callback`.
- [ ] **C2. Auth > Providers:** enable **Google** (create OAuth client in Google Cloud Console; authorised redirect URI = `https://<project-ref>.supabase.co/auth/v1/callback`). Enable **Email** with magic link / OTP. **Disable** "Confirm email" only if you want instant sign-in; otherwise keep it on. Phone provider stays off for launch.
- [ ] **C3. Auth > Email:** set a custom SMTP sender (for example Resend's SMTP) before launch; the built-in sender is heavily rate-limited. Set OTP expiry to 900 seconds.
- [ ] **C4. Auth > Rate Limits:** keep defaults or tighten email sends per hour.
- [ ] **C5. Database > Extensions:** enable `pg_cron`. Then run the schedule SQL below in the SQL editor.
```sql
select cron.schedule('expire-stale-data', '*/10 * * * *', $$select public.expire_stale_data()$$);
```
- [ ] **C6. Database > Replication:** confirm `chat_messages`, `notifications`, `auction_events`, `auction_lots`, `team_purses` are in the `supabase_realtime` publication.
- [ ] **C7. Realtime settings:** keep "Allow public access" on (the auction broadcast channel is public by design; no private data is sent on it).
- [ ] **C8. Make yourself admin** (after you have signed up once through the app or the dashboard): run `scripts/make-admin.sql`.
- [ ] **C9. Storage:** confirm the four buckets exist (`avatars`, `team-logos`, `tournament-banners`, `invoices`).
- [ ] **C10. Backups:** the Free plan has no automatic backups. Before launch, upgrade to a plan with daily backups and enable point-in-time recovery if budget allows. Until then run `supabase db dump -f backup.sql` weekly.
- [ ] **C11. Secrets** for Edge Functions (Part D) must be set with `supabase secrets set`.

---

## Part D: Edge Functions

Runtime is Deno. Import URLs are pinned. Set secrets first:
```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxx RAZORPAY_WEBHOOK_SECRET=xxx \
  RESEND_API_KEY=re_xxx EMAIL_FROM="Tournaments <noreply@yourdomain.com>" ALLOWED_ORIGIN=https://yourdomain.com
```
(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.)

- [ ] **D0. `supabase/config.toml`:** add
```toml
[functions.razorpay-webhook]
verify_jwt = false

[functions.send-email]
verify_jwt = false      # protected by the service-role bearer check inside the function
```

### Shared: Supabase clients, auth helpers, CORS

- [ ] Save as `supabase/functions/_shared/clients.ts`.

```ts
// supabase/functions/_shared/clients.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

export function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
}

export async function getUser(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await adminClient().auth.getUser(token);
  return data.user ?? null;
}

export async function isAdmin(userId: string) {
  const { data } = await adminClient().from("profiles").select("is_admin").eq("id", userId).single();
  return data?.is_admin === true;
}

export function isServiceCall(req: Request) {
  return req.headers.get("Authorization") === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
}

export function handleOptions(req: Request) {
  return req.method === "OPTIONS" ? new Response("ok", { headers: corsHeaders }) : null;
}
```

### Shared: Razorpay API, signature check, tax maths

- [ ] Save as `supabase/functions/_shared/razorpay.ts`.

```ts
// supabase/functions/_shared/razorpay.ts
const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

export const razorpayKeyId = KEY_ID;

export async function rzp(path: string, method: "GET" | "POST", body?: unknown) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: "Basic " + btoa(`${KEY_ID}:${KEY_SECRET}`), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description ?? "razorpay_error");
  return data;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verifySignature(rawBody: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(hex, signature);
}

// Money maths: always integers in paise
export function withTax(amountPaise: number, percent: number, inclusive: boolean) {
  if (inclusive) {
    const tax = Math.round(amountPaise - amountPaise / (1 + percent / 100));
    return { amount: amountPaise - tax, tax, total: amountPaise };
  }
  const tax = Math.round((amountPaise * percent) / 100);
  return { amount: amountPaise, tax, total: amountPaise + tax };
}
```

### Shared: fixture algorithms (pure functions, unit-tested)

- [ ] Save as `supabase/functions/_shared/fixtures.ts`.

```ts
// supabase/functions/_shared/fixtures.ts  (pure functions, no imports, unit-testable)

export type Pair = { round: number; a: string; b: string };

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Circle method. legs=2 repeats every round with home/away swapped.
export function roundRobin(teamIds: string[], legs: 1 | 2): Pair[] {
  const arr: (string | null)[] = [...teamIds];
  if (arr.length % 2 === 1) arr.push(null);              // bye
  const n = arr.length, rounds = n - 1, out: Pair[] = [];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      if (a && b) out.push(r % 2 === 0 ? { round: r + 1, a, b } : { round: r + 1, a: b, b: a });
    }
    arr.splice(1, 0, arr.pop() as string | null);        // rotate, keep arr[0] fixed
  }
  if (legs === 2) {
    const first = [...out];
    for (const p of first) out.push({ round: p.round + rounds, a: p.b, b: p.a });
  }
  return out;
}

export function seedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const sum = order.length * 2 + 1;
    order = order.flatMap((s) => [s, sum - s]);
  }
  return order;
}

export type KONode = {
  round: number; index: number; a: string | null; b: string | null;
  bye: boolean; fromA?: KONode; fromB?: KONode; stage: string; matchNo?: number;
};

// Single elimination with byes for top seeds. `seeded` is ordered best seed first.
export function knockoutTree(seeded: string[]): { nodes: KONode[]; rounds: number } {
  const n = seeded.length;
  let size = 1; while (size < n) size *= 2;
  const rounds = Math.log2(size);
  const order = seedOrder(size);
  const stageName = (r: number) => (r === rounds ? "final" : r === rounds - 1 ? "semi" : r === rounds - 2 ? "quarter" : `round_${r}`);

  let prev: KONode[] = [];
  const nodes: KONode[] = [];
  for (let k = 0; k < size / 2; k++) {
    const a = seeded[order[2 * k] - 1] ?? null, b = seeded[order[2 * k + 1] - 1] ?? null;
    const node: KONode = { round: 1, index: k, a, b, bye: !a || !b, stage: stageName(1) };
    prev.push(node); nodes.push(node);
  }
  for (let r = 2; r <= rounds; r++) {
    const cur: KONode[] = [];
    for (let k = 0; k < prev.length / 2; k++) {
      const fa = prev[2 * k], fb = prev[2 * k + 1];
      const node: KONode = { round: r, index: k, a: fa.bye ? (fa.a ?? fa.b) : null, b: fb.bye ? (fb.a ?? fb.b) : null,
        bye: false, fromA: fa.bye ? undefined : fa, fromB: fb.bye ? undefined : fb, stage: stageName(r) };
      cur.push(node); nodes.push(node);
    }
    prev = cur;
  }
  let no = 1;
  for (const nd of nodes) if (!nd.bye) nd.matchNo = no++;
  return { nodes, rounds };
}

// 'YYYY-MM-DD' + days -> 'YYYY-MM-DD'
export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Spread matches over days/time slots (India time). One team never plays twice in a day because
// callers clamp matchesPerDay to floor(teams / 2) for league rounds.
export function scheduleSlots(count: number, startDate: string, matchesPerDay: number, times: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const day = Math.floor(i / matchesPerDay), slot = i % matchesPerDay;
    out.push(`${addDays(startDate, day)}T${times[slot % times.length] ?? "10:00"}:00+05:30`);
  }
  return out;
}
```

### create-tournament-order: organizer fee order (initial and tier upgrade)

- [ ] Save as `supabase/functions/create-tournament-order/index.ts`.

```ts
// supabase/functions/create-tournament-order/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient, getUser, json, handleOptions } from "../_shared/clients.ts";
import { rzp, razorpayKeyId, withTax } from "../_shared/razorpay.ts";

serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "not_authenticated" }, 401);
    const { tournament_id, target_team_count } = await req.json();
    const sb = adminClient();

    const { data: t } = await sb.from("tournaments")
      .select("id, name, organizer_id, status, team_count, pricing_tier_id").eq("id", tournament_id).single();
    if (!t || t.organizer_id !== user.id) return json({ error: "forbidden" }, 403);

    let kind: "initial" | "upgrade"; let teamCount: number;
    if (t.status === "draft") { kind = "initial"; teamCount = t.team_count; }
    else if (["paid", "registration_open", "registration_closed"].includes(t.status) && Number(target_team_count) > t.team_count) {
      kind = "upgrade"; teamCount = Number(target_team_count);
    } else return json({ error: "invalid_status" }, 409);

    const { data: tier } = await sb.from("pricing_tiers").select("*")
      .eq("is_active", true).lte("min_teams", teamCount).gte("max_teams", teamCount).maybeSingle();
    if (!tier) return json({ error: "no_pricing_tier_for_team_count" }, 422);

    let base = tier.amount_paise;
    if (kind === "upgrade") {
      const { data: cur } = await sb.from("pricing_tiers").select("amount_paise").eq("id", t.pricing_tier_id).single();
      base = Math.max(tier.amount_paise - (cur?.amount_paise ?? 0), 0);
    }
    const { data: taxRow } = await sb.from("site_settings").select("value").eq("key", "tax").single();
    const { amount, tax, total } = withTax(base, taxRow?.value?.percent ?? 0, taxRow?.value?.prices_include_tax ?? false);
    if (total < 100) return json({ error: "amount_too_low" }, 422);          // Razorpay minimum is 1 rupee

    // Reuse a recent unpaid order for the same thing (prevents duplicate orders on double click)
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: existing } = await sb.from("tournament_payments").select("razorpay_order_id, total_paise")
      .eq("tournament_id", t.id).eq("status", "created").eq("kind", kind).eq("total_paise", total).gte("created_at", since)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (existing?.razorpay_order_id) {
      return json({ order_id: existing.razorpay_order_id, amount: total, currency: "INR", key_id: razorpayKeyId, name: t.name });
    }

    const order = await rzp("/orders", "POST", {
      amount: total, currency: "INR", receipt: `t_${t.id.slice(0, 8)}_${Date.now()}`,
      notes: { tournament_id: t.id, organizer_id: user.id, kind },
    });
    const { error } = await sb.from("tournament_payments").insert({
      tournament_id: t.id, organizer_id: user.id, tier_id: tier.id, kind, target_team_count: kind === "upgrade" ? teamCount : null,
      amount_paise: amount, tax_paise: tax, total_paise: total, razorpay_order_id: order.id,
    });
    if (error) throw error;
    return json({ order_id: order.id, amount: total, currency: "INR", key_id: razorpayKeyId, name: t.name });
  } catch (e) {
    console.error("create-tournament-order", e);
    return json({ error: "server_error" }, 500);
  }
});
```

### create-subscription: start the player monthly subscription

- [ ] Save as `supabase/functions/create-subscription/index.ts`.

```ts
// supabase/functions/create-subscription/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient, getUser, json, handleOptions } from "../_shared/clients.ts";
import { rzp, razorpayKeyId } from "../_shared/razorpay.ts";

serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "not_authenticated" }, 401);
    const sb = adminClient();

    const { data: plan } = await sb.from("player_plans").select("*").eq("is_active", true).order("version", { ascending: false }).limit(1).maybeSingle();
    if (!plan) return json({ error: "no_active_plan" }, 422);

    const { data: current } = await sb.from("subscriptions").select("*").eq("user_id", user.id)
      .in("status", ["created", "active", "past_due", "cancelled"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (current?.status === "active" && !current.cancel_at_period_end) return json({ error: "already_subscribed" }, 409);
    // Reuse an unfinished checkout from the last 24h
    if (current?.status === "created" && Date.now() - new Date(current.created_at).getTime() < 24 * 3600 * 1000) {
      return json({ subscription_id: current.razorpay_subscription_id, key_id: razorpayKeyId });
    }

    let planId = plan.razorpay_plan_id as string | null;
    if (!planId) {
      const p = await rzp("/plans", "POST", {
        period: "monthly", interval: 1,
        item: { name: plan.name, amount: plan.amount_paise, currency: "INR", description: plan.description ?? "" },
      });
      planId = p.id;
      await sb.from("player_plans").update({ razorpay_plan_id: planId }).eq("id", plan.id);
    }

    // Resuming after cancel: new subscription starts when the paid period ends
    const startAt = current?.status === "cancelled" && current.current_period_end && new Date(current.current_period_end) > new Date()
      ? Math.floor(new Date(current.current_period_end).getTime() / 1000) : undefined;

    const sub = await rzp("/subscriptions", "POST", {
      plan_id: planId, total_count: 120, quantity: 1, customer_notify: 1, start_at: startAt, notes: { user_id: user.id },
    });
    const { error } = await sb.from("subscriptions").insert({ user_id: user.id, plan_id: plan.id, razorpay_subscription_id: sub.id, status: "created" });
    if (error) throw error;
    return json({ subscription_id: sub.id, key_id: razorpayKeyId });
  } catch (e) {
    console.error("create-subscription", e);
    return json({ error: "server_error" }, 500);
  }
});
```

### cancel-subscription: cancel at end of billing period

- [ ] Save as `supabase/functions/cancel-subscription/index.ts`.

```ts
// supabase/functions/cancel-subscription/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient, getUser, json, handleOptions } from "../_shared/clients.ts";
import { rzp } from "../_shared/razorpay.ts";

serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "not_authenticated" }, 401);
    const sb = adminClient();
    const { data: sub } = await sb.from("subscriptions").select("*").eq("user_id", user.id).eq("status", "active")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!sub) return json({ error: "no_active_subscription" }, 404);
    await rzp(`/subscriptions/${sub.razorpay_subscription_id}/cancel`, "POST", { cancel_at_cycle_end: 1 });
    await sb.from("subscriptions").update({ cancel_at_period_end: true }).eq("id", sub.id);
    return json({ ok: true, ends_at: sub.current_period_end });
  } catch (e) {
    console.error("cancel-subscription", e);
    return json({ error: "server_error" }, 500);
  }
});
```

### razorpay-webhook: the only place payments become "paid"

- [ ] Save as `supabase/functions/razorpay-webhook/index.ts`.

```ts
// supabase/functions/razorpay-webhook/index.ts   (deploy with verify_jwt = false)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient } from "../_shared/clients.ts";
import { verifySignature } from "../_shared/razorpay.ts";

serve(async (req) => {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const eventId = req.headers.get("x-razorpay-event-id") ?? "";
  if (!(await verifySignature(raw, signature, Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!))) {
    return new Response("invalid signature", { status: 400 });
  }
  const sb = adminClient();
  const event = JSON.parse(raw);

  // Idempotency: store first; skip events we've fully processed already
  const { data: existing } = await sb.from("webhook_events").select("id, processed_at").eq("provider", "razorpay").eq("event_id", eventId).maybeSingle();
  if (existing?.processed_at) return new Response("duplicate", { status: 200 });
  const rowId = existing?.id ?? (await sb.from("webhook_events").insert({ provider: "razorpay", event_id: eventId, type: event.event, payload: event }).select("id").single()).data?.id;

  try {
    const pay = event.payload?.payment?.entity;
    const sub = event.payload?.subscription?.entity;

    switch (event.event) {
      case "payment.captured":
      case "order.paid": {
        const orderId = pay?.order_id ?? event.payload?.order?.entity?.id;
        const paymentId = pay?.id;
        if (orderId) {
          const { data: tp } = await sb.from("tournament_payments").select("id").eq("razorpay_order_id", orderId).maybeSingle();
          if (tp) {
            const { error } = await sb.rpc("confirm_tournament_payment", { p_order_id: orderId, p_payment_id: paymentId });
            if (error) throw error;
            sb.functions.invoke("generate-invoice", { body: { payment_type: "tournament", payment_id: tp.id } }).catch(console.error);
          }
        }
        break;
      }
      case "payment.failed": {
        if (pay?.order_id) {
          await sb.from("tournament_payments").update({ status: "failed", failure_reason: pay.error_description ?? "failed" })
            .eq("razorpay_order_id", pay.order_id).eq("status", "created");
        }
        break;
      }
      case "subscription.activated":
      case "subscription.charged": {
        const { data: row } = await sb.from("subscriptions").select("id, user_id, plan_id").eq("razorpay_subscription_id", sub.id).maybeSingle();
        if (row) {
          await sb.from("subscriptions").update({
            status: "active", grace_until: null,
            current_period_end: sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null,
          }).eq("id", row.id);
          if (event.event === "subscription.charged" && pay) {
            const { data: sp } = await sb.from("subscription_payments").upsert({
              subscription_id: row.id, user_id: row.user_id, amount_paise: pay.amount, status: "paid",
              razorpay_payment_id: pay.id, paid_at: new Date().toISOString(),
            }, { onConflict: "razorpay_payment_id" }).select("id").single();
            if (sp) sb.functions.invoke("generate-invoice", { body: { payment_type: "subscription", payment_id: sp.id } }).catch(console.error);
          }
        }
        break;
      }
      case "subscription.pending": {
        const { data: row } = await sb.from("subscriptions").select("id, plan_id").eq("razorpay_subscription_id", sub.id).maybeSingle();
        if (row) {
          const { data: plan } = await sb.from("player_plans").select("grace_days").eq("id", row.plan_id).single();
          const grace = new Date(Date.now() + (plan?.grace_days ?? 0) * 86400000).toISOString();
          await sb.from("subscriptions").update({ status: "past_due", grace_until: grace }).eq("id", row.id);
        }
        break;
      }
      case "subscription.halted":
        await sb.from("subscriptions").update({ status: "expired" }).eq("razorpay_subscription_id", sub.id);
        break;
      case "subscription.cancelled":
      case "subscription.completed":
        await sb.from("subscriptions").update({
          status: "cancelled",
          current_period_end: sub.current_end ? new Date(sub.current_end * 1000).toISOString() : new Date().toISOString(),
        }).eq("razorpay_subscription_id", sub.id);
        break;
      case "refund.processed": {
        const refund = event.payload?.refund?.entity;
        if (refund) {
          await sb.from("refunds").update({ status: "processed", processed_at: new Date().toISOString() }).eq("razorpay_refund_id", refund.id);
          await sb.from("tournament_payments").update({ status: "refunded" }).eq("razorpay_payment_id", refund.payment_id);
          await sb.from("subscription_payments").update({ status: "refunded" }).eq("razorpay_payment_id", refund.payment_id);
        }
        break;
      }
    }
    await sb.from("webhook_events").update({ processed_at: new Date().toISOString(), error: null }).eq("id", rowId);
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("webhook error", event.event, e);
    await sb.from("webhook_events").update({ error: String(e?.message ?? e) }).eq("id", rowId);
    return new Response("error", { status: 500 });      // Razorpay will retry
  }
});
```

### process-refund: admin approves or rejects refunds

- [ ] Save as `supabase/functions/process-refund/index.ts`.

```ts
// supabase/functions/process-refund/index.ts   (admin only)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient, getUser, isAdmin, json, handleOptions } from "../_shared/clients.ts";
import { rzp } from "../_shared/razorpay.ts";

serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const user = await getUser(req);
    if (!user || !(await isAdmin(user.id))) return json({ error: "forbidden" }, 403);
    const { refund_id, action, reason } = await req.json();       // action: 'approve' | 'reject'
    const sb = adminClient();
    const { data: r } = await sb.from("refunds").select("*").eq("id", refund_id).single();
    if (!r || r.status !== "requested") return json({ error: "invalid_status" }, 409);

    if (action === "reject") {
      if (!reason) return json({ error: "reason_required" }, 422);
      await sb.from("refunds").update({ status: "rejected", reject_reason: reason, reviewed_by: user.id }).eq("id", r.id);
      await sb.from("audit_log").insert({ actor_id: user.id, action: "refund_rejected", target_type: "refund", target_id: r.id, reason });
      return json({ ok: true });
    }

    const table = r.payment_type === "tournament" ? "tournament_payments" : "subscription_payments";
    const { data: p } = await sb.from(table).select("*").eq("id", r.payment_id).single();
    if (!p?.razorpay_payment_id || p.status !== "paid") return json({ error: "payment_not_refundable" }, 409);

    const rf = await rzp(`/payments/${p.razorpay_payment_id}/refund`, "POST", { notes: { refund_id: r.id, reason: r.reason ?? "" } });
    await sb.from("refunds").update({ status: "approved", razorpay_refund_id: rf.id, reviewed_by: user.id }).eq("id", r.id);
    await sb.from("audit_log").insert({ actor_id: user.id, action: "refund_approved", target_type: "refund", target_id: r.id, after: { razorpay_refund_id: rf.id } });
    return json({ ok: true, razorpay_refund_id: rf.id });   // final status 'processed' arrives via the refund.processed webhook
  } catch (e) {
    console.error("process-refund", e);
    return json({ error: "server_error" }, 500);
  }
});
```

### generate-invoice: HTML receipts into the private invoices bucket

- [ ] Save as `supabase/functions/generate-invoice/index.ts`.

```ts
// supabase/functions/generate-invoice/index.ts   (service-role / admin only)
// v1 writes a printable HTML receipt to the private 'invoices' bucket. (Upgrade to PDF later.)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient, isServiceCall, getUser, isAdmin, json, handleOptions } from "../_shared/clients.ts";

const rupees = (p: number) => "₹" + (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    if (!isServiceCall(req)) {
      const u = await getUser(req);
      if (!u || !(await isAdmin(u.id))) return json({ error: "forbidden" }, 403);
    }
    const { payment_type, payment_id } = await req.json();
    const sb = adminClient();
    const isT = payment_type === "tournament";
    const { data: p } = await sb.from(isT ? "tournament_payments" : "subscription_payments").select("*").eq("id", payment_id).single();
    if (!p || p.status !== "paid") return json({ error: "not_paid" }, 409);
    const userId = isT ? p.organizer_id : p.user_id;
    const { data: prof } = await sb.from("profiles").select("full_name").eq("id", userId).single();
    const { data: tax } = await sb.from("site_settings").select("value").eq("key", "tax").single();
    const invNo = `INV-${new Date(p.paid_at ?? Date.now()).toISOString().slice(0, 7).replace("-", "")}-${p.id.slice(0, 6).toUpperCase()}`;
    const amount = isT ? p.amount_paise : p.amount_paise;
    const taxPaise = isT ? p.tax_paise : 0;
    const total = isT ? p.total_paise : p.amount_paise;
    const desc = isT ? "Tournament fee" : "Player subscription (monthly)";

    const html = `<!doctype html><meta charset="utf-8"><title>${invNo}</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;color:#0F2A43}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #DCE3EA;text-align:left}.r{text-align:right}</style>
<h1>Receipt ${invNo}</h1><p>Billed to: <b>${prof?.full_name ?? "Customer"}</b><br>Date: ${new Date(p.paid_at ?? Date.now()).toLocaleDateString("en-IN")}</p>
<table><tr><th>Description</th><th class="r">Amount</th></tr>
<tr><td>${desc}</td><td class="r">${rupees(amount)}</td></tr>
<tr><td>Tax (${tax?.value?.percent ?? 0}%)</td><td class="r">${rupees(taxPaise)}</td></tr>
<tr><th>Total paid</th><th class="r">${rupees(total)}</th></tr></table>
<p>Payment reference: ${p.razorpay_payment_id ?? "-"}</p>`;

    const path = `${userId}/${p.id}.html`;
    const { error } = await sb.storage.from("invoices").upload(path, new Blob([html], { type: "text/html" }), { upsert: true, contentType: "text/html" });
    if (error) throw error;
    await sb.from(isT ? "tournament_payments" : "subscription_payments").update(isT ? { invoice_url: path } : { receipt_url: path }).eq("id", p.id);
    return json({ ok: true, path });
  } catch (e) {
    console.error("generate-invoice", e);
    return json({ error: "server_error" }, 500);
  }
});
```

### send-email: transactional email through Resend

- [ ] Save as `supabase/functions/send-email/index.ts`.

```ts
// supabase/functions/send-email/index.ts   (service-role only; called by other functions and cron)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { isServiceCall, json } from "../_shared/clients.ts";

serve(async (req) => {
  if (!isServiceCall(req)) return json({ error: "forbidden" }, 403);
  const { to, subject, title, body, cta_label, cta_url } = await req.json();
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;color:#0F2A43">
    <h2>${title ?? subject}</h2><p style="line-height:1.55">${body ?? ""}</p>
    ${cta_url ? `<p><a href="${cta_url}" style="background:#1F7A4D;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${cta_label ?? "Open"}</a></p>` : ""}
  </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM") ?? "Tournaments <noreply@example.com>", to, subject, html }),
  });
  return json({ ok: res.ok }, res.ok ? 200 : 502);
});
```

### generate-fixtures: league, knockout, playoffs

- [ ] Save as `supabase/functions/generate-fixtures/index.ts`.

```ts
// supabase/functions/generate-fixtures/index.ts
// POST { tournament_id, action: 'generate' | 'playoffs', options?: { start_date, matches_per_day, times[], venues[], manual_order[] } }
// Writes unpublished matches. The organizer reviews them, then flips matches.fixture_published to true.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient, getUser, isAdmin, json, handleOptions } from "../_shared/clients.ts";
import { roundRobin, knockoutTree, shuffle, scheduleSlots, addDays } from "../_shared/fixtures.ts";

serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "not_authenticated" }, 401);
    const { tournament_id, action = "generate", options = {} } = await req.json();
    const sb = adminClient();

    const { data: t } = await sb.from("tournaments").select("*").eq("id", tournament_id).single();
    if (!t || (t.organizer_id !== user.id && !(await isAdmin(user.id)))) return json({ error: "forbidden" }, 403);
    if (!["registration_closed", "auction", "squads_locked", "live"].includes(t.status)) return json({ error: "invalid_status" }, 409);

    const { data: teams } = await sb.from("teams").select("id").eq("tournament_id", t.id).eq("status", "approved");
    if (!teams || teams.length < 3) return json({ error: "need_three_teams" }, 422);

    const times: string[] = options.times?.length ? options.times : ["10:00", "14:00"];
    const venues: string[] = options.venues?.length ? options.venues : [t.venue_name ?? ""];
    const venueFor = (i: number) => venues[i % venues.length] || null;
    const cleanRow = (r: Record<string, unknown>) => ({ tournament_id: t.id, fixture_published: false, ...r });

    if (action === "generate") {
      const { count: published } = await sb.from("matches").select("id", { count: "exact", head: true })
        .eq("tournament_id", t.id).not("result_published_at", "is", null);
      if ((published ?? 0) > 0) return json({ error: "results_exist" }, 409);
      await sb.from("matches").delete().eq("tournament_id", t.id);

      const ids = teams.map((x) => x.id as string);
      let order = ids;
      if (Array.isArray(options.manual_order)) {
        if (new Set(options.manual_order).size !== ids.length || !options.manual_order.every((x: string) => ids.includes(x))) return json({ error: "invalid_manual_order" }, 422);
        order = options.manual_order;
      } else order = shuffle(ids);
      const startDate: string = options.start_date ?? t.start_date;
      if (!startDate) return json({ error: "start_date_required" }, 422);

      if (t.format === "league" || t.format === "league_playoffs") {
        const pairs = roundRobin(order, t.league_legs === 2 ? 2 : 1);
        const perDay = Math.max(1, Math.min(options.matches_per_day ?? 2, Math.floor(ids.length / 2)));
        const slots = scheduleSlots(pairs.length, startDate, perDay, times);
        const rows = pairs.map((p, i) => cleanRow({ stage: "league", round_no: p.round, match_no: i + 1, team_a_id: p.a, team_b_id: p.b, scheduled_at: slots[i], venue: venueFor(i) }));
        const { error } = await sb.from("matches").insert(rows);
        if (error) throw error;
        return json({ ok: true, matches: rows.length });
      }

      // Knockout
      const { nodes, rounds } = knockoutTree(order);
      const real = nodes.filter((n) => !n.bye).sort((x, y) => x.round - y.round || x.index - y.index);
      const perDay = Math.max(1, Math.min(options.matches_per_day ?? 2, 4));
      const withThird = t.third_place_match && rounds >= 2;
      const total = real.length + (withThird ? 1 : 0);
      const slots = scheduleSlots(total, startDate, perDay, times);
      let si = 0;
      const rows: Record<string, unknown>[] = [];
      for (const n of real) {
        if (withThird && n.stage === "final") { rows.push(cleanRow({ stage: "third_place", round_no: n.round, match_no: real.length + 1, label_a: "Loser of semi 1", label_b: "Loser of semi 2", scheduled_at: slots[si], venue: venueFor(si) })); si++; }
        rows.push(cleanRow({
          stage: n.stage, round_no: n.round, match_no: n.matchNo, team_a_id: n.a, team_b_id: n.b,
          label_a: n.fromA ? `Winner of match ${n.fromA.matchNo}` : null, label_b: n.fromB ? `Winner of match ${n.fromB.matchNo}` : null,
          scheduled_at: slots[si], venue: venueFor(si),
        })); si++;
      }
      const { data: inserted, error } = await sb.from("matches").insert(rows).select("id, match_no");
      if (error) throw error;
      const idByNo = new Map(inserted!.map((m) => [m.match_no, m.id]));
      for (const parent of real) {
        for (const [child, slot] of [[parent.fromA, "a"], [parent.fromB, "b"]] as const) {
          if (child?.matchNo) await sb.from("matches").update({ next_match_id: idByNo.get(parent.matchNo!), next_slot: slot }).eq("id", idByNo.get(child.matchNo));
        }
      }
      if (withThird) {
        const thirdId = idByNo.get(real.length + 1);
        const semis = real.filter((n) => n.stage === "semi");
        for (let i = 0; i < semis.length; i++) {
          await sb.from("matches").update({ loser_next_match_id: thirdId, loser_next_slot: i === 0 ? "a" : "b" }).eq("id", idByNo.get(semis[i].matchNo!));
        }
      }
      return json({ ok: true, matches: rows.length });
    }

    if (action === "playoffs") {
      if (t.format !== "league_playoffs") return json({ error: "not_playoff_format" }, 422);
      const { count: open } = await sb.from("matches").select("id", { count: "exact", head: true }).eq("tournament_id", t.id).eq("stage", "league").is("result_published_at", null);
      if ((open ?? 0) > 0) return json({ error: "league_not_finished" }, 409);
      const { count: playedPO } = await sb.from("matches").select("id", { count: "exact", head: true }).eq("tournament_id", t.id).neq("stage", "league").not("result_published_at", "is", null);
      if ((playedPO ?? 0) > 0) return json({ error: "results_exist" }, 409);
      await sb.from("matches").delete().eq("tournament_id", t.id).neq("stage", "league");

      const { data: st } = await sb.from("standings").select("team_id").eq("tournament_id", t.id).order("position", { ascending: true });
      const p = (st ?? []).map((x) => x.team_id as string);
      const { data: last } = await sb.from("matches").select("scheduled_at, match_no").eq("tournament_id", t.id).order("match_no", { ascending: false }).limit(1).single();
      const start: string = options.start_date ?? addDays((last?.scheduled_at ?? new Date().toISOString()).slice(0, 10), 1);
      const style: string = t.playoff_style ?? "top4_semis";
      let no = (last?.match_no ?? 0);
      const at = (day: number, slot: number) => `${addDays(start, day)}T${times[slot % times.length]}:00+05:30`;
      const mk = (stage: string, round: number, day: number, slot: number, a: string | null, b: string | null, la?: string, lb?: string) =>
        cleanRow({ stage, round_no: round, match_no: ++no, team_a_id: a, team_b_id: b, label_a: la ?? null, label_b: lb ?? null, scheduled_at: at(day, slot), venue: venueFor(slot) });

      let rows: Record<string, unknown>[] = [];
      if (style === "top2_final") {
        if (p.length < 2) return json({ error: "not_enough_teams" }, 422);
        rows = [mk("final", 1, 0, 0, p[0], p[1])];
      } else if (style === "qualifier_style") {
        if (p.length < 4) return json({ error: "not_enough_teams" }, 422);
        rows = [mk("qualifier1", 1, 0, 0, p[0], p[1]), mk("eliminator", 1, 0, 1, p[2], p[3]),
                mk("qualifier2", 2, 1, 0, null, null, "Loser of Qualifier 1", "Winner of Eliminator"),
                mk("final", 3, 2, 0, null, null, "Winner of Qualifier 1", "Winner of Qualifier 2")];
      } else {
        if (p.length < 4) return json({ error: "not_enough_teams" }, 422);
        rows = [mk("semi", 1, 0, 0, p[0], p[3]), mk("semi", 1, 0, 1, p[1], p[2]),
                mk("final", 2, 1, 0, null, null, "Winner of Semi 1", "Winner of Semi 2")];
      }
      const { data: ins, error } = await sb.from("matches").insert(rows).select("id, stage, match_no");
      if (error) throw error;
      const by = (stage: string, nth = 0) => ins!.filter((m) => m.stage === stage)[nth]?.id as string;
      const link = (from: string, patch: Record<string, unknown>) => sb.from("matches").update(patch).eq("id", from);
      if (style === "qualifier_style") {
        await link(by("qualifier1"), { next_match_id: by("final"), next_slot: "a", loser_next_match_id: by("qualifier2"), loser_next_slot: "a" });
        await link(by("eliminator"), { next_match_id: by("qualifier2"), next_slot: "b" });
        await link(by("qualifier2"), { next_match_id: by("final"), next_slot: "b" });
      } else if (style !== "top2_final") {
        await link(by("semi", 0), { next_match_id: by("final"), next_slot: "a" });
        await link(by("semi", 1), { next_match_id: by("final"), next_slot: "b" });
      }
      return json({ ok: true, matches: rows.length });
    }
    return json({ error: "invalid_action" }, 422);
  } catch (e) {
    console.error("generate-fixtures", e);
    return json({ error: "server_error" }, 500);
  }
});
```

### Fixture unit test

- [ ] Save as `supabase/functions/_shared/fixtures.test.mts`, then run `npx tsx supabase/functions/_shared/fixtures.test.mts`. It must print `ALL FIXTURE TESTS PASSED`.

```ts
import { roundRobin, knockoutTree, seedOrder, scheduleSlots } from "./fixtures.ts";
let fail = 0; const ok = (c: boolean, m: string) => { if (!c) { console.log("FAIL", m); fail++; } };
for (const n of [3, 4, 5, 6, 7, 8]) {
  const t = Array.from({ length: n }, (_, i) => "T" + i);
  for (const legs of [1, 2] as const) {
    const m = roundRobin(t, legs);
    ok(m.length === (n * (n - 1) / 2) * legs, `rr count n=${n} legs=${legs}: ${m.length}`);
    const pairs = new Map<string, number>();
    m.forEach((p) => { const k = [p.a, p.b].sort().join("-"); pairs.set(k, (pairs.get(k) ?? 0) + 1); });
    ok([...pairs.values()].every((v) => v === legs), `rr each pair ${legs}x n=${n}`);
    const byRound = new Map<number, string[]>();
    m.forEach((p) => byRound.set(p.round, [...(byRound.get(p.round) ?? []), p.a, p.b]));
    ok([...byRound.values()].every((ts) => new Set(ts).size === ts.length), `rr no double-booking in a round n=${n}`);
  }
}
ok(JSON.stringify(seedOrder(8)) === "[1,8,4,5,2,7,3,6]", "seedOrder 8");
for (const n of [3, 4, 5, 6, 7, 8, 12]) {
  const t = Array.from({ length: n }, (_, i) => "T" + i);
  const { nodes, rounds } = knockoutTree(t);
  const real = nodes.filter((x) => !x.bye);
  ok(real.length === n - 1, `ko matches n=${n}: ${real.length}`);
  ok(nodes.filter((x) => x.stage === "final").length === 1, `ko one final n=${n}`);
  const r1 = nodes.filter((x) => x.round === 1 && !x.bye).flatMap((x) => [x.a, x.b]);
  const direct = nodes.filter((x) => x.round > 1).flatMap((x) => [x.a, x.b]).filter(Boolean);
  ok(new Set([...r1, ...direct]).size === n, `ko every team placed once n=${n}`);
}
const s = scheduleSlots(5, "2026-12-01", 2, ["10:00", "14:00"]);
ok(s[0] === "2026-12-01T10:00:00+05:30" && s[3] === "2026-12-02T14:00:00+05:30", "schedule slots");
console.log(fail === 0 ? "ALL FIXTURE TESTS PASSED" : fail + " FAILED");
```

### Deploy

- [ ] Save as `scripts/deploy-functions.sh`, run `chmod +x scripts/deploy-functions.sh`, then run it.

```bash
#!/usr/bin/env bash
set -euo pipefail
for f in create-tournament-order create-subscription cancel-subscription process-refund generate-invoice generate-fixtures; do
  supabase functions deploy "$f"
done
supabase functions deploy razorpay-webhook --no-verify-jwt
supabase functions deploy send-email --no-verify-jwt
```

- [ ] **Razorpay dashboard (Test mode first):** Settings > Webhooks > add `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`, paste the same secret you stored as `RAZORPAY_WEBHOOK_SECRET`, and tick: `payment.captured`, `payment.failed`, `order.paid`, `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`, `subscription.completed`, `refund.processed`.
- [ ] Enable Subscriptions and UPI AutoPay on the Razorpay account (needs Razorpay approval).

**Check D**
- [ ] A signed-in organizer calling `create-tournament-order` for a draft tournament gets an `order_id`; calling it for someone else's tournament returns 403.
- [ ] Sending a webhook with a bad signature returns 400; sending the same valid event twice changes data only once.
- [ ] `fixtures.test.mts` passes.

---

## Part E: Scripts and config

### `.env.example`
```bash
# Public (safe in the browser)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_RAZORPAY_KEY_ID=

# Server only. NEVER prefix with NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
```

### `scripts/make-admin.sql` (run once in the SQL editor, replacing the email)
```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'YOU@example.com');
select id, full_name, is_admin from public.profiles where is_admin;
```

### `scripts/verify-db.sql`
```sql
-- 1. Tables without RLS (must return 0 rows)
select tablename from pg_tables where schemaname = 'public' and not rowsecurity;

-- 2. Seed sanity
select (select count(*) from public.cities) cities, (select count(*) from public.sports) sports,
       (select count(*) from public.pricing_tiers) tiers, (select count(*) from public.player_plans) plans;

-- 3. Functions exist (expect 60+ rows)
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' order by 1;

-- 4. Client-callable functions are NOT callable by anon (expect 0 rows)
select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('apply_as_player','place_bid','publish_tournament','confirm_tournament_payment')
  and has_function_privilege('anon', p.oid, 'execute');

-- 5. Guard test: a normal user must not be able to publish for free or change status.
--    Replace the UUIDs with a real user and a draft tournament they own, then run inside a transaction.
-- begin;
--   select set_config('request.jwt.claims', json_build_object('sub','<USER_UUID>','role','authenticated')::text, true);
--   set local role authenticated;
--   update public.tournaments set status = 'registration_open' where id = '<TOURNAMENT_UUID>';  -- expect: locked_field: status
-- rollback;

-- 6. City and subscription rules
-- begin;
--   select set_config('request.jwt.claims', json_build_object('sub','<PLAYER_UUID>','role','authenticated')::text, true);
--   set local role authenticated;
--   select public.apply_as_player('<OPEN_TOURNAMENT_UUID>','Batter','beginner');  -- expect city_mismatch or subscription_required
-- rollback;
```

### `package.json` scripts (add to the web app)
```json
{
  "scripts": {
    "db:push": "supabase db push",
    "db:types": "supabase gen types typescript --linked --schema public > types/supabase.ts",
    "db:dump": "supabase db dump -f backup.sql",
    "fn:deploy": "bash scripts/deploy-functions.sh",
    "test:fixtures": "tsx supabase/functions/_shared/fixtures.test.mts"
  }
}
```
- [ ] Run `npm run db:types` after every migration. Commit `types/supabase.ts`.

---

## Part F: Function reference (what Plans 2 to 10 will call)

Server functions are called with `supabase.rpc('<name>', { p_... })` and signed-in users only. Errors come back as the exception **message**; map them in the web app (`lib/errors.ts`, Plan 2).

| Area | Function | Who | Notes |
|---|---|---|---|
| Profile | `change_city(p_city_id)` | any user | City can change any time |
| Players | `apply_as_player(p_tournament_id, p_role, p_experience, p_contact_phone, p_notes, p_answers, p_details)` | player | Enforces open registration, deadline, **city match**, **active subscription**, pool cap |
| | `withdraw_application(p_application_id)` | applicant | Blocked once in a squad or pool locked |
| | `review_application(p_application_id, p_decision, p_reason)` | organizer | `approved` adds to pool (auction mode) |
| Tournament | `publish_tournament(p_tournament_id)` | organizer | Needs paid fee and complete fields |
| | `close_registration`, `reopen_registration`, `lock_squads`, `go_live`, `complete_tournament` | organizer | Status stepper |
| | `cancel_tournament(p_tournament_id, p_reason)` | organizer | Notifies members |
| | `post_announcement(p_tid, p_title, p_body, p_pin)` | organizer | Also notifies members |
| Teams | `create_team_invite(p_team_id)` returns code | organizer | 14 day expiry, revokes older codes |
| | `accept_team_invite(p_code)` returns team id | any user | One team per manager per tournament |
| | `apply_with_team(...)`, `review_team(p_team_id, p_decision, p_reason)` | user / organizer | Open team applications |
| Squads | `add_squad_player`, `remove_squad_player`, `set_jersey_number`, `set_squad_lock` | manager/organizer | Direct mode; auction squads are read-only to managers |
| Auction | `lock_pool`, `schedule_auction`, `start_auction`, `pause_auction`, `resume_auction`, `select_lot`, `open_bidding`, `announce_lot`, `undo_last_bid`, `close_lot_sold`, `close_lot_unsold`, `end_auction` | organizer | See spec section 17 |
| | `place_bid(p_lot_id, p_expected_amount)` | manager | Server re-computes the amount; mismatch returns `bid_changed` |
| | `next_bid_amount(p_lot_id)` | anyone | Display only |
| Results | `publish_match_result(p_match_id)` | organizer | Advances knockout winners, recomputes standings, audits edits |
| | `set_match_live(p_match_id)` | organizer | |
| Chat | `post_chat_message`, `delete_chat_message`, `mute_chat_user`, `report_content` | members/organizer | Slow mode 3 s, 500 chars |

**Realtime topics:** broadcast channel `auction:<tournament_id>` with events `auction_started`, `lot_selected`, `bidding_opened`, `going_once`, `going_twice`, `bid_placed`, `bid_undone`, `lot_sold`, `lot_unsold`, `auction_paused`, `auction_resumed`, `auction_ended`. Postgres Changes: `chat_messages`, `notifications`, `auction_events`, `auction_lots`, `team_purses` (filter by `tournament_id` or `user_id`).

### Error codes (exception messages) and what they mean
| Code | Meaning (show a friendly sentence in the UI) |
|---|---|
| `not_authenticated` | Log in first |
| `profile_incomplete` | Finish onboarding |
| `registration_closed` | Deadline passed or not open |
| `city_mismatch` | Tournament city differs from the user's city |
| `subscription_required` | Start a subscription to apply |
| `already_applied`, `already_in_squad`, `pool_full`, `pool_locked`, `applications_disabled` | Application state problems |
| `forbidden`, `not_found`, `invalid_status`, `invalid_decision`, `already_reviewed` | Permission or state errors |
| `payment_required`, `tournament_incomplete` | Cannot publish yet |
| `invite_invalid`, `already_manager_in_tournament`, `team_has_manager` | Invite problems |
| `tournament_full`, `team_name_or_manager_exists`, `team_applications_disabled`, `invalid_name` | Team application problems |
| `squad_full`, `squad_locked`, `squad_too_small`, `squads_incomplete`, `player_already_in_a_team`, `jersey_taken`, `not_direct_mode`, `team_not_approved`, `squad_changes_closed`, `auction_squad_locked` | Squad problems |
| `no_pricing_tier_for_team_count` | Team count outside configured tiers |
| `locked_field: <name>` | Field cannot be changed after payment/publish |
| `auction_not_live`, `auction_paused`, `bidding_closed`, `lot_already_on_block`, `lot_not_available`, `lot_not_on_block`, `no_bids`, `no_bid_to_undo`, `lot_on_block` | Auction flow state |
| `not_a_bidder`, `already_highest`, `insufficient_purse`, `category_limit`, `reserve_rule`, `bid_changed` | Bid rejected |
| `pool_not_locked`, `pool_empty`, `registration_must_be_closed`, `need_two_teams`, `teams_without_manager`, `auction_not_completed`, `auction_not_configured`, `not_auction_mode` | Auction readiness |
| `fixtures_not_published`, `teams_not_set`, `result_required`, `winner_required`, `next_match_already_played` | Match and result flow |
| `not_a_member`, `muted`, `slow_mode`, `invalid_message`, `cannot_mute_self` | Chat |
| `reason_required`, `cannot_reopen`, `cannot_withdraw`, `city_not_found`, `player_not_found`, `invalid_kind` | Misc |

---

## Part G: Acceptance checklist (Plan 1 is done when all are true)

**Schema and security**
- [ ] All 15 migrations applied on `dev` without errors; `npm run db:types` produces `types/supabase.ts`.
- [ ] `verify-db.sql` checks 1 to 4 pass.
- [ ] An anonymous client can read `public_tournaments`, `public_teams`, `public_profiles`, standings and published matches, and **cannot** read `profiles`, `teams`, `player_applications`, `tournament_payments`, `subscriptions`.
- [ ] A normal user cannot set `is_admin`, change a tournament's `status`, or insert into any money table.

**Rules (test each with the SQL snippets or a quick script)**
- [ ] `apply_as_player` fails with `city_mismatch` for a different city and `subscription_required` without an active subscription, and succeeds when both are met.
- [ ] A subscription whose status becomes `cancelled` with a future `current_period_end` still allows applying; after that date it does not.
- [ ] Publishing an unpaid tournament fails with `payment_required`.
- [ ] Two managers bidding the same lot at the same instant: exactly one `bid_placed` wins, the other gets `bid_changed`.
- [ ] A bid that breaks the purse, squad size, category limit, or reserve rule is rejected with the right code.
- [ ] `close_lot_sold` adds the player to the squad and updates the purse in one transaction.
- [ ] `publish_match_result` on a league match updates `standings`; on a knockout match fills the next match's team slot.

**Payments**
- [ ] Test-mode order for a draft tournament: paying it (Razorpay test card) moves the tournament to `paid` **only after the webhook**; replaying the webhook does nothing.
- [ ] Test-mode subscription: `subscription.activated` then `subscription.charged` produce an `active` subscription and a `subscription_payments` row.
- [ ] `process-refund` rejects non-admins.

**Scale basics** (see `RULES.md`)
- [ ] `explain analyze` on the public tournament list query (filter by city and status, order by start date) uses `tournaments_public_idx`.
- [ ] Seed 200 tournaments and 5,000 profiles with a script and confirm list queries stay under 50 ms.

**Hand-off to Plan 2:** commit `types/supabase.ts`, `.env.example`, and the `supabase/` folder.
