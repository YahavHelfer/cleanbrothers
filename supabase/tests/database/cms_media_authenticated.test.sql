begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select ok(exists(select 1 from storage.buckets where id='cms-media-production'
  and not public and file_size_limit=4194304 and allowed_mime_types=array['image/webp']::text[]),
  'Production CMS upload bucket is private and WebP-only');
select ok(not has_function_privilege('anon',
  'public.cms_register_authenticated_media_version(uuid,bigint,uuid,jsonb,jsonb,uuid)','EXECUTE'),
  'anonymous cannot execute registration');
select ok(not has_function_privilege('service_role',
  'public.cms_register_authenticated_media_version(uuid,bigint,uuid,jsonb,jsonb,uuid)','EXECUTE'),
  'registration does not require or grant service_role');
select ok(has_function_privilege('authenticated',
  'public.cms_register_authenticated_media_version(uuid,bigint,uuid,jsonb,jsonb,uuid)','EXECUTE'),
  'authenticated registration has its own AAL2 check');
select is((select count(*)::integer from pg_policies where schemaname='storage'
  and tablename='objects' and policyname like 'cms_production_media_%'),4,
  'four narrow Production Storage policies');

insert into auth.users(id,invited_at) values
 ('62000000-0000-4000-8000-000000000001',null),
 ('62000000-0000-4000-8000-000000000002',null),
 ('62000000-0000-4000-8000-000000000003',null);
insert into public.cms_admin_members(user_id,is_active) values
 ('62000000-0000-4000-8000-000000000001',true),
 ('62000000-0000-4000-8000-000000000003',false);
insert into storage.objects(bucket_id,name,owner_id,metadata) values
 ('cms-media-production','62000000-0000-4000-8000-000000000011.webp',
  '62000000-0000-4000-8000-000000000001','{"size":200,"mimetype":"image/webp"}');
insert into storage.buckets(id,name,public) values('unrelated-media-fixture','unrelated-media-fixture',false);

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select is((select count(*)::integer from storage.objects where bucket_id='cms-media-production'),0,
  'anonymous cannot list objects');
select throws_ok($$select public.cms_register_authenticated_media_version(null,null,null,null,null,null)$$,
  '42501',null,'anonymous registration denied');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"62000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$select public.cms_register_authenticated_media_version(null,null,null,null,null,null)$$,
  '42501',null,'nonmember denied');
select set_config('request.jwt.claims',
 '{"sub":"62000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$select public.cms_register_authenticated_media_version(null,null,null,null,null,null)$$,
  '42501',null,'inactive member denied');
select set_config('request.jwt.claims',
 '{"sub":"62000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
select throws_ok($$select public.cms_register_authenticated_media_version(null,null,null,null,null,null)$$,
  '42501',null,'AAL1 denied');
select set_config('request.jwt.claims',
 '{"sub":"62000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id)
  values('unrelated-media-fixture','62000000-0000-4000-8000-000000000012.webp',
  '62000000-0000-4000-8000-000000000001')$$,
 '42501',null,'AAL2 cannot write an unrelated bucket');
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id)
  values('cms-media-production','arbitrary/path.webp',
  '62000000-0000-4000-8000-000000000001')$$,
 '42501',null,'AAL2 cannot choose an arbitrary object path');
select is((select count(*)::integer from storage.objects where bucket_id='cms-media-production'),0,
 'plain SQL listing has no Storage download operation and remains denied');
select throws_ok($$select public.cms_register_authenticated_media_version(null,null,
 '62000000-0000-4000-8000-000000000011',
 '{"mimeType":"image/webp","byteSize":200,"width":12,"height":8,"contentHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","originalFilename":"photo.png"}',
 '{"altText":"Alt","caption":"","folder":""}',
 '62000000-0000-4000-8000-000000000002')$$,
 '42501',null,'actor must match authenticated identity');
select throws_ok($$select public.cms_register_authenticated_media_version(null,null,
 '62000000-0000-4000-8000-000000000011',
 '{"mimeType":"image/svg+xml","byteSize":200,"width":12,"height":8,"contentHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","originalFilename":"photo.png"}',
 '{"altText":"Alt","caption":"","folder":""}',
 '62000000-0000-4000-8000-000000000001')$$,
 '22023',null,'non-WebP metadata denied');
