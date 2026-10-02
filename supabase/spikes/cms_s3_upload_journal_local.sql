-- LOCAL ROLLBACK-ONLY PROTOTYPE. Surrogate media tables exercise the exact
-- journal/asset/version transaction; this is not a deployable migration.
\set ON_ERROR_STOP on
begin;
create extension if not exists pgcrypto with schema extensions;
create schema cms_s3_journal_spike;
revoke all on schema cms_s3_journal_spike from public, anon, authenticated, service_role;
grant usage on schema cms_s3_journal_spike to authenticated;

create table cms_s3_journal_spike.signing_keys(key_id text primary key, secret bytea not null);
create table cms_s3_journal_spike.assets(
  id uuid primary key, generation bigint not null check(generation > 0),
  status text not null check(status in ('available','archived')),
  current_version_id uuid, alt_text text not null, caption text not null,
  folder text not null, created_by uuid not null
);
create table cms_s3_journal_spike.versions(
  id uuid primary key, asset_id uuid not null references cms_s3_journal_spike.assets(id),
  version_number integer not null check(version_number > 0),
  provider text not null check(provider = 's3'),
  object_key text not null unique,
  byte_size integer not null check(byte_size between 1 and 4194304),
  width integer not null check(width between 1 and 6000),
  height integer not null check(height between 1 and 6000),
  mime_type text not null check(mime_type = 'image/webp'),
  content_hash text not null check(content_hash ~ '^[0-9a-f]{64}$'),
  original_filename text not null, created_by uuid not null,
  unique(asset_id,version_number),
  check(object_key = 'cms-media/' || id::text || '.webp'),
  check(width::bigint * height <= 16000000)
);
alter table cms_s3_journal_spike.assets add constraint current_version_fk
  foreign key(current_version_id) references cms_s3_journal_spike.versions(id)
  deferrable initially deferred;
