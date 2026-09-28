begin;

-- A stale editor is a permanent business conflict, not a retryable serialization
-- failure. PT409 maps to HTTP 409; preserve row locks, AAL2 checks and all writes.
-- Historical migration and existing data/grants remain unchanged.
create or replace function public.cms_save_service_draft(expected_generation bigint, base_revision uuid, payload jsonb, restore_revision uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.content_publication_state; rev uuid; next_number integer;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  select st.* into s from public.content_publication_state st join public.content_documents d on d.id=st.document_id
    where d.content_type='service' and d.content_key='delicate-upholstery-cleaning' for update of st;
  if not found then raise exception using errcode='55000',message='CMS baseline missing'; end if;
  if expected_generation is distinct from s.generation or base_revision is distinct from s.draft_revision_id then
    raise exception using errcode='PT409',message='CMS edit conflict'; end if;
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

create or replace function public.cms_publish_service_revision(expected_generation bigint, revision uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.content_publication_state;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  select st.* into s from public.content_publication_state st join public.content_documents d on d.id=st.document_id
    where d.content_type='service' and d.content_key='delicate-upholstery-cleaning' for update of st;
  if not found then raise exception using errcode='55000',message='CMS baseline missing'; end if;
  if expected_generation is distinct from s.generation or revision is distinct from s.draft_revision_id then
    raise exception using errcode='PT409',message='CMS edit conflict'; end if;
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

commit;
