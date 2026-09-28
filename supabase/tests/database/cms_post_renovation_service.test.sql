begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select is(cms_shared_service_id('post-renovation-cleaning'),
  '46bf0306-f3a9-487e-9a45-3ab3f6fcb3f8'::uuid,
  'new service has one fixed document identity');
select is(cms_shared_service_id('unknown-service'),null::uuid,
  'unknown service stays excluded');
select is(cms_shared_service_id('air-conditioner-cleaning'),
  '2185a776-4440-4728-af2c-909d17994241'::uuid,
  'existing AC identity is preserved');
select is(cms_shared_service_id('window-cleaning'),
  'f05f10a0-b576-4625-8eb2-8abc5a0a1ae6'::uuid,
  'existing Window identity is preserved');
select is(cms_shared_service_id('sofa-cleaning'),
  '9aef51c5-1851-4c76-8816-2242abd80a3f'::uuid,
  'existing sofa identity is preserved');
select is(cms_shared_service_id('mattress-cleaning'),
  '78ae8483-c8d3-4b25-8e62-e15cb3aba3a4'::uuid,
  'existing mattress identity is preserved');
select is(cms_shared_service_id('carpet-cleaning'),
  '7c563896-cf12-4aa7-82a2-1a17bd40cf04'::uuid,
  'existing carpet identity is preserved');
select is(cms_shared_service_id('car-upholstery-cleaning'),
  'e28e9966-82c8-45ce-8d85-266ef6c6643c'::uuid,
  'existing car-upholstery identity is preserved');
select is(cms_shared_service_id('armchair-chair-cleaning'),
  '8896b193-728e-4284-8196-198a95081d7c'::uuid,
  'existing armchair identity is preserved');
select is(cms_shared_service_id('delicate-upholstery-cleaning'),
  'c0000000-0000-4000-8000-000000000001'::uuid,
  'existing delicate-upholstery identity is preserved');

select ok(not cms_new_page_slug('post-renovation-cleaning'),
  'the service slug cannot be claimed by a generic CMS page');
select is((select kind from cms_page_routes where slug='post-renovation-cleaning'),
  'service','route ownership is reserved for the new service');
select ok(cms_page_target('{"kind":"internal","path":"/post-renovation-cleaning"}'::jsonb),
  'typed page CTA can target the active service');
select ok(cms_site_target('{"kind":"service","key":"post-renovation-cleaning"}'::jsonb),
  'typed navigation can target the active service');

insert into content_documents(id,content_type,content_key)
values ('46bf0306-f3a9-487e-9a45-3ab3f6fcb3f8','service','post-renovation-cleaning');
-- Schema-only fixture: the synthetic UUID is never imported as media or content.
create temporary table proposed_payload as select jsonb_build_object(
  'schemaVersion',3,'publicTitle','Post renovation','h1','Post renovation',
  'eyebrow','Service','intro','Intro','imageAlt','Alt',
  'signsTitle','Signs','signsDescription','Details','processTitle','Process',
  'processDescription','Details','benefitsDescription','Benefits',
  'resultDescription','Results','seoTitle','SEO','seoDescription','Description',
  'images',jsonb_build_array('f0000000-0000-4000-8000-000000000099'),
  'signs',jsonb_build_array('Sign'),'process',jsonb_build_array('Step'),
  'benefits',jsonb_build_array('Benefit'),
  'faqs',jsonb_build_array(jsonb_build_object('question','Question','answer','Answer')),
  'relatedLinks','[]'::jsonb) as value;
select ok(cms_valid_service_payload('post-renovation-cleaning',value),
  'new service accepts the unchanged shared-service schema') from proposed_payload;
select ok(not cms_valid_service_payload('post-renovation-cleaning',value ||
  '{"crmServiceName":"forged"}'::jsonb),
  'new service cannot override code-owned CRM identity') from proposed_payload;
select ok(not cms_valid_service_payload('post-renovation-cleaning',value ||
  '{"intro":"<script>"}'::jsonb),
  'new service rejects executable HTML') from proposed_payload;
select is((select count(*)::int from jsonb_array_elements(cms_static_media_inventory()) e
  where e->>'path' like '/images/services/post-renovation-cleaning-%'),4,
  'four immutable real service images are in the static inventory');
select ok(cms_valid_static_version('ca9fda4c-f970-46f6-91cb-6a0347a76002',
  '/images/services/post-renovation-cleaning-4.png',
  'f4dd902d24f540c3298b02c53d43e242c143e656509a7f767ae6e67506b886b3',
  3558064,1086,1448,'image/png'),'hero bytes match the approved inventory');
select is(cms_import_shared_media(),24,'all static media import idempotently');
delete from content_documents where content_key='post-renovation-cleaning';
create temporary table real_payload as select value || jsonb_build_object('images',jsonb_build_array(
  'ca9fda4c-f970-46f6-91cb-6a0347a76002',
  'e69df7e0-b215-4a91-981f-5383bb821adc',
  '67ae7454-b978-48ea-86db-632bbcd32bff',
  '5ddf16ba-4089-4454-9ab1-5161bf191ec3')) as value from proposed_payload;
