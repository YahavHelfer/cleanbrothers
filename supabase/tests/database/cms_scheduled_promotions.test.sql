begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
select ok(exists(select 1 from pg_extension where extname='pg_cron'),
  'pg_cron prerequisite is reproducible in isolated local migrations');
select is((select count(*)::int from cron.job where jobname='cms-promotion-scheduler'),0,
  'local migrations never schedule the permanent background job');

select ok((select rolcanlogin and rolpassword is null and not rolsuper and not rolcreatedb
  and not rolcreaterole and not rolreplication and not rolbypassrls and not rolinherit
  from pg_authid where rolname='cms_scheduler'),
  'permanent scheduler is passwordless, nonprivileged LOGIN');
select is((select count(*)::int from pg_auth_members m join pg_roles r on r.oid=m.member
  where r.rolname='cms_scheduler'),0,'scheduler inherits no other roles');
select is((select count(*)::int from pg_auth_members m join pg_roles r on r.oid=m.roleid
  where r.rolname='cms_scheduler' and m.set_option),0,
  'no operator retains SET ROLE capability to the scheduler');
select ok(has_function_privilege('cms_scheduler','public.cms_process_due_promotion_schedules(integer)','EXECUTE'),
  'scheduler can execute the database-clock wrapper');
select ok(not has_function_privilege('cms_scheduler','public.cms_process_due_promotion_schedules_at(timestamptz,integer)','EXECUTE'),
  'scheduler cannot invoke the fake-time core');
select ok(not has_table_privilege('cms_scheduler','public.cms_promotion_schedules','SELECT,INSERT,UPDATE,DELETE'),
  'scheduler has no direct scheduling table privileges');
select ok(not has_table_privilege('cms_scheduler','public.content_documents','SELECT,INSERT,UPDATE,DELETE'),
  'scheduler has no direct content privileges');
select ok(not has_table_privilege('cms_scheduler','auth.users','SELECT,INSERT,UPDATE,DELETE'),
  'scheduler has no Auth table privileges');
select ok(not has_table_privilege('cms_scheduler','storage.objects','SELECT,INSERT,UPDATE,DELETE'),
  'scheduler has no Storage table privileges');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','auth','storage') and p.prosecdef
  and p.oid <> 'public.cms_process_due_promotion_schedules(integer)'::regprocedure
  and has_function_privilege('cms_scheduler',p.oid,'EXECUTE')),0,
  'scheduler has no other effective SECURITY DEFINER capability');
select ok(not exists(select 1 from pg_extension where extname='pg_cron') or
  not has_schema_privilege('cms_scheduler','cron','USAGE'),
  'local migration gives no cron-management access');
-- The local operator receives SET capability only inside this rolled-back test.
grant cms_scheduler to postgres with set true, inherit false;
grant usage on schema extensions to cms_scheduler;
set local role cms_scheduler;
select throws_ok($$select cron.schedule('unauthorized','* * * * *','select 1;')$$,
  '42501',null,'scheduler cannot create a cron job after migration');
select throws_ok($$select public.cms_process_due_promotion_schedules_at(now(),1)$$,
  '42501',null,'scheduler cannot run the explicit-time core');
select throws_ok($$select * from public.cms_promotion_schedules$$,
  '42501',null,'scheduler cannot read schedule rows directly');
select throws_ok($$update public.content_documents set content_key=content_key$$,
  '42501',null,'scheduler cannot mutate content directly');
select throws_ok($$select * from auth.users$$,
  '42501',null,'scheduler cannot read Auth users');
select throws_ok($$select * from storage.objects$$,
  '42501',null,'scheduler cannot read Storage objects');
reset role;
revoke usage on schema extensions from cms_scheduler;
revoke cms_scheduler from postgres granted by postgres;

create temporary table schedule_fixture (
  doc uuid, rev uuid, draft_promo_rev uuid, draft_id uuid, second_id uuid, endless_id uuid,
  late_id uuid, skipped_id uuid, cancelled_id uuid, active_cancel_id uuid,
  retry_id uuid, bad_id uuid, multi_id uuid, failed_window_id uuid,
  blocking_id uuid, following_id uuid, public_id uuid, version bigint
);
grant select,update on schedule_fixture to authenticated,service_role,anon;
insert into schedule_fixture default values;
select is((select count(*)::int from pg_class where relname in
 ('cms_promotion_schedules','cms_promotion_schedule_placements','cms_active_promotion_placements',
  'cms_promotion_schedule_attempts','cms_promotion_schedule_audit') and relforcerowsecurity),5,
 'all five schedule tables force RLS');
select ok(not has_function_privilege('anon','public.cms_process_due_promotion_schedules_at(timestamptz,integer)','execute'),
 'anonymous cannot call deterministic core');
select ok(not has_function_privilege('authenticated','public.cms_process_due_promotion_schedules_at(timestamptz,integer)','execute'),
 'browser sessions cannot call deterministic core');
select ok(not has_function_privilege('service_role','public.cms_process_due_promotion_schedules_at(timestamptz,integer)','execute'),
 'service role cannot choose scheduler time');
