begin;

-- Phase 2A1: one service, no editable routing, CRM identity or executable HTML.
create function public.cms_valid_pilot_payload(p jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  k text; field_name text; n integer; v jsonb; item jsonb; limit_length integer;
  whitespace text := E' \t\n\r' || U&'\00a0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200a\2028\2029\202f\205f\3000\feff';
  text_limits jsonb := '{"publicTitle":120,"h1":180,"eyebrow":120,"intro":2000,"imageAlt":300,"signsTitle":180,"signsDescription":2000,"processTitle":180,"processDescription":2000,"benefitsDescription":2000,"resultDescription":2000,"seoTitle":120,"seoDescription":320}';
begin
  if jsonb_typeof(p) <> 'object' or p is null then return false; end if;
  if (select count(*) from jsonb_object_keys(p)) <> 20 or
    not p ?& array['schemaVersion','images','signs','process','benefits','faqs','relatedLinks'] or
    p->'schemaVersion' <> '1'::jsonb then return false; end if;
  for k, v in select * from jsonb_each(text_limits) loop
    if not p ? k or jsonb_typeof(p->k) <> 'string' then return false; end if;
    limit_length := v::text::integer;
    if btrim(p->>k, whitespace) = '' or char_length(p->>k) > limit_length
      or (p->>k) ~ E'[<>\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]' then return false; end if;
  end loop;
  if p->'images' <> '["/images/services/delicate-upholstery-cleaning.jpeg"]'::jsonb then return false; end if;
  foreach k in array array['signs','process','benefits','faqs','relatedLinks'] loop
    if jsonb_typeof(p->k) <> 'array' then return false; end if;
    n := jsonb_array_length(p->k);
    if n > (case when k='faqs' then 20 when k='relatedLinks' then 2 else 12 end)
      or n < (case when k='relatedLinks' then 0 else 1 end) then return false; end if;
    for item in select * from jsonb_array_elements(p->k) loop
      if k in ('signs','process','benefits') then
        if jsonb_typeof(item) <> 'string' then return false; end if;
        item := jsonb_build_object('text',item);
      elsif jsonb_typeof(item) <> 'object' then return false;
      elsif k='faqs' then
        if (select count(*) from jsonb_object_keys(item)) <> 2 or not item ?& array['question','answer'] then return false; end if;
      else
        if (select count(*) from jsonb_object_keys(item)) <> 2 or not item ?& array['label','href'] or
          item->>'href' not in ('/mattress-cleaning','/car-upholstery-cleaning') then return false; end if;
      end if;
      for field_name, v in select key, value from jsonb_each(item) loop
        limit_length := case field_name when 'answer' then 2000 when 'label' then 120 when 'href' then 100 else 300 end;
        if jsonb_typeof(v) <> 'string' or btrim(v#>>'{}', whitespace) = '' or char_length(v#>>'{}') > limit_length
          or (v#>>'{}') ~ E'[<>\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]' then return false; end if;
      end loop;
    end loop;
  end loop;
  foreach k in array array['signs','process','benefits','images'] loop
    if (select count(distinct value) from jsonb_array_elements(p->k)) <> jsonb_array_length(p->k) then return false; end if;
  end loop;
  if (select count(distinct value->>'question') from jsonb_array_elements(p->'faqs')) <> jsonb_array_length(p->'faqs') or
     (select count(distinct value->>'href') from jsonb_array_elements(p->'relatedLinks')) <> jsonb_array_length(p->'relatedLinks') then return false; end if;
  return true;
exception when others then return false;
end;
$$;

create table public.content_documents (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type = 'service'),
  content_key text not null check (content_key = 'delicate-upholstery-cleaning'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(content_type, content_key)
);

create table public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.content_documents(id),
  revision_number integer not null check (revision_number > 0),
  schema_version integer not null check (schema_version = 1),
  public_title text not null,
  h1 text not null,
  seo_title text not null,
  seo_description text not null,
  -- Descriptive paragraphs and ordered lists/FAQ/asset references only.
  body jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  base_revision_id uuid,
  source_revision_id uuid,
  unique(document_id, revision_number),
  unique(document_id, id),
  foreign key(document_id, base_revision_id) references public.content_revisions(document_id,id),
  foreign key(document_id, source_revision_id) references public.content_revisions(document_id,id),
  check (public.cms_valid_pilot_payload(body || jsonb_build_object(
    'schemaVersion',schema_version,'publicTitle',public_title,'h1',h1,
    'seoTitle',seo_title,'seoDescription',seo_description))),
  check (not body ?| array['schemaVersion','publicTitle','h1','seoTitle','seoDescription'])
);

create table public.content_publication_state (
  document_id uuid primary key references public.content_documents(id),
  draft_revision_id uuid not null,
  published_revision_id uuid not null,
  generation bigint not null default 1 check (generation > 0),
  foreign key(document_id,draft_revision_id) references public.content_revisions(document_id,id),
  foreign key(document_id,published_revision_id) references public.content_revisions(document_id,id)
);

create table public.content_publication_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.content_documents(id),
  revision_id uuid not null,
  previous_revision_id uuid,
  published_by uuid references auth.users(id),
  published_at timestamptz not null default now(),
  kind text not null check (kind in ('baseline','publish')),
  foreign key(document_id,revision_id) references public.content_revisions(document_id,id),
  foreign key(document_id,previous_revision_id) references public.content_revisions(document_id,id),
  check ((kind='baseline' and published_by is null and previous_revision_id is null)
    or (kind='publish' and published_by is not null and previous_revision_id is not null))
);

create function public.cms_reject_revision_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception using errcode='55000', message='CMS immutable audit record'; end;
$$;
create trigger content_revisions_immutable before update or delete on public.content_revisions
for each row execute function public.cms_reject_revision_mutation();
create trigger content_events_immutable before update or delete on public.content_publication_events
for each row execute function public.cms_reject_revision_mutation();

-- Internal projection: never exposed as a caller-selected public revision RPC.
create function public.cms_revision_payload(r public.content_revisions)
returns jsonb language sql immutable set search_path = '' as $$
 select r.body || jsonb_build_object('schemaVersion',r.schema_version,'publicTitle',r.public_title,
   'h1',r.h1,'seoTitle',r.seo_title,'seoDescription',r.seo_description);
$$;

-- Local operator bootstrap only. Re-running never overwrites an edited document.
create function public.cms_import_service_baseline(payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare doc uuid; rev uuid;
begin
  if not public.cms_valid_pilot_payload(payload) then raise exception using errcode='22023',message='Invalid CMS payload'; end if;
  perform pg_advisory_xact_lock(20260922,1);
  select id into doc from public.content_documents where content_type='service' and content_key='delicate-upholstery-cleaning';
  if doc is not null then
    return (select id from public.content_revisions where document_id=doc and revision_number=1);
  end if;
  doc := 'c0000000-0000-4000-8000-000000000001';
  insert into public.content_documents(id,content_type,content_key) values(doc,'service','delicate-upholstery-cleaning');
  insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body)
    values(doc,1,1,payload->>'publicTitle',payload->>'h1',payload->>'seoTitle',payload->>'seoDescription',
      payload - array['schemaVersion','publicTitle','h1','seoTitle','seoDescription']) returning id into rev;
  insert into public.content_publication_state(document_id,draft_revision_id,published_revision_id) values(doc,rev,rev);
  insert into public.content_publication_events(document_id,revision_id,kind) values(doc,rev,'baseline');
  return rev;
end;
$$;

create function public.cms_save_service_draft(expected_generation bigint, base_revision uuid, payload jsonb, restore_revision uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.content_publication_state; rev uuid; next_number integer;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  select st.* into s from public.content_publication_state st join public.content_documents d on d.id=st.document_id
    where d.content_type='service' and d.content_key='delicate-upholstery-cleaning' for update of st;
  if not found then raise exception using errcode='55000',message='CMS baseline missing'; end if;
  if expected_generation is distinct from s.generation or base_revision is distinct from s.draft_revision_id then
    raise exception using errcode='40001',message='CMS edit conflict'; end if;
  if restore_revision is not null then
    select public.cms_revision_payload(r) into payload from public.content_revisions r where r.document_id=s.document_id and r.id=restore_revision;
  end if;
  if not public.cms_valid_pilot_payload(payload) then raise exception using errcode='22023',message='Invalid CMS payload'; end if;
  select max(revision_number)+1 into next_number from public.content_revisions where document_id=s.document_id;
  insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body,created_by,base_revision_id,source_revision_id)
    values(s.document_id,next_number,1,payload->>'publicTitle',payload->>'h1',payload->>'seoTitle',payload->>'seoDescription',
      payload - array['schemaVersion','publicTitle','h1','seoTitle','seoDescription'],auth.uid(),base_revision,restore_revision) returning id into rev;
  update public.content_publication_state set draft_revision_id=rev,generation=generation+1 where document_id=s.document_id;
  update public.content_documents set updated_at=now() where id=s.document_id;
  return rev;
end;
$$;

create function public.cms_publish_service_revision(expected_generation bigint, revision uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.content_publication_state;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  select st.* into s from public.content_publication_state st join public.content_documents d on d.id=st.document_id
    where d.content_type='service' and d.content_key='delicate-upholstery-cleaning' for update of st;
  if not found then raise exception using errcode='55000',message='CMS baseline missing'; end if;
  if expected_generation is distinct from s.generation or revision is distinct from s.draft_revision_id then
    raise exception using errcode='40001',message='CMS edit conflict'; end if;
  if not public.cms_valid_pilot_payload((select public.cms_revision_payload(r) from public.content_revisions r where id=revision)) then
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

-- Explicit public projection: no parameters, drafts, history, editor IDs or state.
create function public.cms_read_pilot_editor()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  return (select jsonb_build_object('updatedAt',d.updated_at,'generation',s.generation,
    'draftRevisionId',s.draft_revision_id,'publishedRevisionId',s.published_revision_id,
    'draft',public.cms_revision_payload(r), 'history',(
      select jsonb_agg(jsonb_build_object('id',h.id,'number',h.revision_number,'createdAt',h.created_at,
        'createdBy',h.created_by,'baseRevisionId',h.base_revision_id,'sourceRevisionId',h.source_revision_id) order by h.revision_number desc)
      from public.content_revisions h where h.document_id=d.id))
    from public.content_documents d join public.content_publication_state s on s.document_id=d.id
    join public.content_revisions r on r.id=s.draft_revision_id and r.document_id=d.id
    where d.content_type='service' and d.content_key='delicate-upholstery-cleaning');
end;
$$;

create function public.cms_read_published_pilot()
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('revisionId',r.id,'payload',public.cms_revision_payload(r))
 from public.content_documents d join public.content_publication_state s on s.document_id=d.id
 join public.content_revisions r on r.document_id=d.id and r.id=s.published_revision_id
 where d.content_type='service' and d.content_key='delicate-upholstery-cleaning';
$$;

do $$
declare t text; f regprocedure;
begin
  foreach t in array array['content_documents','content_revisions','content_publication_state','content_publication_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy cms_aal2_read on public.%I for select to authenticated using ((select public.is_cms_admin_aal2()))',t);
  end loop;
  for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in (
    'cms_valid_pilot_payload','cms_reject_revision_mutation','cms_revision_payload','cms_import_service_baseline',
    'cms_save_service_draft','cms_publish_service_revision','cms_read_published_pilot','cms_read_pilot_editor') loop
    execute format('alter function %s owner to postgres',f);
    execute format('revoke all on function %s from public, anon, authenticated',f);
  end loop;
end $$;
grant execute on function public.cms_save_service_draft(bigint,uuid,jsonb,uuid) to authenticated;
grant execute on function public.cms_publish_service_revision(bigint,uuid) to authenticated;
grant execute on function public.cms_read_pilot_editor() to authenticated;
grant execute on function public.cms_read_published_pilot() to anon, authenticated;

commit;
