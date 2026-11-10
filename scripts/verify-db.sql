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