select ok(not has_function_privilege('anon','public.cms_process_due_promotion_schedules(integer)','execute'),
 'anonymous cannot call production wrapper');
select ok(not has_function_privilege('authenticated','public.cms_process_due_promotion_schedules(integer)','execute'),
 'browser sessions cannot call production wrapper');
select ok(not has_function_privilege('service_role','public.cms_process_due_promotion_schedules(integer)','execute'),
 'service role is not the production scheduler identity');
select is(to_regprocedure('public.cms_process_due_promotion_schedules(timestamptz,integer)'),null::regprocedure,
 'production wrapper has no explicit-time overload');
select is((select pg_get_userbyid(proowner) from pg_proc
  where oid='public.cms_process_due_promotion_schedules_at(timestamptz,integer)'::regprocedure),
 'postgres','deterministic core retains controlled postgres ownership');
select is((select pg_get_userbyid(proowner) from pg_proc
  where oid='public.cms_process_due_promotion_schedules(integer)'::regprocedure),
 'postgres','production wrapper has controlled postgres ownership');
select ok((select prosecdef and proconfig @> array['search_path=""'] from pg_proc
  where oid='public.cms_process_due_promotion_schedules_at(timestamptz,integer)'::regprocedure),
 'deterministic core keeps SECURITY DEFINER and a fixed empty search path');
select ok((select prosecdef and proconfig @> array['search_path=""'] from pg_proc
  where oid='public.cms_process_due_promotion_schedules(integer)'::regprocedure),
 'production wrapper uses SECURITY DEFINER and a fixed empty search path');
set local role service_role;
select throws_ok($$select public.cms_process_due_promotion_schedules_at(now(),1)$$,'42501',null,
 'service role cannot invoke the explicit-time core');
reset role;
set local role anon;
select throws_ok($$select public.cms_process_due_promotion_schedules_at(now(),1)$$,'42501',null,
 'anonymous execution of the core is denied');
select throws_ok($$select public.cms_process_due_promotion_schedules()$$,'42501',null,
 'anonymous execution of the wrapper is denied');
reset role;
set local role authenticated;
select throws_ok($$select public.cms_process_due_promotion_schedules_at(now(),1)$$,'42501',null,
 'authenticated execution of the core is denied');
select throws_ok($$select public.cms_process_due_promotion_schedules()$$,'42501',null,
 'authenticated execution of the wrapper is denied');
reset role;
select ok(has_function_privilege('anon','public.cms_read_active_promotion_placement(text,text)','execute'),
 'public read uses only narrow placement function');

insert into auth.users(id,invited_at) values
 ('56000000-0000-4000-8000-000000000001',null),
 ('56000000-0000-4000-8000-000000000002',null),
 ('56000000-0000-4000-8000-000000000003',null);
insert into cms_admin_members(user_id,is_active) values
 ('56000000-0000-4000-8000-000000000001',true),
 ('56000000-0000-4000-8000-000000000003',false);

update schedule_fixture set rev=cms_import_promotion_baseline(
 '{"schemaVersion":7,"publicTitle":"מבצע בדיקה","h1":"מבצע בדיקה","seoTitle":"מבצע בדיקה",
 "seoDescription":"תיאור","description":"תוכן בדיקה","template":"accent","enabled":true,
 "cta":{"label":"צרו קשר","target":{"kind":"internal","path":"/contact"}},
 "mediaVersionId":null,"mediaAlt":null}'::jsonb);
update schedule_fixture set doc=(select document_id from content_revisions where id=rev);
select is((select count(*)::int from content_revisions where document_id=(select doc from schedule_fixture)),1,
 'one immutable promotion baseline exists');

set local role anon;
select throws_ok($$select * from cms_promotion_schedules$$,'42501',null,'anonymous cannot enumerate schedules');
select throws_ok($$select * from cms_promotion_schedule_attempts$$,'42501',null,'anonymous cannot enumerate attempts');
select throws_ok($$select cms_read_promotion_schedules()$$,'42501',null,'anonymous admin reader denied');
select is(cms_read_active_promotion_placement('global','site'),null::jsonb,'no public active placement initially');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$select cms_read_promotion_schedules()$$,'42501',null,'nonmember denied');
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$select cms_read_promotion_schedules()$$,'42501',null,'inactive member denied');
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
select throws_ok($$select cms_read_promotion_schedules()$$,'42501',null,'AAL1 reader denied');
select throws_ok($$select cms_create_promotion_schedule(null,null,'x',now(),null,'[]')$$,'42501',null,'AAL1 writer denied');
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select is(jsonb_array_length(cms_read_promotion_schedule_choices()),1,'AAL2 sees one published-safe exact revision');
update schedule_fixture set draft_promo_rev=cms_save_promotion_draft(1,rev,
 jsonb_set(cms_read_promotion_editor()->'draft','{description}','"טיוטה לא מפורסמת"'::jsonb),null);
select is(jsonb_array_length(cms_read_promotion_schedule_choices()),1,
 'unpublished Promotion draft is absent from scheduling choices');
