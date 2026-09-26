begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();
-- Rollback restores the imported local baseline after every SQL run.
truncate public.cms_page_route_events, public.cms_page_routes, public.cms_new_page_identity, public.page_revision_blocks, public.promotion_revision_media, public.cms_promotion_identity, public.revision_media_refs, public.content_publication_events, public.content_publication_state, public.content_revisions, public.content_documents;
create temporary table fixture(payload jsonb, baseline uuid, draft uuid, restored uuid);
insert into fixture(payload) values ('{"schemaVersion":1,"publicTitle":"Baseline","h1":"Baseline h1","eyebrow":"Eyebrow","intro":"Intro","imageAlt":"Alt","signsTitle":"Signs","signsDescription":"Signs intro","processTitle":"Process","processDescription":"Process intro","benefitsDescription":"Benefits intro","resultDescription":"Result","seoTitle":"Baseline SEO","seoDescription":"Baseline description","images":["/images/services/delicate-upholstery-cleaning.jpeg"],"signs":["Sign"],"process":["Step"],"benefits":["Benefit"],"faqs":[{"question":"Question","answer":"Answer"}],"relatedLinks":[{"label":"Mattress","href":"/mattress-cleaning"}]}');
grant select,update on fixture to authenticated,anon;
select ok(public.cms_valid_pilot_payload((select payload from fixture)), 'fixture validates');
update fixture set baseline=public.cms_import_service_baseline(payload);
select is(public.cms_import_service_baseline((select payload from fixture)), (select baseline from fixture), 'baseline import is idempotent');
select is((select count(*)::int from content_revisions),1,'one baseline revision');
select is((select revision_number from content_revisions),1,'baseline is Revision 1');
select is((select count(*)::int from content_publication_events),1,'one baseline audit event');
select is((select draft_revision_id=published_revision_id from content_publication_state),true,'import starts at identical draft/published baseline');
select throws_ok($$insert into content_documents(content_type,content_key) values('service','delicate-upholstery-cleaning')$$,'23505',null,'document identity is unique');
select throws_ok($$insert into content_documents(content_type,content_key) values('service','other-service')$$,'23514',null,'other services are outside scope');
select throws_ok($$update content_revisions set public_title='overwrite'$$,'55000',null,'even operator cannot mutate a revision');
select throws_ok($$delete from content_revisions$$,'55000',null,'revision history cannot be deleted in place');
select throws_ok($$update content_publication_events set kind='publish'$$,'55000',null,'publication audit is immutable');

select ok(not public.cms_valid_pilot_payload(payload || '{"path":"/other"}'),'unknown path rejected') from fixture;
select ok(not public.cms_valid_pilot_payload(payload || '{"schemaVersion":2}'),'schema version rejected') from fixture;
select ok(not public.cms_valid_pilot_payload(payload || jsonb_build_object('publicTitle',chr(160))),'Unicode whitespace title rejected') from fixture;
select ok(not public.cms_valid_pilot_payload(payload - 'h1'),'missing field rejected') from fixture;
select ok(not public.cms_valid_pilot_payload(payload || '{"h1":"<script>bad</script>"}'),'HTML rejected') from fixture;
select ok(not public.cms_valid_pilot_payload(payload || jsonb_build_object('seoTitle',repeat('x',121))),'SEO length rejected') from fixture;
select ok(not public.cms_valid_pilot_payload(payload || '{"images":["https://example.invalid/image"]}'),'remote images rejected') from fixture;
select ok(not public.cms_valid_pilot_payload(payload || '{"images":[]}'),'empty images rejected') from fixture;
select ok(not public.cms_valid_pilot_payload(payload || '{"relatedLinks":[{"label":"bad","href":"javascript:bad"}]}'),'executable links rejected') from fixture;
select ok(not public.cms_valid_pilot_payload(payload || '{"faqs":[{"question":"Q","answer":"A","html":"bad"}]}'),'FAQ extra fields rejected') from fixture;
select ok(not public.cms_valid_pilot_payload(payload || '{"faqs":[{"question":"Q","answer":null}]}'),'FAQ non-text rejected') from fixture;
select ok(not public.cms_valid_pilot_payload(payload || '{"signs":["duplicate","duplicate"]}'),'duplicate list rejected') from fixture;
select ok(not public.cms_valid_pilot_payload(payload || '{"process":[]}'),'empty list rejected') from fixture;
select ok(not public.cms_valid_pilot_payload(payload || '{"benefits":["valid","<html>"]}'),'later list item validated') from fixture;
select ok(not public.cms_valid_pilot_payload(payload || '{"faqs":[{"question":"Q","answer":"A"},{"question":"Q2","answer":"<html>"}]}'),'later FAQ validated') from fixture;
select ok(not public.cms_valid_pilot_payload(payload || '{"relatedLinks":[{"label":"ok","href":"/mattress-cleaning"},{"label":"bad","href":"https://example.invalid"}]}'),'later link validated') from fixture;
select ok(relrowsecurity and relforcerowsecurity, relname || ' forced RLS') from pg_class
 where oid in ('content_documents'::regclass,'content_revisions'::regclass,'content_publication_state'::regclass,'content_publication_events'::regclass);

