begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select ok(not has_table_privilege('authenticated','public.cms_media_upload_attempts','SELECT'),
  'journal has no direct authenticated read');
select ok(not has_table_privilege('service_role','public.cms_external_media_capability','SELECT'),
  'service_role cannot read the S3 upload capability hash');
select ok(not has_function_privilege('anon',
  'public.cms_mark_external_media_uploaded(uuid,text,integer,text,text)','EXECUTE'),
  'anonymous cannot mark an object uploaded');
select ok(not has_function_privilege('service_role',
  'public.cms_mark_external_media_uploaded(uuid,text,integer,text,text)','EXECUTE'),
  'service_role cannot mark an object uploaded');
select ok(has_function_privilege('authenticated',
  'public.cms_mark_external_media_uploaded(uuid,text,integer,text,text)','EXECUTE'),
  'authenticated RPC still enforces AAL2 and server capability');
select ok(not has_function_privilege('anon',
  'public.cms_mark_external_media_uploaded_production(uuid,text,integer,text,text)','EXECUTE'),
  'anonymous cannot mark a Production object uploaded');
select ok(not has_function_privilege('service_role',
  'public.cms_mark_external_media_uploaded_production(uuid,text,integer,text,text)','EXECUTE'),
  'service_role cannot mark a Production object uploaded');
select ok(has_function_privilege('authenticated',
  'public.cms_mark_external_media_uploaded_production(uuid,text,integer,text,text)','EXECUTE'),
  'Production attestation RPC requires authenticated AAL2 and capability');
select ok((select relforcerowsecurity from pg_class where oid='public.cms_media_upload_attempts'::regclass),
  'journal forces RLS');

insert into auth.users(id,invited_at) values
 ('64000000-0000-4000-8000-000000000001',null),
 ('64000000-0000-4000-8000-000000000002',null),
 ('64000000-0000-4000-8000-000000000003',null);
insert into public.cms_admin_members(user_id,is_active) values
 ('64000000-0000-4000-8000-000000000001',true),
 ('64000000-0000-4000-8000-000000000002',true),
 ('64000000-0000-4000-8000-000000000003',false);
insert into public.cms_external_media_capability(capability_name,token_hash)
 values('s3-upload-preview-v1',extensions.digest(decode(repeat('1',64),'hex'),'sha256'));
select is((select count(*)::integer from public.cms_external_media_capability
  where capability_name='s3-upload-production-v1'),0,
  'migration does not provision a Production capability');
select throws_ok($$insert into public.cms_external_media_capability(capability_name,token_hash)
 values('s3-upload-other',extensions.digest(decode(repeat('3',64),'hex'),'sha256'))$$,
 '23514',null,'arbitrary capability name rejected');
insert into public.cms_external_media_capability(capability_name,token_hash)
 values('s3-upload-production-v1',extensions.digest(decode(repeat('2',64),'hex'),'sha256'));
-- Local PostgREST transaction fixture: the server-only Preview capability is
-- supplied as a request header for scoped content writes below.
select set_config('request.headers',
 jsonb_build_object('x-cms-media-scope-capability',repeat('1',64))::text,true);
select is((select count(*)::integer from public.cms_external_media_capability),2,
 'separate Preview and Production hashes coexist');
select ok((select token_hash from public.cms_external_media_capability
  where capability_name='s3-upload-preview-v1') <>
  (select token_hash from public.cms_external_media_capability
  where capability_name='s3-upload-production-v1'),
  'Production capability cannot overwrite the Preview hash');

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select throws_ok($$select public.cms_prepare_external_media_upload(
 '64000000-0000-4000-8000-000000000011',null,null,null,null)$$,
 '42501',null,'anonymous prepare denied');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"64000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
select throws_ok($$select public.cms_prepare_external_media_upload(
 '64000000-0000-4000-8000-000000000011',null,null,null,null)$$,
 '42501',null,'AAL1 prepare denied');
select set_config('request.jwt.claims',
 '{"sub":"64000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$select public.cms_prepare_external_media_upload(
 '64000000-0000-4000-8000-000000000011',null,null,null,null)$$,
 '42501',null,'revoked member denied');
select set_config('request.jwt.claims',
 '{"sub":"64000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select is(public.cms_prepare_external_media_upload(
 '64000000-0000-4000-8000-000000000011',null,null,
 '{"mimeType":"image/webp","byteSize":200,"width":12,"height":8,"contentHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","originalFilename":"photo.png"}',
 '{"altText":"Alt","caption":"","folder":""}'),
 '64000000-0000-4000-8000-000000000011'::uuid,'AAL2 Admin prepares exact UUID');
