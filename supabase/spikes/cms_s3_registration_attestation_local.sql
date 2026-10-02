-- LOCAL SPIKE ONLY. Run with psql against the disposable local CMS database.
-- The entire schema, synthetic key, users and rows are rolled back below.
-- This proves the attestation/nonce transaction, not the final media_assets RPC.
\set ON_ERROR_STOP on
begin;
create extension if not exists pgcrypto with schema extensions;
create schema cms_s3_spike;
revoke all on schema cms_s3_spike from public, anon, authenticated, service_role;
grant usage on schema cms_s3_spike to authenticated;

create table cms_s3_spike.signing_keys(key_id text primary key, secret bytea not null);
create table cms_s3_spike.nonce_ledger(nonce text primary key, version_id uuid not null);
create table cms_s3_spike.assets(id uuid primary key, generation bigint not null);
create table cms_s3_spike.registered_versions(
  id uuid primary key, asset_id uuid not null, actor_id uuid not null,
  object_key text not null unique, content_hash text not null, byte_size integer not null
);
revoke all on all tables in schema cms_s3_spike from public, anon, authenticated, service_role;
insert into cms_s3_spike.signing_keys values('v1',decode(repeat('11',32),'hex'));
insert into cms_s3_spike.assets values('a4000000-0000-4000-8000-000000000003',7);

create function cms_s3_spike.canonical(p jsonb) returns text
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
revoke all on function cms_s3_spike.canonical(jsonb) from public,anon,authenticated,service_role;

