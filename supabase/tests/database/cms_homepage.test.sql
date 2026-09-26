begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
truncate cms_page_route_events,cms_page_routes,cms_new_page_identity,page_revision_blocks,promotion_revision_media,cms_promotion_identity,
  media_audit_events,revision_media_refs,media_versions,media_assets,content_publication_events,content_publication_state,
  content_revisions,content_documents;

create temporary table home_fixture(p jsonb, baseline uuid, draft uuid, rollback uuid);
grant select,update on home_fixture to authenticated;
grant select on home_fixture to anon;
insert into home_fixture(p) values ('{
  "schemaVersion":12,"publicTitle":"דף הבית","h1":"כותרת הבית","seoTitle":"כותרת SEO",
  "seoDescription":"תיאור SEO","canonical":"/","blocks":[{
    "id":"d4000000-0000-4000-8000-000000000001","position":0,"type":"homeHero",
    "schemaVersion":1,"hidden":false,"mediaVersionId":"d3000000-0000-4000-8000-000000000002",
    "promotionRevisionId":null,"payload":{"eyebrow":"פתיח","title":"כותרת הבית","description":"תיאור הבית",
      "primaryLabel":"צרו קשר","secondaryLabel":"שירותים","trustChips":["שירות עד הבית"],
      "backgroundAlt":"ניקוי ספה בבית הלקוח"}}
  ]}'::jsonb);
update home_fixture set baseline=cms_import_home_baseline(p);
select is(cms_import_home_baseline(p),baseline,'home baseline import is idempotent') from home_fixture;
select is((select count(*)::int from content_documents where content_key='home'),1,'one fixed home document');
select is((select count(*)::int from content_revisions where document_id='d4000000-0000-4000-8000-000000000000'),1,'one baseline revision');
select is((select count(*)::int from page_revision_blocks where block_type='homeHero'),1,'homepage reuses immutable block table');
select is((select count(*)::int from revision_media_refs where usage_role='home-hero'),1,'hero pins immutable media version');
select is((select count(*)::int from content_publication_events where document_id='d4000000-0000-4000-8000-000000000000'),1,'second import creates no event');
select ok(not cms_valid_home_revision((p-'blocks')||'{"canonical":"/other"}'),'home canonical cannot change') from home_fixture;
select ok(not cms_valid_home_revision((p-'blocks')||'{"extra":"unsafe"}'),'unknown home revision field denied') from home_fixture;
select ok(not cms_valid_home_block('homeHero','{"title":"<script>"}',null,null),'HTML or incomplete hero denied');
select ok(not cms_valid_home_block('homeEstimate','{"eyebrow":"x","title":"x","description":"x","mobileDescription":"x","formula":"1"}',null,null),'calculator formula cannot be edited');
select ok(not cms_valid_home_block('homeFinalCta','{"eyebrow":"x","title":"x","description":"x","whatsappLabel":"x","phoneLabel":"x","trustNotes":["x"],"url":"https://wa.me/1"}',null,null),'direct WhatsApp destination denied');
select ok(not cms_valid_home_block('homeServices','{"eyebrow":"x","title":"x","mobileDescription":"x","description":"x","serviceKeys":["unknown"],"cards":{},"note":"x"}',null,null),'arbitrary service key denied');
select ok(not cms_valid_home_block('homeBeforeAfter','{"eyebrow":"x","title":"x","mobileDescription":"x","description":"x","ctaLabel":"x","items":[{"title":"x","category":"sofas","description":"x","beforeVersionId":"https://evil.example/a.jpg","afterVersionId":"d3000000-0000-4000-8000-000000000002","beforeAlt":"x","afterAlt":"x"}]}',null,null),'remote gallery URL denied');
select ok(not cms_valid_home_block('unknown','{}',null,null),'unknown section type denied');
select ok(exists(select 1 from pg_trigger where tgrelid='public.page_revision_blocks'::regclass and tgname='page_revision_blocks_immutable'),'home blocks keep immutable trigger');
select ok((select relforcerowsecurity from pg_class where oid='public.page_revision_blocks'::regclass),'home blocks retain forced RLS');

insert into auth.users(id,invited_at) values
  ('54000000-0000-4000-8000-000000000001',null),('54000000-0000-4000-8000-000000000002',null),
  ('54000000-0000-4000-8000-000000000003',null);