select throws_ok($$select cms_create_promotion_schedule((select doc from schedule_fixture),
  (select draft_promo_rev from schedule_fixture),'draft forbidden','2030-01-01T10:00Z',null,
  '[{"kind":"global","target":"site"}]')$$,'23503',null,
  'unpublished exact Promotion revision cannot be scheduled');
select throws_ok($$select * from cms_promotion_schedules$$,'42501',null,'AAL2 cannot directly enumerate table');
select throws_ok($$select cms_create_promotion_schedule((select doc from schedule_fixture),gen_random_uuid(),
  'invalid revision','2030-01-01T10:00Z',null,'[{"kind":"global","target":"site"}]')$$,
  '23503',null,'unknown exact revision rejected');
select throws_ok($$select cms_create_promotion_schedule((select doc from schedule_fixture),
  (select rev from schedule_fixture),'invalid placement','2030-01-01T10:00Z',null,
  '[{"kind":"global","target":"https://evil.example"}]')$$,
  '22023',null,'invalid placement rejected');
select throws_ok($$select cms_create_promotion_schedule((select doc from schedule_fixture),
  (select rev from schedule_fixture),'invalid interval','2030-01-01T10:00Z','2030-01-01T10:00Z',
  '[{"kind":"global","target":"site"}]')$$,
  '22023',null,'end must be later than start');

update schedule_fixture set draft_id=cms_create_promotion_schedule(doc,rev,'first',
 '2030-01-01T10:00Z','2030-01-01T12:00Z','[{"kind":"global","target":"site"}]') ;
select is(jsonb_array_length(cms_read_promotion_schedules()),1,'draft visible to AAL2 admin');
select throws_ok(format('select cms_schedule_promotion(%L,2)',draft_id),'PT409',null,
 'version conflict rejects scheduling') from schedule_fixture;
update schedule_fixture set version=cms_edit_promotion_schedule(draft_id,1,rev,'first edited',
 '2030-01-01T10:00Z','2030-01-01T12:00Z','[{"kind":"global","target":"site"}]');
select is(cms_read_promotion_schedules()->0->>'label','first edited','draft edit persisted');
update schedule_fixture set version=cms_schedule_promotion(draft_id,version);
select throws_ok(format('select cms_edit_promotion_schedule(%L,3,%L,%L,%L,%L,%L)',
  draft_id,rev,'changed','2030-01-01T10:00Z','2030-01-01T12:00Z','[{"kind":"global","target":"site"}]'),
  '55000',null,'scheduled contract cannot be edited') from schedule_fixture;
update schedule_fixture set second_id=cms_create_promotion_schedule(doc,rev,'overlap',
 '2030-01-01T11:00Z','2030-01-01T13:00Z','[{"kind":"global","target":"site"}]');
select throws_ok(format('select cms_schedule_promotion(%L,1)',second_id),'23505',null,
 'overlap on same placement rejected') from schedule_fixture;
reset role;
select is((select status from cms_promotion_schedules where id=(select second_id from schedule_fixture)),
 'draft','rejected overlapping schedule stays draft');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select is(cms_cancel_promotion_schedule((select second_id from schedule_fixture),1),2::bigint,
 'draft cancellation is versioned');
select is(cms_cancel_promotion_schedule((select second_id from schedule_fixture),1),2::bigint,
 'repeated cancellation is idempotent');
reset role;
set local role anon;
select is(cms_read_active_promotion_placement('global','site'),null::jsonb,'future schedule not public');
reset role;
select is(cms_process_due_promotion_schedules_at('2030-01-01T09:59Z',100),0,
 'future tick does nothing');
select is(cms_process_due_promotion_schedules_at('2030-01-01T10:00Z',100),1,
 'start activates once');
select is(cms_process_due_promotion_schedules_at('2030-01-01T10:00Z',100),0,
 'same tick is idempotent');
reset role;
set local role anon;
select is(cms_read_active_promotion_placement('global','site'),null::jsonb,
 'fake-clock activation is not exposed before real start time');
reset role;
select is((select promotion_revision_id::text from cms_active_promotion_placements where placement_kind='global'),
 (select rev::text from schedule_fixture),'active placement pins exact published revision');
select is(cms_process_due_promotion_schedules_at('2030-01-01T12:00Z',100),1,
 'end expires once');
select is(cms_process_due_promotion_schedules_at('2030-01-01T12:00Z',100),0,
 'repeated expiration is harmless');
reset role;
set local role anon;
select is(cms_read_active_promotion_placement('global','site'),null::jsonb,
 'expired promotion is absent publicly');
reset role;
select is((select count(*)::int from cms_active_promotion_placements),0,'no active row after expiration');
select is((select count(*)::int from cms_promotion_schedule_attempts where schedule_id=(select draft_id from schedule_fixture)),
 2,'activation and expiration each audited once');
select is((select count(*)::int from content_revisions where document_id=(select doc from schedule_fixture)),2,
 'scheduler never mutates the published and draft Promotion revisions');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
