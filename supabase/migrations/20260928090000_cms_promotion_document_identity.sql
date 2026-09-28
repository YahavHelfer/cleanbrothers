begin;

-- Phase 4A2-A1: permit multiple stable, internal Promotion document keys.
-- Existing about-intro rows, revisions, publications and block references are untouched.
alter table public.content_documents drop constraint content_documents_content_key_check;
alter table public.content_documents add constraint content_documents_content_key_check check (
  (content_type='service' and public.cms_shared_service_id(content_key) is not null) or
  (content_type='page' and (content_key in ('about','home') or
    content_key ~ '^new:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')) or
  (content_type='promotion' and char_length(content_key) between 3 and 80 and
    content_key ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$') or
  (content_type='site' and content_key in ('settings','navigation','footer'))
);

alter table public.cms_promotion_identity drop constraint cms_promotion_identity_analytics_key_check;
alter table public.cms_promotion_identity add constraint cms_promotion_identity_analytics_key_check check (
  char_length(analytics_key) between 3 and 80 and
  analytics_key ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
);

-- The existing immutable revision trigger remains in place. Only its Promotion
-- branch is generalized; every other content type retains its previous rules.
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
  if doc.content_type='promotion' and new.schema_version=7 and
    public.cms_valid_promotion_revision(payload) then return new; end if;
  if doc.content_type='site' and
    new.schema_version=(case doc.content_key when 'settings' then 9 when 'navigation' then 10 else 11 end) and
    public.cms_valid_site_payload(doc.content_key,public.cms_site_revision_payload(new)) then return new; end if;
  raise exception using errcode='22023',message='Invalid CMS payload';
end; $$;

-- Scheduling remains restricted to an exact, previously published and enabled
-- revision of an active Promotion identity. No page/home reader is broadened.
create or replace function public.cms_schedule_validate_promotion(doc_id uuid, revision_id uuid)
returns integer language plpgsql stable security definer set search_path='' as $$
declare n integer;
begin
  select r.revision_number into n from public.content_documents d
    join public.cms_promotion_identity i on i.document_id=d.id and i.status='active'
    join public.content_revisions r on r.document_id=d.id and r.id=revision_id
  where d.id=doc_id and d.content_type='promotion' and i.analytics_key=d.content_key
    and r.schema_version=7 and public.cms_valid_promotion_revision(public.cms_revision_payload(r))
    and (public.cms_revision_payload(r)->>'enabled')::boolean
    and exists (select 1 from public.content_publication_events e
                where e.document_id=d.id and e.revision_id=r.id and e.kind in ('baseline','publish'));
  if n is null then raise exception using errcode='23503', message='Promotion revision is not published-safe'; end if;
  return n;
end; $$;

create or replace function public.cms_read_promotion_schedule_choices()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501', message='CMS access denied'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('documentId',d.id,'documentKey',d.content_key,
    'revisionId',r.id,'number',r.revision_number,'title',r.public_title)
    order by d.content_key,r.revision_number desc)
    from public.content_documents d join public.cms_promotion_identity i on i.document_id=d.id and i.status='active'
      join public.content_revisions r on r.document_id=d.id
    where d.content_type='promotion' and i.analytics_key=d.content_key and r.schema_version=7
      and public.cms_valid_promotion_revision(public.cms_revision_payload(r))
      and (public.cms_revision_payload(r)->>'enabled')::boolean
      and exists(select 1 from public.content_publication_events e
        where e.document_id=d.id and e.revision_id=r.id and e.kind in ('baseline','publish'))), '[]'::jsonb);
end; $$;

-- Exact-revision Admin preview is still AAL2-only. The existing About editor
-- remains bound to about-intro through its separate reader and write RPCs.
create or replace function public.cms_read_promotion_revision(target_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  return (select jsonb_build_object('id',r.id,'number',r.revision_number,'payload',public.cms_revision_payload(r))
    from public.content_revisions r join public.content_documents d on d.id=r.document_id
      join public.cms_promotion_identity i on i.document_id=d.id and i.analytics_key=d.content_key
    where r.id=target_revision and d.content_type='promotion' and r.schema_version=7);
end; $$;

commit;