select throws_ok($$select public.cms_mark_external_media_uploaded(
 '64000000-0000-4000-8000-000000000011',
 'cms-media/64000000-0000-4000-8000-000000000011.webp',200,
 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
 '3333333333333333333333333333333333333333333333333333333333333333')$$,
 '42501',null,'wrong server capability denied');
select throws_ok($$select public.cms_mark_external_media_uploaded(
 '64000000-0000-4000-8000-000000000011',
 'cms-media/64000000-0000-4000-8000-000000000011.webp',200,
 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
 '2222222222222222222222222222222222222222222222222222222222222222')$$,
 '42501',null,'Preview RPC rejects the Production capability');
select throws_ok($$select public.cms_mark_external_media_uploaded_production(
 '64000000-0000-4000-8000-000000000011',
 'cms-media/64000000-0000-4000-8000-000000000011.webp',200,
 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
 '1111111111111111111111111111111111111111111111111111111111111111')$$,
 '42501',null,'Production RPC rejects the Preview capability');
select throws_ok($$select public.cms_mark_external_media_uploaded(
 '64000000-0000-4000-8000-000000000011','cms-media/wrong.webp',200,
 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
 '1111111111111111111111111111111111111111111111111111111111111111')$$,
 '55000',null,'wrong object key denied');
select set_config('request.jwt.claims',
 '{"sub":"64000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$select public.cms_mark_external_media_uploaded(
 '64000000-0000-4000-8000-000000000011',
 'cms-media/64000000-0000-4000-8000-000000000011.webp',200,
 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
 '1111111111111111111111111111111111111111111111111111111111111111')$$,
 '55000',null,'another AAL2 Admin cannot mark first actor upload');
select set_config('request.jwt.claims',
 '{"sub":"64000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select lives_ok($$select public.cms_mark_external_media_uploaded(
 '64000000-0000-4000-8000-000000000011',
 'cms-media/64000000-0000-4000-8000-000000000011.webp',200,
 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
 '1111111111111111111111111111111111111111111111111111111111111111')$$,
 'exact server attestation moves prepared to uploaded');
select throws_ok($$select public.cms_mark_external_media_uploaded(
 '64000000-0000-4000-8000-000000000011',
 'cms-media/64000000-0000-4000-8000-000000000011.webp',200,
 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
 '1111111111111111111111111111111111111111111111111111111111111111')$$,
 '55000',null,'uploaded transition cannot replay');
select is(public.cms_register_external_media_version(
 '64000000-0000-4000-8000-000000000011') is not null,true,
 'AAL2 registration atomically creates an asset and version');
select throws_ok($$select public.cms_register_external_media_version(
 '64000000-0000-4000-8000-000000000011')$$,
 '55000',null,'registration cannot replay');
select set_config('request.jwt.claims',
 '{"sub":"64000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
select is((select count(*)::integer from public.media_versions
  where id='64000000-0000-4000-8000-000000000011'),1,
  'second AAL2 Admin can read immutable historical version');
reset role;
select is((select storage_provider from public.media_versions
  where id='64000000-0000-4000-8000-000000000011'),'s3',
  'registered provider is s3');
select is((select storage_scope from public.media_versions
  where id='64000000-0000-4000-8000-000000000011'),'preview',
  'Preview mark capability pins immutable Preview scope');
select is((select storage_path from public.media_versions
  where id='64000000-0000-4000-8000-000000000011'),
  'cms-media/64000000-0000-4000-8000-000000000011.webp',
  'registered key is derived from immutable UUID');
select is((select status from public.cms_media_upload_attempts
  where version_id='64000000-0000-4000-8000-000000000011'),
  'registered','journal is registered');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"64000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$select public.cms_prepare_external_media_upload(
 '64000000-0000-4000-8000-000000000012',
 (select asset_id from public.media_versions where id='64000000-0000-4000-8000-000000000011'),7,
 '{"mimeType":"image/webp","byteSize":201,"width":12,"height":8,"contentHash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","originalFilename":"second.png"}',
 '{"altText":"Alt two","caption":"","folder":""}')$$,
 'PT409',null,'stale generation cannot prepare a replacement');
select is(public.cms_prepare_external_media_upload(
 '64000000-0000-4000-8000-000000000012',
 (select asset_id from public.media_versions where id='64000000-0000-4000-8000-000000000011'),1,
 '{"mimeType":"image/webp","byteSize":201,"width":12,"height":8,"contentHash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","originalFilename":"second.png"}',
 '{"altText":"Alt two","caption":"","folder":""}'),
 '64000000-0000-4000-8000-000000000012'::uuid,
 'replacement prepares against exact generation');
