-- 0001_enums_and_utils.sql
-- Enumerated types and tiny shared utilities.

create type public.user_status        as enum ('active','suspended','banned');
create type public.tournament_status  as enum ('draft','paid','registration_open','registration_closed','auction','squads_locked','live','completed','cancelled');
create type public.tournament_format  as enum ('league','knockout','league_playoffs');
create type public.squad_mode         as enum ('auction','direct');
create type public.team_entry         as enum ('invite','open','both');
create type public.visibility         as enum ('public','unlisted');
create type public.team_status        as enum ('invited','pending','approved','rejected','withdrawn');
create type public.application_status as enum ('pending','approved','rejected','withdrawn');
create type public.invite_status      as enum ('pending','accepted','revoked','expired');
create type public.squad_source       as enum ('auction','direct','invite');
create type public.lot_status         as enum ('upcoming','on_block','sold','unsold');
create type public.auction_status     as enum ('not_scheduled','scheduled','live','paused','completed');
create type public.match_status       as enum ('scheduled','live','completed','postponed','cancelled','abandoned','walkover');
create type public.payment_status     as enum ('created','paid','failed','refunded');
create type public.subscription_status as enum ('created','active','past_due','cancelled','expired');
create type public.refund_status      as enum ('requested','approved','processed','rejected');
create type public.report_status      as enum ('open','reviewing','resolved','dismissed');

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
