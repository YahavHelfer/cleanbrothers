begin;

-- Phase 3D1, LOCAL ONLY: one fixed / document using the existing immutable
-- content_revisions and page_revision_blocks machinery. No hosted rollout.
alter table public.content_documents drop constraint content_documents_content_key_check;
alter table public.content_documents add constraint content_documents_content_key_check check(
  (content_type='service' and public.cms_shared_service_id(content_key) is not null) or
  (content_type='page' and (content_key in ('about','home') or content_key ~ '^new:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')) or
  (content_type='promotion' and content_key='about-intro') or
  (content_type='site' and content_key in ('settings','navigation','footer')));
alter table public.content_revisions drop constraint content_revisions_schema_version_check;
alter table public.content_revisions add constraint content_revisions_schema_version_check
  check(schema_version in (1,2,3,4,5,6,7,8,9,10,11,12));

-- The approved repository Hero file joins the existing immutable static-media
-- allowlist. All historical entries retain their exact byte/hash checks.
create or replace function public.cms_valid_static_version(vid uuid,p text,h text,b integer,w integer,ht integer,m text)
returns boolean language sql immutable set search_path='' as $$
  select exists(select 1 from jsonb_array_elements(public.cms_static_media_inventory() || public.cms_special_media_inventory()) e
    where e->>'versionId'=vid::text and e->>'path'=p and e->>'hash'=h and
      (e->>'byteSize')::integer=b and (e->>'width')::integer=w and (e->>'height')::integer=ht and e->>'mime'=m)
    or (vid='d3000000-0000-4000-8000-000000000002'::uuid and
      p='/images/hero/hero-sofa-cleaning.jpg' and
      h='a327cb1d39fd7d86e31fffb53fc64b37722cb1a1820a1041e4656164cead46a8' and
      b=280216 and w=1280 and ht=714 and m='image/jpeg');
$$;

create function public.cms_home_text_fields(p jsonb, names text[])
returns boolean language plpgsql immutable set search_path='' as $$
declare k text;
begin
  foreach k in array names loop
    if not public.cms_page_plain(p->k,2000) then return false; end if;
  end loop;
  return true;
exception when others then return false;
end; $$;

create function public.cms_home_strings(v jsonb, low integer, high integer)
returns boolean language plpgsql immutable set search_path='' as $$
declare x jsonb;
begin
  if jsonb_typeof(v)<>'array' or jsonb_array_length(v) not between low and high then return false; end if;
  for x in select value from jsonb_array_elements(v) loop
    if not public.cms_page_plain(x,300) then return false; end if;
  end loop;
  return (select count(distinct value) from jsonb_array_elements_text(v))=jsonb_array_length(v);
exception when others then return false;
end; $$;

create function public.cms_valid_home_block(kind text,p jsonb,media_id uuid,promotion_id uuid)
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
        'armchair-chair-cleaning','delicate-upholstery-cleaning','air-conditioner-cleaning','window-cleaning') or
        not (p->'cards' ? k) then return false; end if;
    end loop;
    for k,item in select key,value from jsonb_each(p->'cards') loop
      if k not in ('sofa-cleaning','mattress-cleaning','carpet-cleaning','car-upholstery-cleaning',
        'armchair-chair-cleaning','delicate-upholstery-cleaning','air-conditioner-cleaning','window-cleaning') or
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

alter table public.page_revision_blocks drop constraint page_revision_blocks_block_type_check;
alter table public.page_revision_blocks add constraint page_revision_blocks_block_type_check check(block_type in
  ('hero','richText','imageText','faq','cta','promotionBanner','spacer','aboutOverview',
   'homeHero','homeTrust','homeServices','homeProcess','homeBeforeAfter','homeWhyUs',
   'homePricing','homeEstimate','homeAreas','homeFaq','homeFinalCta'));
alter table public.page_revision_blocks drop constraint page_revision_blocks_check;
alter table public.page_revision_blocks add constraint page_revision_blocks_check check(
  public.cms_valid_page_block(block_type,payload,media_version_id,promotion_revision_id) or
  public.cms_valid_home_block(block_type,payload,media_version_id,promotion_revision_id));
alter table public.revision_media_refs drop constraint revision_media_refs_usage_role_check;
alter table public.revision_media_refs add constraint revision_media_refs_usage_role_check check(usage_role in
  ('hero','benefits','result','before','after','gallery','seo','page-hero','page-image','promotion',
   'home-hero','home-before','home-after'));

create function public.cms_valid_home_revision(p jsonb)
returns boolean language sql immutable set search_path='' as $$
  select public.cms_page_keys(p,array['schemaVersion','publicTitle','h1','seoTitle','seoDescription','canonical']) and
    p->'schemaVersion'='12'::jsonb and p->>'publicTitle'='דף הבית' and p->>'canonical'='/' and
    public.cms_page_plain(p->'h1',180) and public.cms_page_plain(p->'seoTitle',120) and
    public.cms_page_plain(p->'seoDescription',320);