select lives_ok($$select public.cms_mark_external_media_uploaded(
 '64000000-0000-4000-8000-000000000012',
 'cms-media/64000000-0000-4000-8000-000000000012.webp',201,
 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
 '1111111111111111111111111111111111111111111111111111111111111111')$$,
 'second exact S3 object is attested');
select is(public.cms_register_external_media_version(
 '64000000-0000-4000-8000-000000000012'),
 (select asset_id from public.media_versions where id='64000000-0000-4000-8000-000000000011'),
 'replacement retains stable asset identity');
select throws_ok($$select public.cms_mark_external_media_definite_failure(
 '64000000-0000-4000-8000-000000000012','REGISTER_REJECTED')$$,
 '55000',null,'registered version cannot be marked for deletion');
select is(public.cms_prepare_external_media_upload(
 '64000000-0000-4000-8000-000000000013',null,null,
 '{"mimeType":"image/webp","byteSize":202,"width":12,"height":8,"contentHash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","originalFilename":"third.png"}',
 '{"altText":"Alt three","caption":"","folder":""}'),
 '64000000-0000-4000-8000-000000000013'::uuid,
 'third independent attempt prepared');
select lives_ok($$select public.cms_mark_external_media_ambiguous(
 '64000000-0000-4000-8000-000000000013')$$,
 'transport uncertainty is retained for reconciliation');
select throws_ok($$select public.cms_mark_external_media_cleaned(
 '64000000-0000-4000-8000-000000000013')$$,
 '55000',null,'ambiguous object cannot be marked cleaned');
select throws_ok($$select public.cms_register_external_media_version(
 '64000000-0000-4000-8000-000000000013')$$,
 '55000',null,'ambiguous object cannot register without attestation');
select is(public.cms_prepare_external_media_upload(
 '64000000-0000-4000-8000-000000000014',null,null,
 '{"mimeType":"image/webp","byteSize":203,"width":12,"height":8,"contentHash":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","originalFilename":"fourth.png"}',
 '{"altText":"Alt four","caption":"","folder":""}'),
 '64000000-0000-4000-8000-000000000014'::uuid,
 'definite failure fixture prepared');
select lives_ok($$select public.cms_mark_external_media_definite_failure(
 '64000000-0000-4000-8000-000000000014','PUT_REJECTED')$$,
 'definite failure recorded');
select lives_ok($$select public.cms_mark_external_media_cleaned(
 '64000000-0000-4000-8000-000000000014')$$,
 'only definite failure may be marked cleaned');
select is(public.cms_prepare_external_media_upload(
 '64000000-0000-4000-8000-000000000015',null,null,
 '{"mimeType":"image/webp","byteSize":204,"width":12,"height":8,"contentHash":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","originalFilename":"production.png"}',
 '{"altText":"Production alt","caption":"","folder":""}'),
 '64000000-0000-4000-8000-000000000015'::uuid,
 'Production test attempt prepared with unchanged journal');
select lives_ok($$select public.cms_mark_external_media_uploaded_production(
 '64000000-0000-4000-8000-000000000015',
 'cms-media/64000000-0000-4000-8000-000000000015.webp',204,
 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
 '2222222222222222222222222222222222222222222222222222222222222222')$$,
 'Production-only capability attests a separate prepared object');
select ok(jsonb_array_length(public.cms_external_media_reconciliation())>=4,
 'AAL2 Admin can inspect known journal IDs without bucket listing');
reset role;
select is((select status from public.cms_media_upload_attempts
  where version_id='64000000-0000-4000-8000-000000000015'),
  'uploaded','Production attestation uses the existing journal transition');
select is((select storage_scope from public.cms_media_upload_attempts
  where version_id='64000000-0000-4000-8000-000000000015'),
  'production','Production mark capability records only Production scope');
select is((select count(*)::integer from public.media_versions where
  id in ('64000000-0000-4000-8000-000000000011',
         '64000000-0000-4000-8000-000000000012')),2,
  'replacement preserves both immutable media versions');
select is((select current_version_id from public.media_assets where id=
  (select asset_id from public.media_versions where id='64000000-0000-4000-8000-000000000011')),
  '64000000-0000-4000-8000-000000000012'::uuid,
  'current version advances without mutating history');

-- Public access follows the CURRENT published revision, not registration or
-- a historical publication. Both registered S3 versions remain Admin-readable.
create temporary table s3_public_fixture(payload jsonb, baseline uuid,
  first_revision uuid, second_revision uuid, restored_revision uuid);
