-- Abuse tests (Plan 10). Every attempt below must FAIL. Run on STAGING with seed data, as the postgres role.
-- Each block runs in its own transaction that is rolled back, impersonating a normal user the way PostgREST does.
-- Fill in the UUIDs first (see the "-- SET" lines). A block that does not raise the expected error is a FAILED test.
--
--   :player      a normal user in city X with NO subscription
--   :player_sub  a normal user in city X WITH an active subscription
--   :org         a normal user who owns :tournament (status registration_open, city Y, city X <> Y)
--   :other_org   a different normal user
--   :mgr_a / :team_a   manager and their team in :tournament (direct squad mode)
--   :mgr_b / :team_b   another manager and team
--   :lot         an auction lot on the block with bidding open;  :team_c_mgr a manager NOT in the auction
-- psql -v player=... (etc.) -f scripts/abuse-tests.sql

\set ON_ERROR_STOP off

-- 1. City bypass: a player from another city applies -> expect city_mismatch
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :'player_sub', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select public.apply_as_player(:'tournament', 'Batter', 'beginner');   -- EXPECT: ERROR city_mismatch
rollback;

-- 2. Subscription bypass: same city, no subscription -> expect subscription_required
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :'player', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select public.apply_as_player(:'tournament_same_city', 'Batter', 'beginner');   -- EXPECT: ERROR subscription_required
rollback;

-- 3. Direct status update: organizer tries to publish for free -> expect locked_field: status
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :'org', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.tournaments set status = 'registration_open' where id = :'draft_tournament';   -- EXPECT: ERROR locked_field: status
rollback;

-- 4. Organizer edits a paid field: team count after payment -> expect locked_field: team_count
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :'org', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.tournaments set team_count = 8 where id = :'tournament';   -- EXPECT: ERROR locked_field: team_count
rollback;

-- 5. Another organizer edits this tournament -> expect 0 rows updated
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :'other_org', 'role', 'authenticated')::text, true);
  set local role authenticated;
  with u as (update public.tournaments set name = 'hacked' where id = :'tournament' returning 1) select count(*) as updated_rows from u;   -- EXPECT: 0
rollback;

-- 6. Bid manipulation: a manager who is not an active bidder in this auction -> expect not_a_bidder
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :'team_c_mgr', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select public.place_bid(:'lot', 100);   -- EXPECT: ERROR not_a_bidder
rollback;

-- 7. Stale bid amount (someone bid first) -> expect bid_changed
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :'mgr_a', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select public.place_bid(:'lot', 1);   -- EXPECT: ERROR bid_changed (or already_highest)
rollback;

-- 8. Direct write to bids and purses from the client -> expect permission denied / 0 rows
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :'mgr_a', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.bids(lot_id, tournament_id, team_id, amount) values (:'lot', :'tournament', :'team_a', 1);   -- EXPECT: ERROR (no insert policy)
  update public.team_purses set spent = 0 where team_id = :'team_a';                                              -- EXPECT: 0 rows
rollback;

-- 9. Other-team squad edit: manager A removes a player from team B -> expect forbidden
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :'mgr_a', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select public.remove_squad_player((select id from public.squad_members where team_id = :'team_b' limit 1));   -- EXPECT: ERROR forbidden
  select public.add_squad_player(:'team_b', :'player');                                                          -- EXPECT: ERROR forbidden
rollback;

-- 10. Reading phone numbers: another user reads profiles.phone and the teams' private phone column -> expect 0 rows / permission denied
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :'player', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select phone from public.profiles where id <> :'player' limit 1;                      -- EXPECT: 0 rows
  select manager_phone from public.teams where manager_id <> :'player' limit 1;         -- EXPECT: 0 rows
  select * from public.public_profiles limit 1;                                          -- EXPECT: no phone or date_of_birth column
rollback;

-- 11. Self-promotion: profile update with is_admin = true -> expect the flag to stay false
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :'player', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.profiles set is_admin = true where id = :'player';
  select is_admin from public.profiles where id = :'player';   -- EXPECT: false
rollback;

-- 12. Anonymous users calling server-only functions -> expect permission denied
begin;
  set local role anon;
  select public.place_bid(:'lot', 1);                       -- EXPECT: ERROR permission denied
  select public.publish_tournament(:'tournament');          -- EXPECT: ERROR permission denied
  select public.confirm_tournament_payment(:'tournament', 'x');   -- EXPECT: ERROR permission denied
rollback;
