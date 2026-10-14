begin;
select plan(6);
create temporary table visibility_payload as
select r.body||jsonb_build_object('schemaVersion',r.schema_version,'publicTitle',r.public_title,'h1',r.h1,'seoTitle',r.seo_title,'seoDescription',r.seo_description) p
from public.content_revisions r join public.content_publication_state s on s.published_revision_id=r.id
where r.document_id='78f7bdd5-5174-4d7b-8d5c-b0c1fd3a53c1';
select ok(public.cms_valid_shared_payload('mini-central-air-conditioner-cleaning',p),'current mini-central payload is valid') from visibility_payload;
select ok(public.cms_valid_shared_payload('mini-central-air-conditioner-cleaning',p-'resultsHidden'),'historical payload without flag remains valid') from visibility_payload;
select ok(public.cms_valid_shared_payload('mini-central-air-conditioner-cleaning',p||'{"resultsHidden":false}'::jsonb),'visible boolean is valid') from visibility_payload;
select ok(public.cms_valid_shared_payload('mini-central-air-conditioner-cleaning',p||'{"resultsHidden":true}'::jsonb),'hidden boolean is valid') from visibility_payload;
select ok(not public.cms_valid_shared_payload('mini-central-air-conditioner-cleaning',p||'{"resultsHidden":"false"}'::jsonb),'string flag rejected') from visibility_payload;
select ok(not public.cms_valid_shared_payload('mini-central-air-conditioner-cleaning',p||'{"resultsHidden":null}'::jsonb),'null flag rejected') from visibility_payload;
select * from finish();
rollback;
