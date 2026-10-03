begin;

-- Scope is immutable with the media version. No historical reference or byte is rewritten.
alter table public.media_versions add column storage_scope text;

-- Historical S3 identities were verified against the two registered pilot
-- objects and their separate buckets before authoring this migration. The
-- journal in migration #25 does not record the mark RPC identity, so no other
-- S3 row can be classified automatically. A fresh local database has no rows.
do $$
begin
  if exists (select 1 from public.media_versions where storage_provider='s3'
    and id not in ('97e5cd8c-5ab8-4e33-9d75-09b0153ee516'::uuid,
                   'f694bec5-b8f6-4508-a450-d2fdf33d7f28'::uuid))
    or exists (select 1 from public.media_versions v where v.storage_provider='s3'
      and ((v.id='97e5cd8c-5ab8-4e33-9d75-09b0153ee516' and
            v.asset_id<>'d1e30f09-8ebf-4fb8-b2ca-f108bb7a7f2a') or
           (v.id='f694bec5-b8f6-4508-a450-d2fdf33d7f28' and
            v.asset_id<>'1fb22133-2b9c-4415-86ee-073b22a47ba7')))
    or exists (select 1 from public.media_versions v
      where v.storage_provider='s3' and not exists (
        select 1 from public.cms_media_upload_attempts a
        where a.version_id=v.id and a.status='registered'
          and a.registered_media_version_id=v.id
          and a.object_key='cms-media/'||v.id::text||'.webp')) then
    raise exception using errcode='23514',message='Unclassified S3 media version';
  end if;
end; $$;

alter table public.media_versions disable trigger media_versions_immutable;
update public.media_versions set storage_scope=case
  when storage_provider='supabase' and storage_bucket='cms-media-preview' then 'preview'
  when storage_provider='supabase' and storage_bucket='cms-media-production' then 'production'
  when storage_provider='s3' and id='97e5cd8c-5ab8-4e33-9d75-09b0153ee516' then 'preview'
  when storage_provider='s3' and id='f694bec5-b8f6-4508-a450-d2fdf33d7f28' then 'production'
  else null end;
alter table public.media_versions enable trigger media_versions_immutable;
alter table public.media_versions add constraint media_versions_storage_scope_check check (
  (storage_provider in ('static','local') and storage_scope is null) or
  (storage_provider='supabase' and
    ((storage_bucket='cms-media-preview' and storage_scope='preview') or
     (storage_bucket='cms-media-production' and storage_scope='production'))) or
  (storage_provider='s3' and storage_scope is not null and storage_scope in ('preview','production'))
);

alter table public.cms_media_upload_attempts add column storage_scope text
  check (storage_scope in ('preview','production'));
alter table public.cms_media_upload_attempts disable trigger cms_media_attempt_guard;
update public.cms_media_upload_attempts set storage_scope=case
  when version_id='97e5cd8c-5ab8-4e33-9d75-09b0153ee516' then 'preview'
  when version_id='f694bec5-b8f6-4508-a450-d2fdf33d7f28' then 'production'
  else null end
where status='registered';
alter table public.cms_media_upload_attempts enable trigger cms_media_attempt_guard;
alter table public.cms_media_upload_attempts add constraint cms_media_attempt_uploaded_scope_check
  check (status not in ('uploaded','registered') or storage_scope is not null);

create or replace function public.cms_guard_media_upload_attempt() returns trigger
language plpgsql set search_path='' as $$
begin
  if not (new.status=any(case old.status
      when 'prepared' then array['uploaded','definite_failure','ambiguous']
      when 'uploaded' then array['registered','definite_failure','ambiguous']
      when 'definite_failure' then array['cleaned']
      else array[]::text[] end)) then
    raise exception using errcode='23514',message='Invalid upload transition';
  end if;
  if (to_jsonb(new)-array['status','updated_at','registered_media_version_id','last_error_code','storage_scope'])
     is distinct from
     (to_jsonb(old)-array['status','updated_at','registered_media_version_id','last_error_code','storage_scope'])
     or (new.storage_scope is distinct from old.storage_scope and not
       (old.status='prepared' and new.status='uploaded' and old.storage_scope is null
        and new.storage_scope in ('preview','production'))) then
    raise exception using errcode='23514',message='Immutable upload identity';
  end if;
  new.updated_at:=now();
  return new;
end;$$;