$$;

create or replace function public.cms_validate_service_revision()
returns trigger language plpgsql set search_path='' as $$
declare doc public.content_documents; payload jsonb;
begin
  select * into doc from public.content_documents where id=new.document_id;
  payload:=public.cms_revision_payload(new);
  if doc.content_type='service' and public.cms_valid_service_payload(doc.content_key,payload) then return new; end if;
  if doc.content_type='page' and doc.content_key='about' and new.schema_version=6 and
    public.cms_valid_page_revision(payload) then return new; end if;
  if doc.content_type='page' and doc.content_key=('new:'||doc.id::text) and new.schema_version=8 and
    public.cms_valid_new_page_revision(payload) then return new; end if;
  if doc.content_type='page' and doc.content_key='home' and new.schema_version=12 and
    public.cms_valid_home_revision(payload) then return new; end if;
  if doc.content_type='promotion' and doc.content_key='about-intro' and new.schema_version=7 and
    public.cms_valid_promotion_revision(payload) then return new; end if;
  if doc.content_type='site' and
    new.schema_version=(case doc.content_key when 'settings' then 9 when 'navigation' then 10 else 11 end) and
    public.cms_valid_site_payload(doc.content_key,public.cms_site_revision_payload(new)) then return new; end if;
  raise exception using errcode='22023',message='Invalid CMS payload';
end; $$;

-- Extend the existing block-reference trigger without changing the historical
-- page/service rules. Gallery pairs pin both immutable media version IDs.
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
  return new;
end; $$;

