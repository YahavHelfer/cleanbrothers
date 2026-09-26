begin;

-- Phase 3C1: local-only revisioned site chrome. No hosted environment enables it.
alter table public.content_documents drop constraint content_documents_content_type_check;
alter table public.content_documents add constraint content_documents_content_type_check
  check(content_type in ('service','page','promotion','site'));
alter table public.content_documents drop constraint content_documents_content_key_check;
alter table public.content_documents add constraint content_documents_content_key_check check(
  (content_type='service' and public.cms_shared_service_id(content_key) is not null) or
  (content_type='page' and (content_key='about' or content_key ~ '^new:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')) or
  (content_type='promotion' and content_key='about-intro') or
  (content_type='site' and content_key in ('settings','navigation','footer')));
alter table public.content_revisions drop constraint content_revisions_schema_version_check;
alter table public.content_revisions add constraint content_revisions_schema_version_check
  check(schema_version in (1,2,3,4,5,6,7,8,9,10,11));

create function public.cms_site_revision_payload(r public.content_revisions)
returns jsonb language sql immutable set search_path='' as $$
  select r.body || jsonb_build_object('schemaVersion',r.schema_version);
$$;
create function public.cms_site_target(v jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
begin
  if v->>'kind'='static' then
    return public.cms_page_keys(v,array['kind','path']) and
      v->>'path'=any(array['/','/services','/gallery','/about','/contact']);
  elsif v->>'kind'='service' then
    return public.cms_page_keys(v,array['kind','key']) and
      v->>'key'=any(array['sofa-cleaning','mattress-cleaning','carpet-cleaning',
        'car-upholstery-cleaning','armchair-chair-cleaning','delicate-upholstery-cleaning',
        'air-conditioner-cleaning','window-cleaning']);
  elsif v->>'kind'='page' then
    return public.cms_page_keys(v,array['kind','id']) and
      v->>'id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  end if;
  return false;
exception when others then return false;
end; $$;
create function public.cms_valid_site_payload(kind text,p jsonb)
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
        'window-cleaning']) then return false; end if;
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
  if doc.content_type='site' and
    new.schema_version=(case doc.content_key when 'settings' then 9 when 'navigation' then 10 else 11 end) and
    public.cms_valid_site_payload(doc.content_key,public.cms_site_revision_payload(new)) then return new; end if;
  raise exception using errcode='22023',message='Invalid CMS payload';
end; $$;

create function public.cms_site_references_valid(p jsonb)
returns boolean language plpgsql stable set search_path='' as $$
declare item jsonb; target jsonb;
begin
  for item in select value from jsonb_array_elements(p->'items') loop
    if item->'visible'='true'::jsonb then
      target:=item->'target';
      if target->>'kind'='page' and not exists(
        select 1 from public.cms_new_page_identity i
        join public.content_publication_state s on s.document_id=i.document_id
        join public.cms_page_routes route on route.page_id=i.document_id
        where i.document_id=(target->>'id')::uuid and i.lifecycle='published' and
          s.published_revision_id is not null and route.kind='page' and route.slug=i.current_slug) then
        return false;
      end if;
    end if;
  end loop;
  return true;
exception when others then return false;
end; $$;

create function public.cms_import_site_baseline(kind text,payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare doc uuid; rev uuid; ver integer;
begin
  if not public.cms_valid_site_payload(kind,payload) then
    raise exception using errcode='22023',message='Invalid site baseline'; end if;
  doc:=case kind when 'settings' then 'c0000000-0000-4000-8000-000000000301'::uuid
    when 'navigation' then 'c0000000-0000-4000-8000-000000000302'::uuid
    when 'footer' then 'c0000000-0000-4000-8000-000000000303'::uuid end;
  ver:=(payload->>'schemaVersion')::integer;
  perform pg_advisory_xact_lock(20260927,1);
  if exists(select 1 from public.content_documents where content_type='site' and content_key=kind) then
    return (select r.id from public.content_revisions r join public.content_documents d on d.id=r.document_id
      where d.content_type='site' and d.content_key=kind and r.revision_number=1);
  end if;
  insert into public.content_documents(id,content_type,content_key) values(doc,'site',kind);
  insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body)
    values(doc,1,ver,kind,kind,kind,kind,payload-'schemaVersion') returning id into rev;
  insert into public.content_publication_state(document_id,draft_revision_id,published_revision_id)
    values(doc,rev,rev);
  insert into public.content_publication_events(document_id,revision_id,kind)
    values(doc,rev,'baseline');
  return rev;