insert into auth.users(id,invited_at) values
 ('30000000-0000-4000-8000-000000000001',null),
 ('30000000-0000-4000-8000-000000000002',null),
 ('30000000-0000-4000-8000-000000000003',null),
 ('30000000-0000-4000-8000-000000000004',now());
insert into cms_admin_members(user_id,is_active) values
 ('30000000-0000-4000-8000-000000000001',true),
 ('30000000-0000-4000-8000-000000000003',false),
 ('30000000-0000-4000-8000-000000000004',true);

set local role anon;
select throws_ok($$select * from content_revisions$$,'42501',null,'anonymous cannot read revisions');
select throws_ok($$select * from content_publication_state$$,'42501',null,'anonymous cannot read draft pointer');
select throws_ok($$select public.cms_read_pilot_editor()$$,'42501',null,'anonymous cannot read editor');
select throws_ok($$select public.cms_save_service_draft(1,null,null)$$,'42501',null,'anonymous cannot save');
select throws_ok($$select public.cms_publish_service_revision(1,null)$$,'42501',null,'anonymous cannot publish');
select throws_ok($$select public.cms_import_service_baseline(null)$$,'42501',null,'anonymous cannot bootstrap');
select is(public.cms_read_published_pilot()->'payload',(select payload from fixture),'anonymous reads only the exact published payload');
select is((select count(*)::int from jsonb_object_keys(public.cms_read_published_pilot())),2,'public projection includes no audit or draft metadata');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","aal":"aal2"}',true);
select is((select count(*)::int from content_revisions),0,'nonmember cannot read revisions');
select throws_ok($$select public.cms_read_pilot_editor()$$,'42501',null,'nonmember cannot read editor');
select throws_ok($$select public.cms_save_service_draft(1,(select baseline from fixture),(select payload from fixture))$$,'42501',null,'nonmember cannot save');
select throws_ok($$select public.cms_publish_service_revision(1,(select baseline from fixture))$$,'42501',null,'nonmember cannot publish');
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","aal":"aal1"}',true);
select is((select count(*)::int from content_revisions),0,'AAL1 cannot read revisions');
select is((select count(*)::int from content_documents),0,'AAL1 cannot read documents');
select is((select count(*)::int from content_publication_state),0,'AAL1 cannot read draft state');
select is((select count(*)::int from content_publication_events),0,'AAL1 cannot read audit');
select throws_ok($$select public.cms_read_pilot_editor()$$,'42501',null,'AAL1 cannot read editor');
select throws_ok($$select public.cms_save_service_draft(1,(select baseline from fixture),(select payload from fixture))$$,'42501',null,'AAL1 cannot save');
select throws_ok($$select public.cms_save_service_draft(1,(select baseline from fixture),null,(select baseline from fixture))$$,'42501',null,'AAL1 cannot restore');
select throws_ok($$select public.cms_publish_service_revision(1,(select baseline from fixture))$$,'42501',null,'AAL1 cannot publish');
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000003","aal":"aal2"}',true);
select is((select count(*)::int from content_revisions),0,'inactive AAL2 cannot read revisions');
select throws_ok($$select public.cms_read_pilot_editor()$$,'42501',null,'inactive AAL2 denied');
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000004","aal":"aal2"}',true);
select is((select count(*)::int from content_revisions),0,'onboarding-pending AAL2 cannot read revisions');
select throws_ok($$select public.cms_read_pilot_editor()$$,'42501',null,'onboarding-pending denied');

