begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

create temporary table promotion_docs_fixture (
  about_doc uuid, about_rev uuid, pilot_doc uuid, pilot_rev uuid,
  about_document_before jsonb, about_revision_before jsonb, schedule_id uuid
);
grant select,update on promotion_docs_fixture to authenticated;
insert into promotion_docs_fixture default values;
update promotion_docs_fixture set about_rev=public.cms_import_promotion_baseline(
 '{"schemaVersion":7,"publicTitle":"מבצע קיים","h1":"מבצע קיים","seoTitle":"מבצע קיים",
 "seoDescription":"תיאור","description":"תוכן קיים","template":"accent","enabled":true,
 "cta":{"label":"צרו קשר","target":{"kind":"internal","path":"/contact"}},
 "mediaVersionId":null,"mediaAlt":null}'::jsonb);
update promotion_docs_fixture set about_doc=(select document_id from public.content_revisions
  where id=about_rev);
update promotion_docs_fixture set about_document_before=(select to_jsonb(d) from public.content_documents d
  where d.id=about_doc), about_revision_before=(select to_jsonb(r) from public.content_revisions r
  where r.id=about_rev);
select is((select about_doc from promotion_docs_fixture),
 'c0000000-0000-4000-8000-000000000200'::uuid,'existing about-intro document keeps its stable UUID');
select is((select content_key from public.content_documents where id=(select about_doc from promotion_docs_fixture)),
 'about-intro','existing Promotion key is unchanged');

update promotion_docs_fixture set pilot_doc=gen_random_uuid();
insert into public.content_documents(id,content_type,content_key)
  select pilot_doc,'promotion','phase-4a2-scheduler-pilot' from promotion_docs_fixture;
insert into public.cms_promotion_identity(document_id,analytics_key)
  select pilot_doc,'phase-4a2-scheduler-pilot' from promotion_docs_fixture;
with inserted as (
  insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,
    seo_title,seo_description,body)
  select f.pilot_doc,1,r.schema_version,'Phase 4A2 Scheduler Pilot',
    'Phase 4A2 Scheduler Pilot','Phase 4A2 Scheduler Pilot','Internal test only',r.body
  from promotion_docs_fixture f join public.content_revisions r on r.id=f.about_rev
  returning id
)
update promotion_docs_fixture set pilot_rev=(select id from inserted);
insert into public.content_publication_state(document_id,draft_revision_id,published_revision_id)
  select pilot_doc,pilot_rev,pilot_rev from promotion_docs_fixture;
insert into public.content_publication_events(document_id,revision_id,kind)
  select pilot_doc,pilot_rev,'baseline' from promotion_docs_fixture;

select is((select count(*)::int from public.content_documents where content_type='promotion'),2,
 'a second Promotion document has its own stable identity');
select is((select to_jsonb(d) from public.content_documents d where d.id=(select about_doc from promotion_docs_fixture)),
 (select about_document_before from promotion_docs_fixture),'about-intro document row is unchanged');
select is((select to_jsonb(r) from public.content_revisions r where r.id=(select about_rev from promotion_docs_fixture)),
 (select about_revision_before from promotion_docs_fixture),'existing exact Promotion revision is unchanged');
select is((select count(*)::int from public.content_revisions where document_id=(select about_doc from promotion_docs_fixture)),
 1,'existing Promotion history is not rewritten');
select ok(exists(select 1 from public.content_publication_events e, promotion_docs_fixture f
  where e.document_id=f.about_doc and e.revision_id=f.about_rev and e.kind='baseline'),
 'existing published exact revision reference remains valid');
select throws_ok($$insert into public.content_documents(content_type,content_key)
  values('promotion','phase-4a2-scheduler-pilot')$$,'23505',null,'duplicate Promotion key rejected');
select throws_ok($$insert into public.content_documents(content_type,content_key)
  values('promotion','Bad Key')$$,'23514',null,'invalid Promotion key format rejected');
select throws_ok($$insert into public.cms_promotion_identity(document_id,analytics_key)
  select about_doc,'Bad Key' from promotion_docs_fixture$$,'23514',null,
  'invalid Promotion identity key format rejected');
select throws_ok($$update public.content_revisions set public_title='changed'
  where id=(select pilot_rev from promotion_docs_fixture)$$,'55000',null,
  'second Promotion revision remains immutable');
select is(public.cms_schedule_validate_promotion((select pilot_doc from promotion_docs_fixture),
  (select pilot_rev from promotion_docs_fixture)),1,'pilot exact published revision is schedule-safe');
select throws_ok($$select public.cms_schedule_validate_promotion(
  (select about_doc from promotion_docs_fixture),(select pilot_rev from promotion_docs_fixture))$$,
  '23503',null,'a revision cannot be paired with another Promotion document');
select ok(exists(select 1 from pg_constraint where conrelid='public.page_revision_blocks'::regclass
  and contype='f' and confrelid='public.content_revisions'::regclass),
  'existing page/home exact Promotion revision FK remains installed');
select ok((select relforcerowsecurity from pg_class where oid='public.cms_promotion_identity'::regclass),
  'Promotion identity forced RLS is preserved');

insert into auth.users(id,invited_at) values ('57000000-0000-4000-8000-000000000001',null);
insert into public.cms_admin_members(user_id,is_active) values
  ('57000000-0000-4000-8000-000000000001',true);
set local role anon;
select throws_ok($$select * from public.cms_promotion_identity$$,'42501',null,
  'anonymous callers cannot enumerate Promotion identities');
select throws_ok($$select * from public.cms_promotion_schedules$$,'42501',null,
  'anonymous callers cannot enumerate schedules');
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"57000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
select throws_ok($$select public.cms_read_promotion_schedule_choices()$$,'42501',null,
  'AAL1 cannot read Promotion choices');
select set_config('request.jwt.claims',
  '{"sub":"57000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select is(jsonb_array_length(public.cms_read_promotion_schedule_choices()),2,
  'AAL2 choices include exact revisions from both Promotion documents');
select is(public.cms_read_promotion_revision((select pilot_rev from promotion_docs_fixture))->>'id',
  (select pilot_rev::text from promotion_docs_fixture),'Admin exact preview reads pilot Promotion revision');
update promotion_docs_fixture set schedule_id=public.cms_create_promotion_schedule(
  pilot_doc,pilot_rev,'pilot schedule','2030-06-01T10:00Z','2030-06-01T11:00Z',
  '[{"kind":"home","target":"home"}]'::jsonb);
select is(public.cms_read_promotion_schedules()->0->>'promotionRevisionId',
  (select pilot_rev::text from promotion_docs_fixture),'schedule pins pilot exact immutable Promotion revision');
select is(public.cms_read_promotion_schedules()->0->>'promotionDocumentId',
  (select pilot_doc::text from promotion_docs_fixture),'schedule pins the matching pilot document UUID');
select throws_ok($$select * from public.cms_promotion_schedules$$,'42501',null,
  'AAL2 Admin still has no direct schedule-table access');
reset role;

select * from finish();
rollback;