update schedule_fixture set endless_id=cms_create_promotion_schedule(doc,rev,'start only',
 '2030-01-02T10:00Z',null,'[{"kind":"home","target":"home"}]');
select is(cms_schedule_promotion((select endless_id from schedule_fixture),1),2::bigint,'start-only scheduled');
update schedule_fixture set late_id=cms_create_promotion_schedule(doc,rev,'late',
 '2030-01-03T10:00Z','2030-01-03T11:00Z','[{"kind":"global","target":"site"}]');
select is(cms_schedule_promotion((select late_id from schedule_fixture),1),2::bigint,'late start scheduled');
update schedule_fixture set skipped_id=cms_create_promotion_schedule(doc,rev,'missed window',
 '2030-01-04T10:00Z','2030-01-04T11:00Z','[{"kind":"global","target":"site"}]');
select is(cms_schedule_promotion((select skipped_id from schedule_fixture),1),2::bigint,'missed window scheduled');
reset role;
select is(cms_process_due_promotion_schedules_at('2030-01-02T12:00Z',100),1,'late start activates');
select is(cms_process_due_promotion_schedules_at('2030-01-03T10:30Z',100),1,'late finite schedule activates');
select is(cms_process_due_promotion_schedules_at('2030-01-03T11:30Z',100),1,'late finite schedule expires');
select is(cms_process_due_promotion_schedules_at('2030-01-04T12:00Z',100),1,
 'downtime spanning both boundaries completes without activation');
reset role;
select is((select status from cms_promotion_schedules where id=(select endless_id from schedule_fixture)),
 'active','start-only remains active');
select is((select status from cms_promotion_schedules where id=(select skipped_id from schedule_fixture)),
 'completed','missed window is completed');
select is((select outcome from cms_promotion_schedule_attempts where schedule_id=(select skipped_id from schedule_fixture)),
 'skipped_window','missed window has explicit audit outcome');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
update schedule_fixture set cancelled_id=cms_create_promotion_schedule(doc,rev,'cancel before start',
 '2030-01-05T10:00Z','2030-01-05T11:00Z','[{"kind":"global","target":"site"}]');
select is(cms_schedule_promotion((select cancelled_id from schedule_fixture),1),2::bigint,'future cancellation fixture scheduled');
select is(cms_cancel_promotion_schedule((select cancelled_id from schedule_fixture),2),3::bigint,
 'cancel before start prevents activation');
reset role;
select is(cms_process_due_promotion_schedules_at('2030-01-05T12:00Z',100),0,
 'cancelled schedule never executes');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
update schedule_fixture set active_cancel_id=cms_create_promotion_schedule(doc,rev,'cancel active',
 '2030-01-06T10:00Z','2030-01-06T11:00Z','[{"kind":"global","target":"site"}]');
select is(cms_schedule_promotion((select active_cancel_id from schedule_fixture),1),2::bigint,'active cancellation fixture scheduled');
reset role;
select is(cms_process_due_promotion_schedules_at('2030-01-06T10:00Z',100),1,'active cancellation fixture activates');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select is(cms_cancel_promotion_schedule((select active_cancel_id from schedule_fixture),3),4::bigint,
 'cancel active schedule immediately deactivates');
reset role;
select is((select count(*)::int from cms_active_promotion_placements where placement_kind='global'),0,
 'active cancellation removes public placement');

-- Simulate a transiently failed activation, then request the documented manual retry.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
update schedule_fixture set retry_id=cms_create_promotion_schedule(doc,rev,'retry transient',
 '2030-01-07T10:00Z','2030-01-07T11:00Z','[{"kind":"global","target":"site"}]');
select is(cms_schedule_promotion((select retry_id from schedule_fixture),1),2::bigint,'retry fixture scheduled');
reset role;
update cms_promotion_schedules set status='failed',failure_action='activate',failure_category='transient',
 retryable=true,retry_after='2030-01-07T10:05Z',version=3 where id=(select retry_id from schedule_fixture);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select is(cms_retry_promotion_schedule((select retry_id from schedule_fixture),3),4::bigint,
 'manual retry advances version of retriable failure');
reset role;
select is(cms_process_due_promotion_schedules_at('2030-01-07T10:10Z',100),1,
 'retry converges to active once');
reset role;
select is((select status from cms_promotion_schedules where id=(select retry_id from schedule_fixture)),
 'active','transient retry recovered');
select is(cms_process_due_promotion_schedules_at('2030-01-07T11:00Z',100),1,'recovered schedule expires');
reset role;

-- A Promotion archived after scheduling is a terminal activation failure.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
update schedule_fixture set bad_id=cms_create_promotion_schedule(doc,rev,'terminal failure',
 '2030-01-08T10:00Z',null,'[{"kind":"global","target":"site"}]');
select is(cms_schedule_promotion((select bad_id from schedule_fixture),1),2::bigint,'terminal fixture scheduled');
reset role;
update cms_promotion_identity set status='archived' where document_id=(select doc from schedule_fixture);
select is(cms_process_due_promotion_schedules_at('2030-01-08T10:00Z',100),1,'terminal failure recorded as one attempt');
reset role;
select is((select status from cms_promotion_schedules where id=(select bad_id from schedule_fixture)),
 'failed','terminal failure state retained');
