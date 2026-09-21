begin;

create table public.cms_admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Two equal administrator seats, including a temporarily inactive seat.
  admin_slot smallint not null unique check (admin_slot in (1, 2)),
  role text not null default 'admin' check (role = 'admin'),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.cms_admin_member_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.cms_admin_member_updated_at() from public, anon, authenticated;

create trigger cms_admin_members_updated_at
before update on public.cms_admin_members
for each row execute function public.cms_admin_member_updated_at();

alter table public.cms_admin_members enable row level security;
alter table public.cms_admin_members force row level security;
revoke all on table public.cms_admin_members from public, anon, authenticated;
grant select on table public.cms_admin_members to authenticated;

create policy cms_admin_members_read_own_active
on public.cms_admin_members for select to authenticated
using (user_id = (select auth.uid()) and is_active and role = 'admin');

-- No INSERT/UPDATE/DELETE grants or policies for API roles. Membership changes
-- require the controlled database-owner bootstrap process, never the web client.
create function public.is_cms_admin()
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.cms_admin_members
    where user_id = (select auth.uid()) and is_active and role = 'admin'
  );
$$;
revoke all on function public.is_cms_admin() from public, anon;
grant execute on function public.is_cms_admin() to authenticated;

commit;
