begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
-- Local transaction only. Never uploads bytes or changes either real account.
create temporary table preview_fixture(asset uuid);
insert into preview_fixture values(null);
grant select,update on preview_fixture to service_role,authenticated;
insert into auth.users(id,invited_at) values
 ('50000000-0000-4000-8000-000000000001',null),
 ('50000000-0000-4000-8000-000000000002',null),
 ('50000000-0000-4000-8000-000000000003',null),
 ('50000000-0000-4000-8000-000000000004',now());
insert into cms_admin_members(user_id,is_active) values
 ('50000000-0000-4000-8000-000000000001',true),
 ('50000000-0000-4000-8000-000000000003',false),
 ('50000000-0000-4000-8000-000000000004',true);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('cms-media-preview','cms-media-preview',false,8388608,array['image/webp']);
select ok((select relrowsecurity from pg_class where oid='storage.objects'::regclass),'Storage RLS enabled');
select is((select count(*)::int from pg_policies where schemaname='storage' and tablename='objects'),0,'no direct browser Storage policies');
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select throws_ok($$select cms_register_preview_media_version(null,null,'e1000000-0000-4000-8000-000000000001','{"byteSize":200,"width":12,"height":8,"contentHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","originalFilename":"test.png"}','{"altText":"Alt","caption":"","folder":""}','50000000-0000-4000-8000-000000000001')$$,'22023',null,'registration requires an existing object in the exact private bucket');
reset role;
insert into storage.objects(bucket_id,name,metadata) values('cms-media-preview','e1000000-0000-4000-8000-000000000001.webp','{"size":200,"mimetype":"image/webp"}');
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select throws_ok($$select cms_register_preview_media_version(null,null,'e1000000-0000-4000-8000-000000000001','{"byteSize":201}','{"altText":"Alt","caption":"","folder":""}','50000000-0000-4000-8000-000000000001')$$,'22023',null,'object size must match validated bytes');
select throws_ok($$select cms_register_preview_media_version(null,null,'e1000000-0000-4000-8000-000000000001','{}','{"altText":"Alt","caption":"","folder":""}','50000000-0000-4000-8000-000000000003')$$,'42501',null,'inactive actor rejected independently');
select throws_ok($$select cms_register_preview_media_version(null,null,'e1000000-0000-4000-8000-000000000001','{}','{"altText":"Alt","caption":"","folder":""}','50000000-0000-4000-8000-000000000004')$$,'42501',null,'pending actor rejected independently');
update preview_fixture set asset=cms_register_preview_media_version(null,null,'e1000000-0000-4000-8000-000000000001','{"byteSize":200,"width":12,"height":8,"contentHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","originalFilename":"test.png"}','{"altText":"Alt","caption":"","folder":""}','50000000-0000-4000-8000-000000000001');
reset role;
select is((select storage_provider from media_versions where id='e1000000-0000-4000-8000-000000000001'),'supabase','cloud provider explicit');
select is((select storage_bucket from media_versions where id='e1000000-0000-4000-8000-000000000001'),'cms-media-preview','one fixed bucket recorded');
select is((select storage_path from media_versions where id='e1000000-0000-4000-8000-000000000001'),'e1000000-0000-4000-8000-000000000001.webp','generated immutable path');
select is((select original_filename from media_versions where id='e1000000-0000-4000-8000-000000000001'),'test.png','original filename is metadata only');
select is((select actor_id from media_audit_events where version_id='e1000000-0000-4000-8000-000000000001'),'50000000-0000-4000-8000-000000000001'::uuid,'upload actor attributed');
select ok(cms_read_public_media_version('e1000000-0000-4000-8000-000000000001') is null,'unpublished cloud version remains private');
select throws_ok($$update media_versions set storage_path='changed' where id='e1000000-0000-4000-8000-000000000001'$$,'55000',null,'cloud version immutable');
select throws_ok($$delete from media_versions where id='e1000000-0000-4000-8000-000000000001'$$,'55000',null,'cloud version retained');
insert into storage.objects(bucket_id,name,metadata) values('cms-media-preview','e1000000-0000-4000-8000-000000000002.webp','{"size":4194305,"mimetype":"image/webp"}');
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select throws_ok($$select cms_register_preview_media_version(null,null,'e1000000-0000-4000-8000-000000000002','{"byteSize":4194305,"width":6000,"height":1000,"contentHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","originalFilename":"big.png"}','{"altText":"Alt","caption":"","folder":""}','50000000-0000-4000-8000-000000000001')$$,'23514',null,'cloud registration cannot exceed Preview response payload budget');
reset role;
set local role anon;
select is((select count(*)::int from storage.objects where bucket_id='cms-media-preview'),0,'anonymous cannot list private objects');
select throws_ok($$insert into storage.objects(bucket_id,name) values('cms-media-preview','forged.webp')$$,'42501',null,'anonymous cannot upload directly');
select throws_ok($$select cms_register_preview_media_version(null,null,null,null,null,null)$$,'42501',null,'anonymous cannot register');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
select is((select count(*)::int from storage.objects where bucket_id='cms-media-preview'),0,'nonmember cannot list');
select throws_ok($$insert into storage.objects(bucket_id,name) values('cms-media-preview','forged.webp')$$,'42501',null,'nonmember cannot upload');
select throws_ok($$select cms_register_preview_media_version(null,null,null,null,null,null)$$,'42501',null,'nonmember cannot register');
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
select is((select count(*)::int from storage.objects where bucket_id='cms-media-preview'),0,'inactive cannot list');
select throws_ok($$insert into storage.objects(bucket_id,name) values('cms-media-preview','forged.webp')$$,'42501',null,'inactive cannot upload');
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
select is((select count(*)::int from storage.objects where bucket_id='cms-media-preview'),0,'AAL1 cannot list');
select throws_ok($$insert into storage.objects(bucket_id,name) values('cms-media-preview','forged.webp')$$,'42501',null,'AAL1 cannot upload');
select throws_ok($$select cms_register_preview_media_version(null,null,null,null,null,null)$$,'42501',null,'AAL1 cannot register');
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select is((select count(*)::int from storage.objects where bucket_id='cms-media-preview'),0,'AAL2 also uses server proxy for bytes');
select throws_ok($$insert into storage.objects(bucket_id,name) values('cms-media-preview','forged.webp')$$,'42501',null,'AAL2 cannot bypass image validation with direct Storage upload');
select throws_ok($$select cms_register_preview_media_version(null,null,null,null,null,null)$$,'42501',null,'AAL2 browser cannot forge server attestation');
select is((select count(*)::int from media_versions where storage_provider='supabase'),1,'AAL2 intended cloud metadata access');
select is(cms_update_media_asset((select asset from preview_fixture),1,'archive'),(select asset from preview_fixture),'AAL2 can archive without deleting bytes');
select throws_ok($$select cms_update_media_asset((select asset from preview_fixture),1,'restore')$$,'PT409',null,'stale cloud metadata mutation rejected');
reset role;
select is((select count(*)::int from storage.objects where bucket_id='cms-media-preview'),2,'archive preserves cloud objects');
select is((select count(*)::int from media_versions where storage_provider='supabase'),1,'archive preserves immutable version');
select * from finish();
rollback;
