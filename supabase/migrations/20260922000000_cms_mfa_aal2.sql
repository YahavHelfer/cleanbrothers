begin;

-- Invitation lifecycle metadata, not a password/hash or a content table.
-- Existing password-created users need no invitation completion marker.
alter table public.cms_admin_members add column password_setup_completed_at timestamptz;

-- Boolean-only, own-UUID onboarding check. No arguments, rows or content access.
-- The owner must bypass membership RLS so AAL1 can enroll without SELECT rights.
create function public.is_cms_member_for_onboarding()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.cms_admin_members
    where user_id = (select auth.uid()) and is_active and role = 'admin'
  );
$$;
alter function public.is_cms_member_for_onboarding() owner to postgres;
revoke all on function public.is_cms_member_for_onboarding() from public, anon, authenticated;
grant execute on function public.is_cms_member_for_onboarding() to authenticated;

-- Auth generates an unknown temporary password when an invite is confirmed.
-- Do not infer completion from encrypted_password; keep an explicit marker.
-- No Auth row or credential ever leaves this boolean-only function.
create function public.cms_invite_password_pending()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_cms_member_for_onboarding() and exists (
    select 1 from auth.users as u
    join public.cms_admin_members as m on m.user_id = u.id
    where u.id = (select auth.uid()) and u.invited_at is not null
      and m.password_setup_completed_at is null
  );
$$;
alter function public.cms_invite_password_pending() owner to postgres;
revoke all on function public.cms_invite_password_pending() from public, anon, authenticated;
grant execute on function public.cms_invite_password_pending() to authenticated;

-- A request cannot self-attest completion: Supabase must have issued a signed
-- password-authentication claim. The unknown Auth-generated password cannot do
-- this. Only this caller's completion timestamp can change, never role/activation.
create function public.complete_cms_initial_password_setup()
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_cms_member_for_onboarding() then return false; end if;
  if not public.cms_invite_password_pending() then return true; end if;
  if not exists (
    select 1 from pg_catalog.jsonb_array_elements(coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)) as method
    where method ->> 'method' = 'password'
  ) then return false; end if;
  update public.cms_admin_members set password_setup_completed_at = now()
    where user_id = (select auth.uid()) and is_active and role = 'admin'
      and password_setup_completed_at is null;
  return found;
end;
$$;
alter function public.complete_cms_initial_password_setup() owner to postgres;
revoke all on function public.complete_cms_initial_password_setup() from public, anon, authenticated;
grant execute on function public.complete_cms_initial_password_setup() to authenticated;

create function public.is_cms_admin_aal2()
returns boolean language sql stable security invoker set search_path = '' as $$
  select coalesce((select auth.jwt()) ->> 'aal' = 'aal2', false)
    and public.is_cms_member_for_onboarding()
    and not public.cms_invite_password_pending();
$$;
revoke all on function public.is_cms_admin_aal2() from public, anon, authenticated;
grant execute on function public.is_cms_admin_aal2() to authenticated;

-- Strengthen the legacy name too: no membership-only "admin" helper survives.
create or replace function public.is_cms_admin()
returns boolean language sql stable security invoker set search_path = '' as $$
  select public.is_cms_admin_aal2();
$$;

drop policy cms_admin_members_read_own_active on public.cms_admin_members;
create policy cms_admin_members_read_own_active
on public.cms_admin_members for select to authenticated
using (user_id = (select auth.uid()) and is_active and role = 'admin'
  and (select public.is_cms_admin_aal2()));

-- Existing forced RLS, SELECT-only table grants and membership-write denial stay.
-- Future CMS content policies MUST use is_cms_admin_aal2(), never onboarding.
commit;