create function cms_s3_spike.register(p jsonb, signature text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid; version uuid; target uuid; expected_generation_value bigint; issued bigint;
  expiry bigint; current_second bigint; secret bytea; expected text; current_generation bigint;
begin
  if not public.is_cms_admin_aal2() then
    raise exception using errcode='42501',message='CMS access denied';
  end if;
  perform cms_s3_spike.canonical(p); -- reject unknown/missing fields first
  actor := auth.uid();
  if p->>'actorUserId' is distinct from actor::text or
     jsonb_typeof(p->'keyId')<>'string' or
     jsonb_typeof(p->'versionId')<>'string' or
     jsonb_typeof(p->'actorUserId')<>'string' or
     jsonb_typeof(p->'targetAssetId')<>'string' or
     jsonb_typeof(p->'storageProvider')<>'string' or
     jsonb_typeof(p->'objectKey')<>'string' or
     jsonb_typeof(p->'mimeType')<>'string' or
     jsonb_typeof(p->'contentHash')<>'string' or
     jsonb_typeof(p->'originalFilename')<>'string' or
     jsonb_typeof(p->'altText')<>'string' or
     jsonb_typeof(p->'caption')<>'string' or
     jsonb_typeof(p->'folder')<>'string' or
     jsonb_typeof(p->'nonce')<>'string' or
     p->>'versionId' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or
     p->>'storageProvider' is distinct from 's3' or p->>'mimeType' is distinct from 'image/webp' or
     p->>'contentHash' !~ '^[0-9a-f]{64}$' or
     p->>'nonce' !~ '^[0-9a-f]{32}$' or
     p->>'byteSize' !~ '^[1-9][0-9]*$' or
     p->>'width' !~ '^[1-9][0-9]*$' or
     p->>'height' !~ '^[1-9][0-9]*$' or
     jsonb_typeof(p->'byteSize')<>'number' or
     jsonb_typeof(p->'width')<>'number' or
     jsonb_typeof(p->'height')<>'number' or
     jsonb_typeof(p->'issuedAt')<>'number' or
     jsonb_typeof(p->'expiresAt')<>'number' or
     p->>'issuedAt' !~ '^[0-9]+$' or p->>'expiresAt' !~ '^[0-9]+$' or
     p->>'expectedGeneration' !~ '^[1-9][0-9]*$' or
     jsonb_typeof(p->'expectedGeneration')<>'number' or
     p->>'targetAssetId' is null or
     p->>'originalFilename' !~* '^[^/\\]{1,125}\.(jpe?g|png|webp)$' or
     not public.cms_valid_media_metadata(jsonb_build_object(
       'altText',p->>'altText','caption',p->>'caption','folder',p->>'folder')) then
    raise exception using errcode='22023',message='Invalid media attestation';
  end if;
  version := (p->>'versionId')::uuid;
  target := (p->>'targetAssetId')::uuid;
  expected_generation_value := (p->>'expectedGeneration')::bigint;
  if p->>'objectKey' is distinct from 'cms-media/'||version::text||'.webp' or
     (p->>'byteSize')::bigint>4194304 or
     (p->>'width')::bigint>6000 or (p->>'height')::bigint>6000 or
     (p->>'width')::bigint*(p->>'height')::bigint>16000000 then
    raise exception using errcode='22023',message='Invalid object identity';
  end if;
  issued := (p->>'issuedAt')::bigint;
  expiry := (p->>'expiresAt')::bigint;
  current_second := floor(extract(epoch from clock_timestamp()))::bigint;
  if issued>current_second+5 or expiry<=current_second or
     expiry<=issued or expiry-issued>60 then
    raise exception using errcode='22023',message='Expired attestation';
  end if;
  select k.secret into secret from cms_s3_spike.signing_keys k where k.key_id=p->>'keyId';
  if secret is null or signature !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='42501',message='Invalid attestation signature';
  end if;
  expected := encode(extensions.hmac(convert_to(cms_s3_spike.canonical(p),'UTF8'),secret,'sha256'),'hex');
  if expected is distinct from signature then
    raise exception using errcode='42501',message='Invalid attestation signature';
  end if;
  -- Unique nonce and version insert share this statement's transaction.
  insert into cms_s3_spike.nonce_ledger values(p->>'nonce',version);
  select a.generation into current_generation from cms_s3_spike.assets a
    where a.id=target for update;
  if not found or current_generation<>expected_generation_value then
    raise exception using errcode='PT409',message='CMS media conflict';
  end if;
  insert into cms_s3_spike.registered_versions values(
    version,target,actor,p->>'objectKey',p->>'contentHash',(p->>'byteSize')::integer);
  update cms_s3_spike.assets set generation=generation+1 where id=target;
  return version;
end;$$;
revoke all on function cms_s3_spike.register(jsonb,text) from public,anon,authenticated,service_role;
grant execute on function cms_s3_spike.register(jsonb,text) to authenticated;

-- A synthetic AAL2 principal and payload exercise the real Auth/member guard.
insert into auth.users(id,invited_at) values('a4000000-0000-4000-8000-000000000002',null);
insert into auth.users(id,invited_at) values('a4000000-0000-4000-8000-000000000004',null);
insert into public.cms_admin_members(user_id,is_active) values
  ('a4000000-0000-4000-8000-000000000002',true);
do $$
declare fixed jsonb;
begin
  fixed:=jsonb_build_object(
    'keyId','v1','versionId','a4000000-0000-4000-8000-000000000001',
    'actorUserId','a4000000-0000-4000-8000-000000000002',
    'targetAssetId','a4000000-0000-4000-8000-000000000003','expectedGeneration',7,
    'storageProvider','s3','objectKey','cms-media/a4000000-0000-4000-8000-000000000001.webp',
    'byteSize',8,'width',12,'height',8,'mimeType','image/webp',
    'contentHash',repeat('a',64),'originalFilename','photo.png',
    'altText','Alt','caption','','folder','',
    'issuedAt',1800000000,'expiresAt',1800000060,'nonce',repeat('b',32));
  if encode(extensions.digest(convert_to(cms_s3_spike.canonical(fixed),'UTF8'),'sha256'),'hex')
    <> 'd452b8413b606e178ac6684cd4fe0663b869dfa6ea56c7578f8a81b7e5671c8e' then
    raise exception 'JavaScript/Postgres canonical payload mismatch';
  end if;
  fixed:=jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(fixed,
    '{targetAssetId}','null'::jsonb),'{expectedGeneration}','null'::jsonb),
    '{originalFilename}',to_jsonb('תמונה.png'::text)),
    '{altText}',to_jsonb('תמונה'::text)),
    '{folder}',to_jsonb('בדיקה'::text));
  if encode(extensions.digest(convert_to(cms_s3_spike.canonical(fixed),'UTF8'),'sha256'),'hex')
    <> '7f27089bb46de11a0efc57144b385430dc0c27c20eea44253453de61174332c3' then
    raise exception 'JavaScript/Postgres Unicode/NULL canonical mismatch';
  end if;
  if has_function_privilege('anon','cms_s3_spike.register(jsonb,text)','EXECUTE') or
     has_function_privilege('service_role','cms_s3_spike.register(jsonb,text)','EXECUTE') then
    raise exception 'Unexpected RPC execution grant';
  end if;
end;$$;
create temporary table s3_spike_fixture(p jsonb, signature text);
grant select on s3_spike_fixture to authenticated;
insert into s3_spike_fixture(p) values(jsonb_build_object(
  'keyId','v1','versionId','a4000000-0000-4000-8000-000000000001',
  'actorUserId','a4000000-0000-4000-8000-000000000002',
  'targetAssetId','a4000000-0000-4000-8000-000000000003','expectedGeneration',7,
  'storageProvider','s3','objectKey','cms-media/a4000000-0000-4000-8000-000000000001.webp',
  'byteSize',8,'width',12,'height',8,'mimeType','image/webp',
  'contentHash',repeat('a',64),'originalFilename','photo.png',
  'altText','Alt','caption','','folder','',
  'issuedAt',floor(extract(epoch from clock_timestamp()))::bigint,
  'expiresAt',floor(extract(epoch from clock_timestamp()))::bigint+60,
  'nonce',repeat('b',32)));
