begin;

-- Phase 2B2 forward provider support. Does not create buckets, policies, users or
-- content. Requires separate approval before cloud application.
alter table public.media_versions drop constraint media_versions_storage_provider_check;
alter table public.media_versions drop constraint media_versions_storage_bucket_check;
alter table public.media_versions drop constraint media_versions_check1;
alter table public.media_versions add constraint media_versions_storage_provider_check
 check(storage_provider in ('static','local','supabase'));
alter table public.media_versions add constraint media_versions_storage_location_check check(
 (storage_provider='static' and storage_bucket is null and storage_path='/images/services/delicate-upholstery-cleaning.jpeg') or
 (storage_provider='local' and storage_bucket is null and storage_path=id::text||'.webp' and mime_type='image/webp') or
 (storage_provider='supabase' and storage_bucket is not null and storage_bucket='cms-media-preview' and storage_path=id::text||'.webp' and mime_type='image/webp' and byte_size<=4194304)
 );

-- A separate fixed-provider entry point retains the reviewed local RPC unchanged.
-- Browser/AAL2 clients cannot attest decoded file metadata or choose bucket/path.
create function public.cms_register_preview_media_version(target_asset uuid,expected_generation bigint,version_id uuid,details jsonb,metadata jsonb,actor uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.media_assets; asset uuid; n integer; old jsonb; event_kind text;
begin
 if auth.role() is distinct from 'service_role' or not exists(select 1 from public.cms_admin_members m join auth.users u on u.id=m.user_id where m.user_id=actor and m.is_active and m.role='admin' and (u.invited_at is null or m.password_setup_completed_at is not null)) then raise exception using errcode='42501',message='CMS access denied';end if;
 -- The application independently authorizes AAL2 and attests normalized bytes.
 -- Registration also requires the exact private, size-restricted bucket/object.
 if not exists(select 1 from storage.buckets b where b.id='cms-media-preview' and not b.public and b.file_size_limit=8388608 and b.allowed_mime_types=array['image/webp']::text[])
 or not exists(select 1 from storage.objects o where o.bucket_id='cms-media-preview' and o.name=version_id::text||'.webp' and o.metadata->>'mimetype'='image/webp' and (o.metadata->>'size')::bigint=(details->>'byteSize')::bigint)
 then raise exception using errcode='22023',message='Preview media object unavailable';end if;
 if not public.cms_valid_media_metadata(metadata) then raise exception using errcode='22023',message='Invalid media metadata';end if;
 if target_asset is null then
   if expected_generation is not null then raise exception using errcode='22023',message='Invalid media generation';end if;
   insert into public.media_assets(alt_text,caption,folder,created_by) values(metadata->>'altText',metadata->>'caption',metadata->>'folder',actor) returning id into asset;
   n:=1;event_kind:='upload';
 else
   select * into a from public.media_assets where id=target_asset for update;
   if not found or a.generation is distinct from expected_generation then raise exception using errcode='PT409',message='CMS media conflict';end if;
   if a.status<>'available' then raise exception using errcode='55000',message='CMS media archived';end if;
   asset:=a.id;old:=to_jsonb(a);event_kind:='replace';
   select max(version_number)+1 into n from public.media_versions where asset_id=asset;
 end if;
 insert into public.media_versions(id,asset_id,version_number,storage_provider,storage_bucket,storage_path,mime_type,byte_size,width,height,content_hash,original_filename,created_by)
 values(version_id,asset,n,'supabase','cms-media-preview',version_id::text||'.webp','image/webp',(details->>'byteSize')::integer,(details->>'width')::integer,(details->>'height')::integer,details->>'contentHash',details->>'originalFilename',actor);
 update public.media_assets set alt_text=metadata->>'altText',caption=metadata->>'caption',folder=metadata->>'folder',current_version_id=version_id,generation=case when event_kind='upload' then 1 else generation+1 end,updated_at=now() where id=asset returning * into a;
 insert into public.media_audit_events(asset_id,version_id,actor_id,kind,before_state,after_state) values(asset,version_id,actor,event_kind,old,to_jsonb(a));
 return asset;
end;$$;

alter function public.cms_register_preview_media_version(uuid,bigint,uuid,jsonb,jsonb,uuid) owner to postgres;
revoke all on function public.cms_register_preview_media_version(uuid,bigint,uuid,jsonb,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.cms_register_preview_media_version(uuid,bigint,uuid,jsonb,jsonb,uuid) to service_role;
commit;
