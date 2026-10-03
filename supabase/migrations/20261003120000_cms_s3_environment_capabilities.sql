begin;

-- Rename the existing Preview identity in place. token_hash is never rewritten.
alter table public.cms_external_media_capability
  drop constraint cms_external_media_capability_capability_name_check;
update public.cms_external_media_capability
  set capability_name='s3-upload-preview-v1'
  where capability_name='s3-upload-v1';
alter table public.cms_external_media_capability
  add constraint cms_external_media_capability_capability_name_check
  check (capability_name in ('s3-upload-preview-v1','s3-upload-production-v1'));

-- The existing RPC remains the Preview RPC. Its signature and grants are
-- unchanged so the deployed Preview can continue to upload after migration.
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
  update public.cms_media_upload_attempts set status='uploaded'
    where cms_media_upload_attempts.version_id=j.version_id;
end;$$;

-- The Production RPC has a fixed, different verifier identity. The caller
-- cannot supply a capability name or select a lookup row through an argument.
create function public.cms_mark_external_media_uploaded_production(
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
  update public.cms_media_upload_attempts set status='uploaded'
    where cms_media_upload_attempts.version_id=j.version_id;
end;$$;

alter function public.cms_mark_external_media_uploaded_production(uuid,text,integer,text,text)
  owner to postgres;
revoke all on function public.cms_mark_external_media_uploaded_production(uuid,text,integer,text,text)
  from public,anon,authenticated,service_role;
grant execute on function public.cms_mark_external_media_uploaded_production(uuid,text,integer,text,text)
  to authenticated;

commit;
