-- 0018_assistants_transfer_groups.sql
-- Plan 11: assistant organizers, ownership transfer, group stage + knockout, football quarter-finals.
-- Additive only (RULES 6.4): new table, nullable columns, one new enum value.

alter type public.tournament_format add value if not exists 'groups_knockout';

alter table public.tournaments
  add column if not exists group_count int check (group_count between 2 and 8),
  add column if not exists advance_per_group int check (advance_per_group in (1, 2));
alter table public.teams     add column if not exists group_no int check (group_no between 1 and 8);
alter table public.matches   add column if not exists group_no int;
alter table public.standings add column if not exists group_no int;

-- ---------- Assistants ----------
create table if not exists public.tournament_assistants (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  added_by      uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  primary key (tournament_id, user_id)
);
create index if not exists tournament_assistants_user_idx on public.tournament_assistants(user_id);
alter table public.tournament_assistants enable row level security;
create policy ta_read on public.tournament_assistants for select
  using (user_id = (select auth.uid()) or public.is_tournament_organizer(tournament_id) or public.is_admin());

-- An assistant has organizer powers except: transfer, assistant management, delete.
create or replace function public.is_tournament_organizer(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tournaments t where t.id = tid and t.organizer_id = auth.uid())
      or exists (select 1 from public.tournament_assistants a where a.tournament_id = tid and a.user_id = auth.uid());
$$;

create or replace function public.is_tournament_owner(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tournaments t where t.id = tid and t.organizer_id = auth.uid());
$$;

create or replace function public.is_tournament_member(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.is_tournament_organizer(tid)
    or exists (select 1 from public.teams t where t.tournament_id = tid and t.manager_id = auth.uid() and t.status = 'approved')
    or exists (select 1 from public.player_applications a where a.tournament_id = tid and a.user_id = auth.uid() and a.status = 'approved')
    or exists (select 1 from public.squad_members s where s.tournament_id = tid and s.user_id = auth.uid())
  );
$$;

drop policy if exists t_select on public.tournaments;
create policy t_select on public.tournaments for select
  using (organizer_id = (select auth.uid()) or public.is_admin() or public.is_tournament_member(id));
drop policy if exists t_update on public.tournaments;
create policy t_update on public.tournaments for update
  using (public.is_tournament_organizer(id) or public.is_admin())
  with check (public.is_tournament_organizer(id) or public.is_admin());

-- Rewrite the organizer checks inside existing RPCs so assistants pass them too.
do $$
declare r record; def text; patched text;
begin
  for r in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and pg_get_functiondef(p.oid) like '%t.organizer_id = auth.uid()%'
      and p.proname not in ('is_tournament_organizer','is_tournament_owner','is_tournament_member','tournaments_guard')
  loop
    def := pg_get_functiondef(r.oid);
    patched := replace(def, 't.organizer_id = auth.uid()', 'public.is_tournament_organizer(t.id)');
    if patched <> def then execute patched; end if;
  end loop;
  -- Group matches also feed the standings.
  for r in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'publish_match_result'
  loop
    def := pg_get_functiondef(r.oid);
    patched := replace(def, 'if m.stage = ''league'' then', 'if m.stage in (''league'',''group'') then');
    if patched <> def then execute patched; end if;
  end loop;
end $$;

