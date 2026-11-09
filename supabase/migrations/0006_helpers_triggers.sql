-- 0006_helpers_triggers.sql
-- Helper functions used by RLS, plus guard/counter triggers.
-- All helpers are STABLE + SECURITY DEFINER so policies can call them without recursion.

alter table public.tournaments
  add column approved_team_count   int not null default 0,
  add column approved_player_count int not null default 0;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = uid), false);
$$;

create or replace function public.tournament_is_published(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tournaments t where t.id = tid and t.status not in ('draft','paid'));
$$;

create or replace function public.is_tournament_organizer(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tournaments t where t.id = tid and t.organizer_id = auth.uid());
$$;

create or replace function public.is_team_manager(team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teams t where t.id = team and t.manager_id = auth.uid());
$$;

create or replace function public.is_tournament_member(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.tournaments t where t.id = tid and t.organizer_id = auth.uid())
    or exists (select 1 from public.teams t where t.tournament_id = tid and t.manager_id = auth.uid() and t.status = 'approved')
    or exists (select 1 from public.player_applications a where a.tournament_id = tid and a.user_id = auth.uid() and a.status = 'approved')
    or exists (select 1 from public.squad_members s where s.tournament_id = tid and s.user_id = auth.uid())
  );
$$;

create or replace function public.has_active_subscription(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid and (
      s.status = 'active'
      or (s.status = 'cancelled' and s.current_period_end > now())
      or (s.status = 'past_due'  and s.grace_until > now())
    )
  );
$$;