create function public.cms_insert_home_blocks(target_revision uuid, items jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; n integer; kind text; seen text[]:=array[]::text[]; hero_title text;
begin
  if jsonb_typeof(items)<>'array' or jsonb_array_length(items) not between 1 and 50 then
    raise exception using errcode='22023',message='Invalid home blocks'; end if;
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

create function public.cms_import_home_media()
returns void language plpgsql security definer set search_path='' as $$
declare aid uuid:='d3000000-0000-4000-8000-000000000001';
  vid uuid:='d3000000-0000-4000-8000-000000000002';
begin
  perform public.cms_import_shared_media();
  if exists(select 1 from public.media_versions where id=vid) then return; end if;
  insert into public.media_assets(id,alt_text,folder) values(aid,'ניקוי ספה מקצועי בבית הלקוח','דף הבית');
  insert into public.media_versions(id,asset_id,version_number,storage_provider,storage_path,mime_type,byte_size,width,height,content_hash,original_filename)
    values(vid,aid,1,'static','/images/hero/hero-sofa-cleaning.jpg','image/jpeg',280216,1280,714,
      'a327cb1d39fd7d86e31fffb53fc64b37722cb1a1820a1041e4656164cead46a8','hero-sofa-cleaning.jpg');
  update public.media_assets set current_version_id=vid where id=aid;
  insert into public.media_audit_events(asset_id,version_id,kind,after_state)
    select aid,vid,'bootstrap',to_jsonb(a) from public.media_assets a where a.id=aid;
end; $$;

create function public.cms_import_home_baseline(payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare doc uuid; rev uuid;
begin
  if not public.cms_valid_home_revision(payload-'blocks') then
    raise exception using errcode='22023',message='Invalid home baseline'; end if;
  perform pg_advisory_xact_lock(20260927,12);
  select id into doc from public.content_documents where content_type='page' and content_key='home';
  if doc is not null then
    return (select id from public.content_revisions where document_id=doc and revision_number=1); end if;
  perform public.cms_import_home_media();
  doc:='d4000000-0000-4000-8000-000000000000';
  insert into public.content_documents(id,content_type,content_key) values(doc,'page','home');
  insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body)
    values(doc,1,12,payload->>'publicTitle',payload->>'h1',payload->>'seoTitle',payload->>'seoDescription',
      payload-array['schemaVersion','publicTitle','h1','seoTitle','seoDescription','blocks']) returning id into rev;
  perform public.cms_insert_home_blocks(rev,payload->'blocks');
  insert into public.content_publication_state(document_id,draft_revision_id,published_revision_id) values(doc,rev,rev);
  insert into public.content_publication_events(document_id,revision_id,kind) values(doc,rev,'baseline');
  return rev;
end; $$;

create function public.cms_save_home_draft(expected_generation bigint,base_revision uuid,payload jsonb,restore_revision uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state; rev uuid; next_number integer; source public.content_revisions;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  select st.* into s from public.content_publication_state st join public.content_documents d on d.id=st.document_id
    where d.content_type='page' and d.content_key='home' for update of st;
  if not found then raise exception using errcode='55000',message='Home baseline missing'; end if;
  if expected_generation is distinct from s.generation or base_revision is distinct from s.draft_revision_id then
    raise exception using errcode='PT409',message='CMS edit conflict'; end if;
  if restore_revision is not null then
    select * into source from public.content_revisions where document_id=s.document_id and id=restore_revision;
    if not found then raise exception using errcode='23503',message='Wrong home revision'; end if;
    payload:=public.cms_page_revision_payload(source);
  end if;
  if not public.cms_valid_home_revision(payload-'blocks') then
    raise exception using errcode='22023',message='Invalid home draft'; end if;
  select max(revision_number)+1 into next_number from public.content_revisions where document_id=s.document_id;
  insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body,created_by,base_revision_id,source_revision_id)
    values(s.document_id,next_number,12,payload->>'publicTitle',payload->>'h1',payload->>'seoTitle',payload->>'seoDescription',
      payload-array['schemaVersion','publicTitle','h1','seoTitle','seoDescription','blocks'],auth.uid(),base_revision,restore_revision)
    returning id into rev;
  perform public.cms_insert_home_blocks(rev,payload->'blocks');
  update public.content_publication_state set draft_revision_id=rev,generation=generation+1 where document_id=s.document_id;
  update public.content_documents set updated_at=now() where id=s.document_id;
  return rev;
end; $$;

create function public.cms_publish_home_revision(expected_generation bigint,revision uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  select st.* into s from public.content_publication_state st join public.content_documents d on d.id=st.document_id
    where d.content_type='page' and d.content_key='home' for update of st;
  if not found then raise exception using errcode='55000',message='Home baseline missing'; end if;
  if expected_generation is distinct from s.generation or revision is distinct from s.draft_revision_id then
    raise exception using errcode='PT409',message='CMS edit conflict'; end if;
  if exists(select 1 from public.page_revision_blocks b join public.content_revisions p on p.id=b.promotion_revision_id
    join public.content_publication_state ps on ps.document_id=p.document_id
    where b.revision_id=revision and not b.hidden and b.promotion_revision_id is not null and
      ps.published_revision_id<>p.id) then
    raise exception using errcode='55000',message='Publish promotion before home'; end if;
  if revision=s.published_revision_id then return revision; end if;
  update public.content_publication_state set published_revision_id=revision,generation=generation+1 where document_id=s.document_id;
  insert into public.content_publication_events(document_id,revision_id,previous_revision_id,published_by,kind)
    values(s.document_id,revision,s.published_revision_id,auth.uid(),'publish');
  update public.content_documents set updated_at=now() where id=s.document_id;
  return revision;
end; $$;

create function public.cms_read_home_editor()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  return (select jsonb_build_object('updatedAt',d.updated_at,'generation',s.generation,
    'draftRevisionId',s.draft_revision_id,'publishedRevisionId',s.published_revision_id,
    'publishedBy',(select e.published_by from public.content_publication_events e where e.document_id=d.id
      and e.revision_id=s.published_revision_id order by e.published_at desc,e.id desc limit 1),
    'draft',public.cms_page_revision_payload(r),'history',
      (select jsonb_agg(jsonb_build_object('id',h.id,'number',h.revision_number,'createdAt',h.created_at,
        'createdBy',h.created_by,'baseRevisionId',h.base_revision_id,'sourceRevisionId',h.source_revision_id)
        order by h.revision_number desc) from public.content_revisions h where h.document_id=d.id))
    from public.content_documents d join public.content_publication_state s on s.document_id=d.id
      join public.content_revisions r on r.id=s.draft_revision_id
    where d.content_type='page' and d.content_key='home');
end; $$;
create function public.cms_read_home_revision(target_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  return (select jsonb_build_object('id',r.id,'number',r.revision_number,'payload',public.cms_page_revision_payload(r))
    from public.content_revisions r join public.content_documents d on d.id=r.document_id
    where r.id=target_revision and d.content_type='page' and d.content_key='home');
end; $$;

-- No selector: only the current published home revision and its visible blocks.
create function public.cms_read_public_home()
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

do $$ declare f regprocedure; begin
  for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in (
    'cms_home_text_fields','cms_home_strings','cms_valid_home_block','cms_valid_home_revision',
    'cms_insert_home_blocks','cms_import_home_media','cms_import_home_baseline','cms_save_home_draft',
    'cms_publish_home_revision','cms_read_home_editor','cms_read_home_revision','cms_read_public_home') loop
    execute format('alter function %s owner to postgres',f);
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f);
  end loop;
end $$;
grant execute on function public.cms_save_home_draft(bigint,uuid,jsonb,uuid) to authenticated;
grant execute on function public.cms_publish_home_revision(bigint,uuid) to authenticated;
grant execute on function public.cms_read_home_editor() to authenticated;
grant execute on function public.cms_read_home_revision(uuid) to authenticated;
grant execute on function public.cms_read_public_home() to anon,authenticated;

commit;
