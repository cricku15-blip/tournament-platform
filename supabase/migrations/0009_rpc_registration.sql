-- 0009_rpc_registration.sql
-- Server-side "referee" functions for profiles, applications, teams, invites, squads, payments.
-- Error codes are the exception MESSAGE (e.g. 'city_mismatch'); the web app maps them to friendly text.

create or replace function public.change_city(p_city_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.cities where id = p_city_id and is_active) then raise exception 'city_not_found'; end if;
  update public.profiles set city_id = p_city_id where id = auth.uid();
end $$;

create or replace function public.apply_as_player(
  p_tournament_id uuid, p_role text, p_experience text,
  p_contact_phone text default null, p_notes text default null,
  p_answers jsonb default '{}'::jsonb, p_details jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_p public.profiles; v_t public.tournaments; v_existing public.player_applications; v_id uuid; v_count int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_p from public.profiles where id = v_uid;
  if v_p.status <> 'active' or v_p.onboarded_at is null then raise exception 'profile_incomplete'; end if;
  select * into v_t from public.tournaments where id = p_tournament_id;
  if not found or v_t.status <> 'registration_open' then raise exception 'registration_closed'; end if;
  if not v_t.allow_player_applications then raise exception 'applications_disabled'; end if;
  if v_t.player_deadline is not null and now() > v_t.player_deadline then raise exception 'registration_closed'; end if;
  if v_p.city_id is distinct from v_t.city_id then raise exception 'city_mismatch'; end if;
  if not public.has_active_subscription(v_uid) then raise exception 'subscription_required'; end if;
  if exists (select 1 from public.squad_members where tournament_id = p_tournament_id and user_id = v_uid) then raise exception 'already_in_squad'; end if;
  if v_t.player_pool_cap is not null then
    select count(*) into v_count from public.player_applications where tournament_id = p_tournament_id and status in ('pending','approved');
    if v_count >= v_t.player_pool_cap then raise exception 'pool_full'; end if;
  end if;

  select * into v_existing from public.player_applications where tournament_id = p_tournament_id and user_id = v_uid for update;
  if found then
    if v_existing.status <> 'withdrawn' then raise exception 'already_applied'; end if;
    update public.player_applications set status = 'pending', role = p_role, experience = p_experience, contact_phone = p_contact_phone,
      notes = p_notes, answers = p_answers, details = p_details, reviewed_by = null, reviewed_at = null, reject_reason = null
    where id = v_existing.id returning id into v_id;
  else
    insert into public.player_applications(tournament_id, user_id, role, experience, contact_phone, notes, answers, details)
    values (p_tournament_id, v_uid, p_role, p_experience, p_contact_phone, p_notes, p_answers, p_details) returning id into v_id;
  end if;
  perform public._notify(v_t.organizer_id, 'player_applied', 'New player application', v_p.full_name || ' applied to ' || v_t.name,
                         '/organizer/tournaments/' || v_t.id || '?tab=applications');
  return v_id;
end $$;

create or replace function public.withdraw_application(p_application_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a public.player_applications; t public.tournaments;
begin
  select * into a from public.player_applications where id = p_application_id for update;
  if not found or a.user_id <> auth.uid() then raise exception 'forbidden'; end if;
  if a.status not in ('pending','approved') then raise exception 'cannot_withdraw'; end if;
  select * into t from public.tournaments where id = a.tournament_id;
  if exists (select 1 from public.squad_members where tournament_id = a.tournament_id and user_id = a.user_id) then raise exception 'already_in_squad'; end if;
  if exists (select 1 from public.auction_settings where tournament_id = a.tournament_id and pool_locked) then raise exception 'pool_locked'; end if;
  update public.player_applications set status = 'withdrawn' where id = a.id;
  delete from public.pool_players where tournament_id = a.tournament_id and user_id = a.user_id and lot_status = 'upcoming';
end $$;

create or replace function public.review_application(p_application_id uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare a public.player_applications; t public.tournaments; v_base int;
begin
  select * into a from public.player_applications where id = p_application_id for update;
  if not found then raise exception 'not_found'; end if;
  select * into t from public.tournaments where id = a.tournament_id;
  if not (t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'forbidden'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_decision'; end if;
  if a.status <> 'pending' then raise exception 'already_reviewed'; end if;
  if p_decision = 'approved' and exists (select 1 from public.auction_settings where tournament_id = t.id and pool_locked) then raise exception 'pool_locked'; end if;
  update public.player_applications
     set status = p_decision::public.application_status, reviewed_by = auth.uid(), reviewed_at = now(),
         reject_reason = case when p_decision = 'rejected' then p_reason end
   where id = a.id;
  if p_decision = 'approved' and t.squad_mode = 'auction' then
    select coalesce((s.base_prices ->> a.role)::int, 0) into v_base from public.auction_settings s where s.tournament_id = t.id;
    insert into public.pool_players(tournament_id, user_id, category, base_price)
    values (t.id, a.user_id, a.role, coalesce(v_base, 0)) on conflict (tournament_id, user_id) do nothing;
  end if;
  perform public._notify(a.user_id, 'application_' || p_decision,
    case p_decision when 'approved' then 'Application approved' else 'Application not approved' end,
    t.name, '/player/applications');
end $$;

create or replace function public.publish_tournament(p_tournament_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found or not (t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'forbidden'; end if;
  if t.status <> 'paid' or not exists (select 1 from public.tournament_payments where tournament_id = t.id and status = 'paid') then
    raise exception 'payment_required';
  end if;
  if t.venue_name is null or t.start_date is null or t.end_date is null or t.description_short is null or t.squad_min is null or t.squad_max is null then
    raise exception 'tournament_incomplete';
  end if;
  if t.squad_mode = 'auction' then
    insert into public.auction_settings(tournament_id) values (t.id) on conflict do nothing;
  end if;
  perform set_config('app.bypass_guard', '1', true);
  update public.tournaments set status = 'registration_open', published_at = now() where id = t.id;
end $$;

create or replace function public.cancel_tournament(p_tournament_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments; r record;
begin
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found or not (t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'forbidden'; end if;
  if t.status in ('completed','cancelled') then raise exception 'invalid_status'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'reason_required'; end if;
  perform set_config('app.bypass_guard', '1', true);
  update public.tournaments set status = 'cancelled', cancelled_reason = p_reason where id = t.id;
  for r in select distinct u from (
      select manager_id as u from public.teams where tournament_id = t.id and manager_id is not null
      union select user_id from public.player_applications where tournament_id = t.id and status = 'approved') x
  loop
    perform public._notify(r.u, 'tournament_cancelled', 'Tournament cancelled', t.name || ': ' || p_reason, '/tournaments/' || t.slug);
  end loop;
  perform public._audit('tournament_cancelled', 'tournament', t.id, null, jsonb_build_object('reason', p_reason), p_reason);
end $$;

-- ---------- Teams and invites ----------
create or replace function public.create_team_invite(p_team_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare tm public.teams; v_code text;
begin
  select * into tm from public.teams where id = p_team_id;
  if not found or not (public.is_tournament_organizer(tm.tournament_id) or public.is_admin()) then raise exception 'forbidden'; end if;
  if tm.manager_id is not null then raise exception 'team_has_manager'; end if;
  update public.team_invites set status = 'revoked' where team_id = p_team_id and status = 'pending';
  insert into public.team_invites(team_id, tournament_id, invited_by) values (tm.id, tm.tournament_id, auth.uid()) returning code into v_code;
  return v_code;
end $$;

create or replace function public.accept_team_invite(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare i public.team_invites; tm public.teams; t public.tournaments;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into i from public.team_invites where code = p_code for update;
  if not found or i.status <> 'pending' then raise exception 'invite_invalid'; end if;
  if i.expires_at < now() then update public.team_invites set status = 'expired' where id = i.id; raise exception 'invite_invalid'; end if;
  select * into tm from public.teams where id = i.team_id for update;
  if tm.manager_id is not null then raise exception 'invite_invalid'; end if;
  select * into t from public.tournaments where id = tm.tournament_id;
  if t.status in ('completed','cancelled') then raise exception 'invite_invalid'; end if;
  begin
    perform set_config('app.bypass_guard', '1', true);
    update public.teams set manager_id = auth.uid(), status = 'approved' where id = tm.id;
  exception when unique_violation then
    raise exception 'already_manager_in_tournament';
  end;
  update public.team_invites set status = 'accepted', used_by = auth.uid(), used_at = now() where id = i.id;
  perform public._notify(t.organizer_id, 'manager_joined', 'Manager accepted invite', tm.name || ' now has a manager', '/organizer/tournaments/' || t.id || '?tab=teams');
  return tm.id;
end $$;

create or replace function public.apply_with_team(
  p_tournament_id uuid, p_name text, p_logo_url text default null, p_color_primary text default null, p_color_secondary text default null,
  p_home_ground text default null, p_manager_phone text default null, p_expected_squad_size int default null, p_notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare t public.tournaments; v_slug text; v_id uuid; v_count int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into t from public.tournaments where id = p_tournament_id;
  if not found or t.status <> 'registration_open' then raise exception 'registration_closed'; end if;
  if t.team_entry not in ('open','both') then raise exception 'team_applications_disabled'; end if;
  if t.team_deadline is not null and now() > t.team_deadline then raise exception 'registration_closed'; end if;
  select count(*) into v_count from public.teams where tournament_id = t.id and status in ('invited','pending','approved');
  if v_count >= t.team_count then raise exception 'tournament_full'; end if;
  v_slug := public.slugify(p_name);
  if v_slug = '' then raise exception 'invalid_name'; end if;
  if exists (select 1 from public.teams where tournament_id = t.id and slug = v_slug) then v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4); end if;
  begin
    insert into public.teams(tournament_id, name, slug, logo_url, color_primary, color_secondary, home_ground, manager_id, manager_phone, expected_squad_size, notes, status)
    values (t.id, p_name, v_slug, p_logo_url, p_color_primary, p_color_secondary, p_home_ground, auth.uid(), p_manager_phone, p_expected_squad_size, p_notes, 'pending')
    returning id into v_id;
  exception when unique_violation then
    raise exception 'team_name_or_manager_exists';
  end;
  perform public._notify(t.organizer_id, 'team_applied', 'New team application', p_name, '/organizer/tournaments/' || t.id || '?tab=teams');
  return v_id;
end $$;

create or replace function public.review_team(p_team_id uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare tm public.teams;
begin
  select * into tm from public.teams where id = p_team_id for update;
  if not found or not (public.is_tournament_organizer(tm.tournament_id) or public.is_admin()) then raise exception 'forbidden'; end if;
  if tm.status <> 'pending' then raise exception 'already_reviewed'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_decision'; end if;
  perform set_config('app.bypass_guard', '1', true);
  update public.teams set status = p_decision::public.team_status where id = tm.id;
  if tm.manager_id is not null then
    perform public._notify(tm.manager_id, 'team_' || p_decision, 'Team application ' || p_decision, tm.name || coalesce(': ' || p_reason, ''), '/manager/teams/' || tm.id);
  end if;
end $$;

-- ---------- Squads (direct mode) ----------
create or replace function public.add_squad_player(p_team_id uuid, p_user_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare tm public.teams; t public.tournaments; v_city uuid; v_id uuid;
begin
  select * into tm from public.teams where id = p_team_id;
  if not found then raise exception 'not_found'; end if;
  select * into t from public.tournaments where id = tm.tournament_id;
  if not (tm.manager_id = auth.uid() or t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'forbidden'; end if;
  if t.squad_mode <> 'direct' then raise exception 'not_direct_mode'; end if;
  if tm.status <> 'approved' then raise exception 'team_not_approved'; end if;
  if tm.squad_locked then raise exception 'squad_locked'; end if;
  if t.status not in ('registration_open','registration_closed') then raise exception 'squad_changes_closed'; end if;
  select city_id into v_city from public.profiles where id = p_user_id and status = 'active';
  if not found then raise exception 'player_not_found'; end if;
  -- OPEN DECISION #5 in the spec: delete the next line if direct adds may come from any city
  if v_city is distinct from t.city_id then raise exception 'city_mismatch'; end if;
  begin
    insert into public.squad_members(team_id, tournament_id, user_id, source) values (tm.id, t.id, p_user_id, 'direct') returning id into v_id;
  exception when unique_violation then raise exception 'player_already_in_a_team';
  end;
  perform public._notify(p_user_id, 'added_to_team', 'You were added to a team', tm.name || ' in ' || t.name, '/player/tournaments');
  return v_id;
end $$;

create or replace function public.remove_squad_player(p_member_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m public.squad_members; tm public.teams; t public.tournaments;
begin
  select * into m from public.squad_members where id = p_member_id;
  if not found then raise exception 'not_found'; end if;
  select * into tm from public.teams where id = m.team_id;
  select * into t from public.tournaments where id = m.tournament_id;
  if not (tm.manager_id = auth.uid() or t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'forbidden'; end if;
  if m.source = 'auction' and not (t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'auction_squad_locked'; end if;
  if tm.squad_locked and not (t.organizer_id = auth.uid() or public.is_admin()) then raise exception 'squad_locked'; end if;
  delete from public.squad_members where id = m.id;
end $$;

create or replace function public.set_jersey_number(p_member_id uuid, p_jersey int)
returns void language plpgsql security definer set search_path = public as $$
declare m public.squad_members; tm public.teams;
begin
  select * into m from public.squad_members where id = p_member_id;
  if not found then raise exception 'not_found'; end if;
  select * into tm from public.teams where id = m.team_id;
  if not (tm.manager_id = auth.uid() or public.is_tournament_organizer(m.tournament_id) or public.is_admin()) then raise exception 'forbidden'; end if;
  begin
    update public.squad_members set jersey_no = p_jersey where id = m.id;
  exception when unique_violation then raise exception 'jersey_taken';
  end;
end $$;

create or replace function public.set_squad_lock(p_team_id uuid, p_lock boolean)
returns void language plpgsql security definer set search_path = public as $$
declare tm public.teams; t public.tournaments; v_count int; v_org boolean;
begin
  select * into tm from public.teams where id = p_team_id for update;
  if not found then raise exception 'not_found'; end if;
  select * into t from public.tournaments where id = tm.tournament_id;
  v_org := t.organizer_id = auth.uid() or public.is_admin();
  if not (tm.manager_id = auth.uid() or v_org) then raise exception 'forbidden'; end if;
  if not p_lock and not v_org then raise exception 'only_organizer_can_unlock'; end if;
  if p_lock then
    select count(*) into v_count from public.squad_members where team_id = tm.id;
    if v_count < coalesce(t.squad_min, 0) then raise exception 'squad_too_small'; end if;
  end if;
  perform set_config('app.bypass_guard', '1', true);
  update public.teams set squad_locked = p_lock where id = tm.id;
end $$;

-- ---------- Payments (service role only; called by Edge Functions) ----------
create or replace function public.confirm_tournament_payment(p_order_id text, p_payment_id text)
returns void language plpgsql security definer set search_path = public as $$
declare p public.tournament_payments;
begin
  select * into p from public.tournament_payments where razorpay_order_id = p_order_id for update;
  if not found then raise exception 'payment_not_found'; end if;
  if p.status = 'paid' then return; end if;            -- idempotent
  update public.tournament_payments set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now() where id = p.id;
  perform set_config('app.bypass_guard', '1', true);
  if p.kind = 'initial' then
    update public.tournaments set status = 'paid' where id = p.tournament_id and status = 'draft';
  else
    update public.tournaments set team_count = p.target_team_count, pricing_tier_id = p.tier_id where id = p.tournament_id;
  end if;
  perform public._notify(p.organizer_id, 'payment_confirmed', 'Payment confirmed', 'You can now publish your tournament.', '/organizer/tournaments/' || p.tournament_id);
end $$;

revoke all on function public.confirm_tournament_payment(text,text) from public, anon, authenticated;
grant execute on function public.confirm_tournament_payment(text,text) to service_role;

-- Client-callable functions: signed-in users only
do $$
declare f text;
begin
  foreach f in array array[
    'change_city(uuid)','apply_as_player(uuid,text,text,text,text,jsonb,jsonb)','withdraw_application(uuid)',
    'review_application(uuid,text,text)','publish_tournament(uuid)','cancel_tournament(uuid,text)',
    'create_team_invite(uuid)','accept_team_invite(text)',
    'apply_with_team(uuid,text,text,text,text,text,text,int,text)','review_team(uuid,text,text)',
    'add_squad_player(uuid,uuid)','remove_squad_player(uuid)','set_jersey_number(uuid,int)','set_squad_lock(uuid,boolean)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
