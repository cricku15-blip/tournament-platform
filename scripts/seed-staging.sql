-- Staging seed for load tests (Plan 10). RUN ONLY ON A STAGING PROJECT, never on production.
-- Volume: 15,000 profiles, 3,000 tournaments (300 live), 20,000 applications, 50,000 chat messages, 500,000 notifications, 100,000 audit rows.
-- Seeds profiles by inserting directly into auth.users first (the on_auth_user_created trigger creates the profile rows).
-- Idempotent enough to re-run: it skips when seed data already exists.
-- Usage: psql "$STAGING_DB_URL" -f scripts/seed-staging.sql

do $$
declare v_city uuid[]; v_sport uuid[]; v_tier uuid; n int;
begin
  select count(*) into n from public.profiles where username like 'seed\_%';
  if n > 0 then raise notice 'Seed data already present (% profiles). Skipping.', n; return; end if;

  select array_agg(id) into v_city from public.cities where is_active;
  select array_agg(id) into v_sport from public.sports where is_active;
  if v_city is null or v_sport is null then raise exception 'Seed cities and sports first (run the migrations).'; end if;

  -- 15,000 users
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seed' || g || '@example.test', '', now(),
         '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', 'Seed User ' || g), now() - (random() * interval '90 days'), now()
  from generate_series(1, 15000) g;

  update public.profiles p set username = 'seed_' || r.rn, city_id = v_city[1 + (r.rn % array_length(v_city, 1))], onboarded_at = now(), date_of_birth = date '2000-01-01' + (r.rn % 3000)
  from (select id, row_number() over (order by id) rn from public.profiles where username is null) r where p.id = r.id;

  -- 3,000 tournaments, 300 live (organizers are the first 600 seeded users)
  insert into public.tournaments (organizer_id, name, slug, sport_id, city_id, venue_name, start_date, end_date, format, team_count, squad_mode, squad_min, squad_max, description_short, status, published_at)
  select o.id, 'Seed Cup ' || g, 'seed-cup-' || g, v_sport[1 + (g % array_length(v_sport, 1))], v_city[1 + (g % array_length(v_city, 1))], 'Seed Ground', current_date + (g % 60), current_date + (g % 60) + 10, 'league', 4, 'direct', 7, 11,
         'Seeded tournament number ' || g || ' for load testing.', case when g <= 300 then 'live' else 'registration_open' end::public.tournament_status, now()
  from generate_series(1, 3000) g
  join (select id, row_number() over (order by id) rn from public.profiles where username like 'seed\_%' limit 600) o on o.rn = 1 + (g % 600);

  -- 20,000 applications
  insert into public.player_applications (tournament_id, user_id, role, experience)
  select t.id, p.id, 'Batter', 'intermediate'
  from (select id, row_number() over (order by id) rn from public.tournaments where slug like 'seed-cup-%') t
  join (select id, row_number() over (order by id) rn from public.profiles where username like 'seed\_%' offset 600) p on p.rn = 1 + (t.rn * 7) % 14000
  limit 20000 on conflict do nothing;

  -- 50,000 chat messages on the live tournaments
  insert into public.chat_messages (tournament_id, user_id, body, created_at)
  select t.id, o.id, 'Seed message ' || g, now() - (g || ' minutes')::interval
  from generate_series(1, 50000) g
  join (select id, row_number() over (order by id) rn from public.tournaments where status = 'live' and slug like 'seed-cup-%') t on t.rn = 1 + (g % 300)
  join (select id, row_number() over (order by id) rn from public.profiles where username like 'seed\_%' limit 1000) o on o.rn = 1 + (g % 1000);

  -- 500,000 notifications and 100,000 audit rows
  insert into public.notifications (user_id, type, title, body, created_at)
  select p.id, 'seed', 'Seed notification ' || g, 'body', now() - (g % 43200 || ' minutes')::interval
  from generate_series(1, 500000) g
  join (select id, row_number() over (order by id) rn from public.profiles where username like 'seed\_%') p on p.rn = 1 + (g % 15000);

  insert into public.audit_log (action, target_type, reason, created_at)
  select 'seed_action', 'tournament', 'seed', now() - (g || ' minutes')::interval from generate_series(1, 100000) g;
end $$;

analyze;
