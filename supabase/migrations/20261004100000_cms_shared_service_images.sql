begin;
-- One immutable collection per stable service slug in each homepage publication snapshot.
-- Homepage blocks are presentation only; no new block payload stores another copy.
create table if not exists public.cms_service_image_collections(
 revision_id uuid not null references public.content_revisions(id),
 service_key text not null check(public.cms_shared_service_id(service_key) is not null),
 images jsonb not null check(public.cms_valid_home_service_images(images)),
 primary key(revision_id,service_key)
);
alter table public.cms_service_image_collections enable row level security;
alter table public.cms_service_image_collections force row level security;
revoke all on public.cms_service_image_collections from public,anon,authenticated,service_role;
drop trigger if exists cms_service_image_collections_immutable on public.cms_service_image_collections;
create trigger cms_service_image_collections_immutable before update or delete on public.cms_service_image_collections
 for each row execute function public.cms_reject_revision_mutation();

create or replace function public.cms_default_service_images() returns jsonb
language sql immutable set search_path='' as $$ select '{"sofa-cleaning":[{"versionId":"76906e25-9adc-44a4-8ada-7851d1ba3b6c","alt":"ניקוי ספות, תמונה 1 מתוך 4","position":"object-[center_48%]"},{"versionId":"c228e26c-817b-4c17-82eb-8d61ebba1040","alt":"ניקוי ספות, תמונה 2 מתוך 4","position":"object-[58%_center]"},{"versionId":"f968f4a0-eec7-45dd-82d0-06828378c0ec","alt":"ניקוי ספות, תמונה 3 מתוך 4","position":"object-center"},{"versionId":"8c65dad3-abcf-4436-8315-e5474954ee65","alt":"ניקוי ספות, תמונה 4 מתוך 4","position":"object-[52%_center]"}],"mattress-cleaning":[{"versionId":"1733a278-1a4c-4230-860d-0db0e62cc57a","alt":"ניקוי מזרנים","position":"object-center"}],"carpet-cleaning":[{"versionId":"bfaa5d53-8085-4fd4-826a-69b9a18ace18","alt":"ניקוי שטיחים","position":"object-center"}],"car-upholstery-cleaning":[{"versionId":"76859201-9b22-42b3-8bd9-01a53b71d664","alt":"ניקוי ריפודי רכב, תמונה 1 מתוך 4","position":"object-[center_42%]"},{"versionId":"9b24cc14-a3ee-4a67-8f74-0c5603cd4944","alt":"ניקוי ריפודי רכב, תמונה 2 מתוך 4","position":"object-[center_42%]"},{"versionId":"d41775e4-f694-4ee1-8de5-05133e9d5502","alt":"ניקוי ריפודי רכב, תמונה 3 מתוך 4","position":"object-[center_42%]"},{"versionId":"d8b4aa78-704e-4376-8703-58ab17c1a170","alt":"ניקוי ריפודי רכב, תמונה 4 מתוך 4","position":"object-[center_42%]"}],"armchair-chair-cleaning":[{"versionId":"b35c01a0-a35b-4629-81cc-73eb5ebdd203","alt":"ניקוי כורסאות וכיסאות","position":"object-center"}],"delicate-upholstery-cleaning":[{"versionId":"d1000000-0000-4000-8000-000000000001","alt":"ניקוי ריפודים עדינים","position":"object-center"}],"air-conditioner-cleaning":[{"versionId":"b920443f-55c5-4b27-a232-154b3688320e","alt":"ניקוי מזגנים, תמונה 1 מתוך 3","position":"object-[center_38%]"},{"versionId":"ba7745a4-fe0c-44fb-913c-971aaef4f486","alt":"ניקוי מזגנים, תמונה 2 מתוך 3","position":"object-[center_38%]"},{"versionId":"9c3e4c0f-d64b-47c7-9fb4-8f643af949a2","alt":"ניקוי מזגנים, תמונה 3 מתוך 3","position":"object-[center_38%]"}],"window-cleaning":[],"post-renovation-cleaning":[{"versionId":"ca9fda4c-f970-46f6-91cb-6a0347a76002","alt":"ניקיון אחרי שיפוץ ולפני אכלוס, תמונה 1 מתוך 4","position":"object-[center_55%]"},{"versionId":"e69df7e0-b215-4a91-981f-5383bb821adc","alt":"ניקיון אחרי שיפוץ ולפני אכלוס, תמונה 2 מתוך 4","position":"object-[center_55%]"},{"versionId":"67ae7454-b978-48ea-86db-632bbcd32bff","alt":"ניקיון אחרי שיפוץ ולפני אכלוס, תמונה 3 מתוך 4","position":"object-[center_55%]"},{"versionId":"5ddf16ba-4089-4454-9ab1-5161bf191ec3","alt":"ניקיון אחרי שיפוץ ולפני אכלוס, תמונה 4 מתוך 4","position":"object-[center_55%]"}]}'::jsonb; $$;
create or replace function public.cms_valid_service_image_collections(input jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare k text; images jsonb;
begin
 if jsonb_typeof(input)<>'object' or (select count(*) from jsonb_object_keys(input))<>9 then return false; end if;
 for k,images in select key,value from jsonb_each(input) loop
  if public.cms_shared_service_id(k) is null or not public.cms_valid_home_service_images(images) then return false; end if;
 end loop;
 return true;
exception when others then return false;
end; $$;

-- Only used once for a service that has never had a shared collection. Published
-- and draft legacy sources are selected separately. An explicit [] is a value.
create or replace function public.cms_legacy_service_images(k text,audience text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r public.content_revisions; p jsonb; items jsonb; item jsonb; vid uuid; result jsonb:='[]'; n integer; image_alt text; crop text;
begin
 select rev.* into r from public.content_publication_state s join public.content_revisions rev
  on rev.id=case when audience='draft' then s.draft_revision_id else s.published_revision_id end
  where s.document_id=public.cms_shared_service_id(k);
 if not found then return public.cms_default_service_images()->k; end if;
 p:=public.cms_revision_payload(r);
 if r.schema_version in (4,5) then
  items:=p#>'{media,hero}';
  if items is null then return public.cms_default_service_images()->k; end if;
  for item,n in select value,(ordinality-1)::integer from jsonb_array_elements(items) with ordinality loop
   result:=result||jsonb_build_array(jsonb_build_object('versionId',item->>'versionId','alt',item->>'alt',
    'position',case when k='air-conditioner-cleaning' then 'object-[center_38%]' else 'object-center' end));
  end loop;
 else
  items:=p->'images';
  if items is null then return public.cms_default_service_images()->k; end if;
  for item,n in select value,(ordinality-1)::integer from jsonb_array_elements(items) with ordinality loop
   if r.schema_version=1 then
    select (value->>'versionId')::uuid into vid from jsonb_array_elements(public.cms_static_media_inventory()) where value->>'path'=item#>>'{}';
   else vid:=(item#>>'{}')::uuid; end if;
   select alt_text into image_alt from public.revision_media_refs where revision_id=r.id and usage_role='hero' and position=n and media_version_id=vid;
   image_alt:=coalesce(image_alt,p->>'imageAlt',p->>'publicTitle');
   crop:=coalesce(p->'imagePositions'->>vid::text,p->>'imagePosition','object-center');
   result:=result||jsonb_build_array(jsonb_build_object('versionId',vid,'alt',image_alt,'position',crop));
  end loop;
 end if;
 if not public.cms_valid_home_service_images(result) then raise exception using errcode='23514',message='Legacy service image collection invalid'; end if;
 return result;
end; $$;

create or replace function public.cms_service_images_for_revision(target uuid,audience text default 'published') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare k text; images jsonb; card jsonb; result jsonb:='{}';
begin
 for k in select jsonb_object_keys(public.cms_default_service_images()) loop
  select c.images into images from public.cms_service_image_collections c where c.revision_id=target and c.service_key=k;
  if not found then
   select b.payload->'cards'->k into card from public.page_revision_blocks b where b.revision_id=target and b.block_type='homeServices';
   -- Legacy homepage CMS selections always take precedence, even when empty.
   images:=case when card ? 'images' then card->'images' else public.cms_legacy_service_images(k,audience) end;
  end if;
  result:=result||jsonb_build_object(k,images);
 end loop;
 return result;
end; $$;

create or replace function public.cms_home_shared_images_payload(p jsonb,target uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_set(p,'{cards}',(select jsonb_object_agg(key,card||jsonb_build_object('images',public.cms_service_images_for_revision(target)->key))
  from jsonb_each(p->'cards') c(key,card)));
$$;

create or replace function public.cms_valid_home_block(kind text,p jsonb,media_id uuid,promotion_id uuid)
returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; k text; n integer;
begin
  if kind in ('richText','imageText','promotionBanner','spacer') then
    return public.cms_valid_page_block(kind,p,media_id,promotion_id);
  end if;
  if promotion_id is not null or (kind='homeHero' and media_id is null) or
    (kind<>'homeHero' and media_id is not null) then return false; end if;
  if kind='homeHero' then
    return public.cms_page_keys(p,array['eyebrow','title','description','primaryLabel','secondaryLabel','trustChips','backgroundAlt']) and
      public.cms_home_text_fields(p,array['eyebrow','title','description','primaryLabel','secondaryLabel','backgroundAlt']) and
      public.cms_home_strings(p->'trustChips',1,6);
  elsif kind in ('homeTrust','homeWhyUs') then
    if kind='homeTrust' then
      return public.cms_page_keys(p,array['items']) and public.cms_home_strings(p->'items',1,8);
    end if;
    return public.cms_page_keys(p,array['eyebrow','title','description','items']) and
      public.cms_home_text_fields(p,array['eyebrow','title','description']) and public.cms_home_strings(p->'items',1,8);
  elsif kind='homeServices' then
    if not public.cms_page_keys(p,array['eyebrow','title','mobileDescription','description','serviceKeys','cards','note']) or
      not public.cms_home_text_fields(p,array['eyebrow','title','mobileDescription','description','note']) or
      jsonb_typeof(p->'serviceKeys')<>'array' or jsonb_array_length(p->'serviceKeys') not between 1 and 8 or
      jsonb_typeof(p->'cards')<>'object' or (select count(*) from jsonb_object_keys(p->'cards'))>9 then return false; end if;
    if (select count(distinct value) from jsonb_array_elements_text(p->'serviceKeys'))<>jsonb_array_length(p->'serviceKeys') then return false; end if;
    for item in select value from jsonb_array_elements(p->'serviceKeys') loop
      k:=item#>>'{}';
      if k not in ('sofa-cleaning','mattress-cleaning','carpet-cleaning','car-upholstery-cleaning',
        'armchair-chair-cleaning','delicate-upholstery-cleaning','air-conditioner-cleaning','window-cleaning','post-renovation-cleaning') or
        not (p->'cards' ? k) then return false; end if;
    end loop;
    for k,item in select key,value from jsonb_each(p->'cards') loop
      if k not in ('sofa-cleaning','mattress-cleaning','carpet-cleaning','car-upholstery-cleaning',
        'armchair-chair-cleaning','delicate-upholstery-cleaning','air-conditioner-cleaning','window-cleaning','post-renovation-cleaning') or
        not (public.cms_page_keys(item,array['title','benefit','description']) or
          public.cms_page_keys(item,array['title','benefit','description','images'])) or
        not public.cms_home_text_fields(item,array['title','benefit','description']) then return false; end if;
    end loop;
    for item in select value from jsonb_each(p->'cards') loop
      if item ? 'images' and not public.cms_valid_home_service_images(item->'images') then return false; end if;
    end loop;
    return true;
  elsif kind='homeProcess' then
    if not public.cms_page_keys(p,array['eyebrow','title','mobileDescription','description','steps']) or
      not public.cms_home_text_fields(p,array['eyebrow','title','mobileDescription','description']) or
      jsonb_typeof(p->'steps')<>'array' or jsonb_array_length(p->'steps') not between 1 and 6 then return false; end if;
    for item in select value from jsonb_array_elements(p->'steps') loop
      if not public.cms_page_keys(item,array['title','description','mobileDescription','icon']) or
        not public.cms_home_text_fields(item,array['title','description','mobileDescription']) or
        item->>'icon' not in ('image','quote','calendar','cleaning') then return false; end if;
    end loop;
    return true;
  elsif kind='homeBeforeAfter' then
    if not public.cms_page_keys(p,array['eyebrow','title','mobileDescription','description','items','ctaLabel']) or
      not public.cms_home_text_fields(p,array['eyebrow','title','mobileDescription','description','ctaLabel']) or
      jsonb_typeof(p->'items')<>'array' or jsonb_array_length(p->'items') not between 1 and 8 then return false; end if;
    for item in select value from jsonb_array_elements(p->'items') loop
      if not public.cms_page_keys(item,array['title','category','description','beforeVersionId','afterVersionId','beforeAlt','afterAlt']) or
        not public.cms_home_text_fields(item,array['title','description','beforeAlt','afterAlt']) or
        item->>'category' not in ('sofas','mattresses','carpets','cars') or
        item->>'beforeVersionId' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or
        item->>'afterVersionId' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or
        item->>'beforeVersionId'=item->>'afterVersionId' then return false; end if;
    end loop;
    return (select count(distinct value->>'title') from jsonb_array_elements(p->'items'))=jsonb_array_length(p->'items');
  elsif kind='homeGoogleReviews' then
    return public.cms_page_keys(p,array['eyebrow','title','description','showRatingSummary']) and
      public.cms_home_text_fields(p,array['eyebrow','title','description']) and
      jsonb_typeof(p->'showRatingSummary')='boolean';
  elsif kind='homePricing' then
    if not public.cms_page_keys(p,array['eyebrow','title','mobileDescription','description','factorsHeading','factors','cards','ctaLabel','ctaNote']) or
      not public.cms_home_text_fields(p,array['eyebrow','title','mobileDescription','description','factorsHeading','ctaLabel','ctaNote']) or
      not public.cms_home_strings(p->'factors',1,10) or jsonb_typeof(p->'cards')<>'array' or
      jsonb_array_length(p->'cards') not between 1 and 8 then return false; end if;
    for item in select value from jsonb_array_elements(p->'cards') loop
      if not public.cms_page_keys(item,array['title','description','icon']) or
        not public.cms_home_text_fields(item,array['title','description']) or
        item->>'icon' not in ('single','multi','car','air') then return false; end if;
    end loop;
    return true;
  elsif kind in ('homeEstimate','homeAreas') then
    return public.cms_page_keys(p,array['eyebrow','title','mobileDescription','description']) and
      public.cms_home_text_fields(p,array['eyebrow','title','mobileDescription','description']);
  elsif kind='homeFaq' then
    if not public.cms_page_keys(p,array['eyebrow','title','mobileDescription','description','items']) or
      not public.cms_home_text_fields(p,array['eyebrow','title','mobileDescription','description']) or
      jsonb_typeof(p->'items')<>'array' or jsonb_array_length(p->'items') not between 1 and 20 then return false; end if;
    for item in select value from jsonb_array_elements(p->'items') loop
      if not public.cms_page_keys(item,array['question','answer']) or
        not public.cms_home_text_fields(item,array['question','answer']) then return false; end if;
    end loop;
    return (select count(distinct value->>'question') from jsonb_array_elements(p->'items'))=jsonb_array_length(p->'items');
  elsif kind='homeFinalCta' then
    return public.cms_page_keys(p,array['eyebrow','title','description','whatsappLabel','phoneLabel','trustNotes']) and
      public.cms_home_text_fields(p,array['eyebrow','title','description','whatsappLabel','phoneLabel']) and
      public.cms_home_strings(p->'trustNotes',1,6);
  end if;
  return false;
exception when others then return false;
end; $$;

create or replace function public.cms_validate_service_image_collection() returns trigger
language plpgsql security definer set search_path='' as $$
declare r public.content_revisions; item jsonb; n integer; asset public.media_assets;
begin
 select * into r from public.content_revisions where id=new.revision_id;
 if r.schema_version<>12 or not exists(select 1 from public.content_documents where id=r.document_id and content_type='page' and content_key='home') then
  raise exception using errcode='23514',message='Shared images need a homepage revision'; end if;
 for item,n in select value,(ordinality-1)::integer from jsonb_array_elements(new.images) with ordinality loop
  select a.* into asset from public.media_assets a join public.media_versions v on v.asset_id=a.id where v.id=(item->>'versionId')::uuid for share of a;
  if not found then raise exception using errcode='23503',message='Shared image version missing'; end if;
  if auth.uid() is not null and asset.status='archived' and not exists(select 1 from public.revision_media_refs ref
    where ref.revision_id in (r.base_revision_id,r.source_revision_id) and ref.usage_role='home-service:'||new.service_key and ref.media_version_id=(item->>'versionId')::uuid) then
   raise exception using errcode='23514',message='Archived shared image cannot be newly selected'; end if;
  insert into public.revision_media_refs(revision_id,media_version_id,usage_role,position,alt_text)
   values(new.revision_id,(item->>'versionId')::uuid,'home-service:'||new.service_key,n,item->>'alt');
 end loop;
 return new;
end; $$;
drop trigger if exists cms_service_image_collection_validate on public.cms_service_image_collections;
create trigger cms_service_image_collection_validate after insert on public.cms_service_image_collections
 for each row execute function public.cms_validate_service_image_collection();

create or replace function public.cms_initialize_service_images(target uuid,items jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare r public.content_revisions; source uuid; collections jsonb; supplied jsonb; cards jsonb; k text; card jsonb;
begin
 select * into r from public.content_revisions where id=target;
 source:=coalesce(r.source_revision_id,r.base_revision_id);
 collections:=public.cms_service_images_for_revision(source);
 select value#>'{payload,cards}' into cards from jsonb_array_elements(items) where value->>'type'='homeServices';
 for k,card in select key,value from jsonb_each(coalesce(cards,'{}')) loop
  if card ? 'images' then collections:=jsonb_set(collections,array[k],card->'images'); end if;
 end loop;
 supplied:=nullif(current_setting('cms.shared_service_images',true),'')::jsonb;
 if supplied is not null then collections:=supplied; end if;
 if not public.cms_valid_service_image_collections(collections) then raise exception using errcode='22023',message='Invalid shared service images'; end if;
 for k,card in select key,value from jsonb_each(collections) loop
  insert into public.cms_service_image_collections(revision_id,service_key,images) values(target,k,card);
 end loop;
end; $$;

create or replace function public.cms_insert_home_blocks(target_revision uuid, items jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; n integer; kind text; seen text[]:=array[]::text[]; hero_title text;
begin
  if jsonb_typeof(items)<>'array' or jsonb_array_length(items) not between 1 and 50 then
    raise exception using errcode='22023',message='Invalid home blocks'; end if;
  perform public.cms_initialize_service_images(target_revision,items);
  select coalesce(jsonb_agg(case when value->>'type'='homeServices' then
    jsonb_set(value,'{payload,cards}',(select jsonb_object_agg(key,card-'images') from jsonb_each(value#>'{payload,cards}') as c(key,card)))
    else value end order by ordinality),'[]'::jsonb) into items from jsonb_array_elements(items) with ordinality;
  for item,n in select value,(ordinality-1)::integer from jsonb_array_elements(items) with ordinality loop
    kind:=item->>'type';

    if not public.cms_page_keys(item,array['id','position','type','schemaVersion','hidden','payload','mediaVersionId','promotionRevisionId']) or
      item->'position'<>to_jsonb(n) or item->'schemaVersion'<>'1'::jsonb or
      jsonb_typeof(item->'hidden')<>'boolean' or
      item->>'id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or
      not public.cms_valid_home_block(kind,item->'payload',(item->>'mediaVersionId')::uuid,
        (item->>'promotionRevisionId')::uuid) then
      raise exception using errcode='22023',message='Invalid home block order or payload'; end if;
    if left(kind,4)='home' then
      if kind=any(seen) then raise exception using errcode='22023',message='Duplicate home section'; end if;
      seen:=array_append(seen,kind);
    end if;
    if n=0 then
      if kind<>'homeHero' or item->'hidden'<>'false'::jsonb then
        raise exception using errcode='22023',message='Home needs a visible first hero'; end if;
      hero_title:=item->'payload'->>'title';
    end if;
    insert into public.page_revision_blocks(revision_id,block_id,position,block_type,schema_version,hidden,payload,media_version_id,promotion_revision_id)
      values(target_revision,(item->>'id')::uuid,n,kind,1,(item->>'hidden')::boolean,
        item->'payload',(item->>'mediaVersionId')::uuid,(item->>'promotionRevisionId')::uuid);
  end loop;
  if hero_title is distinct from (select h1 from public.content_revisions where id=target_revision) then
    raise exception using errcode='22023',message='Home H1 mismatch'; end if;
end; $$;

-- Existing restore/history readers project images from the authoritative rows.
-- Historical pre-migration block payloads remain immutable and are normalized only when read/restored.
create or replace function public.cms_page_revision_payload(r public.content_revisions)
returns jsonb language sql stable security definer set search_path='' as $$
 select public.cms_revision_payload(r)||jsonb_build_object('blocks',
  (select coalesce(jsonb_agg(jsonb_build_object('id',b.block_id,'position',b.position,'type',b.block_type,
    'schemaVersion',b.schema_version,'hidden',b.hidden,
    'payload',case when b.block_type='homeServices' then public.cms_home_shared_images_payload(b.payload,r.id) else b.payload end,
    'mediaVersionId',b.media_version_id,'promotionRevisionId',b.promotion_revision_id) order by b.position),'[]') from public.page_revision_blocks b where b.revision_id=r.id));
$$;

create or replace function public.cms_save_home_shared_draft(expected_generation bigint,base_revision uuid,payload jsonb,service_images jsonb,restore_revision uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; previous text:=coalesce(current_setting('cms.shared_service_images',true),'');
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
 if service_images is not null and not public.cms_valid_service_image_collections(service_images) then raise exception using errcode='22023',message='Invalid shared image collections'; end if;
 if restore_revision is not null then service_images:=public.cms_service_images_for_revision(restore_revision); end if;
 perform set_config('cms.shared_service_images',coalesce(service_images::text,''),true);
 result:=public.cms_save_home_draft(expected_generation,base_revision,payload,restore_revision);
 perform set_config('cms.shared_service_images',previous,true);
 return result;
end; $$;

create or replace function public.cms_read_home_editor()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
 return (select jsonb_build_object('updatedAt',d.updated_at,'generation',s.generation,
  'draftRevisionId',s.draft_revision_id,'publishedRevisionId',s.published_revision_id,
  'publishedBy',(select e.published_by from public.content_publication_events e where e.document_id=d.id and e.revision_id=s.published_revision_id order by e.published_at desc,e.id desc limit 1),
  'draft',public.cms_page_revision_payload(r),'serviceImages',public.cms_service_images_for_revision(r.id),
  'history',(select jsonb_agg(jsonb_build_object('id',h.id,'number',h.revision_number,'createdAt',h.created_at,'createdBy',h.created_by,'baseRevisionId',h.base_revision_id,'sourceRevisionId',h.source_revision_id) order by h.revision_number desc) from public.content_revisions h where h.document_id=d.id))
 from public.content_documents d join public.content_publication_state s on s.document_id=d.id join public.content_revisions r on r.id=s.draft_revision_id
 where d.content_type='page' and d.content_key='home');
end; $$;

create or replace function public.cms_read_public_home()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'revisionId',r.id,
    'serviceImages',public.cms_service_images_for_revision(r.id),
    'payload',public.cms_revision_payload(r)||jsonb_build_object('blocks',
      (select coalesce(jsonb_agg(jsonb_build_object(
        'id',b.block_id,'position',b.public_position,'type',b.block_type,'schemaVersion',b.schema_version,
        'hidden',false,'payload',case when b.block_type='homeServices' then public.cms_home_shared_images_payload(b.payload,r.id) else b.payload end,'mediaVersionId',b.media_version_id,
        'promotionRevisionId',b.promotion_revision_id) order by b.position),'[]'::jsonb)
       from (select blocks.*,(row_number() over(order by blocks.position)-1)::integer as public_position
         from public.page_revision_blocks blocks where blocks.revision_id=r.id and not blocks.hidden) b)),
    'promotions',(select coalesce(jsonb_object_agg(p.id::text,public.cms_revision_payload(p)),'{}'::jsonb)
      from public.content_revisions p join public.content_documents pd on pd.id=p.document_id
      where pd.content_type='promotion' and pd.content_key='about-intro' and
        p.id in (select b.promotion_revision_id from public.page_revision_blocks b
          where b.revision_id=r.id and not b.hidden and b.promotion_revision_id is not null) and
        exists(select 1 from public.content_publication_events e where e.revision_id=p.id)),
    'media',(select coalesce(jsonb_agg(jsonb_build_object(
      'media_version_id',refs.media_version_id,'usage_role',refs.usage_role,
      'position',refs.position,'alt_text',refs.alt_text,'provider',v.storage_provider)
      order by refs.usage_role,refs.position),'[]'::jsonb)
      from public.revision_media_refs refs join public.media_versions v on v.id=refs.media_version_id
      where (refs.revision_id=r.id and (
        (left(refs.usage_role,13)='home-service:') or
        (refs.usage_role='home-hero' and exists(select 1 from public.page_revision_blocks b where
          b.revision_id=r.id and b.block_type='homeHero' and not b.hidden and b.media_version_id=refs.media_version_id)) or
        (refs.usage_role in ('home-before','home-after') and exists(select 1 from public.page_revision_blocks b where
          b.revision_id=r.id and b.block_type='homeBeforeAfter' and not b.hidden)) or
        (refs.usage_role='page-image' and exists(select 1 from public.page_revision_blocks b where
          b.revision_id=r.id and b.position=refs.position and not b.hidden and b.media_version_id=refs.media_version_id)))) or
        (refs.usage_role='promotion' and refs.revision_id in
          (select b.promotion_revision_id from public.page_revision_blocks b where b.revision_id=r.id
            and not b.hidden and b.promotion_revision_id is not null)))
  )
  from public.content_documents d join public.content_publication_state s on s.document_id=d.id
    join public.content_revisions r on r.id=s.published_revision_id and r.document_id=d.id
  where d.content_type='page' and d.content_key='home' and r.schema_version=12 and
    not exists(select 1 from public.page_revision_blocks b where b.revision_id=r.id and not b.hidden
      and b.promotion_revision_id is not null and not exists(
        select 1 from public.content_revisions p join public.content_documents pd on pd.id=p.document_id
        where p.id=b.promotion_revision_id and pd.content_type='promotion' and pd.content_key='about-intro'
          and exists(select 1 from public.content_publication_events e where e.revision_id=p.id)));
$$;

-- Backfill current pointers with immutable successors. No existing row, draft,
-- service content revision, or media asset/version is overwritten.
alter table public.revision_media_refs disable trigger revision_media_scope;
alter table public.page_revision_blocks disable trigger page_promotion_media_scope;
alter table public.content_publication_state disable trigger publication_media_scope;
do $$
declare state public.content_publication_state; source public.content_revisions; old uuid; new_id uuid;
 new_published uuid; new_draft uuid; audience integer; collections jsonb; published_collections jsonb; draft_collections jsonb; blocks jsonb; next_number integer;
begin
 select s.* into state from public.content_publication_state s join public.content_documents d on d.id=s.document_id where d.content_key='home' and d.content_type='page' for update of s;
 if not found then return; end if;
 if (select count(*) from public.cms_service_image_collections where revision_id=state.draft_revision_id)=9 and
    (select count(*) from public.cms_service_image_collections where revision_id=state.published_revision_id)=9 then return; end if;
 perform public.cms_import_home_media();
 published_collections:=public.cms_service_images_for_revision(state.published_revision_id,'published');
 draft_collections:=public.cms_service_images_for_revision(state.draft_revision_id,'draft');
 new_published:=state.published_revision_id; new_draft:=state.draft_revision_id;
 for audience in 0..1 loop
  old:=case when audience=0 then state.published_revision_id else state.draft_revision_id end;
  collections:=case when audience=0 then published_collections else draft_collections end;
  if audience=1 and old=state.published_revision_id and collections=published_collections then new_draft:=new_published; continue; end if;
  if (select count(*) from public.cms_service_image_collections where revision_id=old)=9 then continue; end if;
  select * into source from public.content_revisions where id=old;
  blocks:=public.cms_page_revision_payload(source)->'blocks';
  select max(revision_number)+1 into next_number from public.content_revisions where document_id=state.document_id;
  insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body,created_by,base_revision_id)
   values(source.document_id,next_number,source.schema_version,source.public_title,source.h1,source.seo_title,source.seo_description,source.body,source.created_by,old) returning id into new_id;
  perform set_config('cms.shared_service_images',collections::text,true);
  perform public.cms_insert_home_blocks(new_id,blocks);
  perform set_config('cms.shared_service_images','',true);
  if audience=0 then new_published:=new_id; insert into public.content_publication_events(document_id,revision_id,kind) values(state.document_id,new_id,'baseline');
  else new_draft:=new_id; end if;
 end loop;
 update public.content_publication_state set draft_revision_id=new_draft,published_revision_id=new_published,generation=generation+1 where document_id=state.document_id;
 update public.content_documents set updated_at=now() where id=state.document_id;
end $$;
alter table public.revision_media_refs enable trigger revision_media_scope;
alter table public.page_revision_blocks enable trigger page_promotion_media_scope;
alter table public.content_publication_state enable trigger publication_media_scope;

-- New collection helpers never grant direct table or private-revision access.
DO $$
declare f record;
begin
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname in
 ('cms_default_service_images','cms_valid_service_image_collections','cms_legacy_service_images','cms_service_images_for_revision',
  'cms_home_shared_images_payload','cms_validate_service_image_collection','cms_initialize_service_images','cms_save_home_shared_draft') loop
  execute format('alter function %s owner to postgres',f.signature);
  execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
 end loop;
end $$;
grant execute on function public.cms_save_home_shared_draft(bigint,uuid,jsonb,jsonb,uuid) to authenticated;
commit;
