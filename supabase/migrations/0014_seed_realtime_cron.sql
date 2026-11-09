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