-- ---------- Assistant and ownership RPCs (owner or admin only) ----------
create or replace function public._require_owner(p_tid uuid)
returns public.tournaments language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  select * into t from public.tournaments where id = p_tid for update;
  if not found then raise exception 'not_found'; end if;
  if not (t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'forbidden'; end if;
  return t;
end $$;
revoke all on function public._require_owner(uuid) from public, anon, authenticated;

create or replace function public.add_assistant(p_tournament_id uuid, p_username text)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments; v_uid uuid;
begin
  t := public._require_owner(p_tournament_id);
  select id into v_uid from public.profiles where username = lower(trim(p_username)) and coalesce(status,'active') = 'active';
  if v_uid is null then raise exception 'user_not_found'; end if;
  if v_uid = t.organizer_id then raise exception 'already_owner'; end if;
  if (select count(*) from public.tournament_assistants where tournament_id = t.id) >= 2 then raise exception 'assistant_limit'; end if;
  insert into public.tournament_assistants(tournament_id, user_id, added_by) values (t.id, v_uid, auth.uid()) on conflict do nothing;
  perform public._notify(v_uid, 'assistant_added', 'You are now an assistant organizer', t.name, '/organizer/tournaments/' || t.id);
  perform public._audit('assistant_added', 'tournament', t.id, null, jsonb_build_object('user_id', v_uid));
end $$;

create or replace function public.remove_assistant(p_tournament_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  t := public._require_owner(p_tournament_id);
  delete from public.tournament_assistants where tournament_id = t.id and user_id = p_user_id;
  perform public._audit('assistant_removed', 'tournament', t.id, jsonb_build_object('user_id', p_user_id), null);
end $$;

create or replace function public.transfer_tournament(p_tournament_id uuid, p_username text)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments; v_uid uuid;
begin
  t := public._require_owner(p_tournament_id);
  if t.status in ('completed','cancelled') then raise exception 'invalid_status'; end if;
  select id into v_uid from public.profiles where username = lower(trim(p_username)) and coalesce(status,'active') = 'active';
  if v_uid is null then raise exception 'user_not_found'; end if;
  if v_uid = t.organizer_id then raise exception 'already_owner'; end if;
  if exists (select 1 from public.teams where tournament_id = t.id and manager_id = v_uid) then raise exception 'is_team_manager'; end if;
  perform set_config('app.bypass_guard', '1', true);
  update public.tournaments set organizer_id = v_uid where id = t.id;
  delete from public.tournament_assistants where tournament_id = t.id and user_id = v_uid;
  insert into public.tournament_assistants(tournament_id, user_id, added_by) values (t.id, t.organizer_id, auth.uid()) on conflict do nothing;
  perform public._notify(v_uid, 'ownership_transferred', 'You now own a tournament', t.name, '/organizer/tournaments/' || t.id);
  perform public._audit('tournament_transferred', 'tournament', t.id, jsonb_build_object('from', t.organizer_id), jsonb_build_object('to', v_uid));
end $$;

grant execute on function public.add_assistant(uuid, text), public.remove_assistant(uuid, uuid),
  public.transfer_tournament(uuid, text) to authenticated;

-- ---------- Group-aware standings ----------
create or replace function public.recompute_standings(p_tournament_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments; v_sport text; v_pts jsonb; v_win int; v_tie int; v_draw int; v_nr int;
begin
  select * into t from public.tournaments where id = p_tournament_id;
  select slug into v_sport from public.sports where id = t.sport_id;
  v_pts  := coalesce(t.rules->'points', '{}'::jsonb);
  v_win  := coalesce((v_pts->>'win')::int,  case when v_sport = 'cricket' then 2 else 3 end);
  v_tie  := coalesce((v_pts->>'tie')::int, 1);
  v_draw := coalesce((v_pts->>'draw')::int, 1);
  v_nr   := coalesce((v_pts->>'no_result')::int, 1);

  delete from public.standings where tournament_id = p_tournament_id;
  with sides as (
    select m.team_a_id as team_id, m.winner_team_id, m.result_type, m.score_a as sf, m.score_b as sa
      from public.matches m where m.tournament_id = p_tournament_id and m.stage in ('league','group') and m.result_published_at is not null
    union all
    select m.team_b_id, m.winner_team_id, m.result_type, m.score_b, m.score_a
      from public.matches m where m.tournament_id = p_tournament_id and m.stage in ('league','group') and m.result_published_at is not null
  ), agg as (
    select team_id, count(*) as played,
      count(*) filter (where result_type in ('win','walkover') and winner_team_id = team_id) as won,
      count(*) filter (where result_type in ('win','walkover') and winner_team_id <> team_id) as lost,
      count(*) filter (where result_type = 'tie') as tied,
      count(*) filter (where result_type = 'draw') as drawn,
      count(*) filter (where result_type in ('no_result','abandoned')) as nr,
      coalesce(sum((sf->>'runs')::int), 0) as runs_for,
      coalesce(sum(coalesce((sf->>'balls_nrr')::int, (sf->>'balls')::int)), 0) as balls_for,
      coalesce(sum((sa->>'runs')::int), 0) as runs_against,
      coalesce(sum(coalesce((sa->>'balls_nrr')::int, (sa->>'balls')::int)), 0) as balls_against,
      coalesce(sum((sf->>'goals')::int), 0) as gf, coalesce(sum((sa->>'goals')::int), 0) as ga
    from sides group by team_id
  )
  insert into public.standings (tournament_id, team_id, group_no, played, won, lost, tied, drawn, no_result, points,
                                runs_for, balls_for, runs_against, balls_against, nrr, gf, ga, gd)
  select tm.tournament_id, tm.id, tm.group_no, coalesce(a.played,0), coalesce(a.won,0), coalesce(a.lost,0), coalesce(a.tied,0), coalesce(a.drawn,0), coalesce(a.nr,0),
         coalesce(a.won,0)*v_win + coalesce(a.tied,0)*v_tie + coalesce(a.drawn,0)*v_draw + coalesce(a.nr,0)*v_nr,
         coalesce(a.runs_for,0), coalesce(a.balls_for,0), coalesce(a.runs_against,0), coalesce(a.balls_against,0),
         case when v_sport = 'cricket' and coalesce(a.balls_for,0) > 0 and coalesce(a.balls_against,0) > 0
              then round((a.runs_for::numeric / (a.balls_for / 6.0)) - (a.runs_against::numeric / (a.balls_against / 6.0)), 3) end,
         coalesce(a.gf,0), coalesce(a.ga,0), coalesce(a.gf,0) - coalesce(a.ga,0)
  from public.teams tm left join agg a on a.team_id = tm.id
  where tm.tournament_id = p_tournament_id and tm.status = 'approved';

  update public.standings s set position = r.rn
  from (select team_id, row_number() over (partition by coalesce(group_no, 0) order by points desc,
          case when v_sport = 'cricket' then nrr end desc nulls last,
          case when v_sport = 'cricket' then won else gd end desc,
          case when v_sport = 'cricket' then 0 else gf end desc) as rn
        from public.standings where tournament_id = p_tournament_id) r
  where s.tournament_id = p_tournament_id and s.team_id = r.team_id;
end $$;
revoke all on function public.recompute_standings(uuid) from public, anon, authenticated;

create index if not exists teams_group_idx on public.teams(tournament_id, group_no) where group_no is not null;
create index if not exists standings_group_idx on public.standings(tournament_id, group_no, position);

-- Public view: append the group settings (appending columns keeps existing consumers working).
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
       t.organizer_id, p.full_name as organizer_name, p.avatar_url as organizer_avatar,
       t.group_count, t.advance_per_group
from public.tournaments t
join public.sports s on s.id = t.sport_id
join public.cities c on c.id = t.city_id
join public.profiles p on p.id = t.organizer_id
where t.status not in ('draft','paid');
