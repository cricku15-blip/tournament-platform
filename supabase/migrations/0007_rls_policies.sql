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