grant select,update on s3_public_fixture to authenticated;
insert into s3_public_fixture(payload) values
 ('{"schemaVersion":1,"publicTitle":"Baseline","h1":"Baseline h1","eyebrow":"Eyebrow","intro":"Intro","imageAlt":"Alt","signsTitle":"Signs","signsDescription":"Signs intro","processTitle":"Process","processDescription":"Process intro","benefitsDescription":"Benefits intro","resultDescription":"Result","seoTitle":"Baseline SEO","seoDescription":"Baseline description","images":["/images/services/delicate-upholstery-cleaning.jpeg"],"signs":["Sign"],"process":["Step"],"benefits":["Benefit"],"faqs":[{"question":"Question","answer":"Answer"}],"relatedLinks":[{"label":"Mattress","href":"/mattress-cleaning"}]}');
select is(public.cms_import_static_pilot_media(),
  'd0000000-0000-4000-8000-000000000001'::uuid,'static service fixture imported');
update s3_public_fixture set baseline=public.cms_import_service_baseline(payload);
select ok(public.cms_read_public_media_version('64000000-0000-4000-8000-000000000011') is null,
  'registered S3 version stays private without current publication');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"64000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
update s3_public_fixture set first_revision=public.cms_save_service_draft(1,baseline,
  payload||'{"schemaVersion":2,"images":["64000000-0000-4000-8000-000000000011"]}'::jsonb);
select ok(public.cms_read_public_media_version('64000000-0000-4000-8000-000000000011') is null,
  'S3 Draft does not allow public read');
select is(public.cms_publish_service_revision(2,(select first_revision from s3_public_fixture)),
  (select first_revision from s3_public_fixture),'first S3 version published');
select is(public.cms_read_public_media_version('64000000-0000-4000-8000-000000000011')->>'storage_provider',
  's3','currently published first S3 version is projected');
update s3_public_fixture set second_revision=public.cms_save_service_draft(3,first_revision,
  payload||'{"schemaVersion":2,"images":["64000000-0000-4000-8000-000000000012"]}'::jsonb);
select is(public.cms_publish_service_revision(4,(select second_revision from s3_public_fixture)),
  (select second_revision from s3_public_fixture),'second immutable S3 version published');
select ok(public.cms_read_public_media_version('64000000-0000-4000-8000-000000000011') is null,
  'replaced historical S3 version is private again');
select is(public.cms_read_public_media_version('64000000-0000-4000-8000-000000000012')->>'storage_provider',
  's3','replacement S3 version is public while current');
update s3_public_fixture set restored_revision=public.cms_save_service_draft(5,second_revision,
  null,first_revision);
select is(public.cms_publish_service_revision(6,(select restored_revision from s3_public_fixture)),
  (select restored_revision from s3_public_fixture),'historical S3 version restored by rollback');
select is(public.cms_read_public_media_version('64000000-0000-4000-8000-000000000011')->>'storage_provider',
  's3','rollback makes the first exact S3 version public again');
select ok(public.cms_read_public_media_version('64000000-0000-4000-8000-000000000012') is null,
  'second S3 version becomes private after rollback');
select is(public.cms_register_external_media_version('64000000-0000-4000-8000-000000000015') is not null,
  true,'Production upload registers through its fixed journal identity');
select is((select storage_scope from public.media_versions
  where id='64000000-0000-4000-8000-000000000015'),'production',
  'registered Production S3 version has Production scope');
select throws_ok(format('select public.cms_save_service_draft(7,%L,%L::jsonb)',
  (select restored_revision from s3_public_fixture),
  (select payload||'{"schemaVersion":2,"images":["64000000-0000-4000-8000-000000000015"]}'::jsonb
    from s3_public_fixture)),
  '42501','CMS_MEDIA_SCOPE_MISMATCH',
  'Preview cannot save the Production-only S3 version');
select set_config('request.headers',
  jsonb_build_object('x-cms-media-scope-capability',repeat('2',64))::text,true);
update s3_public_fixture set restored_revision=public.cms_save_service_draft(7,restored_revision,
  payload||'{"schemaVersion":2,"images":["64000000-0000-4000-8000-000000000015"]}'::jsonb);
select is((select count(*)::integer from public.revision_media_refs
  where revision_id=(select restored_revision from s3_public_fixture)
    and media_version_id='64000000-0000-4000-8000-000000000015'),3,
  'Production scope may save only the exact Production S3 version');
select set_config('request.headers',
  jsonb_build_object('x-cms-media-scope-capability',repeat('1',64))::text,true);
select throws_ok(format('select public.cms_publish_service_revision(8,%L)',
  (select restored_revision from s3_public_fixture)),
  '42501','CMS_MEDIA_SCOPE_MISMATCH',
  'Preview cannot publish a Production-scoped S3 draft');
reset role;
select * from finish();
rollback;
