-- 0017_admin_support.sql
-- Plan 10 admin panel support. Append-only. NOT yet applied to the live project (see HANDOFF.md).

alter table public.profiles    add column if not exists suspended_until timestamptz;
alter table public.tournaments add column if not exists admin_notes  text;
alter table public.tournaments add column if not exists admin_hidden boolean not null default false;

create index if not exists profiles_status_idx on public.profiles (status) where status <> 'active';
create index if not exists audit_log_created_idx on public.audit_log (created_at desc, id desc);
create index if not exists audit_log_target_idx on public.audit_log (target_type, target_id);

-- Suspensions with an end date are lifted automatically.
create or replace function public.restore_expired_suspensions()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.profiles set status = 'active', suspended_until = null
   where status = 'suspended' and suspended_until is not null and suspended_until <= now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.restore_expired_suspensions() from public, anon, authenticated;

do $$
begin
  perform cron.schedule('restore-suspensions', '*/15 * * * *', 'select public.restore_expired_suspensions()');
exception when others then
  raise notice 'pg_cron not available; schedule public.restore_expired_suspensions() manually';
end $$;
