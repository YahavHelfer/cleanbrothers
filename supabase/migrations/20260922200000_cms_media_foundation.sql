begin;

-- Phase 2B1. No Storage buckets or cloud configuration. Legacy static bytes stay put.
create table public.media_assets (
 id uuid primary key default gen_random_uuid(), status text not null default 'available' check(status in ('available','archived')),
 generation bigint not null default 1 check(generation>0), current_version_id uuid,
 alt_text text not null check(char_length(btrim(alt_text)) between 1 and 300),
 caption text not null default '' check(char_length(caption)<=1000), folder text not null default '' check(char_length(folder)<=80),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),updated_at timestamptz not null default now(),archived_at timestamptz,
 check((status='archived')=(archived_at is not null))
);
create table public.media_versions (
 id uuid primary key, asset_id uuid not null references public.media_assets(id),version_number integer not null check(version_number>0),
 storage_provider text not null check(storage_provider in ('static','local')),storage_bucket text,
 storage_path text not null,mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),
 byte_size integer not null check(byte_size between 1 and 8388608),width integer not null check(width between 1 and 6000),height integer not null check(height between 1 and 6000),
 content_hash text not null check(content_hash ~ '^[0-9a-f]{64}$'),original_filename text not null check(char_length(original_filename) between 1 and 125 and original_filename !~ E'[/\\\\<>\\x01-\\x1f]'),
 created_by uuid references auth.users(id),created_at timestamptz not null default now(),
 unique(asset_id,version_number),unique(asset_id,id),unique(storage_provider,storage_path),check(width::bigint*height<=16000000),check(storage_bucket is null),
 check((storage_provider='static' and storage_path='/images/services/delicate-upholstery-cleaning.jpeg') or
 (storage_provider='local' and storage_path=id::text||'.webp' and mime_type='image/webp'))
);
alter table public.media_assets add foreign key(id,current_version_id) references public.media_versions(asset_id,id) deferrable initially deferred;
create index media_versions_hash on public.media_versions(content_hash);
create table public.revision_media_refs (
 revision_id uuid not null references public.content_revisions(id),media_version_id uuid not null references public.media_versions(id),
 usage_role text not null check(usage_role in ('hero','benefits','result')),position integer not null check(position between 0 and 7),
 alt_text text not null check(char_length(btrim(alt_text)) between 1 and 300),caption text not null default '' check(char_length(caption)<=1000),
 primary key(revision_id,usage_role,position),unique(revision_id,usage_role,media_version_id)
);
create index revision_media_version_usage on public.revision_media_refs(media_version_id);
create table public.media_audit_events (
 id uuid primary key default gen_random_uuid(),asset_id uuid not null references public.media_assets(id),version_id uuid references public.media_versions(id),
 actor_id uuid references auth.users(id),kind text not null check(kind in ('bootstrap','upload','replace','metadata','archive','restore')),
 occurred_at timestamptz not null default now(),before_state jsonb,after_state jsonb not null,
 check((kind='bootstrap')=(actor_id is null))
);
create trigger media_versions_immutable before update or delete on public.media_versions for each row execute function public.cms_reject_revision_mutation();
create trigger revision_media_refs_immutable before update or delete on public.revision_media_refs for each row execute function public.cms_reject_revision_mutation();
create trigger media_audit_immutable before update or delete on public.media_audit_events for each row execute function public.cms_reject_revision_mutation();
create trigger media_assets_no_delete before delete on public.media_assets for each row execute function public.cms_reject_revision_mutation();

