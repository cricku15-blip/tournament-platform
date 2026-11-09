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