end; $$;

create function public.cms_read_site_editor(kind text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  return (select jsonb_build_object('updatedAt',d.updated_at,'generation',s.generation,
    'draftRevisionId',s.draft_revision_id,'publishedRevisionId',s.published_revision_id,
    'publishedBy',(select e.published_by from public.content_publication_events e
      where e.document_id=d.id and e.kind='publish' order by e.published_at desc,e.id desc limit 1),
    'draft',public.cms_site_revision_payload(r),'history',
    (select jsonb_agg(jsonb_build_object('id',h.id,'number',h.revision_number,'createdAt',h.created_at,
      'createdBy',h.created_by,'baseRevisionId',h.base_revision_id,'sourceRevisionId',h.source_revision_id)
      order by h.revision_number desc) from public.content_revisions h where h.document_id=d.id))
    from public.content_documents d join public.content_publication_state s on s.document_id=d.id
    join public.content_revisions r on r.id=s.draft_revision_id
    where d.content_type='site' and d.content_key=kind);
end; $$;
create function public.cms_read_site_revision(kind text,target_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  return (select jsonb_build_object('id',r.id,'number',r.revision_number,
    'payload',public.cms_site_revision_payload(r)) from public.content_revisions r
    join public.content_documents d on d.id=r.document_id where d.content_type='site' and
      d.content_key=kind and r.id=target_revision);
end; $$;
create function public.cms_save_site_draft(kind text,expected_generation bigint,base_revision uuid,
  payload jsonb,restore_revision uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state; rev uuid; source public.content_revisions;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  select st.* into s from public.content_publication_state st join public.content_documents d
    on d.id=st.document_id where d.content_type='site' and d.content_key=kind for update of st;
  if not found then raise exception using errcode='55000',message='Site baseline missing'; end if;
  if expected_generation is distinct from s.generation or base_revision is distinct from s.draft_revision_id then
    raise exception using errcode='PT409',message='CMS edit conflict'; end if;
  if restore_revision is not null then
    select * into source from public.content_revisions where document_id=s.document_id and id=restore_revision;
    if not found then raise exception using errcode='23503',message='Wrong site revision'; end if;
    payload:=public.cms_site_revision_payload(source);
  end if;
  if not public.cms_valid_site_payload(kind,payload) then
    raise exception using errcode='22023',message='Invalid site payload'; end if;
  insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,
    seo_description,body,created_by,base_revision_id,source_revision_id)
    values(s.document_id,(select max(revision_number)+1 from public.content_revisions where document_id=s.document_id),
      (payload->>'schemaVersion')::integer,kind,kind,kind,kind,payload-'schemaVersion',auth.uid(),
      base_revision,restore_revision) returning id into rev;
  update public.content_publication_state set draft_revision_id=rev,generation=generation+1 where document_id=s.document_id;
  update public.content_documents set updated_at=now() where id=s.document_id;
  return rev;
end; $$;
create function public.cms_publish_site_revision(kind text,expected_generation bigint,revision uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state; r public.content_revisions; payload jsonb;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  perform pg_advisory_xact_lock(20260926,1);
  select st.* into s from public.content_publication_state st join public.content_documents d
    on d.id=st.document_id where d.content_type='site' and d.content_key=kind for update of st;
  if not found then raise exception using errcode='55000',message='Site baseline missing'; end if;
  if expected_generation is distinct from s.generation or revision is distinct from s.draft_revision_id then
    raise exception using errcode='PT409',message='CMS edit conflict'; end if;
  select * into r from public.content_revisions where id=revision and document_id=s.document_id;
  payload:=public.cms_site_revision_payload(r);
  if not found or not public.cms_valid_site_payload(kind,payload) or
    (kind='navigation' and not public.cms_site_references_valid(payload)) then
    raise exception using errcode='22023',message='Invalid site publication'; end if;
  if revision=s.published_revision_id then return revision; end if;
  update public.content_publication_state set published_revision_id=revision,generation=generation+1
    where document_id=s.document_id;
  insert into public.content_publication_events(document_id,revision_id,previous_revision_id,published_by,kind)
    values(s.document_id,revision,s.published_revision_id,auth.uid(),'publish');
  update public.content_documents set updated_at=now() where id=s.document_id;
  return revision;
end; $$;

create function public.cms_site_block_page_unpublish()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.lifecycle='published' and new.lifecycle<>'published' and exists(
    select 1 from public.content_documents d join public.content_publication_state s on s.document_id=d.id
    join public.content_revisions r on r.id=s.published_revision_id
    cross join lateral jsonb_array_elements(r.body->'items') item
    where d.content_type='site' and d.content_key='navigation' and
      item->'visible'='true'::jsonb and item->'target'->>'kind'='page' and
      item->'target'->>'id'=old.document_id::text) then
    raise exception using errcode='55000',message='Published navigation still references page';
  end if;
  return new;
end; $$;
create trigger cms_site_page_unpublish_guard before update of lifecycle on public.cms_new_page_identity
  for each row execute function public.cms_site_block_page_unpublish();

-- The public projection cannot choose a revision and contains no editor/audit identity.
create function public.cms_read_public_site(kind text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('revisionId',r.id,'payload',public.cms_site_revision_payload(r),
    'pageRoutes',case when kind='navigation' then
      (select coalesce(jsonb_object_agg(i.document_id::text,i.current_slug),'{}'::jsonb)
       from public.cms_new_page_identity i join public.cms_page_routes route
         on route.page_id=i.document_id and route.kind='page' and route.slug=i.current_slug
       where i.lifecycle='published' and i.document_id::text in
         (select item->'target'->>'id' from jsonb_array_elements(r.body->'items') item
          where item->'visible'='true'::jsonb and item->'target'->>'kind'='page'))
      else '{}'::jsonb end)
  from public.content_documents d join public.content_publication_state s on s.document_id=d.id
  join public.content_revisions r on r.id=s.published_revision_id and r.document_id=d.id
  where d.content_type='site' and d.content_key=kind and kind in ('settings','navigation','footer');
$$;
create function public.cms_read_site_page_routes()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  return (select coalesce(jsonb_object_agg(i.document_id::text,i.current_slug),'{}'::jsonb)
    from public.cms_new_page_identity i join public.cms_page_routes route
      on route.page_id=i.document_id and route.kind='page' and route.slug=i.current_slug
    where i.lifecycle='published');
end; $$;

do $$ declare f regprocedure; begin
  for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in (
    'cms_site_revision_payload','cms_site_target','cms_valid_site_payload','cms_site_references_valid',
    'cms_import_site_baseline','cms_read_site_editor','cms_read_site_revision','cms_save_site_draft',
    'cms_publish_site_revision','cms_site_block_page_unpublish','cms_read_public_site',
    'cms_read_site_page_routes') loop
    execute format('alter function %s owner to postgres',f);
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f);
  end loop;
end $$;
grant execute on function public.cms_read_site_editor(text) to authenticated;
grant execute on function public.cms_read_site_revision(text,uuid) to authenticated;
grant execute on function public.cms_save_site_draft(text,bigint,uuid,jsonb,uuid) to authenticated;
grant execute on function public.cms_publish_site_revision(text,bigint,uuid) to authenticated;
grant execute on function public.cms_read_site_page_routes() to authenticated;
grant execute on function public.cms_read_public_site(text) to anon,authenticated;

commit;
