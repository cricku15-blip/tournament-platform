-- Player access is now a one-time 30-day pass (Razorpay Order), not an auto-renewing subscription.
-- Rows keep living in public.subscriptions so has_active_subscription / apply_as_player keep working.

alter table public.subscriptions add column if not exists razorpay_order_id text;
create unique index if not exists subs_order_uidx on public.subscriptions (razorpay_order_id) where razorpay_order_id is not null;

-- 'active' now also respects the period end, so a pass stops working the moment it runs out
-- (the cron below only tidies the status afterwards).
create or replace function public.has_active_subscription(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid and (
      (s.status = 'active' and (s.current_period_end is null or s.current_period_end > now()))
      or (s.status = 'cancelled' and s.current_period_end > now())
      or (s.status = 'past_due'  and s.grace_until > now())
    )
  );
$$;

create or replace function public.expire_stale_data()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.team_invites set status = 'expired' where status = 'pending' and expires_at < now();
  update public.tournaments set status = 'registration_closed'
   where status = 'registration_open' and (team_deadline is not null or player_deadline is not null)
     and coalesce(team_deadline, '-infinity') < now() and coalesce(player_deadline, '-infinity') < now();
  update public.subscriptions set status = 'expired'
   where (status in ('active', 'cancelled') and current_period_end < now())
      or (status = 'past_due' and coalesce(grace_until, '-infinity') < now());
  delete from public.chat_mutes where muted_until < now() - interval '7 days';
  delete from public.webhook_events where created_at < now() - interval '90 days' and processed_at is not null;
end $$;
revoke all on function public.expire_stale_data() from public, anon, authenticated;
