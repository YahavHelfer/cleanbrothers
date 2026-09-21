begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(22);

insert into auth.users (id) values
  ('10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000003');
insert into public.cms_admin_members (user_id, admin_slot, is_active) values
  ('10000000-0000-4000-8000-000000000001', 1, true),
  ('10000000-0000-4000-8000-000000000002', 2, false);

select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.cms_admin_members'::regclass), 'RLS enabled and forced');
select throws_ok($$insert into public.cms_admin_members (user_id, admin_slot) values ('10000000-0000-4000-8000-000000000003', 3)$$, '23514', null, 'third seat forbidden');
select throws_ok($$insert into public.cms_admin_members (user_id, admin_slot) values ('10000000-0000-4000-8000-000000000003', 1)$$, '23505', null, 'occupied seat forbidden');
select throws_ok($$update public.cms_admin_members set role = 'owner'$$, '23514', null, 'only the admin role exists');
select throws_ok($$update public.cms_admin_members set user_id = '10000000-0000-4000-8000-000000000004' where admin_slot = 2$$, '23503', null, 'membership requires an Auth identity');

set local role anon;
select throws_ok($$select * from public.cms_admin_members$$, '42501', null, 'anonymous cannot read membership');
select throws_ok($$select public.is_cms_admin()$$, '42501', null, 'anonymous cannot execute membership helper');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is((select count(*)::int from public.cms_admin_members), 0, 'ordinary user cannot read memberships');
select is(public.is_cms_admin(), false, 'authentication alone grants no access');
select throws_ok($$insert into public.cms_admin_members (user_id, admin_slot) values ('10000000-0000-4000-8000-000000000003', 1)$$, '42501', null, 'user cannot grant self membership');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*)::int from public.cms_admin_members), 1, 'active admin can read only own row');
select is((select user_id::text from public.cms_admin_members), '10000000-0000-4000-8000-000000000001', 'own row matches verified JWT subject');
select is(public.is_cms_admin(), true, 'active admin authorized');
select throws_ok($$update public.cms_admin_members set is_active = true$$, '42501', null, 'admin cannot activate or modify membership');
select throws_ok($$delete from public.cms_admin_members$$, '42501', null, 'admin cannot delete membership');
select throws_ok($$insert into public.cms_admin_members (user_id, admin_slot) values ('10000000-0000-4000-8000-000000000003', 1)$$, '42501', null, 'admin cannot create membership');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is((select count(*)::int from public.cms_admin_members), 0, 'inactive admin cannot read membership');
select is(public.is_cms_admin(), false, 'inactive admin denied');
reset role;

update public.cms_admin_members set is_active = true where admin_slot = 2;
set local role authenticated;
select is(public.is_cms_admin(), true, 'second active seat has the same authority');
select is((select count(*)::int from public.cms_admin_members), 1, 'second admin also sees only own row');
reset role;
update public.cms_admin_members set is_active = false where admin_slot = 2;
set local role authenticated;
select is(public.is_cms_admin(), false, 'revocation takes effect without a new JWT');
select set_config('request.jwt.claim.sub', '', true);
select is(public.is_cms_admin(), false, 'missing JWT identity fails closed');

select * from finish();
rollback;
