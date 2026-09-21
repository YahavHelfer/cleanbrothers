begin;

-- Two real administrators is a bootstrap policy, not a permanent table limit.
-- Dropping this column also removes its slot CHECK and UNIQUE constraints.
-- Identity, role, active status, timestamps, RLS and grants are unchanged.
alter table public.cms_admin_members drop column admin_slot;

commit;
