begin;

-- Homepage card media belong to the home revision, independently of service detail media.
create or replace function public.cms_valid_home_service_images(images jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare image jsonb;
begin
  if jsonb_typeof(images)<>'array' or jsonb_array_length(images)>8 then return false; end if;
  for image in select value from jsonb_array_elements(images) loop
    if not public.cms_page_keys(image,array['versionId','alt','position']) or
      jsonb_typeof(image->'versionId')<>'string' or jsonb_typeof(image->'position')<>'string' or
      image->>'versionId' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or
      not public.cms_page_plain(image->'alt',300) or
      image->>'position' not in ('object-center','object-[center_48%]','object-[58%_center]',
        'object-[52%_center]','object-[center_42%]','object-[center_38%]','object-[center_55%]') then return false; end if;
  end loop;
  return (select count(distinct value->>'versionId') from jsonb_array_elements(images))=jsonb_array_length(images);
exception when others then return false;
end; $$;

alter table public.revision_media_refs drop constraint revision_media_refs_usage_role_check;
alter table public.revision_media_refs add constraint revision_media_refs_usage_role_check check(
  usage_role in ('hero','benefits','result','before','after','gallery','seo','page-hero','page-image','promotion',
    'home-hero','home-before','home-after') or usage_role in (
    'home-service:sofa-cleaning','home-service:mattress-cleaning','home-service:carpet-cleaning',
    'home-service:car-upholstery-cleaning','home-service:air-conditioner-cleaning','home-service:window-cleaning',
    'home-service:armchair-chair-cleaning','home-service:delicate-upholstery-cleaning','home-service:post-renovation-cleaning'));

create or replace function public.cms_seed_home_service_images(p jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare k text; card jsonb; seeds jsonb := '{
  "sofa-cleaning": [
    {
      "versionId": "76906e25-9adc-44a4-8ada-7851d1ba3b6c",
      "alt": "ניקוי ספות, תמונה 1 מתוך 4",
      "position": "object-[center_48%]"
    },
    {
      "versionId": "c228e26c-817b-4c17-82eb-8d61ebba1040",
      "alt": "ניקוי ספות, תמונה 2 מתוך 4",
      "position": "object-[58%_center]"
    },
    {
      "versionId": "f968f4a0-eec7-45dd-82d0-06828378c0ec",
      "alt": "ניקוי ספות, תמונה 3 מתוך 4",
      "position": "object-center"
    },
    {
      "versionId": "8c65dad3-abcf-4436-8315-e5474954ee65",
      "alt": "ניקוי ספות, תמונה 4 מתוך 4",
      "position": "object-[52%_center]"
    }
  ],
  "mattress-cleaning": [
    {
      "versionId": "1733a278-1a4c-4230-860d-0db0e62cc57a",
      "alt": "ניקוי מזרנים",
      "position": "object-center"
    }
  ],
  "carpet-cleaning": [
    {
      "versionId": "bfaa5d53-8085-4fd4-826a-69b9a18ace18",
      "alt": "ניקוי שטיחים",
      "position": "object-center"
    }
  ],
  "car-upholstery-cleaning": [
    {
      "versionId": "76859201-9b22-42b3-8bd9-01a53b71d664",
      "alt": "ניקוי ריפודי רכב, תמונה 1 מתוך 4",
      "position": "object-[center_42%]"
    },
    {
      "versionId": "9b24cc14-a3ee-4a67-8f74-0c5603cd4944",
      "alt": "ניקוי ריפודי רכב, תמונה 2 מתוך 4",
      "position": "object-[center_42%]"
    },
    {
      "versionId": "d41775e4-f694-4ee1-8de5-05133e9d5502",
      "alt": "ניקוי ריפודי רכב, תמונה 3 מתוך 4",
      "position": "object-[center_42%]"
    },
    {
      "versionId": "d8b4aa78-704e-4376-8703-58ab17c1a170",
      "alt": "ניקוי ריפודי רכב, תמונה 4 מתוך 4",
      "position": "object-[center_42%]"
    }
  ],
  "air-conditioner-cleaning": [
    {
      "versionId": "b920443f-55c5-4b27-a232-154b3688320e",
      "alt": "ניקוי מזגנים, תמונה 1 מתוך 3",
      "position": "object-[center_38%]"
    },
    {
      "versionId": "ba7745a4-fe0c-44fb-913c-971aaef4f486",
      "alt": "ניקוי מזגנים, תמונה 2 מתוך 3",
      "position": "object-[center_38%]"
    },
    {
      "versionId": "9c3e4c0f-d64b-47c7-9fb4-8f643af949a2",
      "alt": "ניקוי מזגנים, תמונה 3 מתוך 3",
      "position": "object-[center_38%]"
    }
  ],
  "window-cleaning": [],
  "armchair-chair-cleaning": [
    {
      "versionId": "b35c01a0-a35b-4629-81cc-73eb5ebdd203",
      "alt": "ניקוי כורסאות וכיסאות",
      "position": "object-center"
    }
  ],
  "delicate-upholstery-cleaning": [
    {
      "versionId": "d1000000-0000-4000-8000-000000000001",
      "alt": "ניקוי ריפודים עדינים",
      "position": "object-center"
    }
  ],
  "post-renovation-cleaning": [
    {
      "versionId": "ca9fda4c-f970-46f6-91cb-6a0347a76002",
      "alt": "ניקיון אחרי שיפוץ ולפני אכלוס, תמונה 1 מתוך 4",
      "position": "object-[center_55%]"
    },
    {
      "versionId": "e69df7e0-b215-4a91-981f-5383bb821adc",
      "alt": "ניקיון אחרי שיפוץ ולפני אכלוס, תמונה 2 מתוך 4",
      "position": "object-[center_55%]"
    },
    {
      "versionId": "67ae7454-b978-48ea-86db-632bbcd32bff",
      "alt": "ניקיון אחרי שיפוץ ולפני אכלוס, תמונה 3 מתוך 4",
      "position": "object-[center_55%]"
    },
    {
      "versionId": "5ddf16ba-4089-4454-9ab1-5161bf191ec3",
      "alt": "ניקיון אחרי שיפוץ ולפני אכלוס, תמונה 4 מתוך 4",
      "position": "object-[center_55%]"
    }
  ]
}'::jsonb;
begin
  for k,card in select key,value from jsonb_each(p->'cards') loop
    if not card ? 'images' then
      p:=jsonb_set(p,array['cards',k,'images'],coalesce(seeds->k,'[]'::jsonb));
    end if;
  end loop;
  return p;
end; $$;

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
      jsonb_typeof(p->'cards')<>'object' or (select count(*) from jsonb_object_keys(p->'cards'))>8 then return false; end if;
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

create or replace function public.cms_validate_page_block_ref()
returns trigger language plpgsql security definer set search_path='' as $$
declare rev public.content_revisions; promo public.content_revisions; asset public.media_assets;
  role_name text; item jsonb; vid uuid; n integer;
begin
  select * into rev from public.content_revisions where id=new.revision_id;
  if rev.schema_version not in (6,8,12) or not exists(
    select 1 from public.content_documents where id=rev.document_id and content_type='page' and
      (content_key='about' or content_key='home' or content_key=('new:'||id::text))) then
    raise exception using errcode='23514',message='Block revision mismatch'; end if;
  if rev.schema_version=12 and not public.cms_valid_home_block(new.block_type,new.payload,new.media_version_id,new.promotion_revision_id) then
    raise exception using errcode='23514',message='Invalid home block'; end if;
  if rev.schema_version<>12 and not public.cms_valid_page_block(new.block_type,new.payload,new.media_version_id,new.promotion_revision_id) then
    raise exception using errcode='23514',message='Invalid page block'; end if;
  if new.promotion_revision_id is not null then
    select * into promo from public.content_revisions where id=new.promotion_revision_id;
    if promo.schema_version<>7 or not exists(
      select 1 from public.cms_promotion_identity i join public.content_documents d on d.id=i.document_id
      where d.id=promo.document_id and d.content_type='promotion' and i.status='active') then
      raise exception using errcode='23514',message='Promotion revision mismatch'; end if;
  end if;
  if new.media_version_id is not null then
    select a.* into asset from public.media_assets a join public.media_versions v on v.asset_id=a.id
      where v.id=new.media_version_id for share of a;
    if not found or (asset.status='archived' and not exists(
      select 1 from public.page_revision_blocks b where b.revision_id in (rev.base_revision_id,rev.source_revision_id)
        and b.media_version_id=new.media_version_id)) then
      raise exception using errcode='55000',message='CMS media unavailable'; end if;
    role_name:=case new.block_type when 'hero' then 'page-hero' when 'homeHero' then 'home-hero' else 'page-image' end;
    insert into public.revision_media_refs(revision_id,media_version_id,usage_role,position,alt_text,caption)
      values(new.revision_id,new.media_version_id,role_name,new.position,
        case new.block_type when 'hero' then new.payload->>'mediaAlt'
          when 'homeHero' then new.payload->>'backgroundAlt' else new.payload->>'alt' end,asset.caption);
  end if;
  if new.block_type='homeBeforeAfter' then
    for item,n in select value,(ordinality-1)::integer from jsonb_array_elements(new.payload->'items') with ordinality loop
      for role_name,vid in select 'home-before',(item->>'beforeVersionId')::uuid
        union all select 'home-after',(item->>'afterVersionId')::uuid loop
        select a.* into asset from public.media_assets a join public.media_versions v on v.asset_id=a.id
          where v.id=vid for share of a;
        if not found or (asset.status='archived' and not exists(
          select 1 from public.revision_media_refs r where r.revision_id in (rev.base_revision_id,rev.source_revision_id)
            and r.media_version_id=vid)) then
          raise exception using errcode='55000',message='CMS gallery media unavailable'; end if;
        insert into public.revision_media_refs(revision_id,media_version_id,usage_role,position,alt_text,caption)
          values(new.revision_id,vid,role_name,n,
            case role_name when 'home-before' then item->>'beforeAlt' else item->>'afterAlt' end,asset.caption);
      end loop;
    end loop;
  end if;
  if new.block_type='homeServices' then
    for role_name,item in select 'home-service:'||key,value from jsonb_each(new.payload->'cards') loop
      for vid,n in select (value->>'versionId')::uuid,(ordinality-1)::integer
        from jsonb_array_elements(item->'images') with ordinality loop
        select a.* into asset from public.media_assets a join public.media_versions v on v.asset_id=a.id
          where v.id=vid for share of a;
        if not found or (asset.status='archived' and not exists(
          select 1 from public.revision_media_refs r where r.revision_id in (rev.base_revision_id,rev.source_revision_id)
            and r.media_version_id=vid) and not exists(
          select 1 from public.page_revision_blocks b,
            lateral jsonb_each(public.cms_seed_home_service_images(
              case when b.block_type='homeServices' then b.payload else '{"cards":{}}'::jsonb end)->'cards') card,
            lateral jsonb_array_elements(card.value->'images') image
          where b.revision_id in (rev.base_revision_id,rev.source_revision_id) and b.block_type='homeServices'
            and image->>'versionId'=vid::text)) then
          raise exception using errcode='55000',message='CMS service card media unavailable'; end if;
        insert into public.revision_media_refs(revision_id,media_version_id,usage_role,position,alt_text,caption)
          values(new.revision_id,vid,role_name,n,item->'images'->n->>'alt',asset.caption);
      end loop;
    end loop;
  end if;
  return new;
end; $$;

create or replace function public.cms_insert_home_blocks(target_revision uuid, items jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; n integer; kind text; seen text[]:=array[]::text[]; hero_title text;
begin
  if jsonb_typeof(items)<>'array' or jsonb_array_length(items) not between 1 and 50 then
    raise exception using errcode='22023',message='Invalid home blocks'; end if;
  for item,n in select value,(ordinality-1)::integer from jsonb_array_elements(items) with ordinality loop
    kind:=item->>'type';
    if kind='homeServices' then
      item:=jsonb_set(item,'{payload}',public.cms_seed_home_service_images(item->'payload'));
    end if;
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

create or replace function public.cms_import_home_media()
returns void language plpgsql security definer set search_path='' as $$
declare aid uuid:='d3000000-0000-4000-8000-000000000001';
  vid uuid:='d3000000-0000-4000-8000-000000000002';
begin
  perform public.cms_import_shared_media();
  perform public.cms_import_special_media();
  if exists(select 1 from public.media_versions where id=vid) then return; end if;
  insert into public.media_assets(id,alt_text,folder) values(aid,'ניקוי ספה מקצועי בבית הלקוח','דף הבית');
  insert into public.media_versions(id,asset_id,version_number,storage_provider,storage_path,mime_type,byte_size,width,height,content_hash,original_filename)
    values(vid,aid,1,'static','/images/hero/hero-sofa-cleaning.jpg','image/jpeg',280216,1280,714,
      'a327cb1d39fd7d86e31fffb53fc64b37722cb1a1820a1041e4656164cead46a8','hero-sofa-cleaning.jpg');
  update public.media_assets set current_version_id=vid where id=aid;
  insert into public.media_audit_events(asset_id,version_id,kind,after_state)
    select aid,vid,'bootstrap',to_jsonb(a) from public.media_assets a where a.id=aid;
end; $$;

create or replace function public.cms_read_public_home()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'revisionId',r.id,
    'payload',public.cms_revision_payload(r)||jsonb_build_object('blocks',
      (select coalesce(jsonb_agg(jsonb_build_object(
        'id',b.block_id,'position',b.public_position,'type',b.block_type,'schemaVersion',b.schema_version,
        'hidden',false,'payload',b.payload,'mediaVersionId',b.media_version_id,
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
        (left(refs.usage_role,13)='home-service:' and exists(
          select 1 from public.page_revision_blocks b where b.revision_id=r.id and b.block_type='homeServices'
            and not b.hidden and b.payload->'serviceKeys' ? substring(refs.usage_role from 14))) or
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

-- The operator copies existing immutable selections across environments here;
-- request capabilities do not exist during migrations. Scope guards are disabled
-- only for this transaction's backfill and restored before commit. New seeded
-- selections are reviewed static files; authenticated writes retain all guards.
alter table public.revision_media_refs disable trigger revision_media_scope;
alter table public.page_revision_blocks disable trigger page_promotion_media_scope;
alter table public.content_publication_state disable trigger publication_media_scope;

-- Create immutable successors for current draft/published pointers, never rewrite history.
-- Preserve unpublished edits and all editor fields; only fill absent image fields.
do $$
declare state public.content_publication_state; source public.content_revisions;
  old_id uuid; new_id uuid; new_draft uuid; new_published uuid; payload jsonb; block jsonb;
  blocks jsonb; next_number integer; changed boolean;
begin
  select s.* into state from public.content_publication_state s join public.content_documents d on d.id=s.document_id
    where d.content_type='page' and d.content_key='home' for update of s;
  if not found then return; end if;
  perform public.cms_import_home_media();
  new_draft:=state.draft_revision_id; new_published:=state.published_revision_id;
  for old_id in select distinct id from unnest(array[state.draft_revision_id,state.published_revision_id]) id loop
    select * into source from public.content_revisions where id=old_id;
    payload:=public.cms_page_revision_payload(source); blocks:='[]'::jsonb; changed:=false;
    for block in select value from jsonb_array_elements(payload->'blocks') loop
      if block->>'type'='homeServices' then
        changed:=changed or public.cms_seed_home_service_images(block->'payload')<>block->'payload';
        block:=jsonb_set(block,'{payload}',public.cms_seed_home_service_images(block->'payload'));
      end if;
      blocks:=blocks||jsonb_build_array(block);
    end loop;
    if not changed then continue; end if;
    select max(revision_number)+1 into next_number from public.content_revisions where document_id=state.document_id;
    insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,
      body,created_by,base_revision_id)
      values(source.document_id,next_number,source.schema_version,source.public_title,source.h1,source.seo_title,
        source.seo_description,source.body,source.created_by,old_id) returning id into new_id;
    perform public.cms_insert_home_blocks(new_id,blocks);
    if old_id=state.draft_revision_id then new_draft:=new_id; end if;
    if old_id=state.published_revision_id then
      new_published:=new_id;
      -- Operator augmentation uses a baseline event, not a fabricated editor publication.
      -- The successor's base_revision_id retains the previous published lineage.
      insert into public.content_publication_events(document_id,revision_id,kind)
        values(state.document_id,new_id,'baseline');
    end if;
  end loop;
  if new_draft<>state.draft_revision_id or new_published<>state.published_revision_id then
    update public.content_publication_state set draft_revision_id=new_draft,published_revision_id=new_published,
      generation=generation+1 where document_id=state.document_id;
    update public.content_documents set updated_at=now() where id=state.document_id;
  end if;
end $$;

alter table public.revision_media_refs enable trigger revision_media_scope;
alter table public.page_revision_blocks enable trigger page_promotion_media_scope;
alter table public.content_publication_state enable trigger publication_media_scope;

alter function public.cms_valid_home_service_images(jsonb) owner to postgres;
alter function public.cms_seed_home_service_images(jsonb) owner to postgres;
revoke all on function public.cms_valid_home_service_images(jsonb) from public,anon,authenticated,service_role;
revoke all on function public.cms_seed_home_service_images(jsonb) from public,anon,authenticated,service_role;
commit;