select is((select failure_category from cms_promotion_schedule_attempts where schedule_id=(select bad_id from schedule_fixture)),
 'revision_unavailable','safe terminal failure category retained');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select throws_ok(format('select cms_retry_promotion_schedule(%L,3)',bad_id),'55000',null,
 'terminal failure is not manually retryable') from schedule_fixture;
reset role;
select is((select count(*)::int from content_revisions where document_id=(select doc from schedule_fixture)),2,
 'all schedules retain the exact immutable historical promotion revision');
select is((select count(*)::int from content_publication_events where document_id=(select doc from schedule_fixture)),1,
 'scheduler never changes promotion publication pointer');
select is((select count(*)::int from cms_active_promotion_placements where placement_kind='global'),0,
 'no public placement survives expiration, cancellation or failure');

-- Two typed placements activate and cancel as one schedule, without touching other documents.
update cms_promotion_identity set status='active' where document_id=(select doc from schedule_fixture);
insert into content_documents(content_type,content_key) values('service','sofa-cleaning');
create temporary table schedule_content_counts as select
 (select count(*)::int from content_publication_state) as publications,
 (select count(*)::int from content_documents) as documents;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select is(cms_cancel_promotion_schedule((select endless_id from schedule_fixture),3),4::bigint,
 'active start-only placement can be cancelled before a replacement');
update schedule_fixture set multi_id=cms_create_promotion_schedule(doc,rev,'two placements',
 '2030-01-09T10:00Z','2030-01-09T11:00Z',
 '[{"kind":"home","target":"home"},{"kind":"service","target":"sofa-cleaning"}]');
select is(cms_schedule_promotion((select multi_id from schedule_fixture),1),2::bigint,
 'home and stable service target schedule together');
reset role;
select is(cms_process_due_promotion_schedules_at('2030-01-09T10:00Z',100),1,
 'one schedule atomically activates both placements');
reset role;
select is((select count(*)::int from cms_active_promotion_placements where schedule_id=(select multi_id from schedule_fixture)),
 2,'both active rows pin one exact promotion revision');
select is((select count(distinct promotion_revision_id)::int from cms_active_promotion_placements
 where schedule_id=(select multi_id from schedule_fixture)),1,'both placements use same immutable revision');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select is(cms_cancel_promotion_schedule((select multi_id from schedule_fixture),3),4::bigint,
 'active multi-placement cancellation is immediate');
reset role;
select is((select count(*)::int from cms_active_promotion_placements),0,
 'cancellation removes all active placements');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
update schedule_fixture set failed_window_id=cms_create_promotion_schedule(doc,rev,'retry after entire window',
 '2030-01-10T10:00Z','2030-01-10T11:00Z','[{"kind":"home","target":"home"}]');
select is(cms_schedule_promotion((select failed_window_id from schedule_fixture),1),2::bigint,
 'failed-window fixture scheduled');
reset role;
update cms_promotion_schedules set status='failed',failure_action='activate',failure_category='transient',
 retryable=true,retry_after='2030-01-10T10:05Z',version=3 where id=(select failed_window_id from schedule_fixture);
select is(cms_process_due_promotion_schedules_at('2030-01-10T12:00Z',100),1,
 'retry after whole window converges directly to completed');
reset role;
select is((select status from cms_promotion_schedules where id=(select failed_window_id from schedule_fixture)),
 'completed','failed activation never becomes active after end');
select is((select outcome from cms_promotion_schedule_attempts where schedule_id=(select failed_window_id from schedule_fixture)),
 'skipped_window','late retry records skipped window');
select is((select count(*)::int from cms_active_promotion_placements where placement_kind='home'),0,
 'late retry never leaves active home placement');
select is((select count(*)::int from content_publication_state),(select publications from schedule_content_counts),
 'scheduler leaves all content publication pointers unchanged');
select is((select count(*)::int from content_documents),(select documents from schedule_content_counts),
 'scheduler leaves promotion and service document identities unchanged');

-- A stale active row from a transient expiration failure must not permanently
-- strand the next non-overlapping schedule at the same placement.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
update schedule_fixture set blocking_id=cms_create_promotion_schedule(doc,rev,'blocking expiry',
 '2030-01-11T10:00Z','2030-01-11T11:00Z','[{"kind":"home","target":"home"}]');
select is(cms_schedule_promotion((select blocking_id from schedule_fixture),1),2::bigint,'blocking fixture scheduled');
update schedule_fixture set following_id=cms_create_promotion_schedule(doc,rev,'following window',
 '2030-01-11T11:00Z','2030-01-11T12:00Z','[{"kind":"home","target":"home"}]');
select is(cms_schedule_promotion((select following_id from schedule_fixture),1),2::bigint,
 'adjacent [start,end) windows are not overlapping');