-- Registration RPCs cannot take browser-supplied scope. The fixed mark RPC
-- records it on the locked journal row; this trigger enforces it on insert.
create function public.cms_assign_media_storage_scope() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.storage_provider='s3' then
    select a.storage_scope into new.storage_scope
      from public.cms_media_upload_attempts a
      where a.version_id=new.id and a.status='uploaded'
        and a.object_key=new.storage_path and a.content_hash=new.content_hash
        and a.byte_size=new.byte_size and a.width=new.width
        and a.height=new.height and a.mime_type=new.mime_type;
    if new.storage_scope is null then
      raise exception using errcode='23514',message='S3 upload scope unavailable';
    end if;
  elsif new.storage_provider='supabase' then
    new.storage_scope:=case new.storage_bucket
      when 'cms-media-preview' then 'preview'
      when 'cms-media-production' then 'production' else null end;
  else
    new.storage_scope:=null;
  end if;
  return new;
end;$$;
create trigger cms_media_scope_insert before insert on public.media_versions
  for each row execute function public.cms_assign_media_storage_scope();
revoke all on function public.cms_assign_media_storage_scope() from public,anon,authenticated,service_role;

-- A capability is a server-only 32-byte value. PostgREST supplies request
-- headers to the transaction. The browser's JWT alone cannot assert scope.
create function public.cms_media_request_scope() returns text
language plpgsql stable security definer set search_path='' as $$
declare token text; result text; matches integer;
begin
  if not public.is_cms_admin_aal2() then return null; end if;
  token:=current_setting('request.headers',true)::jsonb->>'x-cms-media-scope-capability';
  if token is null or token !~ '^[0-9a-f]{64}$' then return null; end if;
  select count(*)::integer,max(case capability_name
    when 's3-upload-preview-v1' then 'preview'
    when 's3-upload-production-v1' then 'production' end) into matches,result
    from public.cms_external_media_capability
    where token_hash=extensions.digest(decode(token,'hex'),'sha256')
      and capability_name in ('s3-upload-preview-v1','s3-upload-production-v1');
  return case when matches=1 then result else null end;
exception when invalid_text_representation then return null;
end;$$;
revoke all on function public.cms_media_request_scope() from public,anon,authenticated,service_role;

