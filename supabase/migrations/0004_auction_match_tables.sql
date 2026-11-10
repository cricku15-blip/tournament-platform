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
