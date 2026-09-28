begin;

-- Phase 3A1: local page/promotion pilot. No public route or anonymous RPC is enabled.
alter table public.content_documents drop constraint content_documents_content_type_check;
alter table public.content_documents add constraint content_documents_content_type_check
  check(content_type in ('service','page','promotion'));
alter table public.content_documents drop constraint content_documents_content_key_check;
alter table public.content_documents add constraint content_documents_content_key_check check(
  (content_type='service' and public.cms_shared_service_id(content_key) is not null) or
  (content_type='page' and content_key='about') or
  (content_type='promotion' and content_key='about-intro'));
alter table public.content_revisions drop constraint content_revisions_schema_version_check;
alter table public.content_revisions add constraint content_revisions_schema_version_check
  check(schema_version in (1,2,3,4,5,6,7));

-- Service media attachment assumes service JSON. Page media is attached by the
-- immutable block/promotion rows below, after the revision has been inserted.
drop trigger content_revision_media on public.content_revisions;
create trigger content_revision_media after insert on public.content_revisions
  for each row when (new.schema_version < 6) execute function public.cms_attach_revision_media();

create function public.cms_page_plain(v jsonb, max_length integer)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(v)='string' and char_length(btrim(v#>>'{}')) between 1 and max_length
   and (v#>>'{}') !~ '[<>[:cntrl:]]' and (v#>>'{}') !~ U&'[\202a-\202e\2066-\2069]',false);
$$;
create function public.cms_page_keys(v jsonb, names text[])
returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(v)='object' and v ?& names and
   (select count(*) from jsonb_object_keys(v))=array_length(names,1),false);
$$;
create function public.cms_page_target(v jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
begin
 if v->>'kind'='internal' then
  return public.cms_page_keys(v,array['kind','path']) and v->>'path'=any(array[
   '/','/about','/services','/contact','/gallery','/sofa-cleaning','/mattress-cleaning',
   '/carpet-cleaning','/delicate-upholstery-cleaning','/car-upholstery-cleaning',
   '/armchair-chair-cleaning','/air-conditioner-cleaning','/window-cleaning']);
 elsif v->>'kind'='phone' then return public.cms_page_keys(v,array['kind']);
 elsif v->>'kind'='whatsapp' then
  return public.cms_page_keys(v,array['kind','message']) and public.cms_page_plain(v->'message',300);
 end if;
 return false;
exception when others then return false;
end;$$;
create function public.cms_page_cta(v jsonb)
returns boolean language sql immutable set search_path='' as $$
 select public.cms_page_keys(v,array['label','target']) and public.cms_page_plain(v->'label',120)
   and public.cms_page_target(v->'target');
$$;
create function public.cms_page_inline(v jsonb)
returns boolean language sql immutable set search_path='' as $$
 select public.cms_page_keys(v,array['text','bold','emphasis','link']) and
   public.cms_page_plain(v->'text',1000) and jsonb_typeof(v->'bold')='boolean' and
   jsonb_typeof(v->'emphasis')='boolean' and
   (v->'link'='null'::jsonb or public.cms_page_target(v->'link'));
$$;
create function public.cms_page_rich_node(v jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; inline_item jsonb; n integer;
begin
 if not public.cms_page_keys(v,array['kind','level','items']) or
   v->>'kind' not in ('paragraph','heading','unordered','ordered') or
   jsonb_typeof(v->'items')<>'array' then return false;end if;
 n:=jsonb_array_length(v->'items');
 if n<1 or n>(case when v->>'kind' in ('unordered','ordered') then 12 else 1 end) then return false;end if;
 if (v->>'kind'='heading' and v->'level' not in ('2'::jsonb,'3'::jsonb)) or
   (v->>'kind'<>'heading' and v->'level'<>'null'::jsonb) then return false;end if;
 for item in select value from jsonb_array_elements(v->'items') loop
  if jsonb_typeof(item)<>'array' or jsonb_array_length(item) not between 1 and 20 then return false;end if;
  for inline_item in select value from jsonb_array_elements(item) loop
   if not public.cms_page_inline(inline_item) then return false;end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end;$$;

create function public.cms_valid_page_block(kind text,p jsonb,media_id uuid,promotion_id uuid)
returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; inner_item jsonb;
begin
 if kind='hero' then
  return public.cms_page_keys(p,array['eyebrow','title','description','cta','mediaAlt']) and
   public.cms_page_plain(p->'eyebrow',120) and public.cms_page_plain(p->'title',180) and
   public.cms_page_plain(p->'description',2000) and
   (p->'cta'='null'::jsonb or public.cms_page_cta(p->'cta')) and
   ((media_id is null and p->'mediaAlt'='null'::jsonb) or
     (media_id is not null and public.cms_page_plain(p->'mediaAlt',300))) and promotion_id is null;
 elsif kind='richText' then
  if media_id is not null or promotion_id is not null or not public.cms_page_keys(p,array['nodes']) or
    jsonb_typeof(p->'nodes')<>'array' or jsonb_array_length(p->'nodes') not between 1 and 30 then return false;end if;
  for item in select value from jsonb_array_elements(p->'nodes') loop
   if not public.cms_page_rich_node(item) then return false;end if;
  end loop;
  return true;
 elsif kind='imageText' then
  return media_id is not null and promotion_id is null and
   public.cms_page_keys(p,array['heading','body','side','alt','cta']) and
   public.cms_page_plain(p->'heading',180) and public.cms_page_plain(p->'body',2000) and
   p->>'side' in ('start','end') and public.cms_page_plain(p->'alt',300) and
   (p->'cta'='null'::jsonb or public.cms_page_cta(p->'cta'));
 elsif kind='faq' then
  if media_id is not null or promotion_id is not null or not public.cms_page_keys(p,array['items']) or
    jsonb_typeof(p->'items')<>'array' or jsonb_array_length(p->'items') not between 1 and 20 then return false;end if;
  for item in select value from jsonb_array_elements(p->'items') loop
   if not public.cms_page_keys(item,array['question','answer']) or
     not public.cms_page_plain(item->'question',300) or not public.cms_page_plain(item->'answer',2000) then return false;end if;
  end loop;
  return (select count(distinct value->>'question') from jsonb_array_elements(p->'items'))=jsonb_array_length(p->'items');
 elsif kind='cta' then
  return media_id is null and promotion_id is null and
   public.cms_page_keys(p,array['heading','description','cta']) and
   public.cms_page_plain(p->'heading',180) and public.cms_page_plain(p->'description',2000) and
   public.cms_page_cta(p->'cta');
 elsif kind='promotionBanner' then
  return media_id is null and promotion_id is not null and
   public.cms_page_keys(p,array['template']) and p->>'template' in ('accent','quiet');
 elsif kind='spacer' then
  return media_id is null and promotion_id is null and public.cms_page_keys(p,array['size','variant']) and
   p->>'size' in ('compact','normal','wide') and p->>'variant' in ('divider','space');
 elsif kind='aboutOverview' then
  if media_id is not null or promotion_id is not null or
    not public.cms_page_keys(p,array['heading','paragraphs','values']) or
    not public.cms_page_plain(p->'heading',180) or
    jsonb_typeof(p->'paragraphs')<>'array' or jsonb_array_length(p->'paragraphs') not between 1 and 6 or
    jsonb_typeof(p->'values')<>'array' or jsonb_array_length(p->'values') not between 1 and 6 then return false;end if;
  for item in select value from jsonb_array_elements(p->'paragraphs') loop
   if not public.cms_page_plain(item,2000) then return false;end if;
  end loop;
  for item in select value from jsonb_array_elements(p->'values') loop
   if not public.cms_page_keys(item,array['title','description','icon']) or
    not public.cms_page_plain(item->'title',120) or not public.cms_page_plain(item->'description',500) or
    item->>'icon' not in ('shield','message','calendar','sparkles') then return false;end if;
  end loop;
  return true;
 end if;
 return false;
exception when others then return false;
end;$$;

create function public.cms_valid_page_revision(p jsonb)
returns boolean language sql immutable set search_path='' as $$
 select public.cms_page_keys(p,array['schemaVersion','publicTitle','h1','seoTitle','seoDescription','canonical']) and
   p->'schemaVersion'='6'::jsonb and p->>'canonical'='/about' and
   public.cms_page_plain(p->'publicTitle',120) and public.cms_page_plain(p->'h1',180) and
   public.cms_page_plain(p->'seoTitle',120) and public.cms_page_plain(p->'seoDescription',320);
$$;
create function public.cms_valid_promotion_revision(p jsonb)
returns boolean language sql immutable set search_path='' as $$
 select public.cms_page_keys(p,array['schemaVersion','publicTitle','h1','seoTitle','seoDescription','description','template','enabled','cta','mediaVersionId','mediaAlt']) and
   p->'schemaVersion'='7'::jsonb and public.cms_page_plain(p->'publicTitle',120) and
   public.cms_page_plain(p->'h1',180) and public.cms_page_plain(p->'seoTitle',120) and
   public.cms_page_plain(p->'seoDescription',320) and public.cms_page_plain(p->'description',2000) and
   p->>'template' in ('accent','quiet') and jsonb_typeof(p->'enabled')='boolean' and public.cms_page_cta(p->'cta') and
   ((p->'mediaVersionId'='null'::jsonb and p->'mediaAlt'='null'::jsonb) or
    (jsonb_typeof(p->'mediaVersionId')='string' and
      p->>'mediaVersionId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' and
      public.cms_page_plain(p->'mediaAlt',300)));
$$;

create or replace function public.cms_validate_service_revision()
returns trigger language plpgsql set search_path='' as $$
declare doc public.content_documents; payload jsonb;
begin
 select * into doc from public.content_documents where id=new.document_id;
 payload:=public.cms_revision_payload(new);
 if doc.content_type='service' and public.cms_valid_service_payload(doc.content_key,payload) then return new;end if;
 if doc.content_type='page' and doc.content_key='about' and new.schema_version=6 and
   public.cms_valid_page_revision(payload) then return new;end if;
 if doc.content_type='promotion' and doc.content_key='about-intro' and new.schema_version=7 and
   public.cms_valid_promotion_revision(payload) then return new;end if;
 raise exception using errcode='22023',message='Invalid CMS payload';
end;$$;

create table public.cms_promotion_identity (
 document_id uuid primary key references public.content_documents(id),
 analytics_key text not null unique check(analytics_key='about-intro'),
 status text not null default 'active' check(status in ('active','archived')),
 created_at timestamptz not null default now()
);
create table public.page_revision_blocks (
 revision_id uuid not null references public.content_revisions(id),
 block_id uuid not null, position integer not null check(position between 0 and 49),
 block_type text not null check(block_type in ('hero','richText','imageText','faq','cta','promotionBanner','spacer','aboutOverview')),
 schema_version integer not null check(schema_version=1), hidden boolean not null default false,
 payload jsonb not null, media_version_id uuid references public.media_versions(id),
 promotion_revision_id uuid references public.content_revisions(id),
 primary key(revision_id,block_id), unique(revision_id,position),
 check(public.cms_valid_page_block(block_type,payload,media_version_id,promotion_revision_id))
);
create table public.promotion_revision_media (
 revision_id uuid primary key references public.content_revisions(id),
 media_version_id uuid not null references public.media_versions(id),
 alt_text text not null check(char_length(btrim(alt_text)) between 1 and 300)
);
create trigger page_revision_blocks_immutable before update or delete on public.page_revision_blocks
 for each row execute function public.cms_reject_revision_mutation();
create trigger promotion_revision_media_immutable before update or delete on public.promotion_revision_media
 for each row execute function public.cms_reject_revision_mutation();

alter table public.revision_media_refs drop constraint revision_media_refs_usage_role_check;
alter table public.revision_media_refs add constraint revision_media_refs_usage_role_check
 check(usage_role in ('hero','benefits','result','before','after','gallery','seo','page-hero','page-image','promotion'));
alter table public.revision_media_refs drop constraint revision_media_refs_position_check;
alter table public.revision_media_refs add constraint revision_media_refs_position_check check(position between 0 and 49);

create function public.cms_validate_page_block_ref()
returns trigger language plpgsql security definer set search_path='' as $$
declare rev public.content_revisions; promo public.content_revisions; asset public.media_assets; role_name text;
begin
 select * into rev from public.content_revisions where id=new.revision_id;
 if rev.schema_version<>6 or not exists(select 1 from public.content_documents where id=rev.document_id and content_type='page' and content_key='about') then
  raise exception using errcode='23514',message='Block revision mismatch';end if;
 if new.promotion_revision_id is not null then
  select * into promo from public.content_revisions where id=new.promotion_revision_id;
  if promo.schema_version<>7 or not exists(select 1 from public.cms_promotion_identity i join public.content_documents d on d.id=i.document_id
    where d.id=promo.document_id and d.content_type='promotion' and i.status='active') then
   raise exception using errcode='23514',message='Promotion revision mismatch';end if;
 end if;
 if new.media_version_id is not null then
  select a.* into asset from public.media_assets a join public.media_versions v on v.asset_id=a.id
   where v.id=new.media_version_id for share of a;
  if not found or (asset.status='archived' and not exists(
   select 1 from public.page_revision_blocks b where b.revision_id in (rev.base_revision_id,rev.source_revision_id)
     and b.media_version_id=new.media_version_id)) then
   raise exception using errcode='55000',message='CMS media unavailable';end if;
  role_name:=case new.block_type when 'hero' then 'page-hero' else 'page-image' end;
  insert into public.revision_media_refs(revision_id,media_version_id,usage_role,position,alt_text,caption)
   values(new.revision_id,new.media_version_id,role_name,new.position,
    case when new.block_type='hero' then new.payload->>'mediaAlt' else new.payload->>'alt' end,asset.caption);
 end if;
 return new;
end;$$;
create trigger page_block_validate after insert on public.page_revision_blocks
 for each row execute function public.cms_validate_page_block_ref();

create function public.cms_attach_promotion_media()
returns trigger language plpgsql security definer set search_path='' as $$
declare asset public.media_assets; vid uuid;
begin
 if new.schema_version<>7 or new.body->'mediaVersionId'='null'::jsonb then return new;end if;
 vid:=(new.body->>'mediaVersionId')::uuid;
 select a.* into asset from public.media_assets a join public.media_versions v on v.asset_id=a.id
  where v.id=vid for share of a;
 if not found or (asset.status='archived' and not exists(select 1 from public.promotion_revision_media
   where revision_id in (new.base_revision_id,new.source_revision_id) and media_version_id=vid)) then
  raise exception using errcode='55000',message='CMS media unavailable';end if;
 insert into public.promotion_revision_media values(new.id,vid,new.body->>'mediaAlt');
 insert into public.revision_media_refs(revision_id,media_version_id,usage_role,position,alt_text,caption)
  values(new.id,vid,'promotion',0,new.body->>'mediaAlt',asset.caption);
 return new;
end;$$;
create trigger promotion_media_attach after insert on public.content_revisions
 for each row when (new.schema_version=7) execute function public.cms_attach_promotion_media();

do $$declare t text;begin
 foreach t in array array['cms_promotion_identity','page_revision_blocks','promotion_revision_media'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('alter table public.%I force row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy cms_pages_aal2_read on public.%I for select to authenticated using ((select public.is_cms_admin_aal2()))',t);
 end loop;
end$$;

create function public.cms_insert_page_blocks(target_revision uuid, items jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; ordinal integer; visible_heroes integer:=0; hero_title text;
begin
 if jsonb_typeof(items)<>'array' or jsonb_array_length(items) not between 1 and 50 then
  raise exception using errcode='22023',message='Invalid page blocks';end if;
 for item,ordinal in select value,(ordinality-1)::integer from jsonb_array_elements(items) with ordinality loop
  if not public.cms_page_keys(item,array['id','position','type','schemaVersion','hidden','payload','mediaVersionId','promotionRevisionId']) or
    item->'position'<>to_jsonb(ordinal) or item->'schemaVersion'<>'1'::jsonb or
    jsonb_typeof(item->'hidden')<>'boolean' or
    item->>'id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
   raise exception using errcode='22023',message='Invalid page block order';end if;
  if item->>'type'='hero' and item->'hidden'='false'::jsonb then visible_heroes:=visible_heroes+1;hero_title:=item->'payload'->>'title';end if;
  insert into public.page_revision_blocks(revision_id,block_id,position,block_type,schema_version,hidden,payload,media_version_id,promotion_revision_id)
   values(target_revision,(item->>'id')::uuid,ordinal,item->>'type',1,(item->>'hidden')::boolean,
    item->'payload',(item->>'mediaVersionId')::uuid,(item->>'promotionRevisionId')::uuid);
 end loop;
 if visible_heroes<>1 or hero_title is distinct from (select h1 from public.content_revisions where id=target_revision) then
  raise exception using errcode='22023',message='A page needs one matching visible hero';end if;
end;$$;

create function public.cms_page_revision_payload(r public.content_revisions)
returns jsonb language sql stable security definer set search_path='' as $$
 select public.cms_revision_payload(r) || jsonb_build_object('blocks',
  (select coalesce(jsonb_agg(jsonb_build_object('id',b.block_id,'position',b.position,'type',b.block_type,
    'schemaVersion',b.schema_version,'hidden',b.hidden,'payload',b.payload,
    'mediaVersionId',b.media_version_id,'promotionRevisionId',b.promotion_revision_id) order by b.position),'[]'::jsonb)
   from public.page_revision_blocks b where b.revision_id=r.id));
$$;

-- Operator-only local baseline imports. Repeated calls never change pointers/history.
create function public.cms_import_promotion_baseline(payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare doc uuid; rev uuid;
begin
 if not public.cms_valid_promotion_revision(payload) then raise exception using errcode='22023',message='Invalid promotion';end if;
 perform pg_advisory_xact_lock(20260925,1);
 select id into doc from public.content_documents where content_type='promotion' and content_key='about-intro';
 if doc is not null then return (select id from public.content_revisions where document_id=doc and revision_number=1);end if;
 doc:='c0000000-0000-4000-8000-000000000200';
 insert into public.content_documents(id,content_type,content_key) values(doc,'promotion','about-intro');
 insert into public.cms_promotion_identity(document_id,analytics_key) values(doc,'about-intro');
 insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body)
  values(doc,1,7,payload->>'publicTitle',payload->>'h1',payload->>'seoTitle',payload->>'seoDescription',
   payload-array['schemaVersion','publicTitle','h1','seoTitle','seoDescription']) returning id into rev;
 insert into public.content_publication_state(document_id,draft_revision_id,published_revision_id) values(doc,rev,rev);
 insert into public.content_publication_events(document_id,revision_id,kind) values(doc,rev,'baseline');
 return rev;
end;$$;
create function public.cms_import_about_baseline(payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare doc uuid; rev uuid;
begin
 if not public.cms_valid_page_revision(payload-'blocks') then raise exception using errcode='22023',message='Invalid page';end if;
 perform pg_advisory_xact_lock(20260925,1);
 select id into doc from public.content_documents where content_type='page' and content_key='about';
 if doc is not null then return (select id from public.content_revisions where document_id=doc and revision_number=1);end if;
 doc:='c0000000-0000-4000-8000-000000000100';
 insert into public.content_documents(id,content_type,content_key) values(doc,'page','about');
 insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body)
  values(doc,1,6,payload->>'publicTitle',payload->>'h1',payload->>'seoTitle',payload->>'seoDescription',
   payload-array['schemaVersion','publicTitle','h1','seoTitle','seoDescription','blocks']) returning id into rev;
 perform public.cms_insert_page_blocks(rev,payload->'blocks');
 insert into public.content_publication_state(document_id,draft_revision_id,published_revision_id) values(doc,rev,rev);
 insert into public.content_publication_events(document_id,revision_id,kind) values(doc,rev,'baseline');
 return rev;
end;$$;

create function public.cms_save_page_draft(expected_generation bigint,base_revision uuid,payload jsonb,restore_revision uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state; rev uuid; next_number integer; source public.content_revisions;
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
 select st.* into s from public.content_publication_state st join public.content_documents d on d.id=st.document_id
  where d.content_type='page' and d.content_key='about' for update of st;
 if not found then raise exception using errcode='55000',message='CMS baseline missing';end if;
 if expected_generation is distinct from s.generation or base_revision is distinct from s.draft_revision_id then
  raise exception using errcode='PT409',message='CMS edit conflict';end if;
 if restore_revision is not null then
  select * into source from public.content_revisions where document_id=s.document_id and id=restore_revision;
  if not found then raise exception using errcode='23503',message='Wrong page revision';end if;
  payload:=public.cms_page_revision_payload(source);
 end if;
 if not public.cms_valid_page_revision(payload-'blocks') then raise exception using errcode='22023',message='Invalid page';end if;
 select max(revision_number)+1 into next_number from public.content_revisions where document_id=s.document_id;
 insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body,created_by,base_revision_id,source_revision_id)
  values(s.document_id,next_number,6,payload->>'publicTitle',payload->>'h1',payload->>'seoTitle',payload->>'seoDescription',
   payload-array['schemaVersion','publicTitle','h1','seoTitle','seoDescription','blocks'],auth.uid(),base_revision,restore_revision)
   returning id into rev;
 perform public.cms_insert_page_blocks(rev,payload->'blocks');
 update public.content_publication_state set draft_revision_id=rev,generation=generation+1 where document_id=s.document_id;
 update public.content_documents set updated_at=now() where id=s.document_id;
 return rev;
end;$$;
create function public.cms_publish_page_revision(expected_generation bigint,revision uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state;
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
 select st.* into s from public.content_publication_state st join public.content_documents d on d.id=st.document_id
  where d.content_type='page' and d.content_key='about' for update of st;
 if not found then raise exception using errcode='55000',message='CMS baseline missing';end if;
 if expected_generation is distinct from s.generation or revision is distinct from s.draft_revision_id then
  raise exception using errcode='PT409',message='CMS edit conflict';end if;
 if exists(select 1 from public.page_revision_blocks b join public.content_revisions p on p.id=b.promotion_revision_id
   join public.content_publication_state ps on ps.document_id=p.document_id
   where b.revision_id=revision and b.hidden=false and b.promotion_revision_id is not null and
     ps.published_revision_id<>p.id) then
  raise exception using errcode='55000',message='Publish promotion before page';end if;
 if revision=s.published_revision_id then return revision;end if;
 update public.content_publication_state set published_revision_id=revision,generation=generation+1 where document_id=s.document_id;
 insert into public.content_publication_events(document_id,revision_id,previous_revision_id,published_by,kind)
  values(s.document_id,revision,s.published_revision_id,auth.uid(),'publish');
 update public.content_documents set updated_at=now() where id=s.document_id;
 return revision;
end;$$;

create function public.cms_save_promotion_draft(expected_generation bigint,base_revision uuid,payload jsonb,restore_revision uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state; rev uuid; next_number integer; source public.content_revisions;
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
 select st.* into s from public.content_publication_state st join public.content_documents d on d.id=st.document_id
  join public.cms_promotion_identity i on i.document_id=d.id
  where d.content_type='promotion' and d.content_key='about-intro' and i.status='active' for update of st;
 if not found then raise exception using errcode='55000',message='CMS promotion missing';end if;
 if expected_generation is distinct from s.generation or base_revision is distinct from s.draft_revision_id then
  raise exception using errcode='PT409',message='CMS edit conflict';end if;
 if restore_revision is not null then
  select * into source from public.content_revisions where document_id=s.document_id and id=restore_revision;
  if not found then raise exception using errcode='23503',message='Wrong promotion revision';end if;
  payload:=public.cms_revision_payload(source);
 end if;
 if not public.cms_valid_promotion_revision(payload) then raise exception using errcode='22023',message='Invalid promotion';end if;
 select max(revision_number)+1 into next_number from public.content_revisions where document_id=s.document_id;
 insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body,created_by,base_revision_id,source_revision_id)
  values(s.document_id,next_number,7,payload->>'publicTitle',payload->>'h1',payload->>'seoTitle',payload->>'seoDescription',
   payload-array['schemaVersion','publicTitle','h1','seoTitle','seoDescription'],auth.uid(),base_revision,restore_revision)
   returning id into rev;
 update public.content_publication_state set draft_revision_id=rev,generation=generation+1 where document_id=s.document_id;
 update public.content_documents set updated_at=now() where id=s.document_id;
 return rev;
end;$$;
create function public.cms_publish_promotion_revision(expected_generation bigint,revision uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state;
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
 select st.* into s from public.content_publication_state st join public.content_documents d on d.id=st.document_id
  join public.cms_promotion_identity i on i.document_id=d.id
  where d.content_type='promotion' and d.content_key='about-intro' and i.status='active' for update of st;
 if not found then raise exception using errcode='55000',message='CMS promotion missing';end if;
 if expected_generation is distinct from s.generation or revision is distinct from s.draft_revision_id then
  raise exception using errcode='PT409',message='CMS edit conflict';end if;
 if revision=s.published_revision_id then return revision;end if;
 update public.content_publication_state set published_revision_id=revision,generation=generation+1 where document_id=s.document_id;
 insert into public.content_publication_events(document_id,revision_id,previous_revision_id,published_by,kind)
  values(s.document_id,revision,s.published_revision_id,auth.uid(),'publish');
 update public.content_documents set updated_at=now() where id=s.document_id;
 return revision;
end;$$;

create function public.cms_read_page_editor()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
 return (select jsonb_build_object('updatedAt',d.updated_at,'generation',s.generation,
  'draftRevisionId',s.draft_revision_id,'publishedRevisionId',s.published_revision_id,
  'publishedBy',(select e.published_by from public.content_publication_events e where e.document_id=d.id and e.revision_id=s.published_revision_id order by e.published_at desc,e.id desc limit 1),
  'draft',public.cms_page_revision_payload(r),'history',
   (select jsonb_agg(jsonb_build_object('id',h.id,'number',h.revision_number,'createdAt',h.created_at,
    'createdBy',h.created_by,'baseRevisionId',h.base_revision_id,'sourceRevisionId',h.source_revision_id)
    order by h.revision_number desc) from public.content_revisions h where h.document_id=d.id))
  from public.content_documents d join public.content_publication_state s on s.document_id=d.id
   join public.content_revisions r on r.id=s.draft_revision_id
  where d.content_type='page' and d.content_key='about');
end;$$;
create function public.cms_read_page_revision(target_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
 return (select jsonb_build_object('id',r.id,'number',r.revision_number,'payload',public.cms_page_revision_payload(r))
  from public.content_revisions r join public.content_documents d on d.id=r.document_id
  where r.id=target_revision and d.content_type='page' and d.content_key='about');
end;$$;
create function public.cms_read_published_page()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
 return (select jsonb_build_object('id',r.id,'number',r.revision_number,'payload',public.cms_page_revision_payload(r))
  from public.content_documents d join public.content_publication_state s on s.document_id=d.id
   join public.content_revisions r on r.id=s.published_revision_id
  where d.content_type='page' and d.content_key='about');
end;$$;
create function public.cms_read_promotion_editor()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
 return (select jsonb_build_object('updatedAt',d.updated_at,'generation',s.generation,
  'draftRevisionId',s.draft_revision_id,'publishedRevisionId',s.published_revision_id,
  'status',i.status,'analyticsIdentity',i.analytics_key,
  'draft',public.cms_revision_payload(r),'history',
   (select jsonb_agg(jsonb_build_object('id',h.id,'number',h.revision_number,'createdAt',h.created_at,
    'createdBy',h.created_by,'baseRevisionId',h.base_revision_id,'sourceRevisionId',h.source_revision_id)
    order by h.revision_number desc) from public.content_revisions h where h.document_id=d.id))
  from public.content_documents d join public.cms_promotion_identity i on i.document_id=d.id
   join public.content_publication_state s on s.document_id=d.id
   join public.content_revisions r on r.id=s.draft_revision_id
  where d.content_type='promotion' and d.content_key='about-intro');
end;$$;
create function public.cms_read_promotion_revision(target_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied';end if;
 return (select jsonb_build_object('id',r.id,'number',r.revision_number,'payload',public.cms_revision_payload(r))
  from public.content_revisions r join public.content_documents d on d.id=r.document_id
  where r.id=target_revision and d.content_type='promotion' and d.content_key='about-intro');
end;$$;

do $$declare f regprocedure;begin
 for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in (
  'cms_page_plain','cms_page_keys','cms_page_target','cms_page_cta','cms_page_inline','cms_page_rich_node',
  'cms_valid_page_block','cms_valid_page_revision','cms_valid_promotion_revision','cms_validate_service_revision',
  'cms_validate_page_block_ref','cms_attach_promotion_media','cms_insert_page_blocks','cms_page_revision_payload',
  'cms_import_promotion_baseline','cms_import_about_baseline','cms_save_page_draft','cms_publish_page_revision',
  'cms_save_promotion_draft','cms_publish_promotion_revision','cms_read_page_editor','cms_read_page_revision',
  'cms_read_published_page','cms_read_promotion_editor','cms_read_promotion_revision') loop
  execute format('alter function %s owner to postgres',f);
  execute format('revoke all on function %s from public,anon,authenticated,service_role',f);
 end loop;
end$$;
grant execute on function public.cms_save_page_draft(bigint,uuid,jsonb,uuid) to authenticated;
grant execute on function public.cms_publish_page_revision(bigint,uuid) to authenticated;
grant execute on function public.cms_save_promotion_draft(bigint,uuid,jsonb,uuid) to authenticated;
grant execute on function public.cms_publish_promotion_revision(bigint,uuid) to authenticated;
grant execute on function public.cms_read_page_editor() to authenticated;
grant execute on function public.cms_read_page_revision(uuid) to authenticated;
grant execute on function public.cms_read_published_page() to authenticated;
grant execute on function public.cms_read_promotion_editor() to authenticated;
grant execute on function public.cms_read_promotion_revision(uuid) to authenticated;

commit;
