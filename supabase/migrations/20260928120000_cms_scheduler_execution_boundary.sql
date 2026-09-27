begin;

-- Preserve the deterministic engine for a controlled, direct database operator
-- session. Renaming retains its locking, retry and idempotency behavior.
alter function public.cms_process_due_promotion_schedules(timestamptz,integer)
  rename to cms_process_due_promotion_schedules_at;

revoke all on function public.cms_process_due_promotion_schedules_at(timestamptz,integer)
  from public, anon, authenticated, service_role;

-- The eventual cron identity will receive EXECUTE on this function only. A
-- SECURITY DEFINER wrapper is needed because the scheduler has no direct
-- privileges on the forced-RLS scheduling tables or on the internal core.
-- Sample the database wall clock once; the core uses that timestamp for the
-- entire batch. No caller can supply an arbitrary production timestamp.
create function public.cms_process_due_promotion_schedules(batch_limit integer default 100)
returns integer language plpgsql security definer set search_path = '' as $$
declare trusted_now timestamptz;
begin
  trusted_now := pg_catalog.clock_timestamp();
  return public.cms_process_due_promotion_schedules_at(trusted_now, batch_limit);
end; $$;

alter function public.cms_process_due_promotion_schedules(integer) owner to postgres;
revoke all on function public.cms_process_due_promotion_schedules(integer)
  from public, anon, authenticated, service_role;

-- No machine role or cron job is provisioned by this migration.
commit;