reset role;
select is(cms_process_due_promotion_schedules_at('2030-01-11T10:00Z',100),1,'first adjacent window activates');
reset role;
create function pg_temp.cms_test_expire_fail() returns trigger language plpgsql as $$
begin raise exception using errcode='40001',message='simulated transient expiry failure'; end; $$;
create trigger cms_test_expire_fail before delete on cms_active_promotion_placements
  for each row execute function pg_temp.cms_test_expire_fail();
select is(cms_process_due_promotion_schedules_at('2030-01-11T11:00Z',100),2,
 'two due workers record expiry failure and a blocked adjacent activation');
reset role;
drop trigger cms_test_expire_fail on cms_active_promotion_placements;
select is((select failure_category from cms_promotion_schedules where id=(select following_id from schedule_fixture)),
 'transient','stale expired active row is classified retriable');
select is(cms_process_due_promotion_schedules_at('2030-01-11T11:01Z',100),2,
 'expiry retry clears blocker and following schedule then activates');
reset role;
select is((select status from cms_promotion_schedules where id=(select blocking_id from schedule_fixture)),
 'completed','blocked expiry converges to completed');
select is((select status from cms_promotion_schedules where id=(select following_id from schedule_fixture)),
 'active','adjacent schedule recovers after blocker cleanup');
select is((select count(*)::int from cms_active_promotion_placements where placement_kind='home'),1,
 'only the following schedule owns the active home placement');

-- A genuinely current start-only placement is visible through the narrow
-- anonymous reader, without exposing schedule or audit metadata.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"56000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
update schedule_fixture set public_id=cms_create_promotion_schedule(doc,rev,'public safe read',
 '2020-01-01T00:00Z',null,'[{"kind":"service","target":"sofa-cleaning"}]');
select is(cms_schedule_promotion((select public_id from schedule_fixture),1),2::bigint,
 'historical start-only fixture scheduled');
reset role;
select is(cms_process_due_promotion_schedules_at('2020-01-01T00:00Z',100),1,
 'historical start-only fixture activates');
reset role;
set local role anon;
select is(cms_read_active_promotion_placement('service','sofa-cleaning')->>'promotionRevisionId',
 (select rev::text from schedule_fixture),'public reader returns only currently active exact revision');
select ok(not (cms_read_active_promotion_placement('service','sofa-cleaning') ?|
  array['scheduleId','audit','createdBy','attempts','startsAt','draftRevisionId']),
 'public response excludes schedule metadata');
reset role;

-- A transactional local fixture models the future dedicated LOGIN identity.
-- The forward migration intentionally creates no cloud role or grant for it.
create role cms_scheduler_test login noinherit nobypassrls;
grant cms_scheduler_test to postgres;
grant usage on schema public to cms_scheduler_test;
grant execute on function public.cms_process_due_promotion_schedules(integer) to cms_scheduler_test;
select ok(has_function_privilege('cms_scheduler_test','public.cms_process_due_promotion_schedules(integer)','execute'),
 'dedicated scheduler can execute only the production wrapper');
select ok(not has_function_privilege('cms_scheduler_test','public.cms_process_due_promotion_schedules_at(timestamptz,integer)','execute'),
 'dedicated scheduler cannot choose a fake time');
select ok(not (select rolbypassrls from pg_roles where rolname='cms_scheduler_test'),
 'dedicated scheduler has no RLS bypass');
select ok(not exists (select 1 from (values
 ('cms_promotion_schedules'),('cms_promotion_schedule_placements'),
 ('cms_active_promotion_placements'),('cms_promotion_schedule_attempts'),
 ('cms_promotion_schedule_audit')) as t(name)
 where has_table_privilege('cms_scheduler_test','public.'||t.name,'SELECT, INSERT, UPDATE, DELETE')),
 'dedicated scheduler has no direct scheduling table access');
create temporary table wrapper_fixture (schedule_id uuid);
with s as (insert into public.cms_promotion_schedules(
    promotion_document_id,promotion_revision_id,promotion_revision_number,label,
    starts_at,ends_at,status,created_by)
    select doc,rev,(select revision_number from public.content_revisions where id=rev),
      'database clock wrapper',pg_catalog.clock_timestamp()-interval '1 minute',
      null,'scheduled','56000000-0000-4000-8000-000000000001' from schedule_fixture
    returning id)
insert into wrapper_fixture select id from s;
insert into public.cms_promotion_schedule_placements(schedule_id,placement_kind,target_key)
  select schedule_id,'global','site' from wrapper_fixture;
set local role cms_scheduler_test;
do $$ begin
  if public.cms_process_due_promotion_schedules() <> 1 then
    raise exception 'production wrapper did not activate exactly one due schedule';
  end if;
  if public.cms_process_due_promotion_schedules() <> 0 then
    raise exception 'repeated production wrapper invocation was not idempotent';
  end if;
end $$;
reset role;
select is((select count(*)::int from public.cms_promotion_schedule_attempts a
  join wrapper_fixture f on f.schedule_id=a.schedule_id),1,
 'dedicated role wrapper activation and repeat produced one attempt');
