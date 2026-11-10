-- 0010_rpc_tournament_flow.sql
-- Status transitions, pool locking, results, standings, announcements, chat, reports.

create or replace function public._require_organizer(p_tid uuid)
returns public.tournaments language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  select * into t from public.tournaments where id = p_tid for update;
  if not found then raise exception 'not_found'; end if;
  if not (t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'forbidden'; end if;
  return t;
end $$;
revoke all on function public._require_organizer(uuid) from public, anon, authenticated;

create or replace function public._notify_members(p_tid uuid, p_type text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id, type, title, body, link)
  select u, p_type, p_title, p_body, p_link from (
    select manager_id as u from public.teams where tournament_id = p_tid and status = 'approved' and manager_id is not null
    union select user_id from public.player_applications where tournament_id = p_tid and status = 'approved'
    union select user_id from public.squad_members where tournament_id = p_tid
  ) x where u is not null;
$$;
revoke all on function public._notify_members(uuid,text,text,text,text) from public, anon, authenticated;

create or replace function public.close_registration(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  t := public._require_organizer(p_tid);
  if t.status <> 'registration_open' then raise exception 'invalid_status'; end if;
  perform set_config('app.bypass_guard','1',true);
  update public.tournaments set status = 'registration_closed' where id = t.id;
end $$;

create or replace function public.reopen_registration(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  t := public._require_organizer(p_tid);
  if t.status <> 'registration_closed' then raise exception 'invalid_status'; end if;
  if exists (select 1 from public.auction_settings where tournament_id = t.id and (pool_locked or status <> 'not_scheduled'))
     or exists (select 1 from public.matches where tournament_id = t.id) then raise exception 'cannot_reopen'; end if;
  perform set_config('app.bypass_guard','1',true);
  update public.tournaments set status = 'registration_open' where id = t.id;
end $$;

create or replace function public.lock_squads(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments; v_bad int;
begin
  t := public._require_organizer(p_tid);
  if t.squad_mode = 'auction' then
    if t.status <> 'auction' or not exists (select 1 from public.auction_settings where tournament_id = t.id and status = 'completed') then raise exception 'auction_not_completed'; end if;
  elsif t.status <> 'registration_closed' then raise exception 'invalid_status'; end if;
  select count(*) into v_bad from public.teams tm
   where tm.tournament_id = t.id and tm.status = 'approved'
     and (select count(*) from public.squad_members sm where sm.team_id = tm.id) < coalesce(t.squad_min, 0);
  if v_bad > 0 then raise exception 'squads_incomplete'; end if;
  perform set_config('app.bypass_guard','1',true);
  update public.teams set squad_locked = true where tournament_id = t.id;
  update public.tournaments set status = 'squads_locked' where id = t.id;
  perform public._notify_members(t.id, 'squads_locked', 'Squads are locked', t.name, '/tournaments/' || t.slug);
end $$;

create or replace function public.go_live(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  t := public._require_organizer(p_tid);
  if t.status <> 'squads_locked' then raise exception 'invalid_status'; end if;
  if not exists (select 1 from public.matches where tournament_id = t.id and fixture_published) then raise exception 'fixtures_not_published'; end if;
  perform set_config('app.bypass_guard','1',true);
  update public.tournaments set status = 'live' where id = t.id;
end $$;

create or replace function public.complete_tournament(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  t := public._require_organizer(p_tid);
  if t.status <> 'live' then raise exception 'invalid_status'; end if;
  perform set_config('app.bypass_guard','1',true);
  update public.tournaments set status = 'completed' where id = t.id;
  perform public._notify_members(t.id, 'tournament_completed', 'Tournament completed', t.name, '/tournaments/' || t.slug);
end $$;

create or replace function public.lock_pool(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments; s public.auction_settings;
begin
  t := public._require_organizer(p_tid);
  if t.squad_mode <> 'auction' then raise exception 'not_auction_mode'; end if;
  if t.status not in ('registration_open','registration_closed') then raise exception 'invalid_status'; end if;
  select * into s from public.auction_settings where tournament_id = t.id for update;
  if not found then raise exception 'auction_not_configured'; end if;
  if s.pool_locked then raise exception 'pool_locked'; end if;
  if not exists (select 1 from public.pool_players where tournament_id = t.id) then raise exception 'pool_empty'; end if;

  update public.pool_players p set sequence_no = r.rn
  from (select id, row_number() over (order by
          case when s.sequence_mode = 'manual' then coalesce(sequence_no, 2147483647) end,
          case when s.sequence_mode = 'category' then category end,
          random()) as rn
        from public.pool_players where tournament_id = t.id) r
  where p.id = r.id;

  insert into public.auction_lots(tournament_id, player_id)
  select tournament_id, user_id from public.pool_players where tournament_id = t.id
  on conflict (tournament_id, player_id) do nothing;

  insert into public.team_purses(team_id, tournament_id, total)
  select id, tournament_id, s.purse from public.teams where tournament_id = t.id and status = 'approved'
  on conflict (team_id) do nothing;

  update public.auction_settings set pool_locked = true where tournament_id = t.id;
end $$;

-- ---------- Results and standings ----------
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
      from public.matches m where m.tournament_id = p_tournament_id and m.stage = 'league' and m.result_published_at is not null
    union all
    select m.team_b_id, m.winner_team_id, m.result_type, m.score_b, m.score_a
      from public.matches m where m.tournament_id = p_tournament_id and m.stage = 'league' and m.result_published_at is not null
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
  insert into public.standings (tournament_id, team_id, played, won, lost, tied, drawn, no_result, points,
                                runs_for, balls_for, runs_against, balls_against, nrr, gf, ga, gd)
  select tm.tournament_id, tm.id, coalesce(a.played,0), coalesce(a.won,0), coalesce(a.lost,0), coalesce(a.tied,0), coalesce(a.drawn,0), coalesce(a.nr,0),
         coalesce(a.won,0)*v_win + coalesce(a.tied,0)*v_tie + coalesce(a.drawn,0)*v_draw + coalesce(a.nr,0)*v_nr,
         coalesce(a.runs_for,0), coalesce(a.balls_for,0), coalesce(a.runs_against,0), coalesce(a.balls_against,0),
         case when v_sport = 'cricket' and coalesce(a.balls_for,0) > 0 and coalesce(a.balls_against,0) > 0
              then round((a.runs_for::numeric / (a.balls_for / 6.0)) - (a.runs_against::numeric / (a.balls_against / 6.0)), 3) end,
         coalesce(a.gf,0), coalesce(a.ga,0), coalesce(a.gf,0) - coalesce(a.ga,0)
  from public.teams tm left join agg a on a.team_id = tm.id
  where tm.tournament_id = p_tournament_id and tm.status = 'approved';

  update public.standings s set position = r.rn
  from (select team_id, row_number() over (order by points desc,
          case when v_sport = 'cricket' then nrr end desc nulls last,
          case when v_sport = 'cricket' then won else gd end desc,
          case when v_sport = 'cricket' then 0 else gf end desc) as rn
        from public.standings where tournament_id = p_tournament_id) r
  where s.tournament_id = p_tournament_id and s.team_id = r.team_id;
end $$;
revoke all on function public.recompute_standings(uuid) from public, anon, authenticated;

create or replace function public.publish_match_result(p_match_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m public.matches; t public.tournaments; v_was boolean; v_loser uuid; nm public.matches;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'not_found'; end if;
  t := public._require_organizer(m.tournament_id);
  if t.status not in ('live','squads_locked') then raise exception 'invalid_status'; end if;
  if m.team_a_id is null or m.team_b_id is null then raise exception 'teams_not_set'; end if;
  if m.result_type is null then raise exception 'result_required'; end if;
  if m.result_type in ('win','walkover') and m.winner_team_id is null then raise exception 'winner_required'; end if;
  v_was := m.result_published_at is not null;

  if m.winner_team_id is not null then
    v_loser := case when m.winner_team_id = m.team_a_id then m.team_b_id else m.team_a_id end;
    if m.next_match_id is not null then
      select * into nm from public.matches where id = m.next_match_id for update;
      if nm.result_published_at is not null
         and (case m.next_slot when 'a' then nm.team_a_id else nm.team_b_id end) is distinct from m.winner_team_id then
        raise exception 'next_match_already_played';
      end if;
      update public.matches set team_a_id = case when m.next_slot = 'a' then m.winner_team_id else team_a_id end,
                                team_b_id = case when m.next_slot = 'b' then m.winner_team_id else team_b_id end
       where id = m.next_match_id;
    end if;
    if m.loser_next_match_id is not null then
      update public.matches set team_a_id = case when m.loser_next_slot = 'a' then v_loser else team_a_id end,
                                team_b_id = case when m.loser_next_slot = 'b' then v_loser else team_b_id end
       where id = m.loser_next_match_id;
    end if;
  end if;

  update public.matches set result_published_at = now(), fixture_published = true,
         status = case when result_type = 'walkover' then 'walkover'::public.match_status else 'completed'::public.match_status end
   where id = m.id;
  if m.stage = 'league' then perform public.recompute_standings(t.id); end if;
  if v_was then
    perform public._audit('result_edited', 'match', m.id, to_jsonb(m), (select to_jsonb(x) from public.matches x where x.id = m.id));
  end if;
end $$;

create or replace function public.set_match_live(p_match_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m public.matches;
begin
  select * into m from public.matches where id = p_match_id;
  if not found then raise exception 'not_found'; end if;
  perform public._require_organizer(m.tournament_id);
  if m.team_a_id is null or m.team_b_id is null then raise exception 'teams_not_set'; end if;
  update public.matches set status = 'live' where id = m.id and result_published_at is null;
end $$;

-- ---------- Announcements ----------
create or replace function public.post_announcement(p_tid uuid, p_title text, p_body text, p_pin boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare t public.tournaments; v_id uuid;
begin
  t := public._require_organizer(p_tid);
  if p_pin then update public.announcements set is_pinned = false where tournament_id = t.id; end if;
  insert into public.announcements(tournament_id, title, body, is_pinned, created_by) values (t.id, p_title, p_body, p_pin, auth.uid()) returning id into v_id;
  perform public._notify_members(t.id, 'announcement', p_title, left(p_body, 140), '/tournaments/' || t.slug);
  return v_id;
end $$;

-- ---------- Chat ----------
create or replace function public.post_chat_message(p_tid uuid, p_body text, p_reply_to uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_body text := trim(p_body);
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not (public.is_tournament_member(p_tid) or public.is_admin()) then raise exception 'not_a_member'; end if;
  if v_body is null or char_length(v_body) < 1 or char_length(v_body) > 500 then raise exception 'invalid_message'; end if;
  if exists (select 1 from public.chat_mutes where tournament_id = p_tid and user_id = auth.uid() and muted_until > now()) then raise exception 'muted'; end if;
  if exists (select 1 from public.chat_messages where tournament_id = p_tid and user_id = auth.uid() and created_at > now() - interval '3 seconds') then raise exception 'slow_mode'; end if;
  insert into public.chat_messages(tournament_id, user_id, body, reply_to) values (p_tid, auth.uid(), v_body, p_reply_to) returning id into v_id;
  return v_id;
end $$;

create or replace function public.delete_chat_message(p_message_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.chat_messages;
begin
  select * into c from public.chat_messages where id = p_message_id;
  if not found then raise exception 'not_found'; end if;
  if not (c.user_id = auth.uid() or public.is_tournament_organizer(c.tournament_id) or public.is_admin()) then raise exception 'forbidden'; end if;
  update public.chat_messages set is_deleted = true, deleted_by = auth.uid(), body = '[deleted]' where id = c.id;
end $$;

create or replace function public.mute_chat_user(p_tid uuid, p_user uuid, p_minutes int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_tournament_organizer(p_tid) or public.is_admin()) then raise exception 'forbidden'; end if;
  if p_user = auth.uid() then raise exception 'cannot_mute_self'; end if;
  insert into public.chat_mutes(tournament_id, user_id, muted_until, muted_by)
  values (p_tid, p_user, now() + make_interval(mins => greatest(p_minutes, 1)), auth.uid())
  on conflict (tournament_id, user_id) do update set muted_until = excluded.muted_until, muted_by = excluded.muted_by;
end $$;

create or replace function public.report_content(p_target_type text, p_target_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_snap jsonb := '{}'::jsonb; v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_target_type = 'chat_message' then select to_jsonb(c) into v_snap from public.chat_messages c where c.id = p_target_id;
  elsif p_target_type = 'tournament' then select jsonb_build_object('name', name, 'slug', slug) into v_snap from public.tournaments where id = p_target_id;
  elsif p_target_type = 'profile' then select jsonb_build_object('username', username, 'name', full_name) into v_snap from public.profiles where id = p_target_id;
  end if;
  insert into public.reports(reporter_id, target_type, target_id, reason, snapshot) values (auth.uid(), p_target_type, p_target_id, left(p_reason, 500), coalesce(v_snap,'{}')) returning id into v_id;
  return v_id;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'close_registration(uuid)','reopen_registration(uuid)','lock_squads(uuid)','go_live(uuid)','complete_tournament(uuid)','lock_pool(uuid)',
    'publish_match_result(uuid)','set_match_live(uuid)','post_announcement(uuid,text,text,boolean)',
    'post_chat_message(uuid,text,uuid)','delete_chat_message(uuid)','mute_chat_user(uuid,uuid,int)','report_content(text,uuid,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
