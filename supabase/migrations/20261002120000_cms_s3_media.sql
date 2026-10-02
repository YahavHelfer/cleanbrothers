begin;

-- S3 stores bytes only. Existing static/local/Supabase versions are untouched.
alter table public.media_versions drop constraint media_versions_storage_provider_check;
alter table public.media_versions add constraint media_versions_storage_provider_check
  check (storage_provider in ('static','local','supabase','s3'));
alter table public.media_versions drop constraint media_versions_storage_location_check;
alter table public.media_versions add constraint media_versions_storage_location_check check (
  (storage_provider='static' and storage_bucket is null
    and public.cms_valid_static_version(id,storage_path,content_hash,byte_size,width,height,mime_type)) or
  (storage_provider='local' and storage_bucket is null
    and storage_path=id::text||'.webp' and mime_type='image/webp') or
  (storage_provider='supabase' and storage_bucket in ('cms-media-preview','cms-media-production')
    and storage_path=id::text||'.webp' and mime_type='image/webp' and byte_size<=4194304) or
  (storage_provider='s3' and storage_bucket is null
    and storage_path='cms-media/'||id::text||'.webp'
    and mime_type='image/webp' and byte_size<=4194304)
);

-- Provision the SHA-256 of a separate, 32-byte random server capability after
-- migration. The token itself must exist only in server environment storage.
create table public.cms_external_media_capability (
  capability_name text primary key check (capability_name='s3-upload-v1'),
  token_hash bytea not null check (octet_length(token_hash)=32)
);
revoke all on public.cms_external_media_capability from public,anon,authenticated,service_role;
alter table public.cms_external_media_capability enable row level security;
alter table public.cms_external_media_capability force row level security;

