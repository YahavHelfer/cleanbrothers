begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select ok(cms_new_page_slug('cms-test-page'),'lowercase hyphenated slug accepted');
select ok(not cms_new_page_slug('about'),'existing about route reserved');
select ok(not cms_new_page_slug('sofa-cleaning'),'service route reserved');
select ok(not cms_new_page_slug('admin'),'admin reserved');
select ok(not cms_new_page_slug('api'),'api reserved');
select ok(not cms_new_page_slug('robots.txt'),'metadata path denied');
select ok(not cms_new_page_slug('CMS-Page'),'uppercase denied');
select ok(not cms_new_page_slug('עמוד'),'Unicode denied');
select ok(not cms_new_page_slug('nested/path'),'nested path denied');
select ok(not cms_new_page_slug('page?draft=1'),'query injection denied');
select ok(not cms_new_page_slug('page#fragment'),'fragment injection denied');
select ok(not cms_new_page_slug('page--name'),'repeated separator denied');
select ok(not cms_new_page_slug('-page'),'leading separator denied');
select ok(not cms_new_page_slug('page-'),'trailing separator denied');
select is((select count(*)::int from cms_page_routes where kind in ('static','service','system')),27,
  'all existing top-level routes have one reserved owner');
select is((select count(*)::int from pg_class where relname in
  ('cms_new_page_identity','cms_page_routes','cms_page_route_events') and relforcerowsecurity),3,
  'route, identity and audit tables force RLS');
select is((select count(*)::int from pg_policies where tablename in
  ('cms_new_page_identity','cms_page_routes','cms_page_route_events') and policyname='cms_new_pages_aal2_read'),3,
  'all new tables require AAL2 for direct read');

insert into auth.users(id,invited_at) values
  ('53000000-0000-4000-8000-000000000001',null),
  ('53000000-0000-4000-8000-000000000002',null),
  ('53000000-0000-4000-8000-000000000003',null);
insert into cms_admin_members(user_id,is_active) values
  ('53000000-0000-4000-8000-000000000001',true),
  ('53000000-0000-4000-8000-000000000003',false);
