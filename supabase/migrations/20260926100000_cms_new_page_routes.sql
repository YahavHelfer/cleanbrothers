begin;

-- Phase 3B1: new pages only. Existing /about and service functions retain their
-- signatures and public behavior. This migration is LOCAL ONLY until 3B2.
alter table public.content_documents drop constraint content_documents_content_key_check;
alter table public.content_documents add constraint content_documents_content_key_check check(
  (content_type='service' and public.cms_shared_service_id(content_key) is not null) or
  (content_type='page' and (content_key='about' or content_key ~ '^new:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')) or
  (content_type='promotion' and content_key='about-intro'));
alter table public.content_revisions drop constraint content_revisions_schema_version_check;
alter table public.content_revisions add constraint content_revisions_schema_version_check check(schema_version in (1,2,3,4,5,6,7,8));
alter table public.content_publication_state alter column published_revision_id drop not null;
alter table public.content_publication_events drop constraint content_publication_events_kind_check;
alter table public.content_publication_events add constraint content_publication_events_kind_check
  check(kind in ('baseline','publish','unpublish','archive','restore'));
alter table public.content_publication_events drop constraint content_publication_events_check;
alter table public.content_publication_events add constraint content_publication_events_check check(
  (kind='baseline' and published_by is null and previous_revision_id is null) or
  (kind in ('publish','unpublish','archive','restore') and published_by is not null));

create function public.cms_new_page_slug(value text)
returns boolean language sql immutable set search_path='' as $$
  select coalesce(length(value) between 3 and 64 and value ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and
    value <> all(array['admin','api','_next','cms-media','services','gallery','about','contact',
      'privacy-policy','accessibility-statement','data-deletion','robots','sitemap',
      'icon','apple-icon','favicon','manifest','opengraph-image','twitter-image',
      'sofa-cleaning','mattress-cleaning','carpet-cleaning','delicate-upholstery-cleaning',
      'car-upholstery-cleaning','armchair-chair-cleaning','air-conditioner-cleaning','window-cleaning']),false);
$$;