select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","aal":"aal2"}',true);
select is((select count(*)::int from content_revisions),1,'completed active AAL2 reads revision');
select is(public.cms_read_pilot_editor()->'draft',(select payload from fixture),'editor snapshot matches draft');
select throws_ok($$insert into content_documents(content_type,content_key) values('service','delicate-upholstery-cleaning')$$,'42501',null,'admin cannot directly create documents');
select throws_ok($$update content_revisions set public_title='bad'$$,'42501',null,'admin cannot directly mutate revisions');
select throws_ok($$delete from content_revisions$$,'42501',null,'admin cannot delete history');
select throws_ok($$update content_publication_state set generation=100$$,'42501',null,'admin cannot bypass concurrency');
select throws_ok($$insert into content_publication_events(document_id,revision_id,kind) select document_id,draft_revision_id,'baseline' from content_publication_state$$,'42501',null,'admin cannot forge audit');
select throws_ok($$select public.cms_import_service_baseline((select payload from fixture))$$,'42501',null,'admin cannot run operator import');
select throws_ok($$select public.cms_revision_payload(r) from content_revisions r$$,'42501',null,'internal payload helper is not exposed as RPC');
select throws_ok($$select public.cms_save_service_draft(1,(select baseline from fixture),(select payload || '{"h1":"<bad>"}' from fixture))$$,'22023',null,'RPC independently validates payload');
select is((select generation::int from content_publication_state),1,'failed save leaves generation unchanged');
update fixture set draft=public.cms_save_service_draft(1,baseline,payload || '{"h1":"Draft h1","seoTitle":"Draft SEO"}');
select is((select count(*)::int from content_revisions),2,'save creates a new immutable revision');
select is((select draft_revision_id from content_publication_state),(select draft from fixture),'save changes draft pointer');
select is((select published_revision_id from content_publication_state),(select baseline from fixture),'save leaves published pointer unchanged');
select is(public.cms_read_published_pilot()->'payload',(select payload from fixture),'draft cannot affect public payload or SEO');
select is((select generation::int from content_publication_state),2,'save advances optimistic generation');
select is((select base_revision_id from content_revisions where id=(select draft from fixture)),(select baseline from fixture),'base revision recorded');
select is((select created_by::text from content_revisions where id=(select draft from fixture)),'30000000-0000-4000-8000-000000000001','editor UUID recorded');
select throws_ok($$select public.cms_save_service_draft(1,(select baseline from fixture),(select payload from fixture))$$,'PT409',null,'stale editor rejected');
select throws_ok($$select public.cms_publish_service_revision(1,(select draft from fixture))$$,'PT409',null,'stale publication rejected');
select throws_ok($$select public.cms_publish_service_revision(2,(select baseline from fixture))$$,'PT409',null,'cannot publish arbitrary history directly');
select is(public.cms_publish_service_revision(2,(select draft from fixture)),(select draft from fixture),'explicit publication succeeds');
select is((select draft_revision_id from content_publication_state),(select draft from fixture),'publish does not change draft pointer');
select is((select published_revision_id from content_publication_state),(select draft from fixture),'publish replaces published pointer');
select is((select count(*)::int from content_revisions),2,'publish does not mutate/create content');
select is((select count(*)::int from content_publication_events),2,'publish records one event');
select is((select previous_revision_id from content_publication_events where kind='publish'),(select baseline from fixture),'publication records previous pointer');
select is((select published_by::text from content_publication_events where kind='publish'),'30000000-0000-4000-8000-000000000001','publisher UUID recorded');
select is(public.cms_read_published_pilot()->'payload'->>'seoTitle','Draft SEO','published metadata changes with payload');
select throws_ok($$select public.cms_publish_service_revision(2,(select draft from fixture))$$,'PT409',null,'replayed publish rejected');
update fixture set restored=public.cms_save_service_draft(3,draft,null,baseline);
select isnt((select restored from fixture),(select baseline from fixture),'restore creates a new immutable identity');
select is((select revision_number from content_revisions where id=(select restored from fixture)),3,'restore advances revision number');
select is((select source_revision_id from content_revisions where id=(select restored from fixture)),(select baseline from fixture),'restore records historical source');
select is((select base_revision_id from content_revisions where id=(select restored from fixture)),(select draft from fixture),'restore records current base');
select is((select published_revision_id from content_publication_state),(select draft from fixture),'restore does not publish');
select is(public.cms_read_pilot_editor()->'draft',(select payload from fixture),'restore copies exact historical content');
select is(public.cms_publish_service_revision(4,(select restored from fixture)),(select restored from fixture),'restored draft publishes normally');
select is(public.cms_read_published_pilot()->'payload',(select payload from fixture),'published rollback returns exact baseline');
reset role;
select is(public.cms_import_service_baseline((select payload from fixture)),(select baseline from fixture),'reimport still returns Revision 1 after edits');
select is((select published_revision_id from content_publication_state),(select restored from fixture),'reimport never resets publication');

-- Audit insertion failure must roll the pointer back in the same transaction.
create function pg_temp.reject_publish() returns trigger language plpgsql as $$begin raise exception 'synthetic audit failure'; end$$;
create trigger synthetic_audit_failure before insert on content_publication_events for each row execute function pg_temp.reject_publish();
set local role authenticated;
update fixture set draft=public.cms_save_service_draft(5,restored,payload || '{"h1":"Next draft"}');
select throws_ok($$select public.cms_publish_service_revision(6,(select draft from fixture))$$,'P0001','synthetic audit failure','audit failure aborts entire publication');
select is((select published_revision_id from content_publication_state),(select restored from fixture),'failed audit leaves old published pointer');
select is((select generation::int from content_publication_state),6,'failed publication leaves generation unchanged');
reset role;
drop trigger synthetic_audit_failure on content_publication_events;
update cms_admin_members set is_active=false where user_id='30000000-0000-4000-8000-000000000001';
set local role authenticated;
select is((select count(*)::int from content_revisions),0,'revocation immediately removes content read');
select throws_ok($$select public.cms_publish_service_revision(6,(select draft from fixture))$$,'42501',null,'same AAL2 claim cannot publish after revocation');
select * from finish();
rollback;