update s3_spike_fixture set signature=encode(extensions.hmac(
  convert_to(cms_s3_spike.canonical(p),'UTF8'),
  (select secret from cms_s3_spike.signing_keys where key_id='v1'),'sha256'),'hex');
create temporary table s3_spike_conflict(p jsonb, signature text);
grant select on s3_spike_conflict to authenticated;
insert into s3_spike_conflict(p)
select jsonb_set(jsonb_set(p,'{nonce}',to_jsonb(repeat('c',32))),
  '{expectedGeneration}','999'::jsonb) from s3_spike_fixture;
update s3_spike_conflict set signature=encode(extensions.hmac(
  convert_to(cms_s3_spike.canonical(p),'UTF8'),
  (select secret from cms_s3_spike.signing_keys where key_id='v1'),'sha256'),'hex');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a4000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}',true);
do $$
declare item record; accepted boolean:=false;
begin
  select * into item from s3_spike_fixture;
  begin perform cms_s3_spike.register(item.p,item.signature); accepted:=true;
  exception when sqlstate '42501' then null; end;
  if accepted then raise exception 'AAL1 registration accepted'; end if;
end;$$;
select set_config('request.jwt.claims',
  '{"sub":"a4000000-0000-4000-8000-000000000004","aal":"aal2","role":"authenticated"}',true);
do $$
declare item record; accepted boolean:=false;
begin
  select * into item from s3_spike_fixture;
  begin perform cms_s3_spike.register(item.p,item.signature); accepted:=true;
  exception when sqlstate '42501' then null; end;
  if accepted then raise exception 'Nonmember registration accepted'; end if;
end;$$;
select set_config('request.jwt.claims',
  '{"sub":"a4000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
do $$
declare item record; accepted boolean; changed jsonb; field text; conflict_payload jsonb;
  conflict_signature text;
begin
  select * into item from s3_spike_fixture;
  -- A user-crafted unsigned request must fail before consuming its nonce.
  accepted:=false;
  begin perform cms_s3_spike.register(item.p,repeat('0',64)); accepted:=true;
  exception when others then null; end;
  if accepted then raise exception 'Unsigned registration accepted'; end if;
  for field in select unnest(array[
    'contentHash','byteSize','actorUserId','versionId','expectedGeneration',
    'altText','storageProvider','objectKey']) loop
    changed:=jsonb_set(item.p,array[field],case field
      when 'contentHash' then to_jsonb(repeat('c',64))
      when 'byteSize' then '9'::jsonb
      when 'actorUserId' then to_jsonb('a4000000-0000-4000-8000-000000000004'::text)
      when 'versionId' then to_jsonb('a4000000-0000-4000-8000-000000000005'::text)
      when 'expectedGeneration' then '8'::jsonb
      when 'altText' then to_jsonb('Changed'::text)
      when 'storageProvider' then to_jsonb('supabase'::text)
      else to_jsonb('wrong/path.webp'::text) end);
    accepted:=false;
    begin perform cms_s3_spike.register(changed,item.signature); accepted:=true;
    exception when others then null; end;
    if accepted then raise exception 'Tampered field accepted: %',field; end if;
  end loop;
  accepted:=false;
  begin perform cms_s3_spike.register(jsonb_set(item.p,'{expiresAt}',
    to_jsonb(floor(extract(epoch from clock_timestamp()))::bigint-1)),item.signature); accepted:=true;
  exception when others then null; end;
  if accepted then raise exception 'Expired registration accepted'; end if;
  select p,signature into conflict_payload,conflict_signature from s3_spike_conflict;
  accepted:=false;
  begin perform cms_s3_spike.register(conflict_payload,conflict_signature); accepted:=true;
  exception when sqlstate 'PT409' then null; end;
  if accepted then raise exception 'Stale generation accepted'; end if;
  if cms_s3_spike.register(item.p,item.signature) <> (item.p->>'versionId')::uuid then
    raise exception 'Valid registration failed';
  end if;
  accepted:=false;
  begin perform cms_s3_spike.register(item.p,item.signature); accepted:=true;
  exception when unique_violation then null; end;
  if accepted then raise exception 'Replay accepted'; end if;
end;$$;
reset role;
do $$ begin
  if (select count(*) from cms_s3_spike.registered_versions)<>1 or
     (select count(*) from cms_s3_spike.nonce_ledger)<>1 or
     (select generation from cms_s3_spike.assets
       where id='a4000000-0000-4000-8000-000000000003')<>8 then
    raise exception 'Registration/nonce/generation transaction mismatch';
  end if;
end;$$;
rollback;
