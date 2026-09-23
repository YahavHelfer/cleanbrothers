begin;
-- Phase 2C1, local only. Forward migration; no existing revision is rewritten.


create function public.cms_shared_service_id(k text) returns uuid language sql immutable set search_path='' as $$ select case k when 'sofa-cleaning' then '9aef51c5-1851-4c76-8816-2242abd80a3f'::uuid when 'mattress-cleaning' then '78ae8483-c8d3-4b25-8e62-e15cb3aba3a4'::uuid when 'carpet-cleaning' then '7c563896-cf12-4aa7-82a2-1a17bd40cf04'::uuid when 'car-upholstery-cleaning' then 'e28e9966-82c8-45ce-8d85-266ef6c6643c'::uuid when 'armchair-chair-cleaning' then '8896b193-728e-4284-8196-198a95081d7c'::uuid when 'delicate-upholstery-cleaning' then 'c0000000-0000-4000-8000-000000000001'::uuid end; $$;

create function public.cms_static_media_inventory() returns jsonb language sql immutable set search_path='' as $$ select '[
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
  }
]'::jsonb; $$;

create function public.cms_valid_service_payload(k text,p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; pair jsonb; name text; val jsonb; allowed text[]:=array['object-center','object-[center_48%]','object-[58%_center]','object-[52%_center]','object-[center_42%]'];
begin
 if public.cms_shared_service_id(k) is null or p is null then return false;end if;
 if p->'schemaVersion' is distinct from '3'::jsonb then return k='delicate-upholstery-cleaning' and public.cms_valid_pilot_payload(p);end if;
 if not public.cms_valid_pilot_payload((p-array['beforeAfter','imagePosition','imagePositions'])||'{"schemaVersion":2,"relatedLinks":[]}'::jsonb) then return false;end if;
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
 return true;
exception when others then return false;end;$$;
alter table public.content_documents drop constraint content_documents_content_key_check;
alter table public.content_documents add constraint content_documents_content_key_check check(public.cms_shared_service_id(content_key) is not null);
alter table public.content_revisions drop constraint content_revisions_schema_version_check;
alter table public.content_revisions add constraint content_revisions_schema_version_check check(schema_version in (1,2,3));
alter table public.content_revisions drop constraint content_revisions_payload_check;
create function public.cms_validate_service_revision() returns trigger language plpgsql set search_path='' as $$
declare k text;
begin
 select content_key into k from public.content_documents where id=new.document_id and content_type='service';
 if not public.cms_valid_service_payload(k,public.cms_revision_payload(new)) then raise exception using errcode='22023',message='Invalid CMS payload';end if;
 return new;
end;$$;
create trigger content_revision_validate before insert on public.content_revisions for each row execute function public.cms_validate_service_revision();

create function public.cms_valid_static_version(vid uuid,p text,h text,b integer,w integer,ht integer,m text) returns boolean language sql immutable set search_path='' as $$
 select exists(select 1 from jsonb_array_elements(public.cms_static_media_inventory()) e where e->>'versionId'=vid::text and e->>'path'=p and e->>'hash'=h and (e->>'byteSize')::integer=b and (e->>'width')::integer=w and (e->>'height')::integer=ht and e->>'mime'=m);
$$;
alter table public.media_versions drop constraint media_versions_check;
alter table public.media_versions add constraint media_versions_pixels_check check(storage_provider='static' or width::bigint*height<=16000000);
alter table public.media_versions drop constraint media_versions_storage_location_check;
alter table public.media_versions add constraint media_versions_storage_location_check check(
 (storage_provider='static' and storage_bucket is null and public.cms_valid_static_version(id,storage_path,content_hash,byte_size,width,height,mime_type)) or
 (storage_provider='local' and storage_bucket is null and storage_path=id::text||'.webp' and mime_type='image/webp') or
 (storage_provider='supabase' and storage_bucket='cms-media-preview' and storage_bucket is not null and storage_path=id::text||'.webp' and mime_type='image/webp' and byte_size<=4194304));
alter table public.revision_media_refs drop constraint revision_media_refs_usage_role_check;
alter table public.revision_media_refs add constraint revision_media_refs_usage_role_check check(usage_role in ('hero','benefits','result','before','after'));


create or replace function public.cms_attach_revision_media() returns trigger language plpgsql security definer set search_path='' as $$
declare vid uuid; idx integer; role_name text; alt text; cap text; a public.media_assets;
begin
 if new.source_revision_id is not null and exists(select 1 from public.revision_media_refs where revision_id=new.source_revision_id) then
   insert into public.revision_media_refs select new.id,media_version_id,usage_role,position,alt_text,caption from public.revision_media_refs where revision_id=new.source_revision_id;
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


create function public.cms_import_shared_media() returns integer language plpgsql security definer set search_path='' as $$
declare e jsonb; aid uuid; vid uuid;
begin
 perform pg_advisory_xact_lock(20260923,2);
 perform public.cms_import_static_pilot_media();
 for e in select value from jsonb_array_elements(public.cms_static_media_inventory()) loop
   aid:=(e->>'assetId')::uuid;vid:=(e->>'versionId')::uuid;
   if exists(select 1 from public.media_versions where id=vid) then continue;end if;
   insert into public.media_assets(id,alt_text,folder) values(aid,e->>'alt','שירותים');
   insert into public.media_versions(id,asset_id,version_number,storage_provider,storage_path,mime_type,byte_size,width,height,content_hash,original_filename)
   values(vid,aid,1,'static',e->>'path',e->>'mime',(e->>'byteSize')::integer,(e->>'width')::integer,(e->>'height')::integer,e->>'hash',regexp_replace(e->>'path','^.*/',''));
   update public.media_assets set current_version_id=vid where id=aid;
   insert into public.media_audit_events(asset_id,version_id,kind,after_state) select aid,vid,'bootstrap',to_jsonb(a) from public.media_assets a where a.id=aid;
 end loop;
 return jsonb_array_length(public.cms_static_media_inventory());
end;$$;

create function public.cms_save_managed_draft(target_key text, expected_generation bigint, base_revision uuid, payload jsonb, restore_revision uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.content_publication_state; rev uuid; next_number integer;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  select st.* into s from public.content_publication_state st join public.content_documents d on d.id=st.document_id
    where d.content_type='service' and d.content_key=target_key and d.id=public.cms_shared_service_id(target_key) for update of st;
  if not found then raise exception using errcode='55000',message='CMS baseline missing'; end if;
  if expected_generation is distinct from s.generation or base_revision is distinct from s.draft_revision_id then
    raise exception using errcode='PT409',message='CMS edit conflict'; end if;
  if restore_revision is not null then
    select public.cms_revision_payload(r) into payload from public.content_revisions r where r.document_id=s.document_id and r.id=restore_revision;
  end if;
  if not public.cms_valid_service_payload(target_key,payload) then raise exception using errcode='22023',message='Invalid CMS payload'; end if;
  select max(revision_number)+1 into next_number from public.content_revisions where document_id=s.document_id;
  insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body,created_by,base_revision_id,source_revision_id)
    values(s.document_id,next_number,(payload->>'schemaVersion')::integer,payload->>'publicTitle',payload->>'h1',payload->>'seoTitle',payload->>'seoDescription',
      payload - array['schemaVersion','publicTitle','h1','seoTitle','seoDescription'],auth.uid(),base_revision,restore_revision) returning id into rev;
  update public.content_publication_state set draft_revision_id=rev,generation=generation+1 where document_id=s.document_id;
  update public.content_documents set updated_at=now() where id=s.document_id;
  return rev;
end;
$$;

create function public.cms_publish_managed_revision(target_key text, expected_generation bigint, revision uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.content_publication_state;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  select st.* into s from public.content_publication_state st join public.content_documents d on d.id=st.document_id
    where d.content_type='service' and d.content_key=target_key and d.id=public.cms_shared_service_id(target_key) for update of st;
  if not found then raise exception using errcode='55000',message='CMS baseline missing'; end if;
  if expected_generation is distinct from s.generation or revision is distinct from s.draft_revision_id then
    raise exception using errcode='PT409',message='CMS edit conflict'; end if;
  if not public.cms_valid_service_payload(target_key,(select public.cms_revision_payload(r) from public.content_revisions r where id=revision)) then
    raise exception using errcode='22023',message='Invalid CMS payload'; end if;
  -- A double submission is a conflict after generation advances; no duplicate audit.
  if revision = s.published_revision_id then return revision; end if;
  update public.content_publication_state set published_revision_id=revision,generation=generation+1 where document_id=s.document_id;
  insert into public.content_publication_events(document_id,revision_id,previous_revision_id,published_by,kind)
    values(s.document_id,revision,s.published_revision_id,auth.uid(),'publish');
  update public.content_documents set updated_at=now() where id=s.document_id;
  return revision;
end;
$$;

create function public.cms_read_service_editor(target_key text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  return (select jsonb_build_object('updatedAt',d.updated_at,'generation',s.generation,
    'draftRevisionId',s.draft_revision_id,'publishedRevisionId',s.published_revision_id,
    'publishedBy',(select e.published_by from public.content_publication_events e where e.document_id=d.id and e.revision_id=s.published_revision_id order by e.published_at desc,e.id desc limit 1),
    'draft',public.cms_revision_payload(r), 'history',(
      select jsonb_agg(jsonb_build_object('id',h.id,'number',h.revision_number,'createdAt',h.created_at,
        'createdBy',h.created_by,'baseRevisionId',h.base_revision_id,'sourceRevisionId',h.source_revision_id) order by h.revision_number desc)
      from public.content_revisions h where h.document_id=d.id))
    from public.content_documents d join public.content_publication_state s on s.document_id=d.id
    join public.content_revisions r on r.id=s.draft_revision_id and r.document_id=d.id
    where d.content_type='service' and d.content_key=target_key and d.id=public.cms_shared_service_id(target_key));
end;
$$;

create function public.cms_read_published_service(target_key text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('revisionId',r.id,'payload',public.cms_revision_payload(r)) || case when r.schema_version>=2 then jsonb_build_object('media',public.cms_revision_media_projection(r.id)) else '{}'::jsonb end
 from public.content_documents d join public.content_publication_state s on s.document_id=d.id join public.content_revisions r on r.document_id=d.id and r.id=s.published_revision_id
 where d.content_type='service' and d.content_key=target_key and d.id=public.cms_shared_service_id(target_key);
$$;


create function public.cms_import_shared_baseline(target_key text,payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare doc uuid; rev uuid;
begin
  if not public.cms_valid_service_payload(target_key,payload) then raise exception using errcode='22023',message='Invalid CMS payload'; end if;
  perform pg_advisory_xact_lock(20260922,1);
  select id into doc from public.content_documents where content_type='service' and content_key=target_key;
  if doc is not null then
    return (select id from public.content_revisions where document_id=doc and revision_number=1);
  end if;
  doc := public.cms_shared_service_id(target_key);
  insert into public.content_documents(id,content_type,content_key) values(doc,'service',target_key);
  insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body)
    values(doc,1,(payload->>'schemaVersion')::integer,payload->>'publicTitle',payload->>'h1',payload->>'seoTitle',payload->>'seoDescription',
      payload - array['schemaVersion','publicTitle','h1','seoTitle','seoDescription']) returning id into rev;
  insert into public.content_publication_state(document_id,draft_revision_id,published_revision_id) values(doc,rev,rev);
  insert into public.content_publication_events(document_id,revision_id,kind) values(doc,rev,'baseline');
  return rev;
end;
$$;

do $$declare f regprocedure;begin for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in ('cms_shared_service_id','cms_static_media_inventory','cms_valid_service_payload','cms_validate_service_revision','cms_valid_static_version','cms_import_shared_media','cms_save_managed_draft','cms_publish_managed_revision','cms_read_service_editor','cms_read_published_service','cms_import_shared_baseline') loop execute format('alter function %s owner to postgres',f);execute format('revoke all on function %s from public,anon,authenticated,service_role',f);end loop;end $$;

grant execute on function public.cms_save_managed_draft(text,bigint,uuid,jsonb,uuid),public.cms_publish_managed_revision(text,bigint,uuid),public.cms_read_service_editor(text) to authenticated;
grant execute on function public.cms_read_published_service(text) to anon,authenticated;
create or replace function public.cms_read_published_pilot() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('revisionId',r.id,'payload',public.cms_revision_payload(r)) || case when r.schema_version>=2 then jsonb_build_object('media',public.cms_revision_media_projection(r.id)) else '{}'::jsonb end
 from public.content_documents d join public.content_publication_state s on s.document_id=d.id join public.content_revisions r on r.document_id=d.id and r.id=s.published_revision_id
 where d.content_type='service' and d.content_key='delicate-upholstery-cleaning';
$$;

create or replace function public.cms_media_detail(target_asset uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
 return (select jsonb_build_object('asset',to_jsonb(a),'versions',(select coalesce(jsonb_agg(v order by version_number desc),'[]'::jsonb) from public.media_versions v where v.asset_id=a.id),'usages',(select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('serviceKey',d.content_key,'revisionNumber',c.revision_number,'published',exists(select 1 from public.content_publication_state st where st.published_revision_id=r.revision_id)) order by c.revision_number desc,r.usage_role,r.position),'[]'::jsonb) from public.revision_media_refs r join public.media_versions v on v.id=r.media_version_id join public.content_revisions c on c.id=r.revision_id join public.content_documents d on d.id=c.document_id where v.asset_id=a.id),'audit',(select coalesce(jsonb_agg(e order by occurred_at desc),'[]'::jsonb) from public.media_audit_events e where e.asset_id=a.id)) from public.media_assets a where a.id=target_asset);
end;$$;

-- Bytes are served only when an owning, previously-published service is explicitly
-- enabled by the server's source policy. No draft-only version can be projected.
create or replace function public.cms_read_public_media_version(target_version uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',v.id,'storage_provider',v.storage_provider,'storage_path',v.storage_path,'mime_type',v.mime_type,'content_hash',v.content_hash,
 'serviceKeys',(select jsonb_agg(distinct d.content_key) from public.revision_media_refs r join public.content_publication_events e on e.revision_id=r.revision_id join public.content_documents d on d.id=e.document_id where r.media_version_id=v.id and d.content_type='service' and d.id=public.cms_shared_service_id(d.content_key)))
 from public.media_versions v where v.id=target_version and exists(select 1 from public.revision_media_refs r join public.content_publication_events e on e.revision_id=r.revision_id join public.content_documents d on d.id=e.document_id where r.media_version_id=v.id and d.content_type='service' and d.id=public.cms_shared_service_id(d.content_key));
$$;

commit;
