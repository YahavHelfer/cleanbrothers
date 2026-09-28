begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(47);

insert into auth.users (id, invited_at, encrypted_password) values
 ('20000000-0000-4000-8000-000000000001', null, 'synthetic-not-a-password'),
 ('20000000-0000-4000-8000-000000000002', null, 'synthetic-not-a-password'),
 ('20000000-0000-4000-8000-000000000003', null, 'synthetic-not-a-password'),
 ('20000000-0000-4000-8000-000000000004', now(), '');
insert into public.cms_admin_members (user_id, is_active) values
 ('20000000-0000-4000-8000-000000000001', true),
 ('20000000-0000-4000-8000-000000000002', false),
 ('20000000-0000-4000-8000-000000000004', true);

select ok((select prosecdef and pronargs = 0 and proconfig = array['search_path=""'] from pg_proc where oid = 'public.is_cms_member_for_onboarding()'::regprocedure), 'onboarding function has no identity arguments and an empty search path');
select ok((select prosecdef and pronargs = 0 and proconfig = array['search_path=""'] from pg_proc where oid = 'public.cms_invite_password_pending()'::regprocedure), 'password eligibility is narrowly scoped, no Auth row returned');
select ok((select not prosecdef from pg_proc where oid = 'public.is_cms_admin_aal2()'::regprocedure), 'AAL2 helper is security invoker');
select ok((select not prosecdef from pg_proc where oid = 'public.is_cms_admin()'::regprocedure), 'legacy admin helper remains security invoker');

set local role anon;
select throws_ok($$select public.is_cms_member_for_onboarding()$$, '42501', null, 'anonymous has no onboarding RPC');
select throws_ok($$select public.cms_invite_password_pending()$$, '42501', null, 'anonymous cannot check password eligibility');
select throws_ok($$select public.complete_cms_initial_password_setup()$$, '42501', null, 'anonymous cannot complete onboarding');
select throws_ok($$select public.is_cms_admin_aal2()$$, '42501', null, 'anonymous has no AAL2 RPC');
select throws_ok($$select * from public.cms_admin_members$$, '42501', null, 'anonymous has no table read');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000003","aal":"aal2"}', true);
select is(public.is_cms_member_for_onboarding(), false, 'nonmember denied onboarding even with AAL2');
select is(public.is_cms_admin_aal2(), false, 'nonmember denied administration');
select is(public.cms_invite_password_pending(), false, 'nonmember denied password setup');
select is(public.complete_cms_initial_password_setup(), false, 'nonmember cannot complete onboarding');
select is((select count(*)::int from public.cms_admin_members), 0, 'nonmember cannot read memberships');
select throws_ok($$insert into public.cms_admin_members (user_id, is_active) values ('20000000-0000-4000-8000-000000000003', true)$$, '42501', null, 'nonmember cannot self-grant');

select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000001","aal":"aal1"}', true);
select is(public.is_cms_member_for_onboarding(), true, 'active AAL1 has boolean onboarding access');
select is(public.is_cms_admin_aal2(), false, 'active AAL1 is not an administrator');
select is(public.is_cms_admin(), false, 'legacy helper cannot bypass AAL2');
select is((select count(*)::int from public.cms_admin_members), 0, 'AAL1 cannot read membership rows');
select is(public.cms_invite_password_pending(), false, 'password-authenticated member cannot use first-password flow');
select throws_ok($$update public.cms_admin_members set is_active = true$$, '42501', null, 'AAL1 cannot update memberships');
select throws_ok($$delete from public.cms_admin_members$$, '42501', null, 'AAL1 cannot delete memberships');
select throws_ok($$select encrypted_password from auth.users$$, '42501', null, 'onboarding does not expose Auth rows or hashes');

select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000001","aal":"aal2"}', true);
select is(public.is_cms_admin_aal2(), true, 'active AAL2 is authorized');
select is(public.is_cms_admin(), true, 'legacy helper agrees with AAL2 helper');
select is((select count(*)::int from public.cms_admin_members), 1, 'AAL2 reads only own active membership');
select is((select user_id::text from public.cms_admin_members), '20000000-0000-4000-8000-000000000001', 'AAL2 cannot read another member');
select throws_ok($$insert into public.cms_admin_members (user_id) values ('20000000-0000-4000-8000-000000000003')$$, '42501', null, 'AAL2 cannot create memberships');
select throws_ok($$update public.cms_admin_members set is_active = true$$, '42501', null, 'AAL2 cannot update memberships');
select throws_ok($$delete from public.cms_admin_members$$, '42501', null, 'AAL2 cannot delete memberships');

select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000002","aal":"aal2"}', true);
select is(public.is_cms_member_for_onboarding(), false, 'inactive AAL2 denied onboarding');
select is(public.is_cms_admin_aal2(), false, 'inactive AAL2 denied administration');
select is((select count(*)::int from public.cms_admin_members), 0, 'inactive AAL2 denied direct reads');

select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000004","aal":"aal2"}', true);
select is(public.cms_invite_password_pending(), true, 'invited active member without password is eligible');
select is(public.is_cms_admin_aal2(), false, 'even AAL2 cannot skip initial password');
select is(public.complete_cms_initial_password_setup(), false, 'AAL2 alone cannot attest password setup');
select throws_ok($$update public.cms_admin_members set password_setup_completed_at = now()$$, '42501', null, 'cannot self-write completion timestamp');
reset role;
update auth.users set encrypted_password = 'synthetic-not-a-password' where id = '20000000-0000-4000-8000-000000000004';
set local role authenticated;
select is(public.cms_invite_password_pending(), true, 'an Auth-generated temporary password does not complete onboarding');
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000004","aal":"aal1","amr":[{"method":"otp"}]}', true);
select is(public.complete_cms_initial_password_setup(), false, 'invitation OTP alone cannot complete password setup');
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000004","aal":"aal1","amr":[{"method":"password"}]}', true);
select is(public.complete_cms_initial_password_setup(), true, 'fresh signed password authentication completes own onboarding');
select is(public.cms_invite_password_pending(), false, 'completed initial password cannot be set again');
select is(public.is_cms_admin_aal2(), false, 'password completion at AAL1 still grants no administration');
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000004","aal":"aal2","amr":[{"method":"password"},{"method":"totp"}]}', true);
select is(public.is_cms_admin_aal2(), true, 'completed invitation with AAL2 permits access');
reset role;
update public.cms_admin_members set is_active = false where user_id = '20000000-0000-4000-8000-000000000004';
set local role authenticated;
select is(public.is_cms_admin_aal2(), false, 'deactivation immediately revokes same AAL2 JWT');
select is(public.is_cms_member_for_onboarding(), false, 'deactivation also revokes onboarding');
select set_config('request.jwt.claims', '{"aal":"aal2"}', true);
select is(public.is_cms_admin_aal2(), false, 'missing identity is denied');
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000001"}', true);
select is(public.is_cms_admin_aal2(), false, 'missing AAL is denied');

select * from finish();
rollback;