select is((select count(distinct stamp)::int from (
  select s.updated_at stamp from public.cms_promotion_schedules s join wrapper_fixture f on f.schedule_id=s.id
  union all select a.activated_at from public.cms_active_promotion_placements a
    join wrapper_fixture f on f.schedule_id=a.schedule_id
  union all select a.attempted_at from public.cms_promotion_schedule_attempts a
    join wrapper_fixture f on f.schedule_id=a.schedule_id
  union all select a.completed_at from public.cms_promotion_schedule_attempts a
    join wrapper_fixture f on f.schedule_id=a.schedule_id
  union all select a.occurred_at from public.cms_promotion_schedule_audit a
    join wrapper_fixture f on f.schedule_id=a.schedule_id) stamps),1,
 'one sampled database timestamp is used throughout a wrapper invocation');

-- Public eligibility is checked against the real database clock, even if a
-- stale active-placement row remains after the schedule's end.
create temp table public_reader_fixture(id uuid);
delete from public.cms_active_promotion_placements where placement_kind='global' and target_key='site';
with inserted as (insert into public.cms_promotion_schedules
  (promotion_document_id,promotion_revision_id,promotion_revision_number,label,starts_at,ends_at,status,created_by)
  select doc,rev,1,'public reader fixture',now()-interval '5 minutes',now()+interval '5 minutes',
    'active','56000000-0000-4000-8000-000000000001'::uuid from schedule_fixture
  returning id)
insert into public_reader_fixture select id from inserted;
insert into public.cms_promotion_schedule_placements(schedule_id,placement_kind,target_key)
  select id,'global','site' from public_reader_fixture;
insert into public.cms_active_promotion_placements
  (placement_kind,target_key,schedule_id,promotion_revision_id,activated_at)
  select 'global','site',f.id,s.promotion_revision_id,now() from public_reader_fixture f
    join public.cms_promotion_schedules s on s.id=f.id;
set local role anon;
select is(cms_read_active_promotion_placement('global','site')->>'promotionKey','about-intro',
  'anonymous reader sees only the active exact Promotion identity');
select is(cms_read_active_promotion_placement('global','site')->>'promotionRevisionId',
  (select rev::text from schedule_fixture),'public projection pins the exact revision');
select is(cms_read_active_promotion_placement('global','site')->'media','null'::jsonb,
  'Promotion without media has a null media projection');
select is((select count(*)::int from jsonb_object_keys(cms_read_active_promotion_placement('global','site'))),6,
  'public projection has exactly six allowlisted fields');
select ok(not (cms_read_active_promotion_placement('global','site') ?| array[
  'scheduleId','startsAt','endsAt','status','attempts','audit','actorId']),
  'no schedule or audit metadata is public');
select is(cms_read_active_promotion_placement('home','home'),null::jsonb,
  'global placement cannot appear at the home identity');
reset role;
update public.cms_promotion_schedules set ends_at=now()-interval '1 second'
  where id=(select id from public_reader_fixture);
set local role anon;
select is(cms_read_active_promotion_placement('global','site'),null::jsonb,
  'stale active row is hidden after the real DB-time end');
reset role;
update public.cms_promotion_schedules set ends_at=now()+interval '5 minutes',status='completed'
  where id=(select id from public_reader_fixture);
set local role anon;
select is(cms_read_active_promotion_placement('global','site'),null::jsonb,
  'completed schedule is hidden even with a stale active row');
reset role;
update public.cms_promotion_schedules set status='cancelled',cancelled_at=now()
  where id=(select id from public_reader_fixture);
set local role anon;
select is(cms_read_active_promotion_placement('global','site'),null::jsonb,
  'cancelled schedule is hidden even with a stale active row');
reset role;
update public.cms_promotion_schedules set status='active',cancelled_at=null,
  promotion_revision_id=(select draft_promo_rev from schedule_fixture),promotion_revision_number=2
  where id=(select id from public_reader_fixture);
update public.cms_active_promotion_placements set promotion_revision_id=(select draft_promo_rev from schedule_fixture)
  where placement_kind='global' and target_key='site';
set local role anon;
select is(cms_read_active_promotion_placement('global','site'),null::jsonb,
  'unpublished exact Promotion revision is hidden despite a stale active row');
reset role;
update public.cms_promotion_schedules set promotion_revision_id=(select rev from schedule_fixture),
  promotion_revision_number=1 where id=(select id from public_reader_fixture);
update public.cms_active_promotion_placements set promotion_revision_id=(select rev from schedule_fixture)
  where placement_kind='global' and target_key='site';
update public.cms_promotion_schedules set status='active' where id=(select id from public_reader_fixture);
update public.cms_promotion_identity set status='archived'
  where document_id=(select doc from schedule_fixture);
set local role anon;
select is(cms_read_active_promotion_placement('global','site'),null::jsonb,
  'archived Promotion identity is hidden even with an active placement');
reset role;
-- A separate immutable media Promotion proves that only its own exact
-- revision-media reference is projected, without storage path internals.
select public.cms_import_static_pilot_media();
insert into public.content_documents(id,content_type,content_key)
  values('71000000-0000-4000-8000-000000000001','promotion','media-offer');
