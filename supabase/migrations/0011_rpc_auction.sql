-- 0011_rpc_auction.sql
-- Live auction engine. Every bid is validated here, inside one transaction, with row locks.
-- Realtime: each state change inserts into auction_events AND broadcasts on topic 'auction:<tournament_id>'.

create or replace function public._auction_event(p_tid uuid, p_type text, p_payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.auction_events(tournament_id, type, payload) values (p_tid, p_type, p_payload);
  perform public._broadcast('auction:' || p_tid::text, p_type, p_payload);
end $$;
revoke all on function public._auction_event(uuid,text,jsonb) from public, anon, authenticated;

create or replace function public.next_bid_amount(p_lot_id uuid)
returns int language plpgsql stable security definer set search_path = public as $$
declare l public.auction_lots; s public.auction_settings; v_base int; v_step int;
begin
  select * into l from public.auction_lots where id = p_lot_id;
  if not found then return null; end if;
  select * into s from public.auction_settings where tournament_id = l.tournament_id;
  select base_price into v_base from public.pool_players where tournament_id = l.tournament_id and user_id = l.player_id;
  if l.current_bid is null then return greatest(coalesce(v_base, 0), 1); end if;
  select (slab->>'step')::int into v_step
    from jsonb_array_elements(s.increment_slabs) slab
   where l.current_bid >= (slab->>'from')::int and ((slab->>'to') is null or l.current_bid < (slab->>'to')::int)
   order by (slab->>'from')::int desc limit 1;
  return l.current_bid + coalesce(v_step, 1);
end $$;
grant execute on function public.next_bid_amount(uuid) to anon, authenticated;

create or replace function public.schedule_auction(p_tid uuid, p_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments; s public.auction_settings;
begin
  t := public._require_organizer(p_tid);
  select * into s from public.auction_settings where tournament_id = t.id for update;
  if not found or not s.pool_locked then raise exception 'pool_not_locked'; end if;
  if s.status not in ('not_scheduled','scheduled') then raise exception 'invalid_status'; end if;
  update public.auction_settings set scheduled_at = p_at, status = 'scheduled' where tournament_id = t.id;
  perform public._notify_members(t.id, 'auction_scheduled', 'Auction scheduled', t.name || ' auction on ' || to_char(p_at at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI am'), '/tournaments/' || t.slug || '/auction');
end $$;

create or replace function public.start_auction(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments; s public.auction_settings; v_noman int;
begin
  t := public._require_organizer(p_tid);
  select * into s from public.auction_settings where tournament_id = t.id for update;
  if not found or not s.pool_locked then raise exception 'pool_not_locked'; end if;
  if s.status not in ('not_scheduled','scheduled') then raise exception 'invalid_status'; end if;
  if t.status <> 'registration_closed' then raise exception 'registration_must_be_closed'; end if;
  if (select count(*) from public.team_purses where tournament_id = t.id) < 2 then raise exception 'need_two_teams'; end if;
  select count(*) into v_noman from public.teams where tournament_id = t.id and status = 'approved' and manager_id is null;
  if v_noman > 0 then raise exception 'teams_without_manager'; end if;
  perform set_config('app.bypass_guard','1',true);
  update public.tournaments set status = 'auction' where id = t.id;
  update public.auction_settings set status = 'live' where tournament_id = t.id;
  perform public._auction_event(t.id, 'auction_started', '{}'::jsonb);
  perform public._notify_members(t.id, 'auction_live', 'Auction is live', t.name, '/tournaments/' || t.slug || '/auction/live');
end $$;

create or replace function public.pause_auction(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_organizer(p_tid);
  update public.auction_settings set status = 'paused' where tournament_id = p_tid and status = 'live';
  perform public._auction_event(p_tid, 'auction_paused', '{}'::jsonb);
end $$;

create or replace function public.resume_auction(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_organizer(p_tid);
  update public.auction_settings set status = 'live' where tournament_id = p_tid and status = 'paused';
  perform public._auction_event(p_tid, 'auction_resumed', '{}'::jsonb);
end $$;

create or replace function public.select_lot(p_tid uuid, p_player_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare l public.auction_lots; pp public.pool_players; v_name text;
begin
  perform public._require_organizer(p_tid);
  if not exists (select 1 from public.auction_settings where tournament_id = p_tid and status = 'live') then raise exception 'auction_not_live'; end if;
  if exists (select 1 from public.auction_lots where tournament_id = p_tid and status = 'on_block') then raise exception 'lot_already_on_block'; end if;
  select * into l from public.auction_lots where tournament_id = p_tid and player_id = p_player_id for update;
  if not found or l.status not in ('upcoming','unsold') then raise exception 'lot_not_available'; end if;
  update public.auction_lots set status = 'on_block', bidding_open = false, opened_at = now(), closed_at = null,
         current_bid = null, current_team_id = null where id = l.id;
  update public.pool_players set lot_status = 'on_block' where tournament_id = p_tid and user_id = p_player_id returning * into pp;
  select full_name into v_name from public.profiles where id = p_player_id;
  perform public._auction_event(p_tid, 'lot_selected', jsonb_build_object('lot_id', l.id, 'player_id', p_player_id, 'player_name', v_name,
            'category', pp.category, 'base_price', pp.base_price, 'next_bid', greatest(pp.base_price,1)));
  return l.id;
end $$;

create or replace function public.open_bidding(p_lot_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l public.auction_lots;
begin
  select * into l from public.auction_lots where id = p_lot_id for update;
  if not found then raise exception 'not_found'; end if;
  perform public._require_organizer(l.tournament_id);
  if l.status <> 'on_block' then raise exception 'lot_not_on_block'; end if;
  if not exists (select 1 from public.auction_settings where tournament_id = l.tournament_id and status = 'live') then raise exception 'auction_not_live'; end if;
  update public.auction_lots set bidding_open = true where id = l.id;
  perform public._auction_event(l.tournament_id, 'bidding_opened', jsonb_build_object('lot_id', l.id, 'next_bid', public.next_bid_amount(l.id)));
end $$;

create or replace function public.announce_lot(p_lot_id uuid, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
declare l public.auction_lots;
begin
  if p_kind not in ('going_once','going_twice') then raise exception 'invalid_kind'; end if;
  select * into l from public.auction_lots where id = p_lot_id;
  if not found then raise exception 'not_found'; end if;
  perform public._require_organizer(l.tournament_id);
  perform public._auction_event(l.tournament_id, p_kind, jsonb_build_object('lot_id', l.id));
end $$;

create or replace function public.place_bid(p_lot_id uuid, p_expected_amount int)
returns void language plpgsql security definer set search_path = public as $$
declare l public.auction_lots; t public.tournaments; s public.auction_settings; tm public.teams; pu public.team_purses;
        v_amount int; v_remaining int; v_owned int; v_cat text; v_limit int; v_owned_cat int; v_min_base int; v_need int; v_bid_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into l from public.auction_lots where id = p_lot_id for update;       -- serialises concurrent bids on this lot
  if not found then raise exception 'not_found'; end if;
  select * into s from public.auction_settings where tournament_id = l.tournament_id;
  if s.status = 'paused' then raise exception 'auction_paused'; end if;
  if s.status <> 'live' or l.status <> 'on_block' or not l.bidding_open then raise exception 'bidding_closed'; end if;
  select * into t from public.tournaments where id = l.tournament_id;
  select * into tm from public.teams where tournament_id = l.tournament_id and manager_id = auth.uid() and status = 'approved';
  if not found then raise exception 'not_a_bidder'; end if;
  select * into pu from public.team_purses where team_id = tm.id for update;

  v_amount := public.next_bid_amount(l.id);
  if p_expected_amount is distinct from v_amount then raise exception 'bid_changed'; end if;
  if l.current_team_id = tm.id then raise exception 'already_highest'; end if;
  v_remaining := pu.total - pu.spent;
  if v_amount > v_remaining then raise exception 'insufficient_purse'; end if;

  select count(*) into v_owned from public.squad_members where team_id = tm.id;
  if t.squad_max is not null and v_owned >= t.squad_max then raise exception 'squad_full'; end if;

  select category into v_cat from public.pool_players where tournament_id = l.tournament_id and user_id = l.player_id;
  v_limit := (s.category_limits ->> v_cat)::int;
  if v_limit is not null then
    select count(*) into v_owned_cat from public.squad_members sm
      join public.pool_players pp on pp.tournament_id = sm.tournament_id and pp.user_id = sm.user_id
     where sm.team_id = tm.id and pp.category = v_cat;
    if v_owned_cat >= v_limit then raise exception 'category_limit'; end if;
  end if;

  if s.reserve_rule then
    select coalesce(min(base_price), 0) into v_min_base from public.pool_players where tournament_id = l.tournament_id;
    v_need := v_min_base * greatest(coalesce(t.squad_min, 0) - v_owned - 1, 0);
    if v_remaining - v_amount < v_need then raise exception 'reserve_rule'; end if;
  end if;

  insert into public.bids(lot_id, tournament_id, team_id, amount, placed_by) values (l.id, l.tournament_id, tm.id, v_amount, auth.uid()) returning id into v_bid_id;
  update public.auction_lots set current_bid = v_amount, current_team_id = tm.id where id = l.id;
  perform public._auction_event(l.tournament_id, 'bid_placed', jsonb_build_object('lot_id', l.id, 'bid_id', v_bid_id, 'team_id', tm.id,
            'team_name', tm.name, 'amount', v_amount, 'next_bid', public.next_bid_amount(l.id)));
end $$;

create or replace function public.undo_last_bid(p_lot_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare l public.auction_lots; b public.bids; prev public.bids;
begin
  select * into l from public.auction_lots where id = p_lot_id for update;
  if not found then raise exception 'not_found'; end if;
  perform public._require_organizer(l.tournament_id);
  if coalesce(trim(p_reason),'') = '' then raise exception 'reason_required'; end if;
  if l.status <> 'on_block' then raise exception 'lot_not_on_block'; end if;
  select * into b from public.bids where lot_id = l.id and not is_undone order by placed_at desc, id desc limit 1;
  if not found then raise exception 'no_bid_to_undo'; end if;
  update public.bids set is_undone = true, undone_by = auth.uid(), undo_reason = p_reason where id = b.id;
  select * into prev from public.bids where lot_id = l.id and not is_undone order by placed_at desc, id desc limit 1;
  update public.auction_lots set current_bid = prev.amount, current_team_id = prev.team_id where id = l.id;
  perform public._auction_event(l.tournament_id, 'bid_undone', jsonb_build_object('lot_id', l.id, 'bid_id', b.id, 'current_bid', prev.amount,
            'team_id', prev.team_id, 'next_bid', public.next_bid_amount(l.id)));
  perform public._audit('bid_undone', 'bid', b.id, to_jsonb(b), null, p_reason);
end $$;

create or replace function public.close_lot_sold(p_lot_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l public.auction_lots; tm public.teams;
begin
  select * into l from public.auction_lots where id = p_lot_id for update;
  if not found then raise exception 'not_found'; end if;
  perform public._require_organizer(l.tournament_id);
  if l.status <> 'on_block' then raise exception 'lot_not_on_block'; end if;
  if l.current_bid is null then raise exception 'no_bids'; end if;
  select * into tm from public.teams where id = l.current_team_id;
  update public.auction_lots set status = 'sold', bidding_open = false, closed_at = now(), sold_price = l.current_bid, sold_team_id = l.current_team_id where id = l.id;
  update public.pool_players set lot_status = 'sold' where tournament_id = l.tournament_id and user_id = l.player_id;
  insert into public.squad_members(team_id, tournament_id, user_id, source, price) values (l.current_team_id, l.tournament_id, l.player_id, 'auction', l.current_bid);
  update public.team_purses set spent = spent + l.current_bid where team_id = l.current_team_id;
  perform public._auction_event(l.tournament_id, 'lot_sold', jsonb_build_object('lot_id', l.id, 'player_id', l.player_id, 'team_id', tm.id, 'team_name', tm.name, 'price', l.current_bid));
  perform public._notify(l.player_id, 'auction_sold', 'You were picked!', tm.name || ' picked you for ' || l.current_bid || ' points', '/player/tournaments');
end $$;

create or replace function public.close_lot_unsold(p_lot_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l public.auction_lots;
begin
  select * into l from public.auction_lots where id = p_lot_id for update;
  if not found then raise exception 'not_found'; end if;
  perform public._require_organizer(l.tournament_id);
  if l.status <> 'on_block' then raise exception 'lot_not_on_block'; end if;
  update public.auction_lots set status = 'unsold', bidding_open = false, closed_at = now(), current_bid = null, current_team_id = null where id = l.id;
  update public.pool_players set lot_status = 'unsold' where tournament_id = l.tournament_id and user_id = l.player_id;
  perform public._auction_event(l.tournament_id, 'lot_unsold', jsonb_build_object('lot_id', l.id, 'player_id', l.player_id));
end $$;

create or replace function public.end_auction(p_tid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  t := public._require_organizer(p_tid);
  if exists (select 1 from public.auction_lots where tournament_id = t.id and status = 'on_block') then raise exception 'lot_on_block'; end if;
  update public.auction_lots set status = 'unsold' where tournament_id = t.id and status = 'upcoming';
  update public.pool_players set lot_status = 'unsold' where tournament_id = t.id and lot_status = 'upcoming';
  update public.auction_settings set status = 'completed' where tournament_id = t.id and status in ('live','paused');
  perform public._auction_event(t.id, 'auction_ended', '{}'::jsonb);
  perform public._notify_members(t.id, 'auction_completed', 'Auction completed', t.name, '/tournaments/' || t.slug || '/auction');
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'schedule_auction(uuid,timestamptz)','start_auction(uuid)','pause_auction(uuid)','resume_auction(uuid)','select_lot(uuid,uuid)',
    'open_bidding(uuid)','announce_lot(uuid,text)','place_bid(uuid,int)','undo_last_bid(uuid,text)','close_lot_sold(uuid)',
    'close_lot_unsold(uuid)','end_auction(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
