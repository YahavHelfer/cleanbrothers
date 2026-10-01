begin;

-- Production uploads use the administrator's AAL2 JWT. Historical Preview
-- objects and every existing immutable media version remain unchanged.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cms-media-production','cms-media-production',false,4194304,array['image/webp']::text[])
on conflict (id) do nothing;
do $$ begin
 if not exists(select 1 from storage.buckets where id='cms-media-production'
   and name='cms-media-production' and not public and file_size_limit=4194304
   and allowed_mime_types=array['image/webp']::text[]) then
   raise exception 'CMS media bucket configuration mismatch';
 end if;
end $$;

alter table public.media_versions drop constraint media_versions_storage_location_check;
alter table public.media_versions add constraint media_versions_storage_location_check check(
 (storage_provider='static' and storage_bucket is null and public.cms_valid_static_version(id,storage_path,content_hash,byte_size,width,height,mime_type)) or
 (storage_provider='local' and storage_bucket is null and storage_path=id::text||'.webp' and mime_type='image/webp') or
 (storage_provider='supabase' and storage_bucket in ('cms-media-preview','cms-media-production')
   and storage_path=id::text||'.webp' and mime_type='image/webp' and byte_size<=4194304)
);

create policy cms_production_media_insert on storage.objects for insert to authenticated
with check (bucket_id='cms-media-production' and public.is_cms_admin_aal2()
 and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
 and owner_id=auth.uid()::text);
create policy cms_production_media_admin_read on storage.objects for select to authenticated
using (bucket_id='cms-media-production' and public.is_cms_admin_aal2()
 and storage.allow_any_operation(array['object.get_authenticated','object.delete']));
-- The bucket stays private. Only the download operation for a currently
-- published, registered version is public; object.list remains denied.
create function public.cms_published_media_object(object_bucket text, object_path text)
returns boolean language sql stable security definer set search_path='' as $$
 select object_bucket='cms-media-production' and exists(
   select 1 from public.media_versions v
   where v.storage_bucket='cms-media-production' and v.storage_path=object_path
     and v.storage_provider='supabase'
     and public.cms_read_public_media_version(v.id) is not null);
$$;
alter function public.cms_published_media_object(text,text) owner to postgres;
revoke all on function public.cms_published_media_object(text,text) from public,anon,authenticated,service_role;
grant execute on function public.cms_published_media_object(text,text) to anon,authenticated;
create policy cms_production_media_published_read on storage.objects for select to anon,authenticated
using (bucket_id='cms-media-production'
 and storage.allow_only_operation('object.get_authenticated')
 and public.cms_published_media_object(bucket_id,name));
create policy cms_production_media_orphan_delete on storage.objects for delete to authenticated
using (bucket_id='cms-media-production' and public.is_cms_admin_aal2()
 and owner_id=auth.uid()::text
 and not exists(select 1 from public.media_versions v
   where v.storage_bucket='cms-media-production' and v.storage_path=name));

create function public.cms_register_authenticated_media_version(
 target_asset uuid, expected_generation bigint, version_id uuid,
 details jsonb, metadata jsonb, actor uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.media_assets; asset uuid; n integer; old jsonb; event_kind text;
begin
 if not public.is_cms_admin_aal2() or actor is distinct from auth.uid() then
   raise exception using errcode='42501',message='CMS access denied';
 end if;
 if version_id is null or version_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
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
   or (details->>'byteSize')::bigint > 4194304
   or (details->>'width')::bigint > 6000 or (details->>'height')::bigint > 6000
   or (details->>'width')::bigint*(details->>'height')::bigint > 16000000
   or details->>'contentHash' !~ '^[0-9a-f]{64}$'
   or char_length(details->>'originalFilename') not between 1 and 125
   or details->>'originalFilename' ~ E'[/\\\\<>\\x01-\\x1f]'
   or details->>'originalFilename' !~* E'\\.(jpe?g|png|webp)$'
   or position('..' in details->>'originalFilename') > 0
 then raise exception using errcode='22023',message='Invalid media details'; end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='cms-media-production'
   and o.name=version_id::text||'.webp' and o.owner_id=auth.uid()::text
   and o.metadata->>'mimetype'='image/webp'
   and o.metadata->>'size'=details->>'byteSize') then
   raise exception using errcode='22023',message='Media object unavailable';
 end if;
 if target_asset is null then
   if expected_generation is not null then raise exception using errcode='22023',message='Invalid media generation';end if;
   insert into public.media_assets(alt_text,caption,folder,created_by)
   values(metadata->>'altText',metadata->>'caption',metadata->>'folder',actor) returning id into asset;
   n:=1;event_kind:='upload';
 else
   select * into a from public.media_assets where id=target_asset for update;
   if not found or a.generation is distinct from expected_generation then
     raise exception using errcode='PT409',message='CMS media conflict';end if;
   if a.status<>'available' then raise exception using errcode='55000',message='CMS media archived';end if;
   asset:=a.id;old:=to_jsonb(a);event_kind:='replace';
   select max(version_number)+1 into n from public.media_versions where asset_id=asset;
 end if;
 insert into public.media_versions(id,asset_id,version_number,storage_provider,storage_bucket,storage_path,
   mime_type,byte_size,width,height,content_hash,original_filename,created_by)
 values(version_id,asset,n,'supabase','cms-media-production',version_id::text||'.webp',
   'image/webp',(details->>'byteSize')::integer,(details->>'width')::integer,
   (details->>'height')::integer,details->>'contentHash',details->>'originalFilename',actor);
 update public.media_assets set alt_text=metadata->>'altText',caption=metadata->>'caption',folder=metadata->>'folder',
   current_version_id=version_id,generation=case when event_kind='upload' then 1 else generation+1 end,
   updated_at=now() where id=asset returning * into a;
 insert into public.media_audit_events(asset_id,version_id,actor_id,kind,before_state,after_state)
 values(asset,version_id,actor,event_kind,old,to_jsonb(a));
 return asset;
end;$$;
alter function public.cms_register_authenticated_media_version(uuid,bigint,uuid,jsonb,jsonb,uuid) owner to postgres;
revoke all on function public.cms_register_authenticated_media_version(uuid,bigint,uuid,jsonb,jsonb,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.cms_register_authenticated_media_version(uuid,bigint,uuid,jsonb,jsonb,uuid)
 to authenticated;

create or replace function public.cms_media_library() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
 return coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object(
  'version',to_jsonb(v),
  'versionCount',(select count(*) from public.media_versions mv where mv.asset_id=a.id),
  'usageCount',(select count(*) from public.revision_media_refs r join public.media_versions mv on mv.id=r.media_version_id where mv.asset_id=a.id),
  'publishedUsageCount',(select count(*) from public.revision_media_refs r join public.media_versions mv on mv.id=r.media_version_id join public.content_publication_state st on st.published_revision_id=r.revision_id where mv.asset_id=a.id)) order by a.created_at desc)
  from public.media_assets a join public.media_versions v on v.id=a.current_version_id),'[]'::jsonb);
end;$$;
alter function public.cms_media_library() owner to postgres;
revoke all on function public.cms_media_library() from public,anon,authenticated,service_role;
grant execute on function public.cms_media_library() to authenticated;

-- Public projection returns identity/scope only. It never accepts a path or a
-- revision ID. Only CURRENT published references qualify; historical Admin
-- previews use their own authenticated route.
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
   'mime_type',v.mime_type,'content_hash',v.content_hash,
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
