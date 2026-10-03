begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select ok(not has_function_privilege('authenticated','public.cms_media_request_scope()','EXECUTE'),
  'authenticated clients cannot query the server scope verifier');
select ok(not has_function_privilege('authenticated','public.cms_assert_media_version_scope(uuid)','EXECUTE'),
  'scope assertion is internal to guarded content mutations');
select ok((select count(*) from public.media_versions where storage_provider='s3')=0,
  'fresh database has no S3 rows to guess during backfill');
insert into public.media_assets(id,alt_text) values
 ('66000000-0000-4000-8000-000000000020','Unattested S3 fixture');
select throws_ok($$insert into public.media_versions(id,asset_id,version_number,
 storage_provider,storage_scope,storage_path,mime_type,byte_size,width,height,
 content_hash,original_filename) values
 ('66000000-0000-4000-8000-000000000021','66000000-0000-4000-8000-000000000020',
  1,'s3','production','cms-media/66000000-0000-4000-8000-000000000021.webp',
  'image/webp',200,12,8,repeat('a',64),'forged.webp')$$,
 '23514','S3 upload scope unavailable',
 'caller-provided scope cannot register an S3 version without a marked journal');

insert into auth.users(id,invited_at) values ('66000000-0000-4000-8000-000000000001',null);
insert into public.cms_admin_members(user_id,is_active)
 values('66000000-0000-4000-8000-000000000001',true);
insert into public.cms_external_media_capability(capability_name,token_hash) values
 ('s3-upload-preview-v1',extensions.digest(decode(repeat('1',64),'hex'),'sha256')),
 ('s3-upload-production-v1',extensions.digest(decode(repeat('2',64),'hex'),'sha256'));

insert into public.media_assets(id,alt_text) values
 ('66000000-0000-4000-8000-000000000010','Historical Preview fixture');
insert into public.media_versions(id,asset_id,version_number,storage_provider,
 storage_bucket,storage_path,mime_type,byte_size,width,height,content_hash,original_filename)
 values('14c93311-664d-401e-93c2-e0eaddd620cb',
 '66000000-0000-4000-8000-000000000010',1,'supabase','cms-media-preview',
 '14c93311-664d-401e-93c2-e0eaddd620cb.webp','image/webp',200,12,8,
 repeat('a',64),'historical.webp');
update public.media_assets set current_version_id='14c93311-664d-401e-93c2-e0eaddd620cb'
 where id='66000000-0000-4000-8000-000000000010';
select is((select storage_scope from public.media_versions
 where id='14c93311-664d-401e-93c2-e0eaddd620cb'),'preview',
 'legacy Preview bucket gives exact historical version Preview scope');
select throws_ok($$update public.media_versions set storage_scope='production'
 where id='14c93311-664d-401e-93c2-e0eaddd620cb'$$,
 '55000',null,'historical scope and bytes metadata remain immutable');

create temporary table scope_fixture(document_id uuid, payload jsonb, baseline uuid, current_draft uuid,
 revision8 uuid,revision9 uuid);
grant select,update on scope_fixture to authenticated;
insert into scope_fixture(payload) values
 ('{"schemaVersion":1,"publicTitle":"Baseline","h1":"Baseline h1","eyebrow":"Eyebrow","intro":"Intro","imageAlt":"Alt","signsTitle":"Signs","signsDescription":"Signs intro","processTitle":"Process","processDescription":"Process intro","benefitsDescription":"Benefits intro","resultDescription":"Result","seoTitle":"Baseline SEO","seoDescription":"Baseline description","images":["/images/services/delicate-upholstery-cleaning.jpeg"],"signs":["Sign"],"process":["Step"],"benefits":["Benefit"],"faqs":[{"question":"Question","answer":"Answer"}],"relatedLinks":[{"label":"Mattress","href":"/mattress-cleaning"}]}');
select public.cms_import_static_pilot_media();
update scope_fixture set document_id=public.cms_shared_service_id('delicate-upholstery-cleaning'), baseline=public.cms_import_service_baseline(payload),
 current_draft=public.cms_import_service_baseline(payload);

set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"66000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select set_config('request.headers',
 jsonb_build_object('x-cms-media-scope-capability',repeat('1',64))::text,true);
