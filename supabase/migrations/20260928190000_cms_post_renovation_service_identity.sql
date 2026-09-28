begin;
-- Extend the exact shared-service and scheduled-placement identities only.
-- Historical service IDs, scheduler execution and public projection stay unchanged.
create or replace function public.cms_shared_service_id(k text) returns uuid language sql immutable set search_path='' as $$ select case k when 'sofa-cleaning' then '9aef51c5-1851-4c76-8816-2242abd80a3f'::uuid when 'mattress-cleaning' then '78ae8483-c8d3-4b25-8e62-e15cb3aba3a4'::uuid when 'carpet-cleaning' then '7c563896-cf12-4aa7-82a2-1a17bd40cf04'::uuid when 'car-upholstery-cleaning' then 'e28e9966-82c8-45ce-8d85-266ef6c6643c'::uuid when 'armchair-chair-cleaning' then '8896b193-728e-4284-8196-198a95081d7c'::uuid when 'delicate-upholstery-cleaning' then 'c0000000-0000-4000-8000-000000000001'::uuid when 'air-conditioner-cleaning' then '2185a776-4440-4728-af2c-909d17994241'::uuid when 'window-cleaning' then 'f05f10a0-b576-4625-8eb2-8abc5a0a1ae6'::uuid when 'post-renovation-cleaning' then '46bf0306-f3a9-487e-9a45-3ab3f6fcb3f8'::uuid end; $$;

