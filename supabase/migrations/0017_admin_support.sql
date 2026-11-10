-- 0017_admin_support.sql
-- Plan 10 admin panel support. Append-only. NOT yet applied to the live project (see HANDOFF.md).

alter table public.profiles    add column if not exists suspended_until timestamptz;
alter table public.tournaments add column if not exists admin_notes  text;
alter table public.tournaments add column if not exists admin_hidden boolean not null default false;

create index if not exists profiles_status_idx on public.profiles (status) where status <> 'active';
create index if not exists audit_log_created_idx on public.audit_log (created_at desc, id desc);
create index if not exists audit_log_target_idx on public.audit_log (target_type, target_id);

-- Suspensions with an end date are lifted automatically.
create or replace function public.restore_expired_suspensions()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.profiles set status = 'active', suspended_until = null
   where status = 'suspended' and suspended_until is not null and suspended_until <= now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.restore_expired_suspensions() from public, anon, authenticated;

do $$
begin
  perform cron.schedule('restore-suspensions', '*/15 * * * *', 'select public.restore_expired_suspensions()');
exception when others then
  raise notice 'pg_cron not available; schedule public.restore_expired_suspensions() manually';
end $$;

-- Admin search by exact email (emails live in auth.users, which the API can't join). Service role only.
create or replace function public.admin_find_user_by_email(p_email text)
returns uuid language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;
revoke all on function public.admin_find_user_by_email(text) from public, anon, authenticated;
grant execute on function public.admin_find_user_by_email(text) to service_role;

-- One round trip for the admin dashboard tiles.
create or replace function public.admin_dashboard()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'users_today',     (select count(*) from public.profiles where created_at >= date_trunc('day', now())),
    'users_7d',        (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'active_tournaments', (select count(*) from public.tournaments where status in ('registration_open','registration_closed','auction','squads_locked','live')),
    'live_auctions',   (select count(*) from public.auction_settings where status = 'live'),
    'organizer_revenue_month_paise', (select coalesce(sum(total_paise), 0) from public.tournament_payments where status = 'paid' and paid_at >= date_trunc('month', now())),
    'active_subscriptions', (select count(*) from public.subscriptions where status = 'active'),
    'failed_payments_7d', (select (select count(*) from public.tournament_payments where status = 'failed' and created_at >= now() - interval '7 days')
                                + (select count(*) from public.subscription_payments where status = 'failed' and created_at >= now() - interval '7 days')),
    'open_reports',    (select count(*) from public.reports where status in ('open','reviewing')),
    'pending_refunds', (select count(*) from public.refunds where status = 'requested'),
    'failed_webhooks_24h', (select count(*) from public.webhook_events where error is not null and created_at >= now() - interval '24 hours')
  );
$$;
revoke all on function public.admin_dashboard() from public, anon, authenticated;
grant execute on function public.admin_dashboard() to service_role;