create temporary table imported as select cms_import_shared_baseline('post-renovation-cleaning',value) as id from real_payload;
select is((select cms_import_shared_baseline('post-renovation-cleaning',value) from real_payload),
  (select id from imported),'baseline import is idempotent');
select is((select count(*)::int from revision_media_refs r join imported i on i.id=r.revision_id
  where r.usage_role='hero'),4,'published baseline has four ordered hero references');
select is((select array_agg(r.media_version_id::text order by r.position) from revision_media_refs r
  join imported i on i.id=r.revision_id where r.usage_role='hero'),
  array['ca9fda4c-f970-46f6-91cb-6a0347a76002','e69df7e0-b215-4a91-981f-5383bb821adc',
    '67ae7454-b978-48ea-86db-632bbcd32bff','5ddf16ba-4089-4454-9ab1-5161bf191ec3'],
  'carousel order is image 4, 1, 3, 2');
select is((select count(*)::int from revision_media_refs r join imported i on i.id=r.revision_id
  where r.usage_role in ('before','after')),0,'no before or after claim is stored');
insert into auth.users(id,invited_at) values ('50000000-0000-4000-8000-000000000099',null);
insert into cms_admin_members(user_id,is_active) values ('50000000-0000-4000-8000-000000000099',true);
grant select on real_payload,imported to authenticated;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"50000000-0000-4000-8000-000000000099","aal":"aal2","role":"authenticated"}',true);
select set_config('test.post_renovation_draft',cms_save_managed_draft(
  'post-renovation-cleaning',1,(select id from imported),
  (select value || jsonb_build_object('h1','טיוטת ניקיון אחרי שיפוץ') from real_payload))::text,true);
select is(cms_read_published_service('post-renovation-cleaning')->'payload'->>'h1',
  'Post renovation','draft stays private');
select is(cms_publish_managed_revision('post-renovation-cleaning',2,
  current_setting('test.post_renovation_draft')::uuid),
  current_setting('test.post_renovation_draft')::uuid,'publish selects the exact saved revision');
select is(cms_read_published_service('post-renovation-cleaning')->'payload'->>'h1',
  'טיוטת ניקיון אחרי שיפוץ','published content is visible');
select set_config('test.post_renovation_rollback',cms_save_managed_draft(
  'post-renovation-cleaning',3,current_setting('test.post_renovation_draft')::uuid,
  null,(select id from imported))::text,true);
select is(cms_read_published_service('post-renovation-cleaning')->'payload'->>'h1',
  'טיוטת ניקיון אחרי שיפוץ','rollback draft stays private');
select is(cms_publish_managed_revision('post-renovation-cleaning',4,
  current_setting('test.post_renovation_rollback')::uuid),
  current_setting('test.post_renovation_rollback')::uuid,'rollback publishes as a new revision');
select is(cms_read_published_service('post-renovation-cleaning')->'payload'->>'h1',
  'Post renovation','rollback restores the original public content');
reset role;
select throws_ok($$insert into content_documents(content_type,content_key)
  values ('service','arbitrary-cleaning')$$,'23514',null,
  'arbitrary service identity remains rejected');
select lives_ok($$select cms_schedule_validate_placements(
  '[{"kind":"service","target":"post-renovation-cleaning"}]'::jsonb)$$,
  'new service schedule target is accepted only after document identity exists');
select throws_ok($$select cms_schedule_validate_placements(
  '[{"kind":"service","target":"unknown-service"}]'::jsonb)$$,
  '22023',null,'arbitrary scheduled service is rejected');
select throws_ok($$select cms_schedule_validate_placements(
  '[{"kind":"service","target":"*"}]'::jsonb)$$,
  '22023',null,'wildcard scheduled service is rejected');
select throws_ok($$insert into cms_promotion_schedule_placements
  (schedule_id,placement_kind,target_key)
  values ('46bf0306-f3a9-487e-9a45-3ab3f6fcb3f8','service','unknown-service')$$,
  '23514',null,'table constraint rejects arbitrary service placement');
select throws_ok($$insert into cms_promotion_schedule_placements
  (schedule_id,placement_kind,target_key)
  values ('46bf0306-f3a9-487e-9a45-3ab3f6fcb3f8','service','post-renovation-cleaning')$$,
  '23503',null,'table constraint accepts new key and then enforces schedule FK');
select is(cms_read_active_promotion_placement('service','post-renovation-cleaning'),
  null::jsonb,'public scheduled reader returns no banner without active placement');

select ok(not has_table_privilege('anon','public.cms_promotion_schedules','SELECT'),
  'anonymous scheduling table access remains denied');
select ok(not has_table_privilege('authenticated','public.cms_promotion_schedules','SELECT'),
  'authenticated direct scheduling table access remains denied');
select ok(not has_function_privilege('service_role',
  'public.cms_process_due_promotion_schedules_at(timestamptz,integer)','EXECUTE'),
  'deterministic scheduler core remains unavailable to service role');

select * from finish();
rollback;