-- Immutable reviewed media bytes for the new service; existing entries retain their identities.
create or replace function public.cms_static_media_inventory() returns jsonb language sql immutable set search_path='' as $$ select '[
  {
    "path": "/images/services/sofa-cleaning.png",
    "assetId": "7828fc91-9bb4-48b5-84ae-045b3051fc5c",
    "versionId": "76906e25-9adc-44a4-8ada-7851d1ba3b6c",
    "byteSize": 2592172,
    "width": 1086,
    "height": 1448,
    "hash": "fc3c0c991c63941bbb9dfe546e8514df20d85ba7401588acf6976e59460355cb",
    "mime": "image/png",
    "alt": "ניקוי ספת בד בבית הלקוח על ידי CleanBrothers"
  },
  {
    "path": "/images/services/sofa-cleaning2.png",
    "assetId": "25dabcc9-8258-4969-8a91-562bd7f929c3",
    "versionId": "c228e26c-817b-4c17-82eb-8d61ebba1040",
    "byteSize": 2809674,
    "width": 1448,
    "height": 1086,
    "hash": "9758eb6ae61de45a205aa3c3033a71d3936ba128e2124ca42dac4c18f2161672",
    "mime": "image/png",
    "alt": "ניקוי ספת בד בבית הלקוח על ידי CleanBrothers"
  },
  {
    "path": "/images/services/sofa-cleaning5.png",
    "assetId": "fc0d8e6a-4eb2-4bf2-89f2-2bbc8109dade",
    "versionId": "f968f4a0-eec7-45dd-82d0-06828378c0ec",
    "byteSize": 2381345,
    "width": 1086,
    "height": 1448,
    "hash": "a3c7e8d0e4966135c511b12674542a03bb7b8550805e0e902ea16ac6795e7216",
    "mime": "image/png",
    "alt": "ניקוי ספת בד בבית הלקוח על ידי CleanBrothers"
  },
  {
    "path": "/images/services/sofa-cleaning6.png",
    "assetId": "2ec9eb5a-6171-4ab9-871e-dda0080b9676",
    "versionId": "8c65dad3-abcf-4436-8315-e5474954ee65",
    "byteSize": 2514735,
    "width": 1448,
    "height": 1086,
    "hash": "220730dac641baec7f5ab5dc1683ec5e97ce8c944821273d65536c361776e20c",
    "mime": "image/png",
    "alt": "ניקוי ספת בד בבית הלקוח על ידי CleanBrothers"
  },
  {
    "path": "/images/before-after/sofa-before.png",
    "assetId": "94ecd402-2932-47b7-82df-54131eca5f6e",
    "versionId": "ab17154b-cd58-4bb4-8c08-853572cab35d",
    "byteSize": 2205323,
    "width": 1448,
    "height": 1086,
    "hash": "6ca5515316bb42182fbd108cffb13bf02774d80dbc744995aff4a7d8a118421c",
    "mime": "image/png",
    "alt": "ניקוי ספת בד בבית הלקוח על ידי CleanBrothers"
  },
  {
    "path": "/images/before-after/sofa-after.png",
    "assetId": "9ff8b4ac-ec75-4286-8bab-4492e2ed97a0",
    "versionId": "76525560-4963-4f9a-8688-b54c53d85582",
    "byteSize": 2282912,
    "width": 2048,
    "height": 1536,
    "hash": "936b2e0ac675668013ca4e87b279a07fa0ffa4923c47ef330a96c096d30e8eff",
    "mime": "image/png",
    "alt": "ניקוי ספת בד בבית הלקוח על ידי CleanBrothers"
  },
  {
    "path": "/images/services/mattress-cleaning.jpeg",
    "assetId": "b469ec24-43bd-471b-863a-b879b0da800f",
    "versionId": "1733a278-1a4c-4230-860d-0db0e62cc57a",
    "byteSize": 172712,
    "width": 1600,
    "height": 1200,
    "hash": "9082f12a7c8d425a23f6a5e7812a719e412b91f790bee4b4d731efd747dac931",
    "mime": "image/jpeg",
    "alt": "ניקוי מזרן בבית הלקוח על ידי CleanBrothers"
  },
  {
    "path": "/images/before-after/mattress-before.jpeg",
    "assetId": "022b5768-edea-42fe-8823-f6514285e710",
    "versionId": "2cfbbd9b-ef83-4c38-86ec-d214e1334c03",
    "byteSize": 203079,
    "width": 1086,
    "height": 1448,
    "hash": "a5909e2596ba6385c4cacc87ff0275640fdda14b5ae675353ba59060b3e2619a",
    "mime": "image/jpeg",
    "alt": "ניקוי מזרן בבית הלקוח על ידי CleanBrothers"
  },
  {
    "path": "/images/before-after/mattress-after.jpeg",
    "assetId": "a009a352-6972-4948-873e-f20206114daa",
    "versionId": "962403d6-0560-4a6f-8c32-3b1aa682b02e",
    "byteSize": 314251,
    "width": 1536,
    "height": 2048,
    "hash": "beda83d296ab13b8651e3aa22efb794ed1eb2ec70bf492f9c5565d0ada03873e",
    "mime": "image/jpeg",
    "alt": "ניקוי מזרן בבית הלקוח על ידי CleanBrothers"
  },
  {
    "path": "/images/services/carpet-cleaning.jpeg",
    "assetId": "98bdec66-2927-4a90-8b48-9040a3d7d116",
    "versionId": "bfaa5d53-8085-4fd4-826a-69b9a18ace18",
    "byteSize": 2564509,
    "width": 4032,
    "height": 3024,
    "hash": "2fb30854f6b088a2bb43f61a9cf1e72373b79fcf9cbc1d14f12acec263ae1d9b",
    "mime": "image/jpeg",
    "alt": "ניקוי שטיח ביתי על ידי CleanBrothers"
  },
  {
    "path": "/images/before-after/carpet-before.jpeg",
    "assetId": "9693b056-0723-4a89-8bb2-f66c2fffe4e6",
    "versionId": "c42d3ea6-5164-4b43-83bb-f2c984a77781",
    "byteSize": 278180,
    "width": 1085,
    "height": 1450,
    "hash": "7bdf91d0008cb010fe5e22b5ef50376e5da41da8fd61c988a7ca28b6a44f62fe",
    "mime": "image/jpeg",
    "alt": "ניקוי שטיח ביתי על ידי CleanBrothers"
  },
  {
    "path": "/images/before-after/carpet-after.jpeg",
    "assetId": "f7e81670-37cd-4fd3-8e2e-d89267a99a79",
    "versionId": "61c99705-f82e-4740-8262-f3d96ff5de17",
    "byteSize": 633122,
    "width": 1536,
    "height": 2048,
    "hash": "072b45534140aed215094d9e42895ff1907c77e49d74671744e49c8dd7674d31",
    "mime": "image/jpeg",
    "alt": "ניקוי שטיח ביתי על ידי CleanBrothers"
  },
  {
    "path": "/images/services/car-upholstery-cleaning.jpg",
    "assetId": "913abe2d-b542-4f7c-84c5-03d4bf1c970c",
    "versionId": "76859201-9b22-42b3-8bd9-01a53b71d664",
    "byteSize": 2201932,
    "width": 4284,
    "height": 5712,
    "hash": "c724ea9e56926de0347315b554998537803fd65a09977e6bf27f0a4f5a93f2a9",
    "mime": "image/jpeg",
    "alt": "ניקוי מושבי בד ברכב על ידי CleanBrothers"
  },
  {
    "path": "/images/services/car-upholstery-cleaning2.jpg",
    "assetId": "5f43cb4a-f746-44ec-8fe8-b94d804c8b43",
    "versionId": "9b24cc14-a3ee-4a67-8f74-0c5603cd4944",
    "byteSize": 2432106,
    "width": 4284,
    "height": 5712,
    "hash": "b9f6e3e516029f1aaa6a922e81c6086cd84f9647565b23841afb1d36e30c7cfa",
    "mime": "image/jpeg",
    "alt": "ניקוי מושבי בד ברכב על ידי CleanBrothers"
  },
  {
    "path": "/images/services/car-upholstery-cleaning3.jpg",
    "assetId": "f6d531a5-ddb2-4b2a-877b-792937e69c71",
    "versionId": "d41775e4-f694-4ee1-8de5-05133e9d5502",
    "byteSize": 1822245,
    "width": 4032,
    "height": 3024,
    "hash": "c723ef033c6856e08fdd10d67e98d0b45128583365bc019a1e87a53c17730333",
    "mime": "image/jpeg",
    "alt": "ניקוי מושבי בד ברכב על ידי CleanBrothers"
  },
  {
    "path": "/images/services/car-upholstery-cleaning4.jpg",
    "assetId": "01423af1-3e58-4afb-8297-73b6876f7bcc",
    "versionId": "d8b4aa78-704e-4376-8703-58ab17c1a170",
    "byteSize": 2021415,
    "width": 4032,
    "height": 3024,
    "hash": "68dae5238eaf90fa39371dfa53cbb130fed3f8d8ca0c8a7c2f6d3b5402e249c2",
    "mime": "image/jpeg",
    "alt": "ניקוי מושבי בד ברכב על ידי CleanBrothers"
  },
  {
    "path": "/images/before-after/car-before.jpeg",
    "assetId": "85a3fe69-6272-4c4e-84b8-a842c64aa79b",
    "versionId": "815e8a13-732c-4ebf-8a77-a7e56bc89e5c",
    "byteSize": 316019,
    "width": 1200,
    "height": 1600,
    "hash": "c9061514907d2264e695da1afd7f89918f90bfed00a05f8f0b62ec1c34dc8e85",
    "mime": "image/jpeg",
    "alt": "ניקוי מושבי בד ברכב על ידי CleanBrothers"
  },
  {
    "path": "/images/before-after/car-after.jpeg",
    "assetId": "ea8b52cc-6b1c-441b-86a1-0afa884bb522",
    "versionId": "0b3a20c5-1f92-4aa2-8a0e-949bd6a7301c",
    "byteSize": 213531,
    "width": 1086,
    "height": 1448,
    "hash": "cbb0e503d8d56e553473f1aa20624cb4092c0bac4c0092bc3aea49872714fdc2",
    "mime": "image/jpeg",
    "alt": "ניקוי מושבי בד ברכב על ידי CleanBrothers"
  },
  {
    "path": "/images/services/armchair-chair-cleaning.jpeg",
    "assetId": "64cf73e3-6578-48e2-8d7a-e0183e61a2cb",
    "versionId": "b35c01a0-a35b-4629-81cc-73eb5ebdd203",
    "byteSize": 205361,
    "width": 1600,
    "height": 1200,
    "hash": "0ebe7d7b2bf6926e37b962f773da91bdd89aa53346e2d52907d13e9f5c8369c6",
    "mime": "image/jpeg",
    "alt": "ניקוי כורסאות וכיסאות מרופדים על ידי CleanBrothers"
  },
  {
    "path": "/images/services/delicate-upholstery-cleaning.jpeg",
    "assetId": "d0000000-0000-4000-8000-000000000001",
    "versionId": "d1000000-0000-4000-8000-000000000001",
    "byteSize": 132211,
    "width": 1600,
    "height": 1200,
    "hash": "b1420c216c60afec56597ccba27c5cabd2ee44f54a2904ac1b7824225e696107",
    "mime": "image/jpeg",
    "alt": "ניקוי מבוקר של ריפוד עדין על ידי CleanBrothers"
  },
  {
    "path": "/images/services/post-renovation-cleaning-1.png",
    "assetId": "92f17336-cf2c-4185-bd29-a41d486cb8c9",
    "versionId": "e69df7e0-b215-4a91-981f-5383bb821adc",
    "byteSize": 3776767,
    "width": 1086,
    "height": 1448,
    "hash": "111ff909dd760275a74da1f3f15f2fe38edaad269bad6b3111b6448e69ac095a",
    "mime": "image/png",
    "alt": "עובד CleanBrothers מפעיל מכונת ניקוי רצפה במטבח דירה במהלך שיפוץ"
  },
  {
    "path": "/images/services/post-renovation-cleaning-2.png",
    "assetId": "323c6cce-19c2-4f71-a31c-2d2a8f6f928f",
    "versionId": "5ddf16ba-4089-4454-9ab1-5161bf191ec3",
    "byteSize": 3543475,
    "width": 1086,
    "height": 1448,
    "hash": "d7b4804988e6f2fc4b2b4f61bc56fe0f88bbcc23e00ab3a6ad05d736be4cf94f",
    "mime": "image/png",
    "alt": "עובד CleanBrothers מנקה רצפה ליד ריהוט מוגן בדירה במהלך שיפוץ"
  },
  {
    "path": "/images/services/post-renovation-cleaning-3.png",
    "assetId": "ca6f49b2-06ad-4bcf-b9aa-0382bab86a10",
    "versionId": "67ae7454-b978-48ea-86db-632bbcd32bff",
    "byteSize": 3481627,
    "width": 1086,
    "height": 1448,
    "hash": "b7ff910f3b40099732f367444f5090957fa0e3ec8da1859a2ea5e31bee4bac20",
    "mime": "image/png",
    "alt": "עובד CleanBrothers מפעיל מכונת ניקוי רצפה בחלל דירה במהלך שיפוץ"
  },
  {
    "path": "/images/services/post-renovation-cleaning-4.png",
    "assetId": "ff57ce67-f1b9-49dc-904f-6ea8888d84b1",
    "versionId": "ca9fda4c-f970-46f6-91cb-6a0347a76002",
    "byteSize": 3558064,
    "width": 1086,
    "height": 1448,
    "hash": "f4dd902d24f540c3298b02c53d43e242c143e656509a7f767ae6e67506b886b3",
    "mime": "image/png",
    "alt": "עובד CleanBrothers מנקה רצפה במכונה ליד חלון בדירה במהלך שיפוץ"
  }
]'::jsonb; $$;