create table public.cms_new_page_identity (
  document_id uuid primary key references public.content_documents(id),
  current_slug text not null unique check(public.cms_new_page_slug(current_slug)),
  template text not null check(template in ('blank','standard','promotion')),
  lifecycle text not null check(lifecycle in ('draft-only','published','unpublished','archived')),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  duplicated_from uuid references public.content_documents(id)
);
create table public.cms_page_routes (
  slug text primary key,
  kind text not null check(kind in ('static','service','system','draft','page','redirect','archived')),
  page_id uuid references public.cms_new_page_identity(document_id),
  destination_slug text,
  redirect_type text check(redirect_type in ('permanent','temporary')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  check((kind in ('static','service','system') and page_id is null and destination_slug is null and redirect_type is null) or
        (kind in ('draft','page','archived') and page_id is not null and destination_slug is null and redirect_type is null) or
        (kind='redirect' and page_id is not null and destination_slug is not null and destination_slug<>slug and redirect_type is not null))
);
create unique index cms_one_current_route_per_page on public.cms_page_routes(page_id)
  where kind in ('draft','page','archived');
create table public.cms_page_route_events (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.cms_new_page_identity(document_id),
  event_type text not null check(event_type in ('create','save','publish','slug-change','unpublish','archive','restore','duplicate')),
  from_slug text,
  to_slug text,
  revision_id uuid references public.content_revisions(id),
  actor uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create trigger cms_page_route_events_immutable before update or delete on public.cms_page_route_events
  for each row execute function public.cms_reject_revision_mutation();

insert into public.cms_page_routes(slug,kind) values
 ('admin','system'),('api','system'),('_next','system'),('cms-media','system'),
 ('robots','system'),('sitemap','system'),('icon','system'),('apple-icon','system'),
 ('favicon','system'),('manifest','system'),('opengraph-image','system'),('twitter-image','system'),
 ('services','static'),('gallery','static'),('about','static'),('contact','static'),
 ('privacy-policy','static'),('accessibility-statement','static'),('data-deletion','static'),
 ('sofa-cleaning','service'),('mattress-cleaning','service'),('carpet-cleaning','service'),
 ('delicate-upholstery-cleaning','service'),('car-upholstery-cleaning','service'),
 ('armchair-chair-cleaning','service'),('air-conditioner-cleaning','service'),('window-cleaning','service');

do $$ declare t text; begin
  foreach t in array array['cms_new_page_identity','cms_page_routes','cms_page_route_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy cms_new_pages_aal2_read on public.%I for select to authenticated using ((select public.is_cms_admin_aal2()))',t);
  end loop;
end $$;

create function public.cms_valid_new_page_revision(p jsonb)
returns boolean language sql immutable set search_path='' as $$
  select public.cms_page_keys(p,array['schemaVersion','publicTitle','h1','seoTitle','seoDescription','canonical']) and
    p->'schemaVersion'='8'::jsonb and left(p->>'canonical',1)='/' and
    public.cms_new_page_slug(substr(p->>'canonical',2)) and
    public.cms_page_plain(p->'publicTitle',120) and public.cms_page_plain(p->'h1',180) and
    public.cms_page_plain(p->'seoTitle',120) and public.cms_page_plain(p->'seoDescription',320);
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
  if doc.content_type='promotion' and doc.content_key='about-intro' and new.schema_version=7 and
    public.cms_valid_promotion_revision(payload) then return new; end if;
  raise exception using errcode='22023',message='Invalid CMS payload';
end; $$;

create or replace function public.cms_validate_page_block_ref()
returns trigger language plpgsql security definer set search_path='' as $$
declare rev public.content_revisions; promo public.content_revisions; asset public.media_assets; role_name text;
begin
  select * into rev from public.content_revisions where id=new.revision_id;
  if rev.schema_version not in (6,8) or not exists(
    select 1 from public.content_documents where id=rev.document_id and content_type='page' and
      (content_key='about' or content_key=('new:'||id::text))) then
    raise exception using errcode='23514',message='Block revision mismatch'; end if;
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
    role_name:=case new.block_type when 'hero' then 'page-hero' else 'page-image' end;
    insert into public.revision_media_refs(revision_id,media_version_id,usage_role,position,alt_text,caption)
      values(new.revision_id,new.media_version_id,role_name,new.position,
        case when new.block_type='hero' then new.payload->>'mediaAlt' else new.payload->>'alt' end,asset.caption);
  end if;
  return new;
end; $$;

-- All route-changing operations serialize on the same advisory lock. The
-- primary key is the final ownership barrier even for two concurrent editors.
create function public.cms_create_new_page(title text, slug text, template text)
returns uuid language plpgsql security definer set search_path='' as $$
declare doc uuid:=gen_random_uuid(); rev uuid; payload jsonb; blocks jsonb; promo uuid; hero uuid:=gen_random_uuid();
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  if not public.cms_new_page_slug(slug) or not public.cms_page_plain(to_jsonb(title),120) or
    template not in ('blank','standard','promotion') then raise exception using errcode='22023',message='Invalid new page'; end if;
  perform pg_advisory_xact_lock(20260926,1);
  if exists(select 1 from public.cms_page_routes where cms_page_routes.slug=cms_create_new_page.slug) then
    raise exception using errcode='23505',message='Page slug already owned'; end if;
  blocks:=jsonb_build_array(jsonb_build_object('id',hero,'position',0,'type','hero','schemaVersion',1,
    'hidden',false,'payload',jsonb_build_object('eyebrow','עמוד חדש','title',title,'description','תיאור הפתיחה',
      'cta',null,'mediaAlt',null),'mediaVersionId',null,'promotionRevisionId',null));
  if template in ('standard','promotion') then
    blocks:=blocks||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'position',1,'type','richText',
      'schemaVersion',1,'hidden',false,'payload','{"nodes":[{"kind":"paragraph","level":null,"items":[[{"text":"טקסט חדש","bold":false,"emphasis":false,"link":null}]]}]}'::jsonb,
      'mediaVersionId',null,'promotionRevisionId',null));
  end if;
  if template='promotion' then
    select s.published_revision_id into promo from public.content_documents d
      join public.content_publication_state s on s.document_id=d.id
      where d.content_type='promotion' and d.content_key='about-intro';
    if promo is null then raise exception using errcode='55000',message='Published promotion required'; end if;
    blocks:=blocks||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'position',2,'type','promotionBanner',
      'schemaVersion',1,'hidden',false,'payload','{"template":"accent"}'::jsonb,
      'mediaVersionId',null,'promotionRevisionId',promo));
  end if;
  if template in ('standard','promotion') then
    blocks:=blocks||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),
      'position',jsonb_array_length(blocks),'type','cta','schemaVersion',1,'hidden',false,
      'payload','{"heading":"צרו קשר","description":"נשמח לשוחח אתכם.","cta":{"label":"צרו קשר","target":{"kind":"internal","path":"/contact"}}}'::jsonb,
      'mediaVersionId',null,'promotionRevisionId',null));
  end if;
  payload:=jsonb_build_object('schemaVersion',8,'publicTitle',title,'h1',title,'seoTitle',title||' | CleanBrothers',
    'seoDescription','מידע נוסף על שירותי CleanBrothers.','canonical','/'||slug,'blocks',blocks);
  insert into public.content_documents(id,content_type,content_key) values(doc,'page','new:'||doc::text);
  insert into public.cms_new_page_identity(document_id,current_slug,template,lifecycle,created_by)
    values(doc,slug,template,'draft-only',auth.uid());
  insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body,created_by)
    values(doc,1,8,title,title,payload->>'seoTitle',payload->>'seoDescription',
      payload-array['schemaVersion','publicTitle','h1','seoTitle','seoDescription','blocks'],auth.uid()) returning id into rev;
  perform public.cms_insert_page_blocks(rev,blocks);
  insert into public.content_publication_state(document_id,draft_revision_id,published_revision_id)
    values(doc,rev,null);
  insert into public.cms_page_routes(slug,kind,page_id,created_by) values(slug,'draft',doc,auth.uid());
  insert into public.cms_page_route_events(page_id,event_type,to_slug,revision_id,actor)
    values(doc,'create',slug,rev,auth.uid());
  return doc;
