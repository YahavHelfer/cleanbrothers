begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
truncate cms_page_route_events,cms_page_routes,cms_new_page_identity,page_revision_blocks,promotion_revision_media,cms_promotion_identity,media_audit_events,revision_media_refs,media_versions,media_assets,
 content_publication_events,content_publication_state,content_revisions,content_documents;

create temporary table page_fixture(p jsonb,promo jsonb,page_baseline uuid,promo_baseline uuid,
 page_draft uuid,promo_draft uuid,page_restored uuid,promo_changed uuid);
grant select,update on page_fixture to authenticated;
grant select on page_fixture to anon;
insert into page_fixture(p,promo) values(
 '{"schemaVersion":6,"publicTitle":"אודות","h1":"כותרת אודות","seoTitle":"כותרת SEO","seoDescription":"תיאור SEO","canonical":"/about","blocks":[{"id":"a0000000-0000-4000-8000-000000000001","position":0,"type":"hero","schemaVersion":1,"hidden":false,"payload":{"eyebrow":"עלינו","title":"כותרת אודות","description":"תיאור פתיחה","cta":{"label":"צרו קשר","target":{"kind":"internal","path":"/contact"}},"mediaAlt":null},"mediaVersionId":null,"promotionRevisionId":null}]}'::jsonb,
 '{"schemaVersion":7,"publicTitle":"מבצע היכרות","h1":"מבצע היכרות","seoTitle":"מבצע SEO","seoDescription":"תיאור מבצע SEO","description":"תיאור המבצע","template":"accent","enabled":true,"cta":{"label":"צרו קשר","target":{"kind":"internal","path":"/contact"}},"mediaVersionId":null,"mediaAlt":null}'::jsonb);
update page_fixture set promo_baseline=cms_import_promotion_baseline(promo),page_baseline=cms_import_about_baseline(p);
select is((select count(*)::int from content_documents),2,'page and promotion reuse content_documents');
select is((select count(*)::int from content_revisions),2,'one immutable baseline per document');
select is((select count(*)::int from page_revision_blocks),1,'ordered baseline block inserted');
select is(cms_import_about_baseline(p),page_baseline,'page baseline import is idempotent') from page_fixture;
select is(cms_import_promotion_baseline(promo),promo_baseline,'promotion baseline import is idempotent') from page_fixture;
select is((select count(*)::int from content_publication_events),2,'second import created no audit events');
select ok(cms_page_target('{"kind":"internal","path":"/contact"}'),'approved internal route');
select ok(cms_page_target('{"kind":"phone"}'),'phone uses fixed business resolver');
select ok(cms_page_target('{"kind":"whatsapp","message":"היי"}'),'WhatsApp uses typed message');
select ok(not cms_page_target('{"kind":"internal","path":"javascript:alert(1)"}'),'script URL denied');
select ok(not cms_page_target('{"kind":"internal","path":"data:text/html"}'),'data URL denied');
select ok(not cms_page_target('{"kind":"internal","path":"//evil.example"}'),'protocol-relative URL denied');
select ok(not cms_page_target('{"kind":"external","url":"https://evil.example"}'),'arbitrary external URL denied');
select ok(not cms_page_target('{"kind":"whatsapp","message":"<script>"}'),'executable message denied');
select ok(not cms_valid_page_block('unknown','{}',null,null),'unknown block type denied');
select ok(not cms_valid_page_block('hero','{"title":"<script>"}',null,null),'HTML and missing fields denied');
select ok(not cms_valid_page_block('spacer','{"size":"wide","variant":"divider","className":"p-999"}',null,null),'arbitrary class denied');
select ok(not cms_valid_page_block('richText','{"nodes":[{"kind":"iframe","level":null,"items":[[{"text":"bad","bold":false,"emphasis":false,"link":null}]]}]}',null,null),'unsupported rich node denied');
select ok(not cms_page_inline('{"text":"hello","bold":false,"emphasis":false,"link":{"kind":"external","url":"https://evil.example"}}'),'rich link scheme denied');
select ok(not cms_valid_page_revision(p||'{"extra":true}'),'unknown page field denied') from page_fixture;
select ok(not cms_valid_promotion_revision(promo||'{"startAt":"tomorrow"}'),'fake scheduler rejected') from page_fixture;
select ok(not cms_valid_promotion_revision(jsonb_set(promo,'{mediaVersionId}','"f0000000-0000-4000-8000-000000000099"')),'promotion media requires contextual alt') from page_fixture;
select is((select count(*)::int from pg_policies where schemaname='public' and tablename in ('page_revision_blocks','cms_promotion_identity','promotion_revision_media') and policyname='cms_pages_aal2_read'),3,'new tables have AAL2 policies');
select is((select count(*)::int from pg_class where relname in ('page_revision_blocks','cms_promotion_identity','promotion_revision_media') and relforcerowsecurity),3,'new tables force RLS');

insert into auth.users(id,invited_at) values
 ('52000000-0000-4000-8000-000000000001',null),('52000000-0000-4000-8000-000000000002',null),
 ('52000000-0000-4000-8000-000000000003',null),('52000000-0000-4000-8000-000000000004',now());