-- Existing CHECK expressions call cms_shared_service_id; they remain narrow.
-- Widen only the explicit placement target set, preserving all old targets.
alter table public.cms_promotion_schedule_placements
  drop constraint cms_promotion_schedule_placements_check;
alter table public.cms_promotion_schedule_placements
  add constraint cms_promotion_schedule_placements_check check (
    (placement_kind = 'home' and target_key = 'home') or
    (placement_kind = 'global' and target_key = 'site') or
    (placement_kind = 'service' and target_key in
      ('delicate-upholstery-cleaning','sofa-cleaning','mattress-cleaning','carpet-cleaning',
       'car-upholstery-cleaning','armchair-chair-cleaning','air-conditioner-cleaning','window-cleaning',
       'post-renovation-cleaning'))
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
        'air-conditioner-cleaning','window-cleaning','post-renovation-cleaning') and exists (
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
         'car-upholstery-cleaning','armchair-chair-cleaning','air-conditioner-cleaning','window-cleaning','post-renovation-cleaning')))
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

-- Reserve the public service slug at both the SQL validator and route-ownership layers.
create or replace function public.cms_new_page_slug(value text)
returns boolean language sql immutable set search_path='' as $$
  select coalesce(length(value) between 3 and 64 and value ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and
    value <> all(array['admin','api','_next','cms-media','services','gallery','about','contact',
      'privacy-policy','accessibility-statement','data-deletion','robots','sitemap',
      'icon','apple-icon','favicon','manifest','opengraph-image','twitter-image',
      'sofa-cleaning','mattress-cleaning','carpet-cleaning','delicate-upholstery-cleaning',
      'car-upholstery-cleaning','armchair-chair-cleaning','air-conditioner-cleaning','window-cleaning','post-renovation-cleaning']),false);
$$;
insert into public.cms_page_routes(slug,kind) values ('post-renovation-cleaning','service');

-- Extend typed links and home service cards for the now-routable service.
-- Existing item-count limits, ownership and EXECUTE grants are preserved.
create or replace function public.cms_page_target(v jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
begin
 if v->>'kind'='internal' then
  return public.cms_page_keys(v,array['kind','path']) and v->>'path'=any(array[
   '/','/about','/services','/contact','/gallery','/sofa-cleaning','/mattress-cleaning',
   '/carpet-cleaning','/delicate-upholstery-cleaning','/car-upholstery-cleaning',
   '/armchair-chair-cleaning','/air-conditioner-cleaning','/window-cleaning','/post-renovation-cleaning']);
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
        'air-conditioner-cleaning','window-cleaning','post-renovation-cleaning']);
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
        'window-cleaning','post-renovation-cleaning']) then return false; end if;
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
        not public.cms_page_keys(item,array['title','benefit','description']) or
        not public.cms_home_text_fields(item,array['title','benefit','description']) then return false; end if;
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
commit;