end; $$;

create function public.cms_read_new_page_editor(target_page uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  return (select jsonb_build_object('documentId',d.id,'currentSlug',i.current_slug,'template',i.template,
    'lifecycle',i.lifecycle,'createdAt',i.created_at,'createdBy',i.created_by,
    'updatedAt',d.updated_at,'generation',s.generation,'draftRevisionId',s.draft_revision_id,
    'publishedRevisionId',s.published_revision_id,
    'publishedBy',(select e.published_by from public.content_publication_events e
      where e.document_id=d.id and e.kind='publish' order by e.published_at desc,e.id desc limit 1),
    'draft',public.cms_page_revision_payload(r),'history',
    (select jsonb_agg(jsonb_build_object('id',h.id,'number',h.revision_number,'createdAt',h.created_at,
      'createdBy',h.created_by,'baseRevisionId',h.base_revision_id,'sourceRevisionId',h.source_revision_id)
      order by h.revision_number desc) from public.content_revisions h where h.document_id=d.id))
    from public.content_documents d join public.cms_new_page_identity i on i.document_id=d.id
    join public.content_publication_state s on s.document_id=d.id
    join public.content_revisions r on r.id=s.draft_revision_id where d.id=target_page);
end; $$;

create function public.cms_list_new_pages(include_archived boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'title',r.public_title,'slug',i.current_slug,
    'template',i.template,'lifecycle',i.lifecycle,'draftRevisionId',s.draft_revision_id,
    'publishedRevisionId',s.published_revision_id,'updatedAt',d.updated_at,
    'publishedBy',(select e.published_by from public.content_publication_events e
      where e.document_id=d.id and e.kind='publish' order by e.published_at desc,e.id desc limit 1))
    order by d.updated_at desc),'[]'::jsonb) from public.cms_new_page_identity i
    join public.content_documents d on d.id=i.document_id
    join public.content_publication_state s on s.document_id=d.id
    join public.content_revisions r on r.id=s.draft_revision_id
    where include_archived or i.lifecycle<>'archived');
end; $$;

