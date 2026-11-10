-- 0016_simple_auction_and_reminders.sql
-- Plan 9: organizer-recorded ("simple mode") auction sales and match reminder flags.
-- Append-only migration. NOT yet applied to the live project (see HANDOFF.md).

-- ---------- Simple mode: one transaction, same rules as the live engine ----------
create or replace function public.record_simple_sale(p_tid uuid, p_player_id uuid, p_team_id uuid, p_price int)
returns void language plpgsql security definer set search_path = public as $$
declare
  t public.tournaments; s public.auction_settings; l public.auction_lots; tm public.teams; pu public.team_purses; pp public.pool_players;
  v_owned int; v_owned_cat int; v_limit int; v_need int; v_min_base int;
begin
  t := public._require_organizer(p_tid);
  select * into s from public.auction_settings where tournament_id = t.id for update;
  if not found or s.mode <> 'simple' then raise exception 'not_simple_mode'; end if;
  if not s.pool_locked then raise exception 'pool_not_locked'; end if;
  if s.status <> 'live' then raise exception 'auction_not_live'; end if;

  select * into l from public.auction_lots where tournament_id = t.id and player_id = p_player_id for update;
  if not found or l.status not in ('upcoming','unsold') then raise exception 'lot_not_available'; end if;
  select * into tm from public.teams where id = p_team_id and tournament_id = t.id and status = 'approved';
  if not found then raise exception 'not_found'; end if;
  select * into pu from public.team_purses where team_id = tm.id for update;
  select * into pp from public.pool_players where tournament_id = t.id and user_id = p_player_id;

  if p_price < greatest(pp.base_price, 1) then raise exception 'price_below_base'; end if;
  if p_price > pu.total - pu.spent then raise exception 'insufficient_purse'; end if;
  select count(*) into v_owned from public.squad_members where team_id = tm.id;
  if t.squad_max is not null and v_owned >= t.squad_max then raise exception 'squad_full'; end if;

  v_limit := nullif(s.category_limits ->> pp.category, '')::int;
  if v_limit is not null then
    select count(*) into v_owned_cat from public.squad_members sm
      join public.pool_players pl on pl.tournament_id = sm.tournament_id and pl.user_id = sm.user_id
     where sm.team_id = tm.id and pl.category is not distinct from pp.category;
    if v_owned_cat >= v_limit then raise exception 'category_limit'; end if;
  end if;

  if s.reserve_rule then
    select coalesce(min(base_price), 0) into v_min_base from public.pool_players where tournament_id = t.id;
    v_need := v_min_base * greatest(coalesce(t.squad_min, 0) - v_owned - 1, 0);
    if pu.total - pu.spent - p_price < v_need then raise exception 'reserve_rule'; end if;
  end if;

  update public.auction_lots set status = 'sold', bidding_open = false, closed_at = now(), current_bid = p_price, current_team_id = tm.id,
         sold_price = p_price, sold_team_id = tm.id where id = l.id;
  update public.pool_players set lot_status = 'sold' where tournament_id = t.id and user_id = p_player_id;
  insert into public.squad_members(team_id, tournament_id, user_id, source, price) values (tm.id, t.id, p_player_id, 'auction', p_price);
  update public.team_purses set spent = spent + p_price where team_id = tm.id;
  perform public._auction_event(t.id, 'lot_sold', jsonb_build_object('lot_id', l.id, 'player_id', p_player_id, 'team_id', tm.id, 'team_name', tm.name, 'price', p_price));
  perform public._notify(p_player_id, 'auction_sold', 'You were picked!', tm.name || ' picked you for ' || p_price || ' points', '/player/tournaments');
  perform public._audit('simple_sale', 'auction_lot', l.id, null, jsonb_build_object('team_id', tm.id, 'price', p_price), null);
end $$;
revoke all on function public.record_simple_sale(uuid, uuid, uuid, int) from public, anon;
grant execute on function public.record_simple_sale(uuid, uuid, uuid, int) to authenticated;

-- ---------- Match reminders (used by the send-reminders Edge Function) ----------
alter table public.matches add column if not exists reminded_24h boolean not null default false;
alter table public.matches add column if not exists reminded_2h  boolean not null default false;
create index if not exists matches_reminder_idx on public.matches (scheduled_at) where fixture_published and result_published_at is null;

alter table public.auction_settings add column if not exists reminded_15m boolean not null default false;
