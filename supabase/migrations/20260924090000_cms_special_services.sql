begin;
-- Phase 2D1 LOCAL ONLY. Reuse the established lifecycle, RLS and audit.
-- No new tables, grants to editors, cloud changes or historical migration edits.
create or replace function public.cms_shared_service_id(k text) returns uuid language sql immutable set search_path='' as $$ select case k when 'sofa-cleaning' then '9aef51c5-1851-4c76-8816-2242abd80a3f'::uuid when 'mattress-cleaning' then '78ae8483-c8d3-4b25-8e62-e15cb3aba3a4'::uuid when 'carpet-cleaning' then '7c563896-cf12-4aa7-82a2-1a17bd40cf04'::uuid when 'car-upholstery-cleaning' then 'e28e9966-82c8-45ce-8d85-266ef6c6643c'::uuid when 'armchair-chair-cleaning' then '8896b193-728e-4284-8196-198a95081d7c'::uuid when 'delicate-upholstery-cleaning' then 'c0000000-0000-4000-8000-000000000001'::uuid when 'air-conditioner-cleaning' then '2185a776-4440-4728-af2c-909d17994241'::uuid when 'window-cleaning' then 'f05f10a0-b576-4625-8eb2-8abc5a0a1ae6'::uuid end; $$;
create function public.cms_special_contract(k text) returns jsonb language sql immutable set search_path='' as $$ select case k  when 'air-conditioner-cleaning' then '{"kind":"object","fields":{"schemaVersion":{"kind":"literal","value":4},"publicTitle":{"kind":"text","max":180},"h1":{"kind":"text","max":180},"seoTitle":{"kind":"text","max":180},"seoDescription":{"kind":"text","max":500},"copy":{"kind":"object","fields":{"heroEyebrow":{"kind":"text","max":2000},"heroDescription":{"kind":"text","max":2000},"heroCta":{"kind":"text","max":2000},"callCta":{"kind":"text","max":2000},"imageCaption":{"kind":"text","max":2000},"signsEyebrow":{"kind":"text","max":2000},"signsTitle":{"kind":"text","max":2000},"signsDescription":{"kind":"text","max":2000},"cleaningEyebrow":{"kind":"text","max":2000},"cleaningTitle":{"kind":"text","max":2000},"cleaningDescription":{"kind":"text","max":2000},"cleaningNote":{"kind":"text","max":2000},"technicalTitle":{"kind":"text","max":2000},"technicalDescription":{"kind":"text","max":2000},"processEyebrow":{"kind":"text","max":2000},"processTitle":{"kind":"text","max":2000},"processDescription":{"kind":"text","max":2000},"processCta":{"kind":"text","max":2000},"galleryEyebrow":{"kind":"text","max":2000},"galleryTitle":{"kind":"text","max":2000},"galleryDescription":{"kind":"text","max":2000},"pricingEyebrow":{"kind":"text","max":2000},"pricingTitle":{"kind":"text","max":2000},"pricingDescription":{"kind":"text","max":2000},"pricingCta":{"kind":"text","max":2000},"multipleEyebrow":{"kind":"text","max":2000},"multipleTitle":{"kind":"text","max":2000},"multipleDescription":{"kind":"text","max":2000},"multipleCta":{"kind":"text","max":2000},"areasEyebrow":{"kind":"text","max":2000},"areasTitle":{"kind":"text","max":2000},"areasDescription":{"kind":"text","max":2000},"faqEyebrow":{"kind":"text","max":2000},"faqTitle":{"kind":"text","max":2000},"contactEyebrow":{"kind":"text","max":2000},"contactTitle":{"kind":"text","max":2000},"contactDescription":{"kind":"text","max":2000},"contactCta":{"kind":"text","max":2000},"callPrefix":{"kind":"text","max":2000},"servicesCta":{"kind":"text","max":2000}}},"trustItems":{"kind":"list","min":1,"max":20,"item":{"kind":"text","max":2000}},"airConditionerServiceAreas":{"kind":"list","min":1,"max":20,"item":{"kind":"text","max":2000}},"intentSignals":{"kind":"list","min":1,"max":20,"item":{"kind":"text","max":2000}},"cleaningAreas":{"kind":"list","min":1,"max":20,"item":{"kind":"object","fields":{"title":{"kind":"text","max":2000},"description":{"kind":"text","max":2000}}}},"processSteps":{"kind":"list","min":1,"max":20,"item":{"kind":"text","max":2000}},"faqs":{"kind":"list","min":1,"max":20,"item":{"kind":"object","fields":{"question":{"kind":"text","max":2000},"answer":{"kind":"text","max":2000}}}},"serviceDescription":{"kind":"text","max":2000},"keywords":{"kind":"list","min":1,"max":20,"item":{"kind":"text","max":2000}},"media":{"kind":"object","fields":{"hero":{"kind":"list","min":1,"max":8,"item":{"kind":"object","fields":{"versionId":{"kind":"uuid"},"alt":{"kind":"text","max":300}}}},"gallery":{"kind":"list","min":1,"max":8,"item":{"kind":"object","fields":{"versionId":{"kind":"uuid"},"alt":{"kind":"text","max":300}}}},"seo":{"kind":"list","min":1,"max":1,"item":{"kind":"object","fields":{"versionId":{"kind":"uuid"},"alt":{"kind":"text","max":300}}}}}},"promotion":{"kind":"object","fields":{"enabled":{"kind":"boolean"},"startingPrice":{"kind":"number","min":1,"max":10000},"regularPrice":{"kind":"number","min":1,"max":10000},"bundleEnabled":{"kind":"boolean"},"badge":{"kind":"text","max":2000},"heroLabel":{"kind":"text","max":2000},"pricePrefix":{"kind":"text","max":2000},"description":{"kind":"text","max":2000},"cta":{"kind":"text","max":2000},"priceTerms":{"kind":"text","max":2000},"bundleTerms":{"kind":"text","max":2000}}}}}'::jsonb when 'window-cleaning' then '{"kind":"object","fields":{"schemaVersion":{"kind":"literal","value":5},"publicTitle":{"kind":"text","max":180},"h1":{"kind":"text","max":180},"seoTitle":{"kind":"text","max":180},"seoDescription":{"kind":"text","max":500},"copy":{"kind":"object","fields":{"heroEyebrow":{"kind":"text","max":2000},"heroDescription":{"kind":"text","max":2000},"heroCta":{"kind":"text","max":2000},"includedEyebrow":{"kind":"text","max":2000},"includedTitle":{"kind":"text","max":2000},"includedDescription":{"kind":"text","max":2000},"propertyEyebrow":{"kind":"text","max":2000},"propertyTitle":{"kind":"text","max":2000},"processEyebrow":{"kind":"text","max":2000},"processTitle":{"kind":"text","max":2000},"audienceEyebrow":{"kind":"text","max":2000},"audienceTitle":{"kind":"text","max":2000},"audienceDescription":{"kind":"text","max":2000},"safetyEyebrow":{"kind":"text","max":2000},"safetyTitle":{"kind":"text","max":2000},"safetyDescription":{"kind":"text","max":2000},"faqEyebrow":{"kind":"text","max":2000},"faqTitle":{"kind":"text","max":2000},"contactEyebrow":{"kind":"text","max":2000},"contactTitle":{"kind":"text","max":2000},"contactDescription":{"kind":"text","max":2000},"callPrefix":{"kind":"text","max":2000},"callCta":{"kind":"text","max":2000},"quoteCta":{"kind":"text","max":2000}}},"includedItems":{"kind":"list","min":1,"max":20,"item":{"kind":"text","max":2000}},"propertyTypes":{"kind":"list","min":1,"max":20,"item":{"kind":"object","fields":{"title":{"kind":"text","max":2000},"text":{"kind":"text","max":2000}}}},"process":{"kind":"list","min":1,"max":20,"item":{"kind":"text","max":2000}},"faqs":{"kind":"list","min":1,"max":20,"item":{"kind":"object","fields":{"question":{"kind":"text","max":2000},"answer":{"kind":"text","max":2000}}}},"media":{"kind":"object","fields":{"hero":{"kind":"list","min":0,"max":1,"item":{"kind":"object","fields":{"versionId":{"kind":"uuid"},"alt":{"kind":"text","max":300}}}}}}}}'::jsonb end; $$;
create function public.cms_matches_special_contract(c jsonb,v jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; field text; rule jsonb; n numeric;
begin
 if c is null or v is null then return false;end if;
 case c->>'kind'
 when 'text' then return jsonb_typeof(v)='string' and char_length(btrim(v#>>'{}')) >= 1 and char_length(v#>>'{}') <= (c->>'max')::integer and (v#>>'{}') !~ E'[<>\\x01-\\x1f\\x7f]' and (v#>>'{}') !~ U&'[\202A-\202E\2066-\2069]';
 when 'uuid' then return jsonb_typeof(v)='string' and (v#>>'{}') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
 when 'number' then
  if jsonb_typeof(v)<>'number' then return false;end if;n:=(v#>>'{}')::numeric;
  return n=trunc(n) and n between (c->>'min')::numeric and (c->>'max')::numeric;
 when 'boolean' then return jsonb_typeof(v)='boolean';
 when 'literal' then return v=c->'value';
 when 'list' then
  if jsonb_typeof(v)<>'array' then return false;end if;
  if jsonb_array_length(v) not between (c->>'min')::integer and (c->>'max')::integer then return false;end if;
  for item in select value from jsonb_array_elements(v) loop if not public.cms_matches_special_contract(c->'item',item) then return false;end if;end loop;
  return true;
 when 'object' then
  if jsonb_typeof(v)<>'object' then return false;end if;
  if (select count(*) from jsonb_object_keys(v))<>(select count(*) from jsonb_object_keys(c->'fields')) then return false;end if;
  for field,rule in select * from jsonb_each(c->'fields') loop if not v ? field or not public.cms_matches_special_contract(rule,v->field) then return false;end if;end loop;
  return true;
 else return false;
 end case;
exception when others then return false;
end; $$;
alter function public.cms_valid_service_payload(text,jsonb) rename to cms_valid_shared_payload;
create function public.cms_valid_service_payload(k text,p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare items jsonb;
begin
 if k in ('air-conditioner-cleaning','window-cleaning') then
  if not public.cms_matches_special_contract(public.cms_special_contract(k),p) then return false;end if;
  for items in select value from jsonb_each(p->'media') loop
   if (select count(distinct value->>'versionId') from jsonb_array_elements(items))<>jsonb_array_length(items) then return false;end if;
  end loop;
  if k='air-conditioner-cleaning' and (p->'promotion'->>'startingPrice')::integer > (p->'promotion'->>'regularPrice')::integer then return false;end if;
  return true;
 end if;
 -- Keep the shared schema's original six related-link targets unchanged.
 if exists(select 1 from jsonb_array_elements(p->'relatedLinks') item where item->>'href' in ('/air-conditioner-cleaning','/window-cleaning')) then return false;end if;
 return public.cms_valid_shared_payload(k,p);
exception when others then return false;
end; $$;
alter table public.content_revisions drop constraint content_revisions_schema_version_check;
alter table public.content_revisions add constraint content_revisions_schema_version_check check(schema_version in (1,2,3,4,5));
create function public.cms_special_media_inventory() returns jsonb language sql immutable set search_path='' as $$ select '[{"path":"/images/services/Air-conditioner-cleaning4.JPG","assetId":"4190614e-ce0f-4a53-8452-71aab8776a21","versionId":"b920443f-55c5-4b27-a232-154b3688320e","byteSize":308108,"width":1536,"height":2048,"hash":"ca98d70410c6ee99936f233e3ff25bfb77e57dff825632f9f32b500aad5e56b6","mime":"image/jpeg","alt":"ניקוי מזגן בבית הלקוח על ידי CleanBrothers"},{"path":"/images/services/Air-conditioner-cleaning.PNG","assetId":"be80fd2f-eea6-4294-9c3e-3c646f0179cd","versionId":"ba7745a4-fe0c-44fb-913c-971aaef4f486","byteSize":2162084,"width":1086,"height":1448,"hash":"51ec79469975f78e302b96be21e2e8af9be732926aa49176c9ba13046acb10d1","mime":"image/png","alt":"ניקוי מזגן בבית הלקוח על ידי CleanBrothers"},{"path":"/images/services/Air-conditioner-cleaning2.PNG","assetId":"f7f65a8c-714e-405f-b11e-7f4ef18b6358","versionId":"9c3e4c0f-d64b-47c7-9fb4-8f643af949a2","byteSize":2027316,"width":1086,"height":1448,"hash":"4d67e61347c0d04c2758eec9ac0e08287e46962af7e979487e3aeba2949f95dc","mime":"image/png","alt":"ניקוי מזגן בבית הלקוח על ידי CleanBrothers"}]'::jsonb; $$;
create or replace function public.cms_valid_static_version(vid uuid,p text,h text,b integer,w integer,ht integer,m text) returns boolean language sql immutable set search_path='' as $$
 select exists(select 1 from jsonb_array_elements(public.cms_static_media_inventory() || public.cms_special_media_inventory()) e where e->>'versionId'=vid::text and e->>'path'=p and e->>'hash'=h and (e->>'byteSize')::integer=b and (e->>'width')::integer=w and (e->>'height')::integer=ht and e->>'mime'=m);
$$;
alter table public.revision_media_refs drop constraint revision_media_refs_usage_role_check;
alter table public.revision_media_refs add constraint revision_media_refs_usage_role_check check(usage_role in ('hero','benefits','result','before','after','gallery','seo'));
create or replace function public.cms_attach_revision_media() returns trigger language plpgsql security definer set search_path='' as $$
declare vid uuid; idx integer; role_name text; alt text; cap text; a public.media_assets; items jsonb; item jsonb;
begin
 if new.source_revision_id is not null and exists(select 1 from public.revision_media_refs where revision_id=new.source_revision_id) then
   insert into public.revision_media_refs select new.id,media_version_id,usage_role,position,alt_text,caption from public.revision_media_refs where revision_id=new.source_revision_id;
   return new;
 end if;
 if new.schema_version in (4,5) then
  for role_name,items in select * from jsonb_each(new.body->'media') loop
   for item,idx in select value,(ordinality-1)::integer from jsonb_array_elements(items) with ordinality loop
    vid:=(item->>'versionId')::uuid;
    select m.* into a from public.media_assets m join public.media_versions v on v.asset_id=m.id where v.id=vid for share of m;
    if not found then raise exception using errcode='23503',message='Unknown media version';end if;
    if a.status='archived' and not exists(select 1 from public.revision_media_refs where revision_id=new.base_revision_id and media_version_id=vid) then raise exception using errcode='55000',message='CMS media archived';end if;
    insert into public.revision_media_refs values(new.id,vid,role_name,idx,item->>'alt',a.caption);
   end loop;
  end loop;
  return new;
 end if;
 for vid,idx in select case when new.schema_version=1 then 'd1000000-0000-4000-8000-000000000001'::uuid else value::uuid end,(ordinality-1)::integer from jsonb_array_elements_text(new.body->'images') with ordinality loop
   select m.* into a from public.media_assets m join public.media_versions v on v.asset_id=m.id where v.id=vid for share of m;
   if not found then
     if new.schema_version=1 then continue;end if;
     raise exception using errcode='23503',message='Unknown media version';
   end if;
   if a.status='archived' and new.schema_version>=2 and not exists(select 1 from public.revision_media_refs where revision_id=new.base_revision_id and media_version_id=vid) then raise exception using errcode='55000',message='CMS media archived';end if;
   cap:=a.caption;
   foreach role_name in array array['hero','benefits','result'] loop
     if role_name='result' and idx<>0 then continue;end if;
     alt:=case role_name when 'hero' then new.body->>'imageAlt' when 'benefits' then 'תיעוד אמיתי של '||new.public_title||' על ידי CleanBrothers' else 'צילום מהשטח במהלך '||new.public_title end;
     insert into public.revision_media_refs values(new.id,vid,role_name,idx,alt,cap);
   end loop;
 end loop;
 if new.schema_version=3 and new.body ? 'beforeAfter' then
   foreach role_name in array array['before','after'] loop
     vid:=(new.body->'beforeAfter'->>(role_name||'Image'))::uuid;
     select m.* into a from public.media_assets m join public.media_versions v on v.asset_id=m.id where v.id=vid for share of m;
     if not found then raise exception using errcode='23503',message='Unknown media version';end if;
     if a.status='archived' and not exists(select 1 from public.revision_media_refs where revision_id=new.base_revision_id and media_version_id=vid) then raise exception using errcode='55000',message='CMS media archived';end if;
     insert into public.revision_media_refs values(new.id,vid,role_name,0,new.body->'beforeAfter'->>(role_name||'Alt'),a.caption);
   end loop;
 end if;
 return new;
end;$$;
create function public.cms_import_special_media() returns integer language plpgsql security definer set search_path='' as $$
declare e jsonb; aid uuid; vid uuid;
begin
 perform pg_advisory_xact_lock(20260924,1);
 -- No unrelated media import.
 for e in select value from jsonb_array_elements(public.cms_special_media_inventory()) loop
   aid:=(e->>'assetId')::uuid;vid:=(e->>'versionId')::uuid;
   if exists(select 1 from public.media_versions where id=vid) then continue;end if;
   insert into public.media_assets(id,alt_text,folder) values(aid,e->>'alt','שירותים');
   insert into public.media_versions(id,asset_id,version_number,storage_provider,storage_path,mime_type,byte_size,width,height,content_hash,original_filename)
   values(vid,aid,1,'static',e->>'path',e->>'mime',(e->>'byteSize')::integer,(e->>'width')::integer,(e->>'height')::integer,e->>'hash',regexp_replace(e->>'path','^.*/',''));
   update public.media_assets set current_version_id=vid where id=aid;
   insert into public.media_audit_events(asset_id,version_id,kind,after_state) select aid,vid,'bootstrap',to_jsonb(a) from public.media_assets a where a.id=aid;
 end loop;
 return jsonb_array_length(public.cms_special_media_inventory());
end;$$;
do $$declare f regprocedure;begin for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in ('cms_special_contract','cms_matches_special_contract','cms_valid_shared_payload','cms_valid_service_payload','cms_special_media_inventory','cms_import_special_media') loop execute format('alter function %s owner to postgres',f);execute format('revoke all on function %s from public,anon,authenticated,service_role',f);end loop;end $$;
commit;
