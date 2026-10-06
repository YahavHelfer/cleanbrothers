begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
select is(cms_shared_service_id('mini-central-air-conditioner-cleaning'),
 '78f7bdd5-5174-4d7b-8d5c-b0c1fd3a53c1'::uuid,'fixed mini-central identity');
select ok(not cms_new_page_slug('mini-central-air-conditioner-cleaning'),'route reserved for service');
select ok(cms_site_target('{"kind":"service","key":"mini-central-air-conditioner-cleaning"}'),'CMS navigation supports service');
select ok(cms_valid_campaign_placement('service:mini-central-air-conditioner-cleaning'),'promotion target supported');
select ok(cms_valid_service_image_collections(cms_default_service_images()),'ten image collections accepted');
select ok(cms_valid_service_image_collections(cms_default_service_images()-'mini-central-air-conditioner-cleaning'),'historical nine collections accepted');
select ok(not cms_valid_service_image_collections(cms_default_service_images()-'sofa-cleaning'),'missing historical service rejected');
create temporary table mini_payload as
 select cms_revision_payload(r) p from content_documents d
 join content_publication_state s on s.document_id=d.id
 join content_revisions r on r.id=s.published_revision_id
 where d.content_key='mini-central-air-conditioner-cleaning';
select is((select count(*)::int from mini_payload),1,'Hebrew baseline imported');
select ok(cms_valid_service_payload('mini-central-air-conditioner-cleaning',p),'complete editorial payload valid') from mini_payload;
select ok(cms_valid_service_payload('mini-central-air-conditioner-cleaning',p-'pageCopy'),'older schema-3 payload remains valid') from mini_payload;
select ok(not cms_valid_service_payload('mini-central-air-conditioner-cleaning',jsonb_set(p,'{pageCopy,heroCta}','"<script>"')),'HTML CTA rejected') from mini_payload;
select ok(not cms_valid_service_payload('mini-central-air-conditioner-cleaning',p#-'{pageCopy,heroCta}'),'missing CTA rejected') from mini_payload;
select ok(not cms_valid_service_payload('mini-central-air-conditioner-cleaning',jsonb_set(p,'{pageCopy,href}','"https://invalid.example"')),'unrecognized editorial field rejected') from mini_payload;
select is(cms_read_published_service('mini-central-air-conditioner-cleaning')->'payload',p,'public reader returns published content') from mini_payload;
select ok(not has_function_privilege('anon','cms_import_shared_baseline(text,jsonb)','execute'),'public baseline import denied');
select ok(not has_function_privilege('anon','cms_save_managed_draft(text,bigint,uuid,jsonb,uuid)','execute'),'anonymous editing denied');
select * from finish();
rollback;