select throws_ok($$select public.cms_register_authenticated_media_version(null,null,
 '62000000-0000-4000-8000-000000000011',
 '{"mimeType":"image/webp","byteSize":200,"width":12,"height":8,"contentHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","originalFilename":"unsafe.html"}',
 '{"altText":"Alt","caption":"","folder":""}',
 '62000000-0000-4000-8000-000000000001')$$,
 '22023',null,'unsafe original filename denied');
select lives_ok($$select public.cms_register_authenticated_media_version(null,null,
 '62000000-0000-4000-8000-000000000011',
 '{"mimeType":"image/webp","byteSize":200,"width":12,"height":8,"contentHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","originalFilename":"photo.png"}',
 '{"altText":"Alt","caption":"","folder":""}',
 '62000000-0000-4000-8000-000000000001')$$,
 'AAL2 administrator registers existing exact private object');
select is((select storage_bucket from public.media_versions where id='62000000-0000-4000-8000-000000000011'),
 'cms-media-production','registered version has fixed Production bucket');
select is((select storage_path from public.media_versions where id='62000000-0000-4000-8000-000000000011'),
 '62000000-0000-4000-8000-000000000011.webp','path derived only from version UUID');
select ok(not public.cms_published_media_object('cms-media-production',
 '62000000-0000-4000-8000-000000000011.webp'),
 'registered but unreferenced upload is not public');
select is((select count(*)::integer from storage.objects where bucket_id='cms-media-production'),0,
 'registered object cannot be listed through ordinary SQL');
select throws_ok($$select public.cms_register_authenticated_media_version(null,null,
 '62000000-0000-4000-8000-000000000011',
 '{"mimeType":"image/webp","byteSize":200,"width":12,"height":8,"contentHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","originalFilename":"photo.png"}',
 '{"altText":"Alt","caption":"","folder":""}',
 '62000000-0000-4000-8000-000000000001')$$,
 '23505',null,'duplicate version cannot overwrite immutable history');
reset role;
create temporary table current_media_fixture(payload jsonb, baseline uuid, media_revision uuid, restored uuid);
grant select,update on current_media_fixture to authenticated;
insert into current_media_fixture(payload) values ('{"schemaVersion":1,"publicTitle":"Baseline","h1":"Baseline h1","eyebrow":"Eyebrow","intro":"Intro","imageAlt":"Alt","signsTitle":"Signs","signsDescription":"Signs intro","processTitle":"Process","processDescription":"Process intro","benefitsDescription":"Benefits intro","resultDescription":"Result","seoTitle":"Baseline SEO","seoDescription":"Baseline description","images":["/images/services/delicate-upholstery-cleaning.jpeg"],"signs":["Sign"],"process":["Step"],"benefits":["Benefit"],"faqs":[{"question":"Question","answer":"Answer"}],"relatedLinks":[{"label":"Mattress","href":"/mattress-cleaning"}]}');
select is(public.cms_import_static_pilot_media(),
 'd0000000-0000-4000-8000-000000000001'::uuid,'static baseline media imported for publication test');
update current_media_fixture set baseline=public.cms_import_service_baseline(payload);
select ok(public.cms_read_public_media_version('62000000-0000-4000-8000-000000000011') is null,
 'registered media is private before a current publication');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"62000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
update current_media_fixture set media_revision=public.cms_save_service_draft(1,baseline,
 payload||'{"schemaVersion":2,"images":["62000000-0000-4000-8000-000000000011"]}'::jsonb);
select ok(public.cms_read_public_media_version('62000000-0000-4000-8000-000000000011') is null,
 'a draft reference does not permit public media delivery');
select is(public.cms_publish_service_revision(2,(select media_revision from current_media_fixture)),
 (select media_revision from current_media_fixture),'media draft published');
select is(public.cms_read_public_media_version('62000000-0000-4000-8000-000000000011')->'serviceKeys',
 '["delicate-upholstery-cleaning"]'::jsonb,'current service reference is projected');
select ok(public.cms_published_media_object('cms-media-production',
 '62000000-0000-4000-8000-000000000011.webp'),
 'current published version permits exact Storage download');
update current_media_fixture set restored=public.cms_save_service_draft(3,media_revision,null,baseline);
select is(public.cms_publish_service_revision(4,(select restored from current_media_fixture)),
 (select restored from current_media_fixture),'baseline restored as a new revision');
select ok(public.cms_read_public_media_version('62000000-0000-4000-8000-000000000011') is null,
 'historically published but no longer current version is private again');
select ok(not public.cms_published_media_object('cms-media-production',
 '62000000-0000-4000-8000-000000000011.webp'),
 'Storage download also fails closed after rollback');
reset role;
select * from finish();
rollback;