insert into public.cms_promotion_identity(document_id,analytics_key)
  values('71000000-0000-4000-8000-000000000001','media-offer');
create temp table media_reader_fixture(rev uuid,schedule_id uuid);
with inserted as (insert into public.content_revisions(document_id,revision_number,schema_version,
    public_title,h1,seo_title,seo_description,body)
  values('71000000-0000-4000-8000-000000000001',1,7,'מבצע מדיה','מבצע מדיה','מבצע מדיה','תיאור',
    '{"description":"תוכן","template":"quiet","enabled":true,
      "cta":{"label":"צרו קשר","target":{"kind":"internal","path":"/contact"}},
      "mediaVersionId":"d1000000-0000-4000-8000-000000000001","mediaAlt":"תמונת מבצע"}'::jsonb)
  returning id)
insert into media_reader_fixture(rev) select id from inserted;
insert into public.content_publication_events(document_id,revision_id,kind)
  select '71000000-0000-4000-8000-000000000001',rev,'baseline' from media_reader_fixture;
with inserted as (insert into public.cms_promotion_schedules
  (promotion_document_id,promotion_revision_id,promotion_revision_number,label,starts_at,ends_at,status,created_by)
  select '71000000-0000-4000-8000-000000000001',rev,1,'media reader fixture',
    now()-interval '5 minutes',now()+interval '5 minutes','active',
    '56000000-0000-4000-8000-000000000001'::uuid from media_reader_fixture returning id)
update media_reader_fixture set schedule_id=inserted.id from inserted;
insert into public.cms_promotion_schedule_placements(schedule_id,placement_kind,target_key)
  select schedule_id,'service','window-cleaning' from media_reader_fixture;
insert into public.cms_active_promotion_placements
  (placement_kind,target_key,schedule_id,promotion_revision_id,activated_at)
  select 'service','window-cleaning',schedule_id,rev,now() from media_reader_fixture;
set local role anon;
select is(cms_read_active_promotion_placement('service','window-cleaning')->'media'->>'mediaVersionId',
  'd1000000-0000-4000-8000-000000000001','media projection pins exact immutable version');
select is(cms_read_active_promotion_placement('service','window-cleaning')->'media'->>'provider',
  'static','media projection contains only approved provider');
select is((select count(*)::int from jsonb_object_keys(
  cms_read_active_promotion_placement('service','window-cleaning')->'media')),3,
  'media projection excludes storage paths and unrelated metadata');
select is(cms_read_active_promotion_placement('service','sofa-cleaning'),null::jsonb,
  'a service placement cannot appear on another service');
reset role;
-- Even an operator-forged stale placement for a baseline-published but disabled
-- Promotion must never become public.
insert into public.content_documents(id,content_type,content_key)
  values('72000000-0000-4000-8000-000000000001','promotion','disabled-offer');
insert into public.cms_promotion_identity(document_id,analytics_key)
  values('72000000-0000-4000-8000-000000000001','disabled-offer');
create temp table disabled_reader_fixture(rev uuid,schedule_id uuid);
with inserted as (insert into public.content_revisions(document_id,revision_number,schema_version,
    public_title,h1,seo_title,seo_description,body)
  values('72000000-0000-4000-8000-000000000001',1,7,'מבצע כבוי','מבצע כבוי','מבצע כבוי','תיאור',
    '{"description":"תוכן","template":"quiet","enabled":false,
      "cta":{"label":"צרו קשר","target":{"kind":"internal","path":"/contact"}},
      "mediaVersionId":null,"mediaAlt":null}'::jsonb) returning id)
insert into disabled_reader_fixture(rev) select id from inserted;
insert into public.content_publication_events(document_id,revision_id,kind)
  select '72000000-0000-4000-8000-000000000001',rev,'baseline' from disabled_reader_fixture;
with inserted as (insert into public.cms_promotion_schedules
  (promotion_document_id,promotion_revision_id,promotion_revision_number,label,starts_at,ends_at,status,created_by)
  select '72000000-0000-4000-8000-000000000001',rev,1,'disabled reader fixture',
    now()-interval '5 minutes',now()+interval '5 minutes','active',
    '56000000-0000-4000-8000-000000000001'::uuid from disabled_reader_fixture returning id)
update disabled_reader_fixture set schedule_id=inserted.id from inserted;
insert into public.cms_promotion_schedule_placements(schedule_id,placement_kind,target_key)
  select schedule_id,'service','armchair-chair-cleaning' from disabled_reader_fixture;
insert into public.cms_active_promotion_placements
  (placement_kind,target_key,schedule_id,promotion_revision_id,activated_at)
  select 'service','armchair-chair-cleaning',schedule_id,rev,now() from disabled_reader_fixture;
set local role anon;
select is(cms_read_active_promotion_placement('service','armchair-chair-cleaning'),null::jsonb,
  'disabled published Promotion cannot render from a stale active row');
reset role;
select * from finish();
rollback;