insert into cms_admin_members(user_id,is_active) values
  ('54000000-0000-4000-8000-000000000001',true),('54000000-0000-4000-8000-000000000003',false);
set local role anon;
select is(cms_read_public_home()->>'revisionId',(select baseline::text from home_fixture),'anonymous reads published home only');
select ok(not (cms_read_public_home() ?| array['history','draftRevisionId','publishedRevisionId','createdBy','publishedBy']),'public home omits editor and history');
select throws_ok($$select cms_read_home_editor()$$,'42501',null,'anonymous editor denied');
select throws_ok($$select cms_read_home_revision(gen_random_uuid())$$,'42501',null,'anonymous exact revision denied');
select throws_ok($$select cms_save_home_draft(1,null,null)$$,'42501',null,'anonymous mutation denied');
select throws_ok($$select * from page_revision_blocks$$,'42501',null,'anonymous cannot enumerate blocks');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"54000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
select is((select count(*)::int from page_revision_blocks),0,'nonmember RLS hides home blocks');
select throws_ok($$select cms_read_home_editor()$$,'42501',null,'nonmember editor denied');
select set_config('request.jwt.claims','{"sub":"54000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$select cms_read_home_editor()$$,'42501',null,'inactive admin denied');
select set_config('request.jwt.claims','{"sub":"54000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
select throws_ok($$select cms_read_home_editor()$$,'42501',null,'AAL1 editor denied');
select throws_ok($$select cms_save_home_draft(1,null,null)$$,'42501',null,'AAL1 mutation denied');
select set_config('request.jwt.claims','{"sub":"54000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select is((select count(*)::int from page_revision_blocks where block_type='homeHero'),1,'AAL2 active admin sees home block');
select throws_ok($$select cms_import_home_baseline(null)$$,'42501',null,'administrator cannot invoke operator import');
select is(cms_read_home_revision((select baseline from home_fixture))->'payload'->>'canonical','/','exact home revision keeps fixed route');
select is(cms_read_home_revision(gen_random_uuid()),null::jsonb,'wrong revision not readable');
update home_fixture set draft=cms_save_home_draft(1,baseline,jsonb_set(jsonb_set(p,'{seoTitle}','"טיוטת SEO"'::jsonb),'{blocks}',p->'blocks'||
  '[{"id":"d4000000-0000-4000-8000-000000000012","position":1,"type":"richText","schemaVersion":1,
    "hidden":true,"payload":{"nodes":[{"kind":"paragraph","level":null,"items":[[{"text":"טיוטה פרטית","bold":false,"emphasis":false,"link":null}]]}]},
    "mediaVersionId":null,"promotionRevisionId":null}]'::jsonb));
select is(cms_read_public_home()->>'revisionId',baseline::text,'draft does not change public pointer') from home_fixture;
select ok(not (cms_read_public_home()->'payload'->>'seoTitle'='טיוטת SEO'),'unpublished draft SEO cannot leak');
select is(jsonb_array_length(cms_read_home_revision(draft)->'payload'->'blocks'),2,'exact revision includes hidden draft block') from home_fixture;
select throws_ok(format('select cms_save_home_draft(1,%L,%L::jsonb)',baseline,p),'PT409',null,'stale editor rejected') from home_fixture;
select is(cms_publish_home_revision(2,draft),draft,'saved home revision published atomically') from home_fixture;
select is(jsonb_array_length(cms_read_public_home()->'payload'->'blocks'),1,'hidden block excluded from public projection');
select is(cms_read_public_home()->'payload'->>'seoTitle','טיוטת SEO','published SEO follows the published revision');
update home_fixture set rollback=cms_save_home_draft(3,draft,null,baseline);
select is(cms_read_public_home()->>'revisionId',draft::text,'restore creates draft without publishing') from home_fixture;
select is(cms_publish_home_revision(4,rollback),rollback,'rollback publishes new immutable revision') from home_fixture;
select is(cms_read_home_revision(rollback)->'payload',p,'rollback content equals baseline') from home_fixture;
select is((select count(*)::int from content_revisions where document_id='d4000000-0000-4000-8000-000000000000'),3,'history retains baseline, edit and rollback revisions');
select throws_ok($$update page_revision_blocks set hidden=false$$,'42501',null,'admin cannot rewrite historical block');
reset role;
select throws_ok($$update page_revision_blocks set hidden=false$$,'55000',null,'owner cannot mutate historical block');
select * from finish();
rollback;
