-- 0008_views.sql
-- Public read surfaces. Views run with owner rights (they bypass RLS) and expose ONLY safe columns.

create or replace view public.public_profiles as
select p.id, p.full_name, p.username, p.avatar_url, p.bio,
       case when p.show_city then p.city_id end as city_id,
       case when p.show_age and p.date_of_birth is not null then date_part('year', age(p.date_of_birth))::int end as age,
       p.show_stats
from public.profiles p
where p.onboarded_at is not null and p.status = 'active';

create or replace view public.public_tournaments as
select t.id, t.name, t.slug, t.sport_id, s.slug as sport_slug, s.name as sport_name,
       t.city_id, c.name as city_name, c.slug as city_slug,
       t.venue_name, t.venue_address, t.start_date, t.end_date, t.format, t.team_count, t.league_legs,
       t.playoff_style, t.third_place_match, t.rules, t.squad_mode, t.squad_min, t.squad_max, t.team_entry,
       t.team_deadline, t.player_deadline, t.allow_player_applications, t.custom_questions, t.visibility,
       case when t.show_contact then t.contact_phone end as contact_phone,
       case when t.show_contact then t.contact_email end as contact_email,
       t.entry_fee_info, t.prizes, t.individual_awards, t.rules_text, t.description_short, t.description_full,
       t.banner_url, t.logo_url, t.status, t.cancelled_reason, t.published_at,
       t.approved_team_count, t.approved_player_count,
       t.organizer_id, p.full_name as organizer_name, p.avatar_url as organizer_avatar
from public.tournaments t
join public.sports s on s.id = t.sport_id
join public.cities c on c.id = t.city_id
join public.profiles p on p.id = t.organizer_id
where t.status not in ('draft','paid');

create or replace view public.public_teams as
select tm.id, tm.tournament_id, tm.name, tm.slug, tm.logo_url, tm.color_primary, tm.color_secondary,
       tm.description, tm.home_ground, tm.manager_id, tm.squad_locked,
       (select count(*) from public.squad_members sm where sm.team_id = tm.id) as squad_size
from public.teams tm
where tm.status = 'approved' and public.tournament_is_published(tm.tournament_id);

grant select on public.public_profiles, public.public_tournaments, public.public_teams to anon, authenticated;
