begin;
-- Extend stable identities and optional copy, retaining historical revisions.
create or replace function public.cms_shared_service_id(k text) returns uuid language sql immutable set search_path='' as $$ select case k when 'sofa-cleaning' then '9aef51c5-1851-4c76-8816-2242abd80a3f'::uuid when 'mattress-cleaning' then '78ae8483-c8d3-4b25-8e62-e15cb3aba3a4'::uuid when 'carpet-cleaning' then '7c563896-cf12-4aa7-82a2-1a17bd40cf04'::uuid when 'car-upholstery-cleaning' then 'e28e9966-82c8-45ce-8d85-266ef6c6643c'::uuid when 'armchair-chair-cleaning' then '8896b193-728e-4284-8196-198a95081d7c'::uuid when 'delicate-upholstery-cleaning' then 'c0000000-0000-4000-8000-000000000001'::uuid when 'air-conditioner-cleaning' then '2185a776-4440-4728-af2c-909d17994241'::uuid when 'window-cleaning' then 'f05f10a0-b576-4625-8eb2-8abc5a0a1ae6'::uuid when 'post-renovation-cleaning' then '46bf0306-f3a9-487e-9a45-3ab3f6fcb3f8'::uuid when 'mini-central-air-conditioner-cleaning' then '78f7bdd5-5174-4d7b-8d5c-b0c1fd3a53c1'::uuid end; $$;
create or replace function public.cms_valid_shared_payload(k text,p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; pair jsonb; name text; val jsonb; allowed text[]:=array['object-center','object-[center_48%]','object-[58%_center]','object-[52%_center]','object-[center_42%]'];
begin
 if public.cms_shared_service_id(k) is null or p is null then return false;end if;
 if p->'schemaVersion' is distinct from '3'::jsonb then return k='delicate-upholstery-cleaning' and public.cms_valid_pilot_payload(p);end if;
 if not public.cms_valid_pilot_payload((p-array['beforeAfter','imagePosition','imagePositions','pageCopy'])||'{"schemaVersion":2,"relatedLinks":[]}'::jsonb) then return false;end if;
 if jsonb_typeof(p->'relatedLinks') is distinct from 'array' or jsonb_array_length(p->'relatedLinks')>6 then return false;end if;
 for item in select value from jsonb_array_elements(p->'relatedLinks') loop
   if jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>2 or not item ?& array['href','label'] or jsonb_typeof(item->'href')<>'string' or left(item->>'href',1)<>'/' or public.cms_shared_service_id(substr(item->>'href',2)) is null or jsonb_typeof(item->'label')<>'string' or char_length(btrim(item->>'label')) not between 1 and 120 or (item->>'label') ~ E'[<>\\x01-\\x1f\\x7f]' then return false;end if;
 end loop;
 if (select count(distinct value->>'href') from jsonb_array_elements(p->'relatedLinks'))<>jsonb_array_length(p->'relatedLinks') then return false;end if;
 if p ? 'imagePosition' and (jsonb_typeof(p->'imagePosition')<>'string' or not (p->>'imagePosition'=any(allowed))) then return false;end if;
 if p ? 'imagePositions' then
   if jsonb_typeof(p->'imagePositions')<>'object' or (select count(*) from jsonb_object_keys(p->'imagePositions'))>8 then return false;end if;
   for name,val in select * from jsonb_each(p->'imagePositions') loop
     if not (p->'images' ? name) or jsonb_typeof(val)<>'string' or not ((val#>>'{}')=any(allowed)) then return false;end if;
   end loop;
 end if;
 if p ? 'beforeAfter' then
   pair:=p->'beforeAfter';
   if jsonb_typeof(pair)<>'object' or (select count(*) from jsonb_object_keys(pair))<>6 or not pair ?& array['title','description','beforeImage','afterImage','beforeAlt','afterAlt'] then return false;end if;
   for name,val in select * from jsonb_each(pair) loop
     if jsonb_typeof(val)<>'string' or char_length(btrim(val#>>'{}')) not between 1 and (case name when 'title' then 180 when 'description' then 2000 else 300 end) or (val#>>'{}') ~ E'[<>\\x01-\\x1f\\x7f]' then return false;end if;
     if name in ('beforeImage','afterImage') and (val#>>'{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false;end if;
   end loop;
   if pair->>'beforeImage'=pair->>'afterImage' then return false;end if;
 end if;
 if p ? 'pageCopy' then
  pair:=p->'pageCopy';
  if jsonb_typeof(pair)<>'object' or (select count(*) from jsonb_object_keys(pair))<>16 or
    not pair ?& array['heroCta','whatsappCta','imageCaption','signsEyebrow','processEyebrow','benefitsTitle','resultEyebrow','resultTitle','resultHeading','resultNote','galleryCta','faqTitle','contactEyebrow','contactTitle','contactDescription','contactWhatsappCta'] then return false; end if;
  for name,val in select * from jsonb_each(pair) loop
   if not public.cms_page_plain(val,2000) then return false; end if;
  end loop;
 end if;
 return true;
exception when others then return false;end;$$;
create or replace function public.cms_new_page_slug(value text)
returns boolean language sql immutable set search_path='' as $$
  select coalesce(length(value) between 3 and 64 and value ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and
    value <> all(array['admin','api','_next','cms-media','services','gallery','about','contact',
      'privacy-policy','accessibility-statement','data-deletion','robots','sitemap',
      'icon','apple-icon','favicon','manifest','opengraph-image','twitter-image',
      'sofa-cleaning','mattress-cleaning','carpet-cleaning','delicate-upholstery-cleaning',
      'car-upholstery-cleaning','armchair-chair-cleaning','air-conditioner-cleaning','window-cleaning','post-renovation-cleaning','mini-central-air-conditioner-cleaning']),false);
$$;
insert into public.cms_page_routes(slug,kind)
 values ('mini-central-air-conditioner-cleaning','service') on conflict (slug) do nothing;
do $$ begin
 if exists(select 1 from public.cms_page_routes where slug='mini-central-air-conditioner-cleaning' and kind<>'service') then
  raise exception 'Mini-central service route is already owned by another page';
 end if;
end $$;
alter table public.cms_promotion_schedule_placements
  drop constraint cms_promotion_schedule_placements_check;
alter table public.cms_promotion_schedule_placements
  add constraint cms_promotion_schedule_placements_check check (
    (placement_kind = 'home' and target_key = 'home') or
    (placement_kind = 'global' and target_key = 'site') or
    (placement_kind = 'service' and target_key in
      ('delicate-upholstery-cleaning','sofa-cleaning','mattress-cleaning','carpet-cleaning',
       'car-upholstery-cleaning','armchair-chair-cleaning','air-conditioner-cleaning','window-cleaning',
       'post-renovation-cleaning','mini-central-air-conditioner-cleaning'))
  );

create or replace function public.cms_schedule_validate_placements(items jsonb)
returns void language plpgsql stable security definer set search_path='' as $$
declare item jsonb; n integer; k text; target text; seen text[]:=array[]::text[];
begin
  if jsonb_typeof(items)<>'array' or jsonb_array_length(items) not between 1 and 12 then
    raise exception using errcode='22023', message='Invalid placements'; end if;
  for item,n in select value,ordinality from jsonb_array_elements(items) with ordinality loop
    if not public.cms_page_keys(item,array['kind','target']) then
      raise exception using errcode='22023', message='Invalid placement shape'; end if;
    k:=item->>'kind'; target:=item->>'target';
    if not ((k='home' and target='home') or (k='global' and target='site') or
      (k='service' and target in ('delicate-upholstery-cleaning','sofa-cleaning','mattress-cleaning',
        'carpet-cleaning','car-upholstery-cleaning','armchair-chair-cleaning',
        'air-conditioner-cleaning','window-cleaning','post-renovation-cleaning','mini-central-air-conditioner-cleaning') and exists (
          select 1 from public.content_documents d where d.content_type='service' and d.content_key=target))) or
      k||':'||target=any(seen) then
      raise exception using errcode='22023', message='Invalid or duplicate placement'; end if;
    seen:=array_append(seen,k||':'||target);
  end loop;
end; $$;
create or replace function public.cms_read_active_promotion_placement(kind text, target text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'kind', a.placement_kind,
    'target', a.target_key,
    'promotionKey', d.content_key,
    'promotionRevisionId', r.id,
    'promotion', public.cms_revision_payload(r),
    'media', case when public.cms_revision_payload(r)->>'mediaVersionId' is null then null
      else (select jsonb_build_object('mediaVersionId', prm.media_version_id,
        'provider', v.storage_provider, 'altText', prm.alt_text)
        from public.promotion_revision_media prm
        join public.revision_media_refs refs on refs.revision_id=prm.revision_id
          and refs.media_version_id=prm.media_version_id and refs.usage_role='promotion'
          and refs.position=0 and refs.alt_text=prm.alt_text
        join public.media_versions v on v.id=prm.media_version_id
        where prm.revision_id=r.id and prm.media_version_id::text=public.cms_revision_payload(r)->>'mediaVersionId'
          and prm.alt_text=public.cms_revision_payload(r)->>'mediaAlt') end)
  from public.cms_active_promotion_placements a
  join public.cms_promotion_schedules s on s.id=a.schedule_id and s.status='active'
    and s.promotion_revision_id=a.promotion_revision_id
  join public.content_documents d on d.id=s.promotion_document_id and d.content_type='promotion'
  join public.cms_promotion_identity i on i.document_id=d.id and i.status='active'
    and i.analytics_key=d.content_key
  join public.content_revisions r on r.id=a.promotion_revision_id and r.document_id=d.id
    and r.schema_version=7
  where a.placement_kind=kind and a.target_key=target
    and ((kind='global' and target='site') or (kind='home' and target='home') or
      (kind='service' and target in
        ('delicate-upholstery-cleaning','sofa-cleaning','mattress-cleaning','carpet-cleaning',
         'car-upholstery-cleaning','armchair-chair-cleaning','air-conditioner-cleaning','window-cleaning','post-renovation-cleaning','mini-central-air-conditioner-cleaning')))
    and s.starts_at <= now() and (s.ends_at is null or s.ends_at > now())
    and public.cms_valid_promotion_revision(public.cms_revision_payload(r))
    and (public.cms_revision_payload(r)->>'enabled')::boolean
    and exists(select 1 from public.content_publication_events e
      where e.document_id=d.id and e.revision_id=r.id and e.kind in ('baseline','publish'))
    and ((public.cms_revision_payload(r)->>'mediaVersionId' is null and
        not exists(select 1 from public.promotion_revision_media prm where prm.revision_id=r.id)) or
      exists(select 1 from public.promotion_revision_media prm
        join public.revision_media_refs refs on refs.revision_id=prm.revision_id
          and refs.media_version_id=prm.media_version_id and refs.usage_role='promotion'
          and refs.position=0 and refs.alt_text=prm.alt_text
        join public.media_versions v on v.id=prm.media_version_id
        where prm.revision_id=r.id and prm.media_version_id::text=public.cms_revision_payload(r)->>'mediaVersionId'
          and prm.alt_text=public.cms_revision_payload(r)->>'mediaAlt'
          and v.storage_provider in ('static','local','supabase')));
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
      jsonb_typeof(p->'cards')<>'object' or (select count(*) from jsonb_object_keys(p->'cards'))>10 then return false; end if;
    if (select count(distinct value) from jsonb_array_elements_text(p->'serviceKeys'))<>jsonb_array_length(p->'serviceKeys') then return false; end if;
    for item in select value from jsonb_array_elements(p->'serviceKeys') loop
      k:=item#>>'{}';
      if k not in ('sofa-cleaning','mattress-cleaning','carpet-cleaning','car-upholstery-cleaning',
        'armchair-chair-cleaning','delicate-upholstery-cleaning','air-conditioner-cleaning','window-cleaning','post-renovation-cleaning','mini-central-air-conditioner-cleaning') or
        not (p->'cards' ? k) then return false; end if;
    end loop;
    for k,item in select key,value from jsonb_each(p->'cards') loop
      if k not in ('sofa-cleaning','mattress-cleaning','carpet-cleaning','car-upholstery-cleaning',
        'armchair-chair-cleaning','delicate-upholstery-cleaning','air-conditioner-cleaning','window-cleaning','post-renovation-cleaning','mini-central-air-conditioner-cleaning') or
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
create or replace function public.cms_valid_service_image_collections(input jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare k text; images jsonb;
begin
 if jsonb_typeof(input)<>'object' or not input ?& array['sofa-cleaning','mattress-cleaning','carpet-cleaning','car-upholstery-cleaning','armchair-chair-cleaning','delicate-upholstery-cleaning','air-conditioner-cleaning','window-cleaning','post-renovation-cleaning'] or (select count(*) from jsonb_object_keys(input)) not in (9,10) then return false; end if;
 for k,images in select key,value from jsonb_each(input) loop
  if public.cms_shared_service_id(k) is null or not public.cms_valid_home_service_images(images) then return false; end if;
 end loop;
 return true;
exception when others then return false;
end; $$;
create or replace function public.cms_default_service_images() returns jsonb
language sql immutable set search_path='' as $$ select '{"sofa-cleaning":[{"versionId":"76906e25-9adc-44a4-8ada-7851d1ba3b6c","alt":"ניקוי ספות, תמונה 1 מתוך 4","position":"object-[center_48%]"},{"versionId":"c228e26c-817b-4c17-82eb-8d61ebba1040","alt":"ניקוי ספות, תמונה 2 מתוך 4","position":"object-[58%_center]"},{"versionId":"f968f4a0-eec7-45dd-82d0-06828378c0ec","alt":"ניקוי ספות, תמונה 3 מתוך 4","position":"object-center"},{"versionId":"8c65dad3-abcf-4436-8315-e5474954ee65","alt":"ניקוי ספות, תמונה 4 מתוך 4","position":"object-[52%_center]"}],"mattress-cleaning":[{"versionId":"1733a278-1a4c-4230-860d-0db0e62cc57a","alt":"ניקוי מזרנים","position":"object-center"}],"carpet-cleaning":[{"versionId":"bfaa5d53-8085-4fd4-826a-69b9a18ace18","alt":"ניקוי שטיחים","position":"object-center"}],"car-upholstery-cleaning":[{"versionId":"76859201-9b22-42b3-8bd9-01a53b71d664","alt":"ניקוי ריפודי רכב, תמונה 1 מתוך 4","position":"object-[center_42%]"},{"versionId":"9b24cc14-a3ee-4a67-8f74-0c5603cd4944","alt":"ניקוי ריפודי רכב, תמונה 2 מתוך 4","position":"object-[center_42%]"},{"versionId":"d41775e4-f694-4ee1-8de5-05133e9d5502","alt":"ניקוי ריפודי רכב, תמונה 3 מתוך 4","position":"object-[center_42%]"},{"versionId":"d8b4aa78-704e-4376-8703-58ab17c1a170","alt":"ניקוי ריפודי רכב, תמונה 4 מתוך 4","position":"object-[center_42%]"}],"armchair-chair-cleaning":[{"versionId":"b35c01a0-a35b-4629-81cc-73eb5ebdd203","alt":"ניקוי כורסאות וכיסאות","position":"object-center"}],"delicate-upholstery-cleaning":[{"versionId":"d1000000-0000-4000-8000-000000000001","alt":"ניקוי ריפודים עדינים","position":"object-center"}],"air-conditioner-cleaning":[{"versionId":"b920443f-55c5-4b27-a232-154b3688320e","alt":"ניקוי מזגנים, תמונה 1 מתוך 3","position":"object-[center_38%]"},{"versionId":"ba7745a4-fe0c-44fb-913c-971aaef4f486","alt":"ניקוי מזגנים, תמונה 2 מתוך 3","position":"object-[center_38%]"},{"versionId":"9c3e4c0f-d64b-47c7-9fb4-8f643af949a2","alt":"ניקוי מזגנים, תמונה 3 מתוך 3","position":"object-[center_38%]"}],"window-cleaning":[],"post-renovation-cleaning":[{"versionId":"ca9fda4c-f970-46f6-91cb-6a0347a76002","alt":"ניקיון אחרי שיפוץ ולפני אכלוס, תמונה 1 מתוך 4","position":"object-[center_55%]"},{"versionId":"e69df7e0-b215-4a91-981f-5383bb821adc","alt":"ניקיון אחרי שיפוץ ולפני אכלוס, תמונה 2 מתוך 4","position":"object-[center_55%]"},{"versionId":"67ae7454-b978-48ea-86db-632bbcd32bff","alt":"ניקיון אחרי שיפוץ ולפני אכלוס, תמונה 3 מתוך 4","position":"object-[center_55%]"},{"versionId":"5ddf16ba-4089-4454-9ab1-5161bf191ec3","alt":"ניקיון אחרי שיפוץ ולפני אכלוס, תמונה 4 מתוך 4","position":"object-[center_55%]"}],"mini-central-air-conditioner-cleaning":[{"versionId":"b920443f-55c5-4b27-a232-154b3688320e","alt":"תיעוד ניקוי מזגן מתוך עבודות CleanBrothers — תמונת המחשה, לא מזגן מיני מרכזי","position":"object-center"}]}'::jsonb; $$;

select public.cms_import_special_media();
select public.cms_import_shared_baseline('mini-central-air-conditioner-cleaning', $baseline${"schemaVersion":3,"publicTitle":"ניקוי מזגן מיני מרכזי","h1":"ניקוי מזגן מיני מרכזי","eyebrow":"CleanBrothers • ניקוי מזגנים","intro":"רוצים לבדוק אפשרות לניקוי המזגן המיני מרכזי בבית? שלחו לנו תמונות ופרטים על המערכת. נבדוק את המבנה ואת הגישה לחלקים לפני שנאשר התאמה ונקבע את היקף הניקוי.","imageAlt":"תיעוד ניקוי מזגן מתוך עבודות CleanBrothers — תמונת המחשה, לא מזגן מיני מרכזי","signsTitle":"מה כולל השירות ומה בודקים לפני שמתחילים?","signsDescription":"שירות ניקוי המזגנים הקיים מתמקד בחלקים הנגישים לניקוי מקצועי. במערכת מיני מרכזית יש לבדוק תחילה אם המבנה והגישה מתאימים. פירוט העבודה ייקבע לאחר הבדיקה; ניקוי תעלות אינו כלול.","processTitle":"כך מתאמים בדיקה וניקוי","processDescription":"מתחילים במידע ותמונות, ומתקדמים לתיאום רק לאחר בדיקת התאמה. העבודה בפועל מותאמת למערכת ולגישה שאושרו.","benefitsDescription":"התיאום מראש מאפשר להבין מה אפשר לנקות במערכת שלכם ולקבל הסבר על היקף העבודה לפני קביעת ביקור.","resultDescription":"בגלריה מוצג תיעוד קיים של עבודות ניקוי מזגנים. אין בפרויקט תיעוד מזוהה של ניקוי מיני מרכזי, ולכן התמונות מוצגות להמחשה בלבד.","seoTitle":"ניקוי מזגן מיני מרכזי | בדיקת התאמה ותיאום | CleanBrothers","seoDescription":"ניקוי מזגן מיני מרכזי בהתאם למבנה ולגישה ליחידה. שלחו תמונות ופרטי המזגן ל-CleanBrothers לבדיקת התאמה ולהערכת מחיר. השירות אינו כולל ניקוי תעלות.","images":["b920443f-55c5-4b27-a232-154b3688320e"],"signs":["סוג המזגן והדגם","מבנה היחידה והגישה אליה","מצב הלכלוך בחלקים הנגישים","תמונות עדכניות של המערכת","תיאום היקף הניקוי לפני הביקור"],"process":["שולחים תמונות, דגם ויישוב בוואטסאפ או משאירים פרטים","בודקים את המבנה והנגישות ומסכמים היקף והערכת מחיר","מתאמים ביקור ומוודאים את התנאים בשטח","מנקים את החלקים הנגישים בהתאם להיקף שסוכם"],"benefits":["בדיקת התאמה לפי המערכת שלכם","התייחסות למבנה ולנגישות","היקף עבודה מוסכם מראש","הערכת מחיר לפי פרטי המזגן","פנייה נוחה בטופס או בוואטסאפ"],"faqs":[{"question":"האם כל מזגן מיני מרכזי מתאים לניקוי?","answer":"ההתאמה תלויה במבנה המזגן ובגישה לחלקים. שלחו תמונות ודגם כדי שנוכל לבדוק אם המערכת מתאימה לשירות הניקוי שלנו."},{"question":"האם השירות כולל ניקוי תעלות?","answer":"לא. העמוד מתייחס לבדיקת התאמה לניקוי חלקי המזגן הנגישים. ניקוי תעלות אינו כלול בהיקף השירות המתואר כאן."},{"question":"מה צריך לשלוח לפני התיאום?","answer":"שלחו תמונות של המזגן ושל הגישה ליחידה, ציינו את הדגם אם הוא ידוע ואת היישוב שבו נדרש השירות."},{"question":"איך נקבע המחיר?","answer":"הערכת המחיר ניתנת לפי סוג המזגן, מצב הלכלוך והנגישות. נבדוק את הפרטים ונבהיר את ההיקף לפני תיאום העבודה."},{"question":"האם הניקוי מתקן תקלות במזגן?","answer":"ניקוי אינו תיקון תקלה ואינו מבטיח שינוי בביצועי המזגן. במקרה של בעיית קירור, נזילה חריגה, רעש או בעיית חשמל, ייתכן שתידרש בדיקה של טכנאי מזגנים."}],"relatedLinks":[],"pageCopy":{"heroCta":"קבלת בדיקת התאמה והצעת מחיר","whatsappCta":"שלחו תמונה של המזגן","imageCaption":"תיעוד ניקוי מזגנים מהשטח — להמחשה","signsEyebrow":"סקירת השירות","processEyebrow":"תיאום ובדיקת התאמה","benefitsTitle":"למה לתאם עם CleanBrothers?","resultEyebrow":"תיעוד עבודות","resultTitle":"ניקוי מזגנים בעבודות קודמות","resultHeading":"תמונות אמיתיות של ניקוי מזגנים","resultNote":"התמונות הן מתיעוד ניקוי מזגנים קיים ואינן תיעוד של ניקוי מיני מרכזי. היקף השירות למערכת שלכם ייבדק בנפרד.","galleryCta":"לגלריית העבודות","faqTitle":"מה כדאי לדעת לפני תיאום ניקוי מיני מרכזי?","contactEyebrow":"בדיקת התאמה לניקוי מזגן מיני מרכזי","contactTitle":"שלחו פרטים ותמונה לתיאום","contactDescription":"ציינו את היישוב, סוג המזגן והגישה ליחידה. נחזור אליכם לבדיקת התאמה ולהערכת מחיר לפני תיאום העבודה.","contactWhatsappCta":"שלחו תמונות לבדיקת התאמה"}}$baseline$::jsonb);

create or replace function public.cms_page_target(v jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
begin
 if v->>'kind'='internal' then
  return public.cms_page_keys(v,array['kind','path']) and v->>'path'=any(array[
   '/','/about','/services','/contact','/gallery','/sofa-cleaning','/mattress-cleaning',
   '/carpet-cleaning','/delicate-upholstery-cleaning','/car-upholstery-cleaning',
   '/armchair-chair-cleaning','/air-conditioner-cleaning','/window-cleaning','/mini-central-air-conditioner-cleaning','/post-renovation-cleaning']);
 elsif v->>'kind'='phone' then return public.cms_page_keys(v,array['kind']);
 elsif v->>'kind'='whatsapp' then
  return public.cms_page_keys(v,array['kind','message']) and public.cms_page_plain(v->'message',300);
 end if;
 return false;
exception when others then return false;
end;$$;
create or replace function public.cms_site_target(v jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
begin
  if v->>'kind'='static' then
    return public.cms_page_keys(v,array['kind','path']) and
      v->>'path'=any(array['/','/services','/gallery','/about','/contact']);
  elsif v->>'kind'='service' then
    return public.cms_page_keys(v,array['kind','key']) and
      v->>'key'=any(array['sofa-cleaning','mattress-cleaning','carpet-cleaning',
        'car-upholstery-cleaning','armchair-chair-cleaning','delicate-upholstery-cleaning',
        'air-conditioner-cleaning','window-cleaning','post-renovation-cleaning','mini-central-air-conditioner-cleaning']);
  elsif v->>'kind'='page' then
    return public.cms_page_keys(v,array['kind','id']) and
      v->>'id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  end if;
  return false;
exception when others then return false;
end; $$;
create or replace function public.cms_valid_site_payload(kind text,p jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; seen text[]:=array[]::text[]; n integer; i integer:=0; key text;
begin
  if kind='settings' then
    if not public.cms_page_keys(p,array['schemaVersion','businessName','phoneDisplay','email',
      'serviceAreas','structuredDescription']) or p->'schemaVersion'<>'9'::jsonb or
      not public.cms_page_plain(p->'businessName',120) or
      not public.cms_page_plain(p->'phoneDisplay',30) or
      regexp_replace(p->>'phoneDisplay','[^0-9]','','g')<>'0559577731' or
      not public.cms_page_plain(p->'email',254) or
      p->>'email' !~ '^[^[:space:]@/?#]+@[^[:space:]@/?#]+\.[^[:space:]@/?#]+$' or
      not public.cms_page_plain(p->'structuredDescription',500) or
      jsonb_typeof(p->'serviceAreas')<>'array' or
      jsonb_array_length(p->'serviceAreas') not between 1 and 20 then return false; end if;
    for item in select value from jsonb_array_elements(p->'serviceAreas') loop
      if not public.cms_page_plain(item,80) or item#>>'{}'=any(seen) then return false; end if;
      seen:=array_append(seen,item#>>'{}');
    end loop;
    return true;
  elsif kind='navigation' then
    if not public.cms_page_keys(p,array['schemaVersion','items']) or
      p->'schemaVersion'<>'10'::jsonb or jsonb_typeof(p->'items')<>'array' or
      jsonb_array_length(p->'items') not between 1 and 20 then return false; end if;
    for item in select value from jsonb_array_elements(p->'items') loop
      if not public.cms_page_keys(item,array['id','order','label','visible','target']) or
        item->>'id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or
        item->>'id'=any(seen) or item->'order'<>to_jsonb(i) or
        not public.cms_page_plain(item->'label',80) or
        jsonb_typeof(item->'visible')<>'boolean' or
        not public.cms_site_target(item->'target') then return false; end if;
      seen:=array_append(seen,item->>'id'); i:=i+1;
    end loop;
    return true;
  elsif kind='footer' then
    if not public.cms_page_keys(p,array['schemaVersion','description','featuredServices','legal',
      'copyright','tagline','whatsappCtaLabel']) or p->'schemaVersion'<>'11'::jsonb or
      not public.cms_page_plain(p->'description',500) or
      not public.cms_page_plain(p->'copyright',120) or
      not public.cms_page_plain(p->'tagline',120) or
      not public.cms_page_plain(p->'whatsappCtaLabel',120) or
      jsonb_typeof(p->'featuredServices')<>'array' or
      jsonb_array_length(p->'featuredServices') not between 1 and 8 or
      jsonb_typeof(p->'legal')<>'array' or jsonb_array_length(p->'legal')<>3 then return false; end if;
    for item in select value from jsonb_array_elements(p->'featuredServices') loop
      key:=item#>>'{}';
      if jsonb_typeof(item)<>'string' or key=any(seen) or key<>all(array[
        'sofa-cleaning','mattress-cleaning','carpet-cleaning','car-upholstery-cleaning',
        'armchair-chair-cleaning','delicate-upholstery-cleaning','air-conditioner-cleaning',
        'window-cleaning','post-renovation-cleaning','mini-central-air-conditioner-cleaning']) then return false; end if;
      seen:=array_append(seen,key);
    end loop;
    seen:=array[]::text[];
    for item in select value from jsonb_array_elements(p->'legal') loop
      key:=item->>'path';
      if not public.cms_page_keys(item,array['path','order','label','visible']) or
        key<>all(array['/privacy-policy','/data-deletion','/accessibility-statement']) or
        key=any(seen) or item->'order'<>to_jsonb(i) or
        not public.cms_page_plain(item->'label',80) or
        jsonb_typeof(item->'visible')<>'boolean' then return false; end if;
      seen:=array_append(seen,key); i:=i+1;
    end loop;
    return true;
  end if;
  return false;
exception when others then return false;
end; $$;
create or replace function public.cms_valid_campaign_placement(value text)
returns boolean language sql immutable set search_path='' as $$
  select value = any(array[
    'global:site','home:home','page:about','page:services',
    'service:delicate-upholstery-cleaning','service:sofa-cleaning','service:mattress-cleaning',
    'service:carpet-cleaning','service:car-upholstery-cleaning','service:armchair-chair-cleaning',
    'service:air-conditioner-cleaning','service:window-cleaning','service:post-renovation-cleaning','service:mini-central-air-conditioner-cleaning']);
$$;
create or replace function public.cms_read_public_manual_campaign(public_path text)
returns jsonb language sql stable security definer set search_path='' as $$
  with requested as (select case public_path
    when '/' then 'home:home' when '/about' then 'page:about'
    when '/services' then 'page:services'
    when '/contact' then 'global:site' when '/gallery' then 'global:site'
    when '/privacy-policy' then 'global:site'
    when '/accessibility-statement' then 'global:site'
    when '/data-deletion' then 'global:site'
    when '/delicate-upholstery-cleaning' then 'service:delicate-upholstery-cleaning'
    when '/sofa-cleaning' then 'service:sofa-cleaning'
    when '/mattress-cleaning' then 'service:mattress-cleaning'
    when '/carpet-cleaning' then 'service:carpet-cleaning'
    when '/car-upholstery-cleaning' then 'service:car-upholstery-cleaning'
    when '/armchair-chair-cleaning' then 'service:armchair-chair-cleaning'
    when '/air-conditioner-cleaning' then 'service:air-conditioner-cleaning'
    when '/window-cleaning' then 'service:window-cleaning'
    when '/mini-central-air-conditioner-cleaning' then 'service:mini-central-air-conditioner-cleaning'
    when '/post-renovation-cleaning' then 'service:post-renovation-cleaning'
    else null end as slot),
  candidates as (
    select a.placement,a.document_id,a.revision_id,'manual'::text as source
      from public.cms_manual_campaign_placements a
    union all
    select a.placement_kind||':'||a.target_key,s.promotion_document_id,a.promotion_revision_id,'scheduled'::text
      from public.cms_active_promotion_placements a
      join public.cms_promotion_schedules s on s.id=a.schedule_id and s.status='active'
        and s.promotion_revision_id=a.promotion_revision_id
      where s.starts_at <= now() and (s.ends_at is null or s.ends_at > now())
  ),
  chosen as (select a.*,r.id as valid_revision,c.campaign_config from candidates a
    join public.content_documents d on d.id=a.document_id and d.content_type='promotion'
    join public.cms_promotion_identity i on i.document_id=d.id and i.status='active'
    join public.content_publication_state st on st.document_id=d.id
    join public.content_revisions r on r.id=a.revision_id and r.document_id=d.id and r.schema_version=7
    join public.cms_manual_campaign_revisions c on c.revision_id=r.id
    cross join requested q
    where q.slot is not null and a.placement in (q.slot,'global:site')
      and d.content_key like 'campaign-%' and c.campaign_config->'enabled'='true'::jsonb
      and public.cms_valid_campaign_payload(c.campaign_config)
      and (a.source='scheduled' or st.published_revision_id=r.id)
      and exists(select 1 from public.content_publication_events e where e.document_id=d.id
        and e.revision_id=r.id and e.kind='publish')
    order by case when a.placement=q.slot then 0 else 1 end,
      case when a.source='manual' then 0 else 1 end limit 1)
  select jsonb_build_object('revisionId',r.id,'campaign',jsonb_build_object(
      'enabled',c.campaign_config->'enabled','displayMode',c.campaign_config->'displayMode',
      'badgeText',c.campaign_config->'badgeText','h1',c.campaign_config->'h1',
      'showPrice',c.campaign_config->'showPrice','currentPrice',c.campaign_config->'currentPrice',
      'oldPrice',c.campaign_config->'oldPrice','currency',c.campaign_config->'currency',
      'benefitText',c.campaign_config->'benefitText','description',c.campaign_config->'description',
      'cta',c.campaign_config->'cta','terms',c.campaign_config->'terms',
      'delaySeconds',c.campaign_config->'delaySeconds','frequency',c.campaign_config->'frequency'))
    from chosen a join public.content_revisions r on r.id=a.valid_revision
    join public.cms_manual_campaign_revisions c on c.revision_id=r.id;
$$;

alter table public.revision_media_refs drop constraint revision_media_refs_usage_role_check;
alter table public.revision_media_refs add constraint revision_media_refs_usage_role_check check(
  usage_role in ('hero','benefits','result','before','after','gallery','seo','page-hero','page-image','promotion',
    'home-hero','home-before','home-after') or usage_role in (
    'home-service:sofa-cleaning','home-service:mattress-cleaning','home-service:carpet-cleaning',
    'home-service:car-upholstery-cleaning','home-service:air-conditioner-cleaning','home-service:window-cleaning',
    'home-service:armchair-chair-cleaning','home-service:delicate-upholstery-cleaning','home-service:post-renovation-cleaning','home-service:mini-central-air-conditioner-cleaning'));

-- Create immutable homepage successors with the tenth collection.
alter table public.revision_media_refs disable trigger revision_media_scope;
alter table public.page_revision_blocks disable trigger page_promotion_media_scope;
alter table public.content_publication_state disable trigger publication_media_scope;
do $$
declare state public.content_publication_state; source public.content_revisions; old uuid; new_id uuid;
 new_published uuid; new_draft uuid; audience integer; collections jsonb; published_collections jsonb; draft_collections jsonb; blocks jsonb; next_number integer;
begin
 select s.* into state from public.content_publication_state s join public.content_documents d on d.id=s.document_id where d.content_key='home' and d.content_type='page' for update of s;
 if not found then return; end if;
 if (select count(*) from public.cms_service_image_collections where revision_id=state.draft_revision_id)=10 and
    (select count(*) from public.cms_service_image_collections where revision_id=state.published_revision_id)=10 then return; end if;
 perform public.cms_import_home_media();
 published_collections:=public.cms_service_images_for_revision(state.published_revision_id,'published');
 draft_collections:=public.cms_service_images_for_revision(state.draft_revision_id,'draft');
 new_published:=state.published_revision_id; new_draft:=state.draft_revision_id;
 for audience in 0..1 loop
  old:=case when audience=0 then state.published_revision_id else state.draft_revision_id end;
  collections:=case when audience=0 then published_collections else draft_collections end;
  if audience=1 and old=state.published_revision_id and collections=published_collections then new_draft:=new_published; continue; end if;
  if (select count(*) from public.cms_service_image_collections where revision_id=old)=10 then continue; end if;
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

commit;