create function public.cms_assert_media_version_scope(version_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare required_scope text;
begin
  select storage_scope into required_scope from public.media_versions where id=version_id;
  -- Preserve the foreign-key error for nonexistent UUIDs; scope applies to
  -- registered versions only.
  if not found then return; end if;
  if required_scope is not null and
    required_scope is distinct from public.cms_media_request_scope() then
    raise exception using errcode='42501',message='CMS_MEDIA_SCOPE_MISMATCH';
  end if;
end;$$;
revoke all on function public.cms_assert_media_version_scope(uuid) from public,anon,authenticated,service_role;

create function public.cms_assert_revision_media_scope(revision uuid) returns void
language plpgsql security definer set search_path='' as $$
declare vid uuid;
begin
  for vid in select media_version_id from public.revision_media_refs
    where revision_id=revision loop
    perform public.cms_assert_media_version_scope(vid);
  end loop;
  for vid in select prm.media_version_id from public.page_revision_blocks b
    join public.promotion_revision_media prm on prm.revision_id=b.promotion_revision_id
    where b.revision_id=revision loop
    perform public.cms_assert_media_version_scope(vid);
  end loop;
end;$$;
revoke all on function public.cms_assert_revision_media_scope(uuid) from public,anon,authenticated,service_role;

create function public.cms_guard_revision_media_scope() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform public.cms_assert_media_version_scope(new.media_version_id);
  return new;
end;$$;
create trigger revision_media_scope before insert on public.revision_media_refs
  for each row execute function public.cms_guard_revision_media_scope();
revoke all on function public.cms_guard_revision_media_scope() from public,anon,authenticated,service_role;

create function public.cms_guard_page_promotion_scope() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.promotion_revision_id is not null then
    perform public.cms_assert_revision_media_scope(new.promotion_revision_id);
  end if;
  return new;
end;$$;
create trigger page_promotion_media_scope before insert on public.page_revision_blocks
  for each row execute function public.cms_guard_page_promotion_scope();
revoke all on function public.cms_guard_page_promotion_scope() from public,anon,authenticated,service_role;

create function public.cms_guard_publication_media_scope() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.published_revision_id is distinct from old.published_revision_id then
    perform public.cms_assert_revision_media_scope(new.published_revision_id);
  end if;
  return new;
end;$$;
create trigger publication_media_scope before update on public.content_publication_state
  for each row execute function public.cms_guard_publication_media_scope();
revoke all on function public.cms_guard_publication_media_scope() from public,anon,authenticated,service_role;

-- Schedules are shared between deployments. Until schedules themselves have
-- an environment owner, a scoped-media promotion cannot be scheduled.
create function public.cms_guard_schedule_media_scope() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists (select 1 from public.revision_media_refs r
    join public.media_versions v on v.id=r.media_version_id
    where r.revision_id=new.promotion_revision_id and v.storage_scope is not null) then
    raise exception using errcode='42501',message='CMS_MEDIA_SCOPE_MISMATCH';
  end if;
  return new;
end;$$;
create trigger schedule_media_scope before insert or update of promotion_revision_id,status
  on public.cms_promotion_schedules for each row execute function public.cms_guard_schedule_media_scope();
create trigger active_schedule_media_scope before insert or update of promotion_revision_id
  on public.cms_active_promotion_placements for each row execute function public.cms_guard_schedule_media_scope();
revoke all on function public.cms_guard_schedule_media_scope() from public,anon,authenticated,service_role;

-- Replacements of the existing public projections follow below.

create or replace function public.cms_mark_external_media_uploaded(
  version_id uuid, observed_object_key text, observed_byte_size integer,
  observed_content_hash text, server_capability text)
returns void language plpgsql security definer set search_path='' as $$
declare j public.cms_media_upload_attempts; expected_hash bytea;
begin
  if not public.is_cms_admin_aal2() or server_capability is null
    or server_capability !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='42501',message='CMS access denied';
  end if;
  select token_hash into expected_hash from public.cms_external_media_capability
    where capability_name='s3-upload-preview-v1';
  if expected_hash is null or
    expected_hash<>extensions.digest(decode(server_capability,'hex'),'sha256') then
    raise exception using errcode='42501',message='CMS access denied';
  end if;
  select * into j from public.cms_media_upload_attempts
    where cms_media_upload_attempts.version_id=cms_mark_external_media_uploaded.version_id
    for update;
  if not found or j.actor_id is distinct from auth.uid() or j.status<>'prepared'
    or j.object_key is distinct from observed_object_key
    or j.byte_size is distinct from observed_byte_size
    or j.content_hash is distinct from observed_content_hash then
    raise exception using errcode='55000',message='Upload state conflict';
  end if;
  update public.cms_media_upload_attempts set status='uploaded',storage_scope='preview'
    where cms_media_upload_attempts.version_id=j.version_id;
end;$$;

create or replace function public.cms_mark_external_media_uploaded_production(
  version_id uuid, observed_object_key text, observed_byte_size integer,
  observed_content_hash text, server_capability text)
returns void language plpgsql security definer set search_path='' as $$
declare j public.cms_media_upload_attempts; expected_hash bytea;
begin
  if not public.is_cms_admin_aal2() or server_capability is null
    or server_capability !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='42501',message='CMS access denied';
  end if;
  select token_hash into expected_hash from public.cms_external_media_capability
    where capability_name='s3-upload-production-v1';
  if expected_hash is null or
    expected_hash<>extensions.digest(decode(server_capability,'hex'),'sha256') then
    raise exception using errcode='42501',message='CMS access denied';
  end if;
  select * into j from public.cms_media_upload_attempts
    where cms_media_upload_attempts.version_id=cms_mark_external_media_uploaded_production.version_id
    for update;
  if not found or j.actor_id is distinct from auth.uid() or j.status<>'prepared'
    or j.object_key is distinct from observed_object_key
    or j.byte_size is distinct from observed_byte_size
    or j.content_hash is distinct from observed_content_hash then
    raise exception using errcode='55000',message='Upload state conflict';
  end if;
  update public.cms_media_upload_attempts set status='uploaded',storage_scope='production'
    where cms_media_upload_attempts.version_id=j.version_id;
end;$$;

create or replace function public.cms_revision_media_projection(target_revision uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('revision_id',r.revision_id,'media_version_id',r.media_version_id,'usage_role',r.usage_role,'position',r.position,'alt_text',r.alt_text,'caption',r.caption,'provider',v.storage_provider,'storage_scope',v.storage_scope,'width',v.width,'height',v.height) order by r.usage_role,r.position),'[]'::jsonb)
 from public.revision_media_refs r join public.media_versions v on v.id=r.media_version_id where r.revision_id=target_revision;
$$;