create function public.cms_valid_media_metadata(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text; lim integer;
begin
 if p is null or jsonb_typeof(p)<>'object' or (select count(*) from jsonb_object_keys(p))<>3 or not p ?& array['altText','caption','folder'] then return false; end if;
 foreach k in array array['altText','caption','folder'] loop
 lim:=case k when 'altText' then 300 when 'caption' then 1000 else 80 end;
 if jsonb_typeof(p->k)<>'string' or char_length(p->>k)>lim or (p->>k) ~ E'[<>\\x01-\\x1f\\x7f]' then return false;end if;
 end loop;
 return length(btrim(p->>'altText'))>0;
exception when others then return false;end;
$$;

-- Only the isolated server holding the LOCAL service key may attest decoded bytes.
-- Browser/AAL2 clients cannot invoke this RPC or forge file-validation metadata.
create function public.cms_register_media_version(target_asset uuid,expected_generation bigint,version_id uuid,details jsonb,metadata jsonb,actor uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.media_assets; asset uuid; n integer; old jsonb; event_kind text;
begin
 if auth.role() is distinct from 'service_role' or not exists(select 1 from public.cms_admin_members m join auth.users u on u.id=m.user_id where m.user_id=actor and m.is_active and m.role='admin' and (u.invited_at is null or m.password_setup_completed_at is not null)) then raise exception using errcode='42501',message='CMS access denied';end if;
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
 insert into public.media_versions(id,asset_id,version_number,storage_provider,storage_path,mime_type,byte_size,width,height,content_hash,original_filename,created_by)
 values(version_id,asset,n,'local',version_id::text||'.webp','image/webp',(details->>'byteSize')::integer,(details->>'width')::integer,(details->>'height')::integer,details->>'contentHash',details->>'originalFilename',actor);
 update public.media_assets set alt_text=metadata->>'altText',caption=metadata->>'caption',folder=metadata->>'folder',current_version_id=version_id,generation=case when event_kind='upload' then 1 else generation+1 end,updated_at=now() where id=asset returning * into a;
 insert into public.media_audit_events(asset_id,version_id,actor_id,kind,before_state,after_state) values(asset,version_id,actor,event_kind,old,to_jsonb(a));
 return asset;
end;$$;

create function public.cms_update_media_asset(target_asset uuid,expected_generation bigint,operation text,metadata jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.media_assets; old jsonb;
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
 select * into a from public.media_assets where id=target_asset for update;
 if not found or a.generation is distinct from expected_generation then raise exception using errcode='PT409',message='CMS media conflict';end if;
 old:=to_jsonb(a);
 if operation='metadata' then
   if not public.cms_valid_media_metadata(metadata) then raise exception using errcode='22023',message='Invalid media metadata';end if;
   update public.media_assets set alt_text=metadata->>'altText',caption=metadata->>'caption',folder=metadata->>'folder' where id=a.id;
 elsif operation in ('archive','restore') then
   update public.media_assets set status=case operation when 'archive' then 'archived' else 'available' end,archived_at=case operation when 'archive' then now() else null end where id=a.id;
 else raise exception using errcode='22023',message='Invalid media operation';end if;
 update public.media_assets set generation=generation+1,updated_at=now() where id=a.id returning * into a;
 insert into public.media_audit_events(asset_id,version_id,actor_id,kind,before_state,after_state) values(a.id,a.current_version_id,auth.uid(),operation,old,to_jsonb(a));
 return a.id;
end;$$;

-- Keep schema 1 valid and byte-for-byte immutable; new schema 2 stores version UUIDs.
alter function public.cms_valid_pilot_payload(jsonb) rename to cms_valid_pilot_payload_v1;
create function public.cms_valid_pilot_payload(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare v jsonb;
begin
 if p->'schemaVersion'='1'::jsonb then return public.cms_valid_pilot_payload_v1(p);end if;
 if p->'schemaVersion' is distinct from '2'::jsonb or jsonb_typeof(p->'images') is distinct from 'array' then return false;end if;
 if jsonb_array_length(p->'images') not between 1 and 8 then return false;end if;
 for v in select value from jsonb_array_elements(p->'images') loop
   if jsonb_typeof(v)<>'string' or (v#>>'{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false;end if;
 end loop;
 if (select count(distinct value) from jsonb_array_elements(p->'images'))<>jsonb_array_length(p->'images') then return false;end if;
 return public.cms_valid_pilot_payload_v1(p||'{"schemaVersion":1,"images":["/images/services/delicate-upholstery-cleaning.jpeg"]}'::jsonb);
exception when others then return false;end;$$;
alter table public.content_revisions drop constraint content_revisions_schema_version_check;
alter table public.content_revisions add constraint content_revisions_schema_version_check check(schema_version in (1,2));
-- Renaming a function preserves the old CHECK's OID dependency; replace that CHECK explicitly.
alter table public.content_revisions drop constraint content_revisions_check;
alter table public.content_revisions add constraint content_revisions_payload_check check(public.cms_valid_pilot_payload(body||jsonb_build_object('schemaVersion',schema_version,'publicTitle',public_title,'h1',h1,'seoTitle',seo_title,'seoDescription',seo_description)));

create function public.cms_attach_revision_media() returns trigger language plpgsql security definer set search_path='' as $$
declare vid uuid; idx integer; role_name text; alt text; cap text; a public.media_assets;
begin
 if new.source_revision_id is not null and exists(select 1 from public.revision_media_refs where revision_id=new.source_revision_id) then
   insert into public.revision_media_refs select new.id,media_version_id,usage_role,position,alt_text,caption from public.revision_media_refs where revision_id=new.source_revision_id;
   return new;
 end if;
 for vid,idx in select case when new.schema_version=1 then 'd1000000-0000-4000-8000-000000000001'::uuid else value::uuid end,(ordinality-1)::integer from jsonb_array_elements_text(new.body->'images') with ordinality loop
   select m.* into a from public.media_assets m join public.media_versions v on v.asset_id=m.id where v.id=vid for share of m;
   if not found then
     if new.schema_version=1 then continue;end if;
     raise exception using errcode='23503',message='Unknown media version';
   end if;
   if a.status='archived' and new.schema_version=2 and not exists(select 1 from public.revision_media_refs where revision_id=new.base_revision_id and media_version_id=vid) then raise exception using errcode='55000',message='CMS media archived';end if;
   cap:=a.caption;
   foreach role_name in array array['hero','benefits','result'] loop
     if role_name='result' and idx<>0 then continue;end if;
     alt:=case role_name when 'hero' then new.body->>'imageAlt' when 'benefits' then 'תיעוד אמיתי של '||new.public_title||' על ידי CleanBrothers' else 'צילום מהשטח במהלך '||new.public_title end;
     insert into public.revision_media_refs values(new.id,vid,role_name,idx,alt,cap);
   end loop;
 end loop;
 return new;
end;$$;
create trigger content_revision_media after insert on public.content_revisions for each row execute function public.cms_attach_revision_media();

-- Explicit operator/system import, never attributed to an invented administrator.
create function public.cms_import_static_pilot_media() returns uuid language plpgsql security definer set search_path='' as $$
declare aid uuid:='d0000000-0000-4000-8000-000000000001';vid uuid:='d1000000-0000-4000-8000-000000000001';r public.content_revisions;role_name text;
begin
 perform pg_advisory_xact_lock(20260923,1);
 if not exists(select 1 from public.media_assets where id=aid) then
   insert into public.media_assets(id,alt_text,folder) values(aid,'ניקוי מבוקר של ריפוד עדין על ידי CleanBrothers','ריפודים עדינים');
   insert into public.media_versions(id,asset_id,version_number,storage_provider,storage_path,mime_type,byte_size,width,height,content_hash,original_filename)
   values(vid,aid,1,'static','/images/services/delicate-upholstery-cleaning.jpeg','image/jpeg',132211,1600,1200,'b1420c216c60afec56597ccba27c5cabd2ee44f54a2904ac1b7824225e696107','delicate-upholstery-cleaning.jpeg');
   update public.media_assets set current_version_id=vid where id=aid;
   insert into public.media_audit_events(asset_id,version_id,kind,after_state) select aid,vid,'bootstrap',to_jsonb(m) from public.media_assets m where id=aid;
 end if;
 -- Add relational references alongside legacy rows, never rewrite their content/audit.
 for r in select * from public.content_revisions where schema_version=1 loop
   foreach role_name in array array['hero','benefits','result'] loop
     insert into public.revision_media_refs values(r.id,vid,role_name,0,case role_name when 'hero' then r.body->>'imageAlt' when 'benefits' then 'תיעוד אמיתי של '||r.public_title||' על ידי CleanBrothers' else 'צילום מהשטח במהלך '||r.public_title end,'') on conflict do nothing;
   end loop;
 end loop;
 return aid;
end;$$;

create function public.cms_revision_media_projection(target_revision uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('revision_id',r.revision_id,'media_version_id',r.media_version_id,'usage_role',r.usage_role,'position',r.position,'alt_text',r.alt_text,'caption',r.caption,'provider',v.storage_provider,'width',v.width,'height',v.height) order by r.usage_role,r.position),'[]'::jsonb)
 from public.revision_media_refs r join public.media_versions v on v.id=r.media_version_id where r.revision_id=target_revision;
$$;
create function public.cms_read_revision_media(target_revision uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
 return public.cms_revision_media_projection(target_revision);
end;$$;
create or replace function public.cms_read_published_pilot() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('revisionId',r.id,'payload',public.cms_revision_payload(r)) || case when r.schema_version=2 then jsonb_build_object('media',public.cms_revision_media_projection(r.id)) else '{}'::jsonb end
 from public.content_documents d join public.content_publication_state s on s.document_id=d.id join public.content_revisions r on r.document_id=d.id and r.id=s.published_revision_id
 where d.content_type='service' and d.content_key='delicate-upholstery-cleaning';
$$;
-- No unauthenticated arbitrary revision selection; only bytes already published at least once.
create function public.cms_read_public_media_version(target_version uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',v.id,'storage_provider',v.storage_provider,'storage_path',v.storage_path,'mime_type',v.mime_type,'content_hash',v.content_hash)
 from public.media_versions v where v.id=target_version and exists(select 1 from public.revision_media_refs r join public.content_publication_events e on e.revision_id=r.revision_id where r.media_version_id=v.id);
$$;

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
    values(s.document_id,next_number,(payload->>'schemaVersion')::integer,payload->>'publicTitle',payload->>'h1',payload->>'seoTitle',payload->>'seoDescription',
      payload - array['schemaVersion','publicTitle','h1','seoTitle','seoDescription'],auth.uid(),base_revision,restore_revision) returning id into rev;
  update public.content_publication_state set draft_revision_id=rev,generation=generation+1 where document_id=s.document_id;
  update public.content_documents set updated_at=now() where id=s.document_id;
  return rev;
end;
$$;

do $$declare t text; f regprocedure;
begin
 foreach t in array array['media_assets','media_versions','revision_media_refs','media_audit_events'] loop
 execute format('alter table public.%I enable row level security',t);execute format('alter table public.%I force row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy cms_media_aal2_read on public.%I for select to authenticated using ((select public.is_cms_admin_aal2()))',t);
 end loop;
 for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in ('cms_valid_media_metadata','cms_register_media_version','cms_update_media_asset','cms_valid_pilot_payload','cms_valid_pilot_payload_v1','cms_attach_revision_media','cms_import_static_pilot_media','cms_revision_media_projection','cms_read_revision_media','cms_read_public_media_version') loop
 execute format('alter function %s owner to postgres',f);execute format('revoke all on function %s from public,anon,authenticated,service_role',f);
 end loop;
end $$;
grant execute on function public.cms_register_media_version(uuid,bigint,uuid,jsonb,jsonb,uuid) to service_role;
grant execute on function public.cms_update_media_asset(uuid,bigint,text,jsonb) to authenticated;
grant execute on function public.cms_read_revision_media(uuid) to authenticated;
grant execute on function public.cms_read_public_media_version(uuid) to anon,authenticated;
create function public.cms_media_library() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
 return coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('version',to_jsonb(v),'usageCount',(select count(*) from public.revision_media_refs r join public.media_versions mv on mv.id=r.media_version_id where mv.asset_id=a.id),'publishedUsageCount',(select count(*) from public.revision_media_refs r join public.media_versions mv on mv.id=r.media_version_id join public.content_publication_state st on st.published_revision_id=r.revision_id where mv.asset_id=a.id)) order by a.created_at desc) from public.media_assets a join public.media_versions v on v.id=a.current_version_id),'[]'::jsonb);
end;$$;
create function public.cms_media_detail(target_asset uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
 return (select jsonb_build_object('asset',to_jsonb(a),'versions',(select coalesce(jsonb_agg(v order by version_number desc),'[]'::jsonb) from public.media_versions v where v.asset_id=a.id),'usages',(select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('revisionNumber',c.revision_number,'published',exists(select 1 from public.content_publication_state st where st.published_revision_id=r.revision_id)) order by c.revision_number desc,r.usage_role,r.position),'[]'::jsonb) from public.revision_media_refs r join public.media_versions v on v.id=r.media_version_id join public.content_revisions c on c.id=r.revision_id where v.asset_id=a.id),'audit',(select coalesce(jsonb_agg(e order by occurred_at desc),'[]'::jsonb) from public.media_audit_events e where e.asset_id=a.id)) from public.media_assets a where a.id=target_asset);
end;$$;
revoke all on function public.cms_media_library(),public.cms_media_detail(uuid) from public,anon,authenticated,service_role;
grant execute on function public.cms_media_library(),public.cms_media_detail(uuid) to authenticated;
commit;