create table cms_s3_journal_spike.audit_events(
  id bigint generated always as identity primary key, asset_id uuid not null,
  version_id uuid not null, actor_id uuid not null, kind text not null
  check(kind in ('upload','replace'))
);
create table cms_s3_journal_spike.attempts(
  version_id uuid primary key,
  actor_id uuid not null,
  target_asset_id uuid references cms_s3_journal_spike.assets(id),
  expected_generation bigint,
  provider text not null default 's3' check(provider='s3'),
  object_key text not null unique,
  byte_size integer not null check(byte_size between 1 and 4194304),
  width integer not null check(width between 1 and 6000),
  height integer not null check(height between 1 and 6000),
  mime_type text not null default 'image/webp' check(mime_type='image/webp'),
  content_hash text not null check(content_hash ~ '^[0-9a-f]{64}$'),
  original_filename text not null,
  alt_text text not null, caption text not null, folder text not null,
  status text not null default 'prepared' check(status in
    ('prepared','uploaded','registered','definite_failure','ambiguous','cleaned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  registered_media_version_id uuid references cms_s3_journal_spike.versions(id),
  last_error_code text,
  check((target_asset_id is null) = (expected_generation is null)),
  check(expected_generation is null or expected_generation > 0),
  check(object_key = 'cms-media/' || version_id::text || '.webp'),
  check(width::bigint * height <= 16000000),
  check((status='registered') = (registered_media_version_id is not null)),
  check(registered_media_version_id is null or registered_media_version_id=version_id),
  check((status in ('definite_failure','cleaned')) = (last_error_code is not null))
);
create index attempts_reconcile on cms_s3_journal_spike.attempts(status,updated_at,version_id);
revoke all on all tables in schema cms_s3_journal_spike from public,anon,authenticated,service_role;
insert into cms_s3_journal_spike.signing_keys values('v1',decode(repeat('11',32),'hex'));

create function cms_s3_journal_spike.guard_attempt() returns trigger
language plpgsql set search_path='' as $$
begin
  if not (new.status = any(case old.status
    when 'prepared' then array['uploaded','definite_failure','ambiguous']
    when 'uploaded' then array['registered','definite_failure','ambiguous']
    when 'ambiguous' then array['registered','definite_failure']
    when 'definite_failure' then array['cleaned']
    else array[]::text[] end)) then
    raise exception using errcode='23514',message='Invalid journal transition';
  end if;
  if (to_jsonb(new) - array['status','updated_at','registered_media_version_id','last_error_code'])
    is distinct from
     (to_jsonb(old) - array['status','updated_at','registered_media_version_id','last_error_code']) then
    raise exception using errcode='23514',message='Immutable journal identity';
  end if;
  new.updated_at := now();
  return new;
end;$$;
create trigger attempt_state before update on cms_s3_journal_spike.attempts
  for each row execute function cms_s3_journal_spike.guard_attempt();

create function cms_s3_journal_spike.canonical(p jsonb) returns text
language plpgsql immutable set search_path='' as $$
declare names text[] := array[
  'keyId','versionId','actorUserId','targetAssetId','expectedGeneration',
  'storageProvider','objectKey','byteSize','width','height','mimeType',
  'contentHash','originalFilename','altText','caption','folder',
  'issuedAt','expiresAt','nonce'];
  field text; result text := E'cms-s3-media-register-v1\n'; encoded text;
begin
  if jsonb_typeof(p)<>'object' or
     (select count(*) from jsonb_object_keys(p))<>array_length(names,1) then
    raise exception using errcode='22023',message='Invalid attestation fields';
  end if;
  foreach field in array names loop
    if not p ? field then
      raise exception using errcode='22023',message='Missing attestation field';
    end if;
    encoded := case when p->field='null'::jsonb then '~' else
      replace(replace(encode(convert_to(p->>field,'UTF8'),'base64'),E'\n',''),E'\r','') end;
    result := result||field||'='||encoded||E'\n';
  end loop;
  return result;
end;$$;

create function cms_s3_journal_spike.prepare(
  target_asset uuid, expected_generation bigint, byte_size integer,
  width integer, height integer, content_hash text, original_filename text,
  metadata jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare version uuid;
begin
  if not public.is_cms_admin_aal2() then
    raise exception using errcode='42501',message='CMS access denied';
  end if;
  if (target_asset is null) is distinct from (expected_generation is null) or
     (target_asset is not null and not exists(
       select 1 from cms_s3_journal_spike.assets where id=target_asset)) or
     byte_size is null or byte_size not between 1 and 4194304 or
     width is null or width not between 1 and 6000 or
     height is null or height not between 1 and 6000 or
     width::bigint*height>16000000 or
     content_hash is null or content_hash !~ '^[0-9a-f]{64}$' or
     original_filename is null or
     original_filename !~* '^[^/\\]{1,125}\.(jpe?g|png|webp)$' or
     not public.cms_valid_media_metadata(metadata) then
    raise exception using errcode='22023',message='Invalid upload preparation';
  end if;
  version := gen_random_uuid();
  insert into cms_s3_journal_spike.attempts(
    version_id,actor_id,target_asset_id,expected_generation,object_key,
    byte_size,width,height,content_hash,original_filename,alt_text,caption,folder)
  values(version,auth.uid(),target_asset,expected_generation,
    'cms-media/'||version::text||'.webp',byte_size,width,height,content_hash,
    original_filename,metadata->>'altText',metadata->>'caption',metadata->>'folder');
  return version;
end;$$;

create function cms_s3_journal_spike.mark_uploaded(version uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then
    raise exception using errcode='42501',message='CMS access denied';
  end if;
  update cms_s3_journal_spike.attempts set status='uploaded'
    where version_id=version and actor_id=auth.uid() and status='prepared';
  if not found then raise exception using errcode='55000',message='Upload state conflict';end if;
end;$$;

create function cms_s3_journal_spike.register(
  version uuid, target_asset uuid, expected_generation bigint,
  details jsonb, metadata jsonb, attestation jsonb, signature text) returns uuid
language plpgsql security definer set search_path='' as $$
declare j cms_s3_journal_spike.attempts; a cms_s3_journal_spike.assets;
  actor uuid; secret bytea; expected text; issued bigint; expiry bigint;
  current_second bigint; asset uuid; next_number integer; event_kind text;
begin
  if not public.is_cms_admin_aal2() then
    raise exception using errcode='42501',message='CMS access denied';
  end if;
  actor := auth.uid();
  perform cms_s3_journal_spike.canonical(attestation);
  select * into j from cms_s3_journal_spike.attempts where version_id=version for update;
  if not found then raise exception using errcode='P0002',message='Upload journal missing';end if;
  if j.status not in ('uploaded','ambiguous') or j.actor_id<>actor or
     j.target_asset_id is distinct from target_asset or
     j.expected_generation is distinct from expected_generation or
     attestation->>'actorUserId' is distinct from actor::text or
     jsonb_typeof(attestation->'keyId')<>'string' or
     jsonb_typeof(attestation->'versionId')<>'string' or
     jsonb_typeof(attestation->'actorUserId')<>'string' or
     jsonb_typeof(attestation->'targetAssetId') is distinct from
       (case when target_asset is null then 'null' else 'string' end) or
     jsonb_typeof(attestation->'expectedGeneration') is distinct from
       (case when expected_generation is null then 'null' else 'number' end) or
     jsonb_typeof(attestation->'storageProvider')<>'string' or
     jsonb_typeof(attestation->'objectKey')<>'string' or
     jsonb_typeof(attestation->'byteSize')<>'number' or
     jsonb_typeof(attestation->'width')<>'number' or
     jsonb_typeof(attestation->'height')<>'number' or
     jsonb_typeof(attestation->'mimeType')<>'string' or
     jsonb_typeof(attestation->'contentHash')<>'string' or
     jsonb_typeof(attestation->'originalFilename')<>'string' or
     jsonb_typeof(attestation->'altText')<>'string' or
     jsonb_typeof(attestation->'caption')<>'string' or
     jsonb_typeof(attestation->'folder')<>'string' or
     jsonb_typeof(attestation->'nonce')<>'string' or
     attestation->>'versionId' is distinct from version::text or
     attestation->>'targetAssetId' is distinct from target_asset::text or
     attestation->>'expectedGeneration' is distinct from expected_generation::text or
     attestation->>'storageProvider' is distinct from j.provider or
     attestation->>'objectKey' is distinct from j.object_key or
     attestation->>'mimeType' is distinct from j.mime_type or
     attestation->>'byteSize' is distinct from j.byte_size::text or
     attestation->>'width' is distinct from j.width::text or
     attestation->>'height' is distinct from j.height::text or
     attestation->>'contentHash' is distinct from j.content_hash or
     attestation->>'originalFilename' is distinct from j.original_filename or
     attestation->>'altText' is distinct from j.alt_text or
     attestation->>'caption' is distinct from j.caption or
     attestation->>'folder' is distinct from j.folder or
     details is distinct from jsonb_build_object(
       'byteSize',j.byte_size,'width',j.width,'height',j.height,
       'contentHash',j.content_hash,'originalFilename',j.original_filename) or
     metadata is distinct from jsonb_build_object(
       'altText',j.alt_text,'caption',j.caption,'folder',j.folder) or
     attestation->>'keyId' is distinct from 'v1' or
     attestation->>'nonce' !~ '^[0-9a-f]{32}$' or
     jsonb_typeof(attestation->'issuedAt')<>'number' or
     jsonb_typeof(attestation->'expiresAt')<>'number' or
     attestation->>'issuedAt' !~ '^[0-9]+$' or
     attestation->>'expiresAt' !~ '^[0-9]+$' then
    raise exception using errcode='22023',message='Attestation/journal mismatch';
  end if;
  issued := (attestation->>'issuedAt')::bigint;
  expiry := (attestation->>'expiresAt')::bigint;
  current_second := floor(extract(epoch from clock_timestamp()))::bigint;
  if issued>current_second+5 or expiry<=current_second or
     expiry<=issued or expiry-issued>60 then
    raise exception using errcode='22023',message='Expired attestation';
  end if;
  select k.secret into secret from cms_s3_journal_spike.signing_keys k
    where k.key_id=attestation->>'keyId';
  if secret is null or signature !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='42501',message='Invalid attestation signature';
  end if;
  expected := encode(extensions.hmac(
    convert_to(cms_s3_journal_spike.canonical(attestation),'UTF8'),secret,'sha256'),'hex');
  if expected is distinct from signature then
    raise exception using errcode='42501',message='Invalid attestation signature';
  end if;
  if target_asset is null then
    asset := gen_random_uuid();
    insert into cms_s3_journal_spike.assets values(
      asset,1,'available',null,j.alt_text,j.caption,j.folder,actor);
    next_number := 1;
    event_kind := 'upload';
  else
    select * into a from cms_s3_journal_spike.assets where id=target_asset for update;
    if not found or a.generation is distinct from expected_generation or
       a.status <> 'available' then
      raise exception using errcode='PT409',message='CMS media conflict';
    end if;
    asset := a.id;
    select coalesce(max(version_number),0)+1 into next_number
      from cms_s3_journal_spike.versions where asset_id=asset;
    event_kind := 'replace';
  end if;
  insert into cms_s3_journal_spike.versions values(
    version,asset,next_number,'s3',j.object_key,j.byte_size,j.width,j.height,
    j.mime_type,j.content_hash,j.original_filename,actor);
  update cms_s3_journal_spike.assets set current_version_id=version,
    generation=case when event_kind='upload' then 1 else generation+1 end,
    alt_text=j.alt_text,caption=j.caption,folder=j.folder where id=asset;
  insert into cms_s3_journal_spike.audit_events(asset_id,version_id,actor_id,kind)
    values(asset,version,actor,event_kind);
  update cms_s3_journal_spike.attempts set status='registered',
    registered_media_version_id=version,last_error_code=null where version_id=version;
  return asset;
end;$$;

create function cms_s3_journal_spike.mark_ambiguous(version uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
  update cms_s3_journal_spike.attempts set status='ambiguous'
    where version_id=version and actor_id=auth.uid() and status in ('prepared','uploaded');
  if not found then raise exception using errcode='55000',message='Ambiguous state conflict';end if;
end;$$;

create function cms_s3_journal_spike.mark_definite_failure(version uuid, error_code text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
  if error_code not in ('PUT_REJECTED','REGISTRATION_REJECTED','RECONCILED_UNREGISTERED') then
    raise exception using errcode='22023',message='Invalid failure code';end if;
  update cms_s3_journal_spike.attempts set status='definite_failure',
    last_error_code=error_code
    where version_id=version and actor_id=auth.uid() and
      ((status='prepared' and error_code='PUT_REJECTED') or
       (status='uploaded' and error_code='REGISTRATION_REJECTED') or
       (status='ambiguous' and error_code='RECONCILED_UNREGISTERED')) and
      not exists(select 1 from cms_s3_journal_spike.versions where id=version);
  if not found then raise exception using errcode='55000',message='Failure state conflict';end if;
end;$$;

create function cms_s3_journal_spike.cleanup_eligible(version uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare j cms_s3_journal_spike.attempts;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
  select * into j from cms_s3_journal_spike.attempts where version_id=version;
  return found and j.actor_id=auth.uid() and j.status='definite_failure' and
    j.object_key='cms-media/'||version::text||'.webp' and
    not exists(select 1 from cms_s3_journal_spike.versions where id=version);
end;$$;

revoke all on all functions in schema cms_s3_journal_spike
  from public,anon,authenticated,service_role;
grant execute on function cms_s3_journal_spike.prepare(uuid,bigint,integer,integer,integer,text,text,jsonb),
  cms_s3_journal_spike.mark_uploaded(uuid),
  cms_s3_journal_spike.register(uuid,uuid,bigint,jsonb,jsonb,jsonb,text),
  cms_s3_journal_spike.mark_ambiguous(uuid),
  cms_s3_journal_spike.mark_definite_failure(uuid,text),
  cms_s3_journal_spike.cleanup_eligible(uuid) to authenticated;

insert into auth.users(id,invited_at) values
  ('a5000000-0000-4000-8000-000000000001',null),
  ('a5000000-0000-4000-8000-000000000002',null),
  ('a5000000-0000-4000-8000-000000000003',null);
insert into public.cms_admin_members(user_id,is_active) values
  ('a5000000-0000-4000-8000-000000000001',true),
  ('a5000000-0000-4000-8000-000000000002',true);

-- Fixtures use signed synthetic payloads; no browser, AWS or real secrets.
create temporary table s3_journal_cases(
  name text primary key, version uuid, asset uuid, expected_generation bigint,
  details jsonb, metadata jsonb, p jsonb, signature text
);
grant select,insert,update on s3_journal_cases to authenticated;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a5000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
insert into s3_journal_cases(name,version,details,metadata)
select 'new',cms_s3_journal_spike.prepare(null,null,8,12,8,repeat('a',64),
  'photo.png','{"altText":"Alt","caption":"","folder":""}'::jsonb),
  jsonb_build_object('byteSize',8,'width',12,'height',8,
    'contentHash',repeat('a',64),'originalFilename','photo.png'),
  '{"altText":"Alt","caption":"","folder":""}'::jsonb;
select cms_s3_journal_spike.mark_uploaded(version) from s3_journal_cases where name='new';
reset role;
update s3_journal_cases c set p=jsonb_build_object(
  'keyId','v1','versionId',c.version::text,'actorUserId','a5000000-0000-4000-8000-000000000001',
  'targetAssetId',null,'expectedGeneration',null,
  'storageProvider','s3','objectKey','cms-media/'||c.version::text||'.webp',
  'byteSize',8,'width',12,'height',8,'mimeType','image/webp',
  'contentHash',repeat('a',64),'originalFilename','photo.png',
  'altText','Alt','caption','','folder','',
  'issuedAt',floor(extract(epoch from clock_timestamp()))::bigint,
  'expiresAt',floor(extract(epoch from clock_timestamp()))::bigint+60,
  'nonce',repeat('b',32)) where name='new';
update s3_journal_cases set signature=encode(extensions.hmac(
  convert_to(cms_s3_journal_spike.canonical(p),'UTF8'),
  (select secret from cms_s3_journal_spike.signing_keys where key_id='v1'),'sha256'),'hex');
insert into s3_journal_cases(name,version,asset,expected_generation,details,metadata,p)
select 'expired',version,asset,expected_generation,details,metadata,
  jsonb_set(jsonb_set(p,'{issuedAt}','1'::jsonb),'{expiresAt}','2'::jsonb)
  from s3_journal_cases where name='new';
update s3_journal_cases set signature=encode(extensions.hmac(
  convert_to(cms_s3_journal_spike.canonical(p),'UTF8'),
  (select secret from cms_s3_journal_spike.signing_keys where key_id='v1'),'sha256'),'hex')
  where name='expired';
insert into s3_journal_cases(name,version,asset,expected_generation,details,metadata,p)
select mutation.name,c.version,c.asset,c.expected_generation,c.details,c.metadata,
  jsonb_set(c.p,array[field],replacement)
  from s3_journal_cases c cross join (values
    ('signed_wrong_hash','contentHash',to_jsonb(repeat('c',64))),
    ('signed_wrong_size','byteSize','9'::jsonb),
    ('signed_wrong_key','objectKey',to_jsonb('cms-media/wrong.webp'::text))
  ) as mutation(name,field,replacement) where c.name='new';
update s3_journal_cases set signature=encode(extensions.hmac(
  convert_to(cms_s3_journal_spike.canonical(p),'UTF8'),
  (select secret from cms_s3_journal_spike.signing_keys where key_id='v1'),'sha256'),'hex')
  where name like 'signed_wrong_%';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a5000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
do $$ declare c record; accepted boolean:=false; begin
  select * into c from s3_journal_cases where name='new';
  begin perform cms_s3_journal_spike.register(
    c.version,null,null,c.details,c.metadata,c.p,c.signature);accepted:=true;
  exception when sqlstate '42501' then null;end;
  if accepted then raise exception 'Nonmember registration accepted';end if;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"a5000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
do $$ declare c record; accepted boolean:=false; begin
  select * into c from s3_journal_cases where name='new';
  begin perform cms_s3_journal_spike.register(
    c.version,null,null,c.details,c.metadata,c.p,c.signature);accepted:=true;
  exception when sqlstate '22023' then null;end;
  if accepted then raise exception 'Wrong actor accepted';end if;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"a5000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
do $$ declare c record; accepted boolean:=false; begin
  select * into c from s3_journal_cases where name='new';
  begin perform cms_s3_journal_spike.register(
    c.version,null,null,c.details,c.metadata,c.p,c.signature);accepted:=true;
  exception when sqlstate '42501' then null;end;
  if accepted then raise exception 'AAL1 accepted';end if;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"a5000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
do $$ declare c record; bad record; altered jsonb; accepted boolean; field text; begin
  select * into c from s3_journal_cases where name='new';
  foreach field in array array['objectKey','contentHash','byteSize','targetAssetId','versionId'] loop
    altered:=jsonb_set(c.p,array[field],case field
      when 'objectKey' then to_jsonb('cms-media/wrong.webp'::text)
      when 'contentHash' then to_jsonb(repeat('c',64))
      when 'byteSize' then '9'::jsonb
      when 'targetAssetId' then to_jsonb('a5000000-0000-4000-8000-000000000002'::text)
      else to_jsonb('a5000000-0000-4000-8000-000000000004'::text) end);
    accepted:=false;
    begin perform cms_s3_journal_spike.register(
      c.version,null,null,c.details,c.metadata,altered,c.signature);accepted:=true;
    exception when others then null;end;
    if accepted then raise exception 'Tampered field accepted: %',field;end if;
  end loop;
  accepted:=false;
  begin perform cms_s3_journal_spike.register(
    c.version,null,null,jsonb_set(c.details,'{byteSize}','9'::jsonb),c.metadata,c.p,c.signature);
    accepted:=true;
  exception when sqlstate '22023' then null;end;
  if accepted then raise exception 'RPC args mismatch accepted';end if;
  accepted:=false;
  begin perform cms_s3_journal_spike.register(
    gen_random_uuid(),null,null,c.details,c.metadata,c.p,c.signature);accepted:=true;
  exception when sqlstate 'P0002' then null;end;
  if accepted then raise exception 'Missing journal accepted';end if;
  accepted:=false;
  begin perform cms_s3_journal_spike.register(
    c.version,null,null,c.details,c.metadata,
    (select p from s3_journal_cases where name='expired'),
    (select signature from s3_journal_cases where name='expired'));accepted:=true;
  exception when sqlstate '22023' then null;end;
  if accepted then raise exception 'Expired attestation accepted';end if;
  for bad in select p,signature from s3_journal_cases where name like 'signed_wrong_%' loop
    accepted:=false;
    begin perform cms_s3_journal_spike.register(
      c.version,null,null,c.details,c.metadata,bad.p,bad.signature);accepted:=true;
    exception when sqlstate '22023' then null;end;
    if accepted then raise exception 'Validly signed journal mismatch accepted';end if;
  end loop;
  accepted:=false;
  begin perform cms_s3_journal_spike.register(
    c.version,gen_random_uuid(),1,c.details,c.metadata,c.p,c.signature);accepted:=true;
  exception when sqlstate '22023' then null;end;
  if accepted then raise exception 'Wrong asset accepted';end if;
  if cms_s3_journal_spike.register(c.version,null,null,c.details,c.metadata,c.p,c.signature) is null
    then raise exception 'New asset registration failed';end if;
  accepted:=false;
  begin perform cms_s3_journal_spike.register(
    c.version,null,null,c.details,c.metadata,c.p,c.signature);accepted:=true;
  exception when sqlstate '22023' then null;end;
  if accepted then raise exception 'Replay accepted';end if;
  if cms_s3_journal_spike.cleanup_eligible(c.version) then
    raise exception 'Registered version is cleanup candidate';end if;
end $$;
reset role;

-- Prepare a replacement against the newly created asset; a separately signed
-- stale-generation request must fail without altering the historical version.
select set_config('request.jwt.claims',
  '{"sub":"a5000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
insert into s3_journal_cases(name,asset,expected_generation,version,details,metadata)
select 'replace',v.asset_id,1,
  cms_s3_journal_spike.prepare(v.asset_id,1,9,12,8,repeat('c',64),'next.png',
    '{"altText":"Next","caption":"","folder":""}'::jsonb),
  jsonb_build_object('byteSize',9,'width',12,'height',8,
    'contentHash',repeat('c',64),'originalFilename','next.png'),
  '{"altText":"Next","caption":"","folder":""}'::jsonb
  from cms_s3_journal_spike.versions v where v.version_number=1;
set local role authenticated;
select cms_s3_journal_spike.mark_uploaded(version) from s3_journal_cases where name='replace';
reset role;
update s3_journal_cases c set p=jsonb_build_object(
  'keyId','v1','versionId',c.version::text,'actorUserId','a5000000-0000-4000-8000-000000000001',
  'targetAssetId',c.asset::text,'expectedGeneration',c.expected_generation,
  'storageProvider','s3','objectKey','cms-media/'||c.version::text||'.webp',
  'byteSize',9,'width',12,'height',8,'mimeType','image/webp',
  'contentHash',repeat('c',64),'originalFilename','next.png',
  'altText','Next','caption','','folder','',
  'issuedAt',floor(extract(epoch from clock_timestamp()))::bigint,
  'expiresAt',floor(extract(epoch from clock_timestamp()))::bigint+60,
  'nonce',repeat('d',32)) where name='replace';
update s3_journal_cases set signature=encode(extensions.hmac(
  convert_to(cms_s3_journal_spike.canonical(p),'UTF8'),
  (select secret from cms_s3_journal_spike.signing_keys where key_id='v1'),'sha256'),'hex')
  where name='replace';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a5000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
do $$ declare c record; accepted boolean:=false; other uuid; begin
  select * into c from s3_journal_cases where name='replace';
  begin perform cms_s3_journal_spike.register(c.version,c.asset,2,c.details,c.metadata,c.p,c.signature);
    accepted:=true;
  exception when sqlstate '22023' then null;end;
  if accepted then raise exception 'Wrong generation argument accepted';end if;
  if cms_s3_journal_spike.register(
    c.version,c.asset,c.expected_generation,c.details,c.metadata,c.p,c.signature) <> c.asset
    then raise exception 'Replacement failed';end if;
  other:=cms_s3_journal_spike.prepare(c.asset,1,9,12,8,repeat('e',64),'stale.png',
    '{"altText":"Stale","caption":"","folder":""}'::jsonb);
  perform cms_s3_journal_spike.mark_uploaded(other);
  -- A stale prepared generation is not a cleanup candidate merely because
  -- the current generation advanced; it needs a definite rejection first.
  if cms_s3_journal_spike.cleanup_eligible(other) then
    raise exception 'Stale uploaded attempt cleanup accepted';end if;
  perform cms_s3_journal_spike.mark_ambiguous(other);
  if cms_s3_journal_spike.cleanup_eligible(other) then
    raise exception 'Ambiguous attempt cleanup accepted';end if;
  perform cms_s3_journal_spike.mark_definite_failure(other,'RECONCILED_UNREGISTERED');
  if not cms_s3_journal_spike.cleanup_eligible(other) then
    raise exception 'Definite failed exact version not cleanup eligible';end if;
  begin update cms_s3_journal_spike.attempts set object_key='wrong' where version_id=other;
    raise exception 'Journal identity update accepted';
  exception when sqlstate '42501' then null;end;
end $$;
reset role;
insert into s3_journal_cases(name,asset,expected_generation,version,details,metadata)
select 'stale_signed',a.id,1,
  cms_s3_journal_spike.prepare(a.id,1,9,12,8,repeat('f',64),'stale-signed.png',
    '{"altText":"Stale signed","caption":"","folder":""}'::jsonb),
  jsonb_build_object('byteSize',9,'width',12,'height',8,
    'contentHash',repeat('f',64),'originalFilename','stale-signed.png'),
  '{"altText":"Stale signed","caption":"","folder":""}'::jsonb
  from cms_s3_journal_spike.assets a;
update s3_journal_cases c set p=jsonb_build_object(
  'keyId','v1','versionId',c.version::text,'actorUserId','a5000000-0000-4000-8000-000000000001',
  'targetAssetId',c.asset::text,'expectedGeneration',1,
  'storageProvider','s3','objectKey','cms-media/'||c.version::text||'.webp',
  'byteSize',9,'width',12,'height',8,'mimeType','image/webp',
  'contentHash',repeat('f',64),'originalFilename','stale-signed.png',
  'altText','Stale signed','caption','','folder','',
  'issuedAt',floor(extract(epoch from clock_timestamp()))::bigint,
  'expiresAt',floor(extract(epoch from clock_timestamp()))::bigint+60,
  'nonce',repeat('e',32)) where name='stale_signed';
update s3_journal_cases set signature=encode(extensions.hmac(
  convert_to(cms_s3_journal_spike.canonical(p),'UTF8'),
  (select secret from cms_s3_journal_spike.signing_keys where key_id='v1'),'sha256'),'hex')
  where name='stale_signed';
set local role authenticated;
do $$ declare c record; accepted boolean:=false; begin
  select * into c from s3_journal_cases where name='stale_signed';
  perform cms_s3_journal_spike.mark_uploaded(c.version);
  begin perform cms_s3_journal_spike.register(
    c.version,c.asset,c.expected_generation,c.details,c.metadata,c.p,c.signature);
    accepted:=true;
  exception when sqlstate 'PT409' then null;end;
  if accepted then raise exception 'Signed stale generation accepted';end if;
  if cms_s3_journal_spike.cleanup_eligible(c.version) then
    raise exception 'Rejected but unmarked attempt eligible for cleanup';end if;
end $$;
reset role;
do $$ begin
  if (select generation from cms_s3_journal_spike.assets)<>2 or
     (select max(version_number) from cms_s3_journal_spike.versions)<>2 or
     (select count(*) from cms_s3_journal_spike.versions)<>2 then
    raise exception 'Replacement mutated history or generation';end if;
  if (select count(*) from cms_s3_journal_spike.assets)<>1 or
     (select count(*) from cms_s3_journal_spike.versions)<>2 or
     (select count(*) from cms_s3_journal_spike.audit_events)<>2 or
     (select count(*) from cms_s3_journal_spike.attempts where status='registered')<>2 then
    raise exception 'Atomic media/journal/audit result failed';end if;
  if has_table_privilege('authenticated','cms_s3_journal_spike.attempts','INSERT') or
     has_table_privilege('authenticated','cms_s3_journal_spike.attempts','UPDATE') or
     has_function_privilege('anon','cms_s3_journal_spike.register(uuid,uuid,bigint,jsonb,jsonb,jsonb,text)','EXECUTE') then
    raise exception 'Unexpected journal or RPC grant';end if;
end $$;
rollback;