create or replace function public.match_tournament(mid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select tournament_id from public.matches where id = mid;
$$;

create or replace function public.match_result_public(mid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches m
    where m.id = mid and m.result_published_at is not null and public.tournament_is_published(m.tournament_id)
  );
$$;

create or replace function public.tier_for_team_count(n int)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.pricing_tiers where is_active and n between min_teams and max_teams limit 1;
$$;

create or replace function public.slugify(t text)
returns text language sql immutable as $$
  select trim(both '-' from lower(regexp_replace(coalesce(t,''), '[^a-zA-Z0-9]+', '-', 'g')));
$$;

grant execute on function
  public.is_admin(uuid), public.tournament_is_published(uuid), public.is_tournament_organizer(uuid),
  public.is_team_manager(uuid), public.is_tournament_member(uuid), public.has_active_subscription(uuid),
  public.match_tournament(uuid), public.match_result_public(uuid), public.tier_for_team_count(int),
  public.slugify(text)
to anon, authenticated, service_role;

-- Internal helpers (never callable from the client)
create or replace function public._notify(p_user uuid, p_type text, p_title text, p_body text default null, p_link text default null, p_data jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id, type, title, body, link, data) values (p_user, p_type, p_title, p_body, p_link, p_data);
$$;

create or replace function public._audit(p_action text, p_target_type text, p_target_id uuid, p_before jsonb, p_after jsonb, p_reason text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_log(actor_id, action, target_type, target_id, before, after, reason)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_before, p_after, p_reason);
$$;

create or replace function public._broadcast(p_topic text, p_event text, p_payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(p_payload, p_event, p_topic, false);   -- public channel; auction is publicly watchable
exception when others then
  null;  -- never break a transaction because realtime is unavailable
end $$;

revoke all on function public._notify(uuid,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public._audit(text,text,uuid,jsonb,jsonb,text) from public, anon, authenticated;
revoke all on function public._broadcast(text,text,jsonb) from public, anon, authenticated;

-- New auth user -> profile row
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users cannot make themselves admin or un-ban themselves
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_admin := old.is_admin;
    new.status   := old.status;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Tournament guard: status, owner and paid-for fields change only through server functions
create or replace function public.tournaments_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_bypass boolean := coalesce(current_setting('app.bypass_guard', true), '') = '1';
        v_client boolean := auth.uid() is not null and not public.is_admin() and not v_bypass;
begin
  if tg_op = 'INSERT' then
    if v_client then
      new.status := 'draft'; new.organizer_id := auth.uid(); new.published_at := null; new.cancelled_reason := null;
    end if;
    new.pricing_tier_id := public.tier_for_team_count(new.team_count);
    if new.pricing_tier_id is null then raise exception 'no_pricing_tier_for_team_count'; end if;
    return new;
  end if;

  if v_client then
    if new.organizer_id is distinct from old.organizer_id then raise exception 'locked_field: organizer_id'; end if;
    if new.status is distinct from old.status then raise exception 'locked_field: status'; end if;
    if new.published_at is distinct from old.published_at then raise exception 'locked_field: published_at'; end if;
    if old.status <> 'draft' then
      if new.sport_id      is distinct from old.sport_id      then raise exception 'locked_field: sport'; end if;
      if new.city_id       is distinct from old.city_id       then raise exception 'locked_field: city'; end if;
      if new.squad_mode    is distinct from old.squad_mode    then raise exception 'locked_field: squad_mode'; end if;
      if new.team_count    is distinct from old.team_count    then raise exception 'locked_field: team_count'; end if;
      if new.pricing_tier_id is distinct from old.pricing_tier_id then raise exception 'locked_field: tier'; end if;
    end if;
  end if;
  if old.status = 'draft' and new.team_count is distinct from old.team_count then
    new.pricing_tier_id := public.tier_for_team_count(new.team_count);
    if new.pricing_tier_id is null then raise exception 'no_pricing_tier_for_team_count'; end if;
  end if;
  return new;
end $$;
create trigger tournaments_guard_trg before insert or update on public.tournaments
  for each row execute function public.tournaments_guard();

-- Keep old links working when a published tournament's slug changes
create or replace function public.tournaments_slug_redirect()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.slug is distinct from old.slug and old.status not in ('draft','paid') then
    insert into public.slug_redirects(old_slug, tournament_id) values (old.slug, new.id) on conflict (old_slug) do nothing;
  end if;
  return null;
end $$;
create trigger tournaments_slug_redirect_trg after update of slug on public.tournaments
  for each row execute function public.tournaments_slug_redirect();

-- Teams guard: managers may edit only the team profile, never status/owner/lock
create or replace function public.teams_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_bypass boolean := coalesce(current_setting('app.bypass_guard', true), '') = '1';
        v_status public.tournament_status;
begin
  if auth.uid() is null or v_bypass or public.is_admin() or public.is_tournament_organizer(old.tournament_id) then
    return new;
  end if;
  if new.status is distinct from old.status or new.tournament_id is distinct from old.tournament_id
     or new.manager_id is distinct from old.manager_id or new.squad_locked is distinct from old.squad_locked then
    raise exception 'locked_field';
  end if;
  select status into v_status from public.tournaments where id = old.tournament_id;
  if new.name is distinct from old.name and v_status not in ('draft','paid','registration_open') then
    raise exception 'team_name_locked';
  end if;
  return new;
end $$;
create trigger teams_guard_trg before update on public.teams
  for each row execute function public.teams_guard();

-- Squad size cap (covers direct adds and auction sales)
create or replace function public.check_squad_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_max int; v_count int;
begin
  select squad_max into v_max from public.tournaments where id = new.tournament_id;
  if v_max is not null then
    select count(*) into v_count from public.squad_members where team_id = new.team_id;
    if v_count >= v_max then raise exception 'squad_full'; end if;
  end if;
  return new;
end $$;
create trigger squad_limit_trg before insert on public.squad_members
  for each row execute function public.check_squad_limit();

-- Denormalised counters (cheap public lists at scale)
create or replace function public.refresh_team_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_tid uuid := case when tg_op = 'DELETE' then old.tournament_id else new.tournament_id end;
begin
  update public.tournaments set approved_team_count =
    (select count(*) from public.teams where tournament_id = v_tid and status = 'approved') where id = v_tid;
  return null;
end $$;
create trigger teams_count_trg after insert or update of status or delete on public.teams
  for each row execute function public.refresh_team_count();

create or replace function public.refresh_player_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_tid uuid := case when tg_op = 'DELETE' then old.tournament_id else new.tournament_id end;
begin
  update public.tournaments set approved_player_count =
    (select count(*) from public.player_applications where tournament_id = v_tid and status = 'approved') where id = v_tid;
  return null;
end $$;
create trigger apps_count_trg after insert or update of status or delete on public.player_applications
  for each row execute function public.refresh_player_count();

-- updated_at on every table that has the column
do $$
declare r record;
begin
  for r in
    select c.table_name from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'updated_at' and t.table_type = 'BASE TABLE'
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                   'set_updated_at_' || r.table_name, r.table_name);
  end loop;
end $$;