-- Revisions 2–7 carry only static bytes. Revisions 8 and 9 pin the exact
-- historical Preview-only version, reproducing the Production restore bug.
do $$
declare n integer; previous uuid; next_revision uuid; body jsonb;
begin
  select current_draft,payload into previous,body from scope_fixture;
  for n in 2..9 loop
    if n>=8 then
      body:=body||jsonb_build_object('schemaVersion',2,
        'images',jsonb_build_array('14c93311-664d-401e-93c2-e0eaddd620cb'));
    end if;
    next_revision:=public.cms_save_service_draft(n-1,previous,body);
    if n=8 then update scope_fixture set revision8=next_revision; end if;
    if n=9 then update scope_fixture set revision9=next_revision; end if;
    previous:=next_revision;
  end loop;
  update scope_fixture set current_draft=previous;
end;$$;
select is((select count(*)::integer from public.content_revisions r
 where r.document_id=(select document_id from scope_fixture)),9,
 'historical service revisions 8 and 9 exist');
select is((select count(*)::integer from public.revision_media_refs r
 where r.revision_id in ((select revision8 from scope_fixture),(select revision9 from scope_fixture))
   and r.media_version_id='14c93311-664d-401e-93c2-e0eaddd620cb'),6,
 'both historical revisions retain the exact Preview media UUID');

select set_config('request.headers',
 jsonb_build_object('x-cms-media-scope-capability',repeat('2',64))::text,true);
select throws_ok(format('select public.cms_save_service_draft(9,%L,null,%L)',
 (select current_draft from scope_fixture),(select revision8 from scope_fixture)),
 '42501','CMS_MEDIA_SCOPE_MISMATCH',
 'Production restore of historical revision 8 rejects Preview media');
select throws_ok(format('select public.cms_save_service_draft(9,%L,null,%L)',
 (select current_draft from scope_fixture),(select revision9 from scope_fixture)),
 '42501','CMS_MEDIA_SCOPE_MISMATCH',
 'Production restore of historical revision 9 rejects Preview media');
select throws_ok(format('select public.cms_save_service_draft(9,%L,%L::jsonb)',
 (select current_draft from scope_fixture),
 (select payload||jsonb_build_object('schemaVersion',2,
 'images',jsonb_build_array('14c93311-664d-401e-93c2-e0eaddd620cb')) from scope_fixture)),
 '42501','CMS_MEDIA_SCOPE_MISMATCH',
 'Production explicit UUID save rejects Preview media');
select throws_ok(format('select public.cms_publish_service_revision(9,%L)',
 (select revision9 from scope_fixture)),
 '42501','CMS_MEDIA_SCOPE_MISMATCH',
 'Production publish rejects a historical Preview-scoped draft');
select is((select generation::integer from public.content_publication_state
 where document_id=(select document_id from scope_fixture)),9,
 'failed writes keep generation unchanged');
select is((select draft_revision_id from public.content_publication_state
 where document_id=(select document_id from scope_fixture)),
 (select current_draft from scope_fixture),'failed writes keep draft pointer unchanged');
select is((select published_revision_id from public.content_publication_state
 where document_id=(select document_id from scope_fixture)),
 (select baseline from scope_fixture),'failed publish keeps baseline pointer unchanged');
select is((select count(*)::integer from public.content_revisions
 where document_id=(select document_id from scope_fixture)),9,
 'failed writes create no revision');
select set_config('request.headers',
 jsonb_build_object('x-cms-media-scope-capability',repeat('1',64))::text,true);
select lives_ok(format('select public.cms_save_service_draft(9,%L,null,%L)',
 (select current_draft from scope_fixture),(select revision8 from scope_fixture)),
 'Preview capability permits a historical Preview-scoped restore');
select is((select count(*)::integer from public.revision_media_refs r
 join public.content_publication_state s on s.draft_revision_id=r.revision_id
 where s.document_id=(select document_id from scope_fixture)
   and r.media_version_id='14c93311-664d-401e-93c2-e0eaddd620cb'),3,
 'Preview restore copies the exact immutable historical media reference');

select * from finish();
rollback;