create or replace function public.cms_read_public_media_version(target_version uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with current_refs as (
   select doc.id as document_id,doc.content_type,doc.content_key
   from public.revision_media_refs ref
   join public.content_revisions revision on revision.id=ref.revision_id
   join public.content_publication_state state on state.document_id=revision.document_id
     and state.published_revision_id=revision.id
   join public.content_documents doc on doc.id=revision.document_id
   where ref.media_version_id=target_version and
     (doc.content_type='service' or (doc.content_type='page' and
       (doc.content_key in ('about','home') or exists(
         select 1 from public.cms_new_page_identity identity
         join public.cms_page_routes route on route.page_id=identity.document_id
           and route.kind='page'
         where identity.document_id=doc.id and identity.lifecycle='published'))))
 ), pinned as (
   select page_doc.id as document_id,page_doc.content_key
   from public.promotion_revision_media prm
   join public.content_revisions promotion on promotion.id=prm.revision_id
   join public.cms_promotion_identity identity on identity.document_id=promotion.document_id
     and identity.status='active'
   join public.page_revision_blocks block on block.promotion_revision_id=promotion.id
     and block.block_type='promotionBanner' and not block.hidden
   join public.content_revisions page_revision on page_revision.id=block.revision_id
   join public.content_publication_state state on state.document_id=page_revision.document_id
     and state.published_revision_id=page_revision.id
   join public.content_documents page_doc on page_doc.id=page_revision.document_id
     and page_doc.content_type='page'
   where prm.media_version_id=target_version
     and public.cms_revision_payload(promotion)->>'mediaVersionId'=target_version::text
     and public.cms_revision_payload(promotion)->>'enabled'='true'
     and (page_doc.content_key in ('about','home') or exists(
       select 1 from public.cms_new_page_identity page_identity
       join public.cms_page_routes route on route.page_id=page_identity.document_id
         and route.kind='page'
       where page_identity.document_id=page_doc.id and page_identity.lifecycle='published'))
 ), scheduled as (
   select placement.placement_kind||':'||placement.target_key as placement
   from public.promotion_revision_media prm
   join public.content_revisions promotion on promotion.id=prm.revision_id
   join public.cms_promotion_identity identity on identity.document_id=promotion.document_id
     and identity.status='active'
   join public.cms_active_promotion_placements placement
     on placement.promotion_revision_id=promotion.id
   join public.cms_promotion_schedules schedule on schedule.id=placement.schedule_id
     and schedule.promotion_document_id=promotion.document_id
     and schedule.promotion_revision_id=promotion.id and schedule.status='active'
   where prm.media_version_id=target_version
     and schedule.starts_at<=now() and (schedule.ends_at is null or schedule.ends_at>now())
     and public.cms_revision_payload(promotion)->>'mediaVersionId'=target_version::text
     and public.cms_revision_payload(promotion)->>'enabled'='true'
 )
 select jsonb_build_object('id',v.id,'storage_provider',v.storage_provider,'storage_bucket',v.storage_bucket,'storage_scope',v.storage_scope,
   'mime_type',v.mime_type,'content_hash',v.content_hash,'byte_size',v.byte_size,
   'serviceKeys',(select coalesce(jsonb_agg(distinct content_key),'[]'::jsonb) from current_refs where content_type='service'),
   'pageKeys',(select coalesce(jsonb_agg(distinct content_key),'[]'::jsonb) from current_refs where content_type='page'),
   'pageSlugs',(select coalesce(jsonb_agg(distinct route.slug),'[]'::jsonb)
     from current_refs ref join public.cms_page_routes route on route.page_id=ref.document_id and route.kind='page'
     join public.cms_new_page_identity identity on identity.document_id=route.page_id and identity.lifecycle='published'
     where ref.content_type='page' and ref.content_key like 'new:%'),
   'home',exists(select 1 from current_refs where content_type='page' and content_key='home'),
   'pinnedPageKeys',(select coalesce(jsonb_agg(distinct content_key),'[]'::jsonb) from pinned),
   'pinnedPageSlugs',(select coalesce(jsonb_agg(distinct route.slug),'[]'::jsonb)
     from pinned ref join public.cms_page_routes route on route.page_id=ref.document_id and route.kind='page'),
   'scheduledPlacements',(select coalesce(jsonb_agg(distinct placement),'[]'::jsonb) from scheduled))
 from public.media_versions v where v.id=target_version
 and (exists(select 1 from current_refs) or exists(select 1 from pinned) or exists(select 1 from scheduled));
$$;

commit;