create table public.cms_media_upload_attempts (
  version_id uuid primary key,
  actor_id uuid not null references auth.users(id),
  target_asset_id uuid references public.media_assets(id),
  expected_generation bigint,
  provider text not null default 's3' check (provider='s3'),
  object_key text not null unique,
  byte_size integer not null check (byte_size between 1 and 4194304),
  width integer not null check (width between 1 and 6000),
  height integer not null check (height between 1 and 6000),
  mime_type text not null default 'image/webp' check (mime_type='image/webp'),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  original_filename text not null check (char_length(original_filename) between 1 and 125),
  metadata jsonb not null check (public.cms_valid_media_metadata(metadata)),
  status text not null default 'prepared' check (status in
    ('prepared','uploaded','registered','definite_failure','ambiguous','cleaned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  registered_media_version_id uuid references public.media_versions(id),
  last_error_code text,
  check ((target_asset_id is null)=(expected_generation is null)),
  check (expected_generation is null or expected_generation>0),
  check (object_key='cms-media/'||version_id::text||'.webp'),
  check (width::bigint*height<=16000000),
  check ((status='registered')=(registered_media_version_id is not null)),
  check (registered_media_version_id is null or registered_media_version_id=version_id),
  check ((status in ('definite_failure','cleaned'))=(last_error_code is not null))
);
create index cms_media_attempts_reconcile
  on public.cms_media_upload_attempts(status,updated_at,version_id);
revoke all on public.cms_media_upload_attempts from public,anon,authenticated,service_role;
alter table public.cms_media_upload_attempts enable row level security;
alter table public.cms_media_upload_attempts force row level security;

create function public.cms_guard_media_upload_attempt() returns trigger
language plpgsql set search_path='' as $$
begin
  if not (new.status=any(case old.status
      when 'prepared' then array['uploaded','definite_failure','ambiguous']
      when 'uploaded' then array['registered','definite_failure','ambiguous']
      when 'definite_failure' then array['cleaned']
      else array[]::text[] end)) then
    raise exception using errcode='23514',message='Invalid upload transition';
  end if;
  if (to_jsonb(new)-array['status','updated_at','registered_media_version_id','last_error_code'])
     is distinct from
     (to_jsonb(old)-array['status','updated_at','registered_media_version_id','last_error_code']) then
    raise exception using errcode='23514',message='Immutable upload identity';
  end if;
  new.updated_at:=now();
  return new;
end;$$;
create trigger cms_media_attempt_guard before update on public.cms_media_upload_attempts
  for each row execute function public.cms_guard_media_upload_attempt();

create function public.cms_prepare_external_media_upload(
  version_id uuid,target_asset uuid,expected_generation bigint,
  details jsonb,metadata jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.media_assets;
begin
  if not public.is_cms_admin_aal2() then
    raise exception using errcode='42501',message='CMS access denied';
  end if;
  if version_id is null or version_id::text !~
       '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or (target_asset is null) is distinct from (expected_generation is null)
    or not public.cms_valid_media_metadata(metadata)
    or details is null or jsonb_typeof(details)<>'object'
    or (select count(*) from jsonb_object_keys(details))<>6
    or not details ?& array['mimeType','byteSize','width','height','contentHash','originalFilename']
    or details->>'mimeType'<>'image/webp'
    or jsonb_typeof(details->'byteSize')<>'number'
    or jsonb_typeof(details->'width')<>'number'
    or jsonb_typeof(details->'height')<>'number'
    or jsonb_typeof(details->'contentHash')<>'string'
    or jsonb_typeof(details->'originalFilename')<>'string'
    or details->>'byteSize' !~ '^[1-9][0-9]*$'
    or details->>'width' !~ '^[1-9][0-9]*$'
    or details->>'height' !~ '^[1-9][0-9]*$'
    or (details->>'byteSize')::bigint>4194304
    or (details->>'width')::bigint>6000
    or (details->>'height')::bigint>6000
    or (details->>'width')::bigint*(details->>'height')::bigint>16000000
    or details->>'contentHash' !~ '^[0-9a-f]{64}$'
    or char_length(details->>'originalFilename') not between 1 and 125
    or details->>'originalFilename' ~ E'[/\\\\<>\\x01-\\x1f]'
    or details->>'originalFilename' !~* E'\\.(jpe?g|png|webp)$'
    or position('..' in details->>'originalFilename')>0
  then
    raise exception using errcode='22023',message='Invalid media details';
  end if;
  if target_asset is not null then
    select * into a from public.media_assets where id=target_asset for share;
    if not found or a.generation is distinct from expected_generation then
      raise exception using errcode='PT409',message='CMS media conflict';
    end if;
    if a.status<>'available' then
      raise exception using errcode='55000',message='CMS media archived';
    end if;
  end if;
  insert into public.cms_media_upload_attempts(
    version_id,actor_id,target_asset_id,expected_generation,object_key,
    byte_size,width,height,content_hash,original_filename,metadata)
  values(version_id,auth.uid(),target_asset,expected_generation,
    'cms-media/'||version_id::text||'.webp',
    (details->>'byteSize')::integer,(details->>'width')::integer,
    (details->>'height')::integer,details->>'contentHash',
    details->>'originalFilename',metadata);
  return version_id;
end;$$;

-- Only the server possesses the independent random capability. The same AAL2
-- user's JWT is also required, so the token alone cannot mark an upload.
create function public.cms_mark_external_media_uploaded(
  version_id uuid,observed_object_key text,observed_byte_size integer,
  observed_content_hash text,server_capability text)
returns void language plpgsql security definer set search_path='' as $$
declare j public.cms_media_upload_attempts; expected_hash bytea;
begin
  if not public.is_cms_admin_aal2() or server_capability is null
    or server_capability !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='42501',message='CMS access denied';
  end if;
  select token_hash into expected_hash from public.cms_external_media_capability
    where capability_name='s3-upload-v1';
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
  update public.cms_media_upload_attempts set status='uploaded'
    where cms_media_upload_attempts.version_id=j.version_id;
end;$$;

create function public.cms_register_external_media_version(version_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare j public.cms_media_upload_attempts; a public.media_assets;
  asset uuid; n integer; old jsonb; event_kind text;
begin
  if not public.is_cms_admin_aal2() then
    raise exception using errcode='42501',message='CMS access denied';
  end if;
  select * into j from public.cms_media_upload_attempts
    where cms_media_upload_attempts.version_id=cms_register_external_media_version.version_id
    for update;
  if not found or j.status<>'uploaded' or j.actor_id is distinct from auth.uid()
    or j.provider<>'s3' or j.object_key is distinct from
      'cms-media/'||j.version_id::text||'.webp' then
    raise exception using errcode='55000',message='Upload state conflict';
  end if;
  if j.target_asset_id is null then
    insert into public.media_assets(alt_text,caption,folder,created_by)
      values(j.metadata->>'altText',j.metadata->>'caption',
        j.metadata->>'folder',j.actor_id) returning id into asset;
    n:=1; event_kind:='upload';
  else
    select * into a from public.media_assets where id=j.target_asset_id for update;
    if not found or a.generation is distinct from j.expected_generation then
      raise exception using errcode='PT409',message='CMS media conflict';
    end if;
    if a.status<>'available' then
      raise exception using errcode='55000',message='CMS media archived';
    end if;
    asset:=a.id; old:=to_jsonb(a); event_kind:='replace';
    select max(version_number)+1 into n from public.media_versions where asset_id=asset;
  end if;
  insert into public.media_versions(id,asset_id,version_number,storage_provider,
    storage_bucket,storage_path,mime_type,byte_size,width,height,content_hash,
    original_filename,created_by)
  values(j.version_id,asset,n,'s3',null,j.object_key,j.mime_type,
    j.byte_size,j.width,j.height,j.content_hash,j.original_filename,j.actor_id);
  update public.media_assets set alt_text=j.metadata->>'altText',
    caption=j.metadata->>'caption',folder=j.metadata->>'folder',
    current_version_id=j.version_id,
    generation=case when event_kind='upload' then 1 else generation+1 end,
    updated_at=now() where id=asset returning * into a;
  insert into public.media_audit_events(asset_id,version_id,actor_id,kind,
    before_state,after_state)
  values(asset,j.version_id,j.actor_id,event_kind,old,to_jsonb(a));
  update public.cms_media_upload_attempts set status='registered',
    registered_media_version_id=j.version_id where cms_media_upload_attempts.version_id=j.version_id;
  return asset;
end;$$;

create function public.cms_mark_external_media_ambiguous(version_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then
    raise exception using errcode='42501',message='CMS access denied';
  end if;
  update public.cms_media_upload_attempts set status='ambiguous'
    where cms_media_upload_attempts.version_id=cms_mark_external_media_ambiguous.version_id
      and actor_id=auth.uid() and status in ('prepared','uploaded');
  if not found then raise exception using errcode='55000',message='Upload state conflict';end if;
end;$$;
create function public.cms_mark_external_media_definite_failure(version_id uuid,error_code text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() or error_code is null
    or error_code !~ '^[A-Z_]{2,40}$' then
    raise exception using errcode='42501',message='CMS access denied';
  end if;
  update public.cms_media_upload_attempts set status='definite_failure',
    last_error_code=error_code
    where cms_media_upload_attempts.version_id=cms_mark_external_media_definite_failure.version_id
      and actor_id=auth.uid() and status in ('prepared','uploaded');
  if not found then raise exception using errcode='55000',message='Upload state conflict';end if;
end;$$;
create function public.cms_mark_external_media_cleaned(version_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then
    raise exception using errcode='42501',message='CMS access denied';
  end if;
  update public.cms_media_upload_attempts set status='cleaned'
    where cms_media_upload_attempts.version_id=cms_mark_external_media_cleaned.version_id
      and actor_id=auth.uid() and status='definite_failure'
      and registered_media_version_id is null;
  if not found then raise exception using errcode='55000',message='Upload state conflict';end if;
end;$$;
create function public.cms_external_media_reconciliation()
returns jsonb language sql stable security definer set search_path='' as $$
  select case when public.is_cms_admin_aal2() then
    coalesce((select jsonb_agg(jsonb_build_object(
      'versionId',version_id,'actorId',actor_id,'assetId',target_asset_id,
      'status',status,'createdAt',created_at,'updatedAt',updated_at,
      'registeredMediaVersionId',registered_media_version_id,
      'lastErrorCode',last_error_code) order by updated_at desc)
      from public.cms_media_upload_attempts),'[]'::jsonb)
    else null end;
$$;

alter function public.cms_guard_media_upload_attempt() owner to postgres;
alter function public.cms_prepare_external_media_upload(uuid,uuid,bigint,jsonb,jsonb) owner to postgres;
alter function public.cms_mark_external_media_uploaded(uuid,text,integer,text,text) owner to postgres;
alter function public.cms_register_external_media_version(uuid) owner to postgres;
alter function public.cms_mark_external_media_ambiguous(uuid) owner to postgres;
alter function public.cms_mark_external_media_definite_failure(uuid,text) owner to postgres;
alter function public.cms_mark_external_media_cleaned(uuid) owner to postgres;
alter function public.cms_external_media_reconciliation() owner to postgres;
revoke all on function public.cms_guard_media_upload_attempt() from public,anon,authenticated,service_role;
revoke all on function public.cms_prepare_external_media_upload(uuid,uuid,bigint,jsonb,jsonb)
  from public,anon,authenticated,service_role;
revoke all on function public.cms_mark_external_media_uploaded(uuid,text,integer,text,text)
  from public,anon,authenticated,service_role;
revoke all on function public.cms_register_external_media_version(uuid)
  from public,anon,authenticated,service_role;
revoke all on function public.cms_mark_external_media_ambiguous(uuid)
  from public,anon,authenticated,service_role;
revoke all on function public.cms_mark_external_media_definite_failure(uuid,text)
  from public,anon,authenticated,service_role;
revoke all on function public.cms_mark_external_media_cleaned(uuid)
  from public,anon,authenticated,service_role;
revoke all on function public.cms_external_media_reconciliation()
  from public,anon,authenticated,service_role;
grant execute on function public.cms_prepare_external_media_upload(uuid,uuid,bigint,jsonb,jsonb),
  public.cms_mark_external_media_uploaded(uuid,text,integer,text,text),
  public.cms_register_external_media_version(uuid),
  public.cms_mark_external_media_ambiguous(uuid),
  public.cms_mark_external_media_definite_failure(uuid,text),
  public.cms_mark_external_media_cleaned(uuid),
  public.cms_external_media_reconciliation() to authenticated;
-- Update the legacy scheduled reader while preserving the manual-campaign
-- wrapper introduced by migration #22 (which suppresses duplicate banners).
create or replace function public.cms_read_active_legacy_promotion_placement(kind text, target text)
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
          and v.storage_provider in ('static','local','supabase','s3')));
$$;

-- Current-publication projection also includes the immutable byte size.
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
 select jsonb_build_object('id',v.id,'storage_provider',v.storage_provider,'storage_bucket',v.storage_bucket,
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
alter function public.cms_read_public_media_version(uuid) owner to postgres;
revoke all on function public.cms_read_public_media_version(uuid) from public,anon,authenticated,service_role;
grant execute on function public.cms_read_public_media_version(uuid) to anon,authenticated;
commit;