create function public.cms_read_new_page_revision(target_page uuid,target_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  return (select jsonb_build_object('id',r.id,'number',r.revision_number,'payload',public.cms_page_revision_payload(r))
    from public.content_revisions r join public.cms_new_page_identity i on i.document_id=r.document_id
    where i.document_id=target_page and r.id=target_revision and r.schema_version=8);
end; $$;

create function public.cms_save_new_page_draft(target_page uuid,expected_generation bigint,base_revision uuid,
  payload jsonb,restore_revision uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state; i public.cms_new_page_identity; rev uuid; source public.content_revisions;
  candidate text;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  select * into i from public.cms_new_page_identity where document_id=target_page for update;
  if not found or i.lifecycle='archived' then raise exception using errcode='55000',message='Page unavailable'; end if;
  select * into s from public.content_publication_state where document_id=target_page for update;
  if expected_generation is distinct from s.generation or base_revision is distinct from s.draft_revision_id then
    raise exception using errcode='PT409',message='CMS edit conflict'; end if;
  if restore_revision is not null then
    select * into source from public.content_revisions where document_id=target_page and id=restore_revision;
    if not found then raise exception using errcode='23503',message='Wrong page revision'; end if;
    payload:=public.cms_page_revision_payload(source);
  end if;
  if not public.cms_valid_new_page_revision(payload-'blocks') then
    raise exception using errcode='22023',message='Invalid page'; end if;
  candidate:=substr(payload->>'canonical',2);
  if exists(select 1 from public.cms_page_routes where slug=candidate and page_id is distinct from target_page) then
    raise exception using errcode='23505',message='Page slug already owned'; end if;
  insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,
    body,created_by,base_revision_id,source_revision_id)
    values(target_page,(select max(revision_number)+1 from public.content_revisions where document_id=target_page),8,
      payload->>'publicTitle',payload->>'h1',payload->>'seoTitle',payload->>'seoDescription',
      payload-array['schemaVersion','publicTitle','h1','seoTitle','seoDescription','blocks'],
      auth.uid(),base_revision,restore_revision) returning id into rev;
  perform public.cms_insert_page_blocks(rev,payload->'blocks');
  update public.content_publication_state set draft_revision_id=rev,generation=generation+1 where document_id=target_page;
  update public.content_documents set updated_at=now() where id=target_page;
  insert into public.cms_page_route_events(page_id,event_type,from_slug,to_slug,revision_id,actor)
    values(target_page,'save',i.current_slug,candidate,rev,auth.uid());
  return rev;
end; $$;

create function public.cms_publish_new_page(target_page uuid,expected_generation bigint,revision uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state; i public.cms_new_page_identity; r public.content_revisions;
  candidate text; existing public.cms_page_routes;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  perform pg_advisory_xact_lock(20260926,1);
  select * into i from public.cms_new_page_identity where document_id=target_page for update;
  if not found or i.lifecycle='archived' then raise exception using errcode='55000',message='Page unavailable'; end if;
  select * into s from public.content_publication_state where document_id=target_page for update;
  if expected_generation is distinct from s.generation or revision is distinct from s.draft_revision_id then
    raise exception using errcode='PT409',message='CMS edit conflict'; end if;
  select * into r from public.content_revisions where id=revision and document_id=target_page and schema_version=8;
  if not found then raise exception using errcode='23503',message='Wrong page revision'; end if;
  candidate:=substr(r.body->>'canonical',2);
  if not public.cms_new_page_slug(candidate) then raise exception using errcode='22023',message='Invalid page slug'; end if;
  select * into existing from public.cms_page_routes where slug=candidate for update;
  if found and existing.page_id is distinct from target_page then
    raise exception using errcode='PT409',message='Page slug already owned'; end if;
  if exists(select 1 from public.page_revision_blocks b join public.content_revisions p on p.id=b.promotion_revision_id
    where b.revision_id=revision and not b.hidden and b.promotion_revision_id is not null and not exists(
      select 1 from public.content_publication_events e where e.revision_id=p.id)) then
    raise exception using errcode='55000',message='Publish promotion before page'; end if;
  if candidate<>i.current_slug then
    update public.cms_page_routes set kind='redirect',destination_slug=candidate,redirect_type='permanent'
      where slug=i.current_slug and page_id=target_page and kind='page';
    delete from public.cms_page_routes where slug=i.current_slug and page_id=target_page and kind in ('draft','archived');
    update public.cms_page_routes set destination_slug=candidate
      where page_id=target_page and kind='redirect' and slug<>candidate;
    delete from public.cms_page_routes where slug=candidate and page_id=target_page and kind='redirect';
    insert into public.cms_page_routes(slug,kind,page_id,created_by) values(candidate,'page',target_page,auth.uid());
    update public.cms_new_page_identity set current_slug=candidate where document_id=target_page;
  else
    update public.cms_page_routes set kind='page',destination_slug=null,redirect_type=null
      where slug=candidate and page_id=target_page;
  end if;
  update public.content_publication_state set published_revision_id=revision,generation=generation+1
    where document_id=target_page;
  update public.cms_new_page_identity set lifecycle='published' where document_id=target_page;
  insert into public.content_publication_events(document_id,revision_id,previous_revision_id,published_by,kind)
    values(target_page,revision,s.published_revision_id,auth.uid(),'publish');
  insert into public.cms_page_route_events(page_id,event_type,from_slug,to_slug,revision_id,actor)
    values(target_page,case when candidate<>i.current_slug then 'slug-change' else 'publish' end,
      i.current_slug,candidate,revision,auth.uid());
  update public.content_documents set updated_at=now() where id=target_page;
  return revision;
end; $$;

create function public.cms_unpublish_new_page(target_page uuid,expected_generation bigint)
returns void language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state; i public.cms_new_page_identity;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  perform pg_advisory_xact_lock(20260926,1);
  select * into i from public.cms_new_page_identity where document_id=target_page for update;
  select * into s from public.content_publication_state where document_id=target_page for update;
  if not found or i.lifecycle<>'published' or expected_generation is distinct from s.generation then
    raise exception using errcode='PT409',message='CMS edit conflict'; end if;
  update public.cms_page_routes set kind='draft' where slug=i.current_slug and page_id=target_page and kind='page';
  update public.cms_new_page_identity set lifecycle='unpublished' where document_id=target_page;
  update public.content_publication_state set generation=generation+1 where document_id=target_page;
  insert into public.content_publication_events(document_id,revision_id,previous_revision_id,published_by,kind)
    values(target_page,s.draft_revision_id,s.published_revision_id,auth.uid(),'unpublish');
  insert into public.cms_page_route_events(page_id,event_type,from_slug,revision_id,actor)
    values(target_page,'unpublish',i.current_slug,s.draft_revision_id,auth.uid());
end; $$;

create function public.cms_archive_new_page(target_page uuid,expected_generation bigint)
returns void language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state; i public.cms_new_page_identity;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  perform pg_advisory_xact_lock(20260926,1);
  select * into i from public.cms_new_page_identity where document_id=target_page for update;
  select * into s from public.content_publication_state where document_id=target_page for update;
  if not found or i.lifecycle not in ('draft-only','unpublished') or
    expected_generation is distinct from s.generation then
    raise exception using errcode='PT409',message='Unpublish before archive or reload page'; end if;
  update public.cms_page_routes set kind='archived' where slug=i.current_slug and page_id=target_page;
  update public.cms_new_page_identity set lifecycle='archived' where document_id=target_page;
  update public.content_publication_state set generation=generation+1 where document_id=target_page;
  insert into public.content_publication_events(document_id,revision_id,previous_revision_id,published_by,kind)
    values(target_page,s.draft_revision_id,s.published_revision_id,auth.uid(),'archive');
  insert into public.cms_page_route_events(page_id,event_type,from_slug,revision_id,actor)
    values(target_page,'archive',i.current_slug,s.draft_revision_id,auth.uid());
end; $$;

create function public.cms_restore_new_page(target_page uuid,expected_generation bigint)
returns void language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state; i public.cms_new_page_identity;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  perform pg_advisory_xact_lock(20260926,1);
  select * into i from public.cms_new_page_identity where document_id=target_page for update;
  select * into s from public.content_publication_state where document_id=target_page for update;
  if not found or i.lifecycle<>'archived' or expected_generation is distinct from s.generation then
    raise exception using errcode='PT409',message='CMS edit conflict'; end if;
  update public.cms_page_routes set kind='draft' where slug=i.current_slug and page_id=target_page and kind='archived';
  update public.cms_new_page_identity set lifecycle='unpublished' where document_id=target_page;
  update public.content_publication_state set generation=generation+1 where document_id=target_page;
  insert into public.content_publication_events(document_id,revision_id,previous_revision_id,published_by,kind)
    values(target_page,s.draft_revision_id,s.published_revision_id,auth.uid(),'restore');
  insert into public.cms_page_route_events(page_id,event_type,to_slug,revision_id,actor)
    values(target_page,'restore',i.current_slug,s.draft_revision_id,auth.uid());
end; $$;

create function public.cms_duplicate_new_page(source_page uuid,title text,slug text)
returns uuid language plpgsql security definer set search_path='' as $$
declare source_rev public.content_revisions; source_identity public.cms_new_page_identity;
  doc uuid:=gen_random_uuid(); rev uuid; payload jsonb; blocks jsonb;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  if not public.cms_new_page_slug(slug) or not public.cms_page_plain(to_jsonb(title),120) then
    raise exception using errcode='22023',message='Invalid duplicate page'; end if;
  perform pg_advisory_xact_lock(20260926,1);
  if exists(select 1 from public.cms_page_routes where cms_page_routes.slug=cms_duplicate_new_page.slug) then
    raise exception using errcode='23505',message='Page slug already owned'; end if;
  select * into source_identity from public.cms_new_page_identity where document_id=source_page;
  if not found then raise exception using errcode='23503',message='Source page missing'; end if;
  select * into source_rev from public.content_revisions r join public.content_publication_state s
    on s.draft_revision_id=r.id where s.document_id=source_page;
  payload:=public.cms_page_revision_payload(source_rev);
  select jsonb_agg(jsonb_set(value,'{id}',to_jsonb(gen_random_uuid())) order by ordinality)
    into blocks from jsonb_array_elements(payload->'blocks') with ordinality;
  payload:=jsonb_set(jsonb_set(jsonb_set(payload,'{blocks}',blocks),'{canonical}',to_jsonb('/'||slug)),
    '{publicTitle}',to_jsonb(title));
  insert into public.content_documents(id,content_type,content_key) values(doc,'page','new:'||doc::text);
  insert into public.cms_new_page_identity(document_id,current_slug,template,lifecycle,created_by,duplicated_from)
    values(doc,slug,source_identity.template,'draft-only',auth.uid(),source_page);
  insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body,created_by)
    values(doc,1,8,title,payload->>'h1',payload->>'seoTitle',payload->>'seoDescription',
      payload-array['schemaVersion','publicTitle','h1','seoTitle','seoDescription','blocks'],auth.uid()) returning id into rev;
  perform public.cms_insert_page_blocks(rev,blocks);
  insert into public.content_publication_state(document_id,draft_revision_id,published_revision_id) values(doc,rev,null);
  insert into public.cms_page_routes(slug,kind,page_id,created_by) values(slug,'draft',doc,auth.uid());
  insert into public.cms_page_route_events(page_id,event_type,from_slug,to_slug,revision_id,actor)
    values(doc,'duplicate',source_identity.current_slug,slug,rev,auth.uid());
  return doc;
end; $$;

-- Public functions never accept a revision ID. A redirect is returned only
-- while its owning page is currently published, so unpublish yields a 404.
create function public.cms_resolve_new_page_route(target_slug text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('kind',r.kind,'pageId',r.page_id,'destination',r.destination_slug,
    'redirectType',r.redirect_type)
  from public.cms_page_routes r join public.cms_new_page_identity i on i.document_id=r.page_id
  where public.cms_new_page_slug(target_slug) and r.slug=target_slug and i.lifecycle='published'
    and r.kind in ('page','redirect') limit 1;
$$;
create function public.cms_read_public_new_page(target_slug text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'revisionId',r.id,
    'payload',public.cms_revision_payload(r)||jsonb_build_object('blocks',
      (select coalesce(jsonb_agg(jsonb_build_object('id',b.block_id,'position',b.public_position,
        'type',b.block_type,'schemaVersion',b.schema_version,'hidden',false,'payload',b.payload,
        'mediaVersionId',b.media_version_id,'promotionRevisionId',b.promotion_revision_id)
        order by b.position),'[]'::jsonb)
       from (select blocks.*,(row_number() over (order by blocks.position)-1)::integer public_position
         from public.page_revision_blocks blocks where blocks.revision_id=r.id and not blocks.hidden) b)),
    'promotions',(select coalesce(jsonb_object_agg(p.id::text,public.cms_revision_payload(p)),'{}'::jsonb)
      from public.content_revisions p join public.content_documents pd on pd.id=p.document_id
      where pd.content_type='promotion' and pd.content_key='about-intro' and
        p.id in (select b.promotion_revision_id from public.page_revision_blocks b
          where b.revision_id=r.id and not b.hidden and b.promotion_revision_id is not null)
        and exists(select 1 from public.content_publication_events e where e.revision_id=p.id and e.kind in ('baseline','publish'))),
    'media',(select coalesce(jsonb_agg(jsonb_build_object('media_version_id',refs.media_version_id,
      'usage_role',refs.usage_role,'position',refs.position,'alt_text',refs.alt_text,'provider',v.storage_provider)
      order by refs.revision_id,refs.position),'[]'::jsonb)
      from public.revision_media_refs refs join public.media_versions v on v.id=refs.media_version_id
      where (refs.revision_id=r.id and refs.usage_role in ('page-hero','page-image') and exists(
        select 1 from public.page_revision_blocks b where b.revision_id=r.id and b.position=refs.position and not b.hidden))
        or (refs.usage_role='promotion' and refs.revision_id in (
          select b.promotion_revision_id from public.page_revision_blocks b where b.revision_id=r.id and not b.hidden
            and b.promotion_revision_id is not null))))
  from public.cms_page_routes route join public.cms_new_page_identity i on i.document_id=route.page_id
  join public.content_publication_state s on s.document_id=i.document_id
  join public.content_revisions r on r.id=s.published_revision_id and r.document_id=i.document_id
  where public.cms_new_page_slug(target_slug) and route.slug=target_slug and route.kind='page'
    and i.lifecycle='published' and r.schema_version=8 and r.body->>'canonical'='/'||target_slug
    and not exists(select 1 from public.page_revision_blocks b where b.revision_id=r.id and not b.hidden
      and b.promotion_revision_id is not null and not exists(select 1 from public.content_revisions p
        join public.content_documents pd on pd.id=p.document_id where p.id=b.promotion_revision_id
          and pd.content_type='promotion' and pd.content_key='about-intro' and exists(
            select 1 from public.content_publication_events e where e.revision_id=p.id and e.kind in ('baseline','publish'))));
$$;
create function public.cms_list_public_new_page_slugs()
returns text[] language sql stable security definer set search_path='' as $$
  select coalesce(array_agg(r.slug order by r.slug),array[]::text[])
    from public.cms_page_routes r join public.cms_new_page_identity i on i.document_id=r.page_id
    where r.kind='page' and i.lifecycle='published';
$$;

do $$ declare f regprocedure; begin
  for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in (
    'cms_new_page_slug','cms_valid_new_page_revision','cms_create_new_page','cms_read_new_page_editor',
    'cms_list_new_pages','cms_read_new_page_revision','cms_save_new_page_draft','cms_publish_new_page',
    'cms_unpublish_new_page','cms_archive_new_page','cms_restore_new_page','cms_duplicate_new_page',
    'cms_resolve_new_page_route','cms_read_public_new_page','cms_list_public_new_page_slugs') loop
    execute format('alter function %s owner to postgres',f);
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f);
  end loop;
end $$;
grant execute on function public.cms_create_new_page(text,text,text) to authenticated;
grant execute on function public.cms_read_new_page_editor(uuid) to authenticated;
grant execute on function public.cms_list_new_pages(boolean) to authenticated;
grant execute on function public.cms_read_new_page_revision(uuid,uuid) to authenticated;
grant execute on function public.cms_save_new_page_draft(uuid,bigint,uuid,jsonb,uuid) to authenticated;
grant execute on function public.cms_publish_new_page(uuid,bigint,uuid) to authenticated;
grant execute on function public.cms_unpublish_new_page(uuid,bigint) to authenticated;
grant execute on function public.cms_archive_new_page(uuid,bigint) to authenticated;
grant execute on function public.cms_restore_new_page(uuid,bigint) to authenticated;
grant execute on function public.cms_duplicate_new_page(uuid,text,text) to authenticated;
grant execute on function public.cms_resolve_new_page_route(text) to anon,authenticated;
grant execute on function public.cms_read_public_new_page(text) to anon,authenticated;
grant execute on function public.cms_list_public_new_page_slugs() to anon,authenticated;

commit;
