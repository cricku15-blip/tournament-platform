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