set local role anon;
select throws_ok($$select cms_list_new_pages()$$,'42501',null,'anonymous cannot list new pages');
select throws_ok($$select cms_create_new_page('x','cms-test-page','blank')$$,'42501',null,'anonymous cannot create pages');
select throws_ok($$select * from cms_page_routes$$,'42501',null,'anonymous cannot enumerate route registry');
select is(cms_read_public_new_page('cms-test-page'),null::jsonb,'anonymous cannot see absent page');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$select cms_create_new_page('x','cms-test-page','blank')$$,'42501',null,'nonmember denied');
select set_config('request.jwt.claims','{"sub":"53000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$select cms_create_new_page('x','cms-test-page','blank')$$,'42501',null,'inactive member denied');
select set_config('request.jwt.claims','{"sub":"53000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
select throws_ok($$select cms_create_new_page('x','cms-test-page','blank')$$,'42501',null,'AAL1 denied');
select set_config('request.jwt.claims','{"sub":"53000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$select cms_create_new_page('x','about','blank')$$,'22023',null,'reserved route denied on server');
select throws_ok($$select cms_create_new_page('x','api','blank')$$,'22023',null,'API route denied on server');
select throws_ok($$select cms_create_new_page('x','cms/nested','blank')$$,'22023',null,'nested route denied');
select set_config('cms.test.page',cms_create_new_page('עמוד בדיקה','cms-test-page','standard')::text,true);
select is((cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->>'lifecycle'),'draft-only',
  'new document starts draft-only');
select is((cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->>'publishedRevisionId'),null::text,
  'new document has no public pointer');
select is(jsonb_array_length(cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->'draft'->'blocks'),3,
  'standard template starts hero, rich text and CTA');
select is(cms_resolve_new_page_route('cms-test-page'),null::jsonb,'draft claim does not resolve publicly');
select is(cms_read_public_new_page('cms-test-page'),null::jsonb,'draft content is not public');
select is((select count(*)::int from cms_page_routes where slug='cms-test-page' and kind='draft'),1,
  'draft route ownership prevents duplicate identity');
select throws_ok($$select cms_create_new_page('other','cms-test-page','blank')$$,'23505',null,'duplicate draft slug denied');
select throws_ok($$insert into cms_page_routes(slug,kind) values('intruder','static')$$,'42501',null,
  'admin cannot bypass route RPC with direct insert');
select is(cms_read_new_page_revision('53000000-0000-4000-8000-000000000001',
  (cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->>'draftRevisionId')::uuid),
  null::jsonb,'page and revision mismatch is denied by reader');
select is(cms_publish_new_page(current_setting('cms.test.page')::uuid,1,
  (cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->>'draftRevisionId')::uuid)::text,
  (cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->>'draftRevisionId'),
  'first publish advances draft pointer atomically');
select is(cms_resolve_new_page_route('cms-test-page')->>'kind','page','published route resolves');
select is(cms_read_public_new_page('cms-test-page')->'payload'->>'canonical','/cms-test-page','public canonical derived from published route');
select ok(not (cms_read_public_new_page('cms-test-page') ?| array['history','draftRevisionId','createdBy','audit']),
  'public reader omits management data');
select is(cms_list_public_new_page_slugs(),array['cms-test-page']::text[],'only published page enters sitemap projection');

select set_config('cms.test.first',cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->>'draftRevisionId',true);
select set_config('cms.test.second',cms_save_new_page_draft(current_setting('cms.test.page')::uuid,2,
  current_setting('cms.test.first')::uuid,
  jsonb_set(cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->'draft','{canonical}',
    '"/cms-test-renamed"'::jsonb))::text,true);
select is(cms_resolve_new_page_route('cms-test-page')->>'kind','page','slug edit on draft leaves old public route');
select is(cms_resolve_new_page_route('cms-test-renamed'),null::jsonb,'new slug remains unpublished');
select throws_ok($$select cms_save_new_page_draft(current_setting('cms.test.page')::uuid,2,
  current_setting('cms.test.first')::uuid,null)$$,'PT409',null,'stale block editor denied');
select is(cms_publish_new_page(current_setting('cms.test.page')::uuid,3,current_setting('cms.test.second')::uuid)::text,
  current_setting('cms.test.second'),'slug change publishes exact draft');
select is(cms_resolve_new_page_route('cms-test-page')->>'destination','cms-test-renamed','old slug redirects');
select is(cms_resolve_new_page_route('cms-test-page')->>'redirectType','permanent','slug redirect is permanent');
select is(cms_resolve_new_page_route('cms-test-renamed')->>'kind','page','new slug owns page');
select is(cms_read_public_new_page('cms-test-page'),null::jsonb,'redirect source does not serve page bytes');
select is(cms_read_public_new_page('cms-test-renamed')->>'revisionId',current_setting('cms.test.second'),
  'public reader follows exact published revision');
select set_config('cms.test.third',cms_save_new_page_draft(current_setting('cms.test.page')::uuid,4,
  current_setting('cms.test.second')::uuid,
  jsonb_set(cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->'draft','{canonical}',
    '"/cms-test-final"'::jsonb))::text,true);
select is(cms_publish_new_page(current_setting('cms.test.page')::uuid,5,current_setting('cms.test.third')::uuid)::text,
  current_setting('cms.test.third'),'second slug change publishes');
select is(cms_resolve_new_page_route('cms-test-page')->>'destination','cms-test-final','A→B→C collapses A→C');
select is(cms_resolve_new_page_route('cms-test-renamed')->>'destination','cms-test-final','B→C preserved directly');
select throws_ok($$select cms_create_new_page('collision','cms-test-page','blank')$$,'23505',null,
  'redirect source remains reserved');
select set_config('cms.test.copy',cms_duplicate_new_page(current_setting('cms.test.page')::uuid,
  'עמוד מועתק','cms-test-copy')::text,true);
select isnt(current_setting('cms.test.copy'),current_setting('cms.test.page'),'duplicate gets new identity');
select is((cms_read_new_page_editor(current_setting('cms.test.copy')::uuid)->>'publishedRevisionId'),null::text,
  'duplicate is unpublished');
select is(cms_read_public_new_page('cms-test-copy'),null::jsonb,'duplicate does not leak publicly');
select is((select count(*)::int from content_revisions where document_id=current_setting('cms.test.page')::uuid),3,
  'source history unchanged by duplicate');
select is(cms_read_new_page_editor(current_setting('cms.test.copy')::uuid)->'draft'->'blocks'->0->>'type','hero',
  'duplicate copies typed block structure');
select isnt(cms_read_new_page_editor(current_setting('cms.test.copy')::uuid)->'draft'->'blocks'->0->>'id',
  cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->'draft'->'blocks'->0->>'id',
  'duplicate allocates new block UUIDs');
select cms_unpublish_new_page(current_setting('cms.test.page')::uuid,6);
select is(cms_resolve_new_page_route('cms-test-final'),null::jsonb,'unpublished page is 404');
select is(cms_resolve_new_page_route('cms-test-page'),null::jsonb,'old redirect also disabled while unpublished');
select is(cms_list_public_new_page_slugs(),array[]::text[],'unpublished page removed from sitemap');
select is((cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->>'lifecycle'),'unpublished',
  'history retained after unpublish');
select cms_archive_new_page(current_setting('cms.test.page')::uuid,7);
select is((cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->>'lifecycle'),'archived','archived state explicit');
select is((select count(*)::int from jsonb_array_elements(cms_list_new_pages(false)) row
  where row->>'id'=current_setting('cms.test.page')),0,'archive hidden from normal list');
select is((select count(*)::int from jsonb_array_elements(cms_list_new_pages(true)) row
  where row->>'id'=current_setting('cms.test.page')),1,'archive visible through filter');
select throws_ok(format('select cms_publish_new_page(%L,8,%L)',current_setting('cms.test.page'),
  current_setting('cms.test.third')),'55000',null,'archive cannot publish');
select cms_restore_new_page(current_setting('cms.test.page')::uuid,8);
select is((cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->>'lifecycle'),'unpublished',
  'archive restore does not republish');
select is(cms_resolve_new_page_route('cms-test-final'),null::jsonb,'restored page remains private');
select ok((select count(*) from content_revisions where document_id=current_setting('cms.test.page')::uuid)=3,
  'all historical revisions remain immutable');
select * from finish();
rollback;
