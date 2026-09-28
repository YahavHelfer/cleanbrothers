begin;

-- Available in the isolated Supabase stack; no job is created here.
create extension if not exists pg_cron;

-- Durable execution identity only. Job creation is an explicit cloud operation;
-- local migrations must never start a background scheduler.
create role cms_scheduler login password null nosuperuser nocreatedb nocreaterole
  noreplication nobypassrls noinherit;
grant usage on schema public to cms_scheduler;
grant execute on function public.cms_process_due_promotion_schedules(integer)
  to cms_scheduler;

-- The explicit provisioning command still checks the hosted extension and
-- never assumes a job was created by this migration.
commit;