insert into cms_admin_members(user_id,is_active) values
 ('52000000-0000-4000-8000-000000000001',true),('52000000-0000-4000-8000-000000000003',false),
 ('52000000-0000-4000-8000-000000000004',true);
set local role anon;
select throws_ok($$select * from page_revision_blocks$$,'42501',null,'anonymous cannot enumerate page blocks');
select throws_ok($$select * from cms_promotion_identity$$,'42501',null,'anonymous cannot enumerate promotions');
select throws_ok($$select cms_read_page_editor()$$,'42501',null,'anonymous editor denied');
select throws_ok($$select cms_read_published_page()$$,'42501',null,'no anonymous published page projection');
select is(cms_read_public_page('about')->>'revisionId',(select page_baseline::text from page_fixture),'anonymous reads only published about');
select is(cms_read_public_page('sofa-cleaning'),null::jsonb,'service key cannot read as a page');
select is(cms_read_public_page('about-intro'),null::jsonb,'promotion key cannot read as a page');
select is(cms_read_public_page('c0000000-0000-4000-8000-000000000100'),null::jsonb,'document UUID is not a public key');
select is(cms_read_public_page((select page_baseline::text from page_fixture)),null::jsonb,'revision UUID is not a public key') from page_fixture;
select ok(not (cms_read_public_page('about') ?| array['history','draftRevisionId','publishedRevisionId','createdBy','publishedBy']),'public projection omits management fields');
select throws_ok($$select * from content_revisions$$,'42501',null,'anonymous cannot enumerate page revisions');
select throws_ok($$select cms_save_page_draft(1,null,null)$$,'42501',null,'anonymous cannot mutate page');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"52000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
select is((select count(*)::int from page_revision_blocks),0,'nonmember RLS hides blocks');
select throws_ok($$select cms_read_promotion_editor()$$,'42501',null,'nonmember promotion denied');
select is(cms_read_public_page('about')->>'revisionId',(select page_baseline::text from page_fixture),'nonmember only has public snapshot') from page_fixture;
select set_config('request.jwt.claims','{"sub":"52000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
select is((select count(*)::int from cms_promotion_identity),0,'inactive member RLS hides promotion');
select throws_ok($$select cms_read_page_editor()$$,'42501',null,'inactive member page denied');
select set_config('request.jwt.claims','{"sub":"52000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
select is((select count(*)::int from page_revision_blocks),0,'AAL1 RLS hides blocks');
select throws_ok($$select cms_read_page_editor()$$,'42501',null,'AAL1 page editor denied');
select throws_ok($$select cms_read_promotion_editor()$$,'42501',null,'AAL1 promotion editor denied');
select throws_ok($$select cms_save_page_draft(1,null,null)$$,'42501',null,'AAL1 page mutation denied');
select set_config('request.jwt.claims','{"sub":"52000000-0000-4000-8000-000000000004","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$select cms_read_page_editor()$$,'42501',null,'pending onboarding page denied');
select set_config('request.jwt.claims','{"sub":"52000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select is((select count(*)::int from page_revision_blocks),1,'active AAL2 admin reads blocks');
select throws_ok($$select cms_import_about_baseline(null)$$,'42501',null,'admin cannot call operator import');
select throws_ok($$insert into page_revision_blocks(revision_id,block_id,position,block_type,schema_version,payload) values(gen_random_uuid(),gen_random_uuid(),0,'hero',1,'{}')$$,'42501',null,'admin cannot directly insert blocks');
select is(cms_read_page_revision((select promo_baseline from page_fixture)),null::jsonb,'promotion revision cannot render as page') ;
select is(cms_read_promotion_revision((select page_baseline from page_fixture)),null::jsonb,'page revision cannot render as promotion');

-- Two editors start from the same generation. Saving a draft never publishes.
update page_fixture set page_draft=cms_save_page_draft(1,page_baseline,
 jsonb_set(p,'{blocks}',p->'blocks'||jsonb_build_array(jsonb_build_object(
   'id','a0000000-0000-4000-8000-000000000002','position',1,'type','spacer','schemaVersion',1,
   'hidden',true,'payload',jsonb_build_object('size','normal','variant','divider'),
   'mediaVersionId',null,'promotionRevisionId',null)))) ;
select is(cms_read_published_page()->>'id',page_baseline::text,'draft does not alter published pointer') from page_fixture;
select is(cms_read_public_page('about')->>'revisionId',page_baseline::text,'public reader ignores saved draft') from page_fixture;
select is(jsonb_array_length(cms_read_page_revision(page_draft)->'payload'->'blocks'),2,'exact preview reads saved revision') from page_fixture;
select is(jsonb_array_length(cms_read_page_revision(page_baseline)->'payload'->'blocks'),1,'historical baseline blocks unchanged') from page_fixture;
select throws_ok(format('select cms_save_page_draft(1,%L,%L::jsonb)',page_baseline,p),'PT409',null,'stale editor rejected') from page_fixture;
select throws_ok(format('select cms_save_page_draft(2,%L,null,%L)',page_draft,promo_baseline),'23503',null,'promotion revision cannot be page restore') from page_fixture;
select is(cms_publish_page_revision(2,page_draft),page_draft,'published exact saved page revision') from page_fixture;
select is((cms_read_published_page()->'payload'->'blocks'->1->>'hidden')::boolean,true,'hidden block stays in published immutable data') from page_fixture;
select is(jsonb_array_length(cms_read_public_page('about')->'payload'->'blocks'),1,'public projection removes hidden block');
select throws_ok($$update page_revision_blocks set hidden=false$$,'42501',null,'admin cannot mutate historical block');
select throws_ok($$delete from page_revision_blocks$$,'42501',null,'admin cannot remove historical block');

-- Promotion is a separate document; page keeps an exact immutable revision FK.
update page_fixture set promo_draft=cms_save_promotion_draft(1,promo_baseline,promo||'{"description":"מבצע חדש"}');
select is(cms_read_promotion_revision(promo_baseline)->'payload'->>'description','תיאור המבצע','promotion baseline immutable') from page_fixture;
update page_fixture set page_draft=cms_save_page_draft(3,page_draft,
 jsonb_set(p,'{blocks}',p->'blocks'||jsonb_build_array(jsonb_build_object(
   'id','a0000000-0000-4000-8000-000000000003','position',1,'type','promotionBanner','schemaVersion',1,
   'hidden',false,'payload',jsonb_build_object('template','accent'),
   'mediaVersionId',null,'promotionRevisionId',promo_draft))));
select throws_ok(format('select cms_publish_page_revision(4,%L)',page_draft),'55000',null,'page cannot publish unapproved promotion draft') from page_fixture;
select is(cms_publish_promotion_revision(2,promo_draft),promo_draft,'promotion published first') from page_fixture;
select is(cms_publish_page_revision(4,page_draft),page_draft,'page publishes exact approved promotion revision') from page_fixture;
select is((cms_read_published_page()->'payload'->'blocks'->1->>'promotionRevisionId')::uuid,promo_draft,'page pins exact promotion revision') from page_fixture;
select is(cms_read_public_page('about')->'promotions'->(promo_draft::text)->>'description','מבצע חדש','public reader exposes only pinned published promotion') from page_fixture;
select is(jsonb_array_length(cms_read_public_page('about')->'payload'->'blocks'),2,'public projection includes visible promotion block');
update page_fixture set promo_changed=cms_save_promotion_draft(3,promo_draft,promo||'{"description":"מבצע אחר"}');
select is(cms_publish_promotion_revision(4,promo_changed),promo_changed,'later promotion revision published') from page_fixture;
select is((cms_read_published_page()->'payload'->'blocks'->1->>'promotionRevisionId')::uuid,promo_draft,'later promotion edit does not mutate historical page') from page_fixture;
select is(cms_read_promotion_revision(promo_draft)->'payload'->>'description','מבצע חדש','pinned promotion content stays exact') from page_fixture;
select is(cms_read_public_page('about')->'promotions'->(promo_draft::text)->>'description','מבצע חדש','later promotion publication does not change pinned public copy') from page_fixture;
select ok(not (cms_read_public_page('about')->'promotions' ? (select promo_changed::text from page_fixture)),'unreferenced promotion revision is not exposed');
update page_fixture set page_restored=cms_save_page_draft(5,page_draft,null,page_baseline);
select is(cms_read_published_page()->>'id',page_draft::text,'restore only creates draft') from page_fixture;
select is(cms_read_page_revision(page_restored)->'payload'->'blocks',cms_read_page_revision(page_baseline)->'payload'->'blocks','rollback copies exact historical block list') from page_fixture;
select is(cms_publish_page_revision(6,page_restored),page_restored,'rollback published as new revision') from page_fixture;
select is(cms_read_published_page()->'payload',p,'published rollback equals original page payload') from page_fixture;
select is(cms_read_public_page('about')->>'revisionId',page_restored::text,'public reader follows rollback publication pointer') from page_fixture;
select is(cms_read_public_page('about')->'promotions','{}'::jsonb,'rolled-back baseline exposes no promotion');
select is((select count(*)::int from content_revisions where document_id='c0000000-0000-4000-8000-000000000100'),4,'page history remains immutable and complete');
select is((select count(*)::int from content_publication_events where document_id='c0000000-0000-4000-8000-000000000100'),4,'page audit records each publication');
select is((select analytics_key from cms_promotion_identity where document_id='c0000000-0000-4000-8000-000000000200'),'about-intro','analytics identity stable despite copy edits');
select throws_ok($$update promotion_revision_media set alt_text='overwrite'$$,'42501',null,'admin cannot edit promotion media references');
reset role;
select throws_ok($$update page_revision_blocks set hidden=false$$,'55000',null,'owner-side historical block immutability');
select throws_ok($$delete from page_revision_blocks$$,'55000',null,'owner-side historical block deletion blocked');
select ok(exists(select 1 from pg_trigger where tgrelid='public.promotion_revision_media'::regclass
 and tgname='promotion_revision_media_immutable'),'promotion media immutability trigger installed');
select * from finish();
rollback;
