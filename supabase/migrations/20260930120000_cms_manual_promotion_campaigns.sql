begin;

-- Manual campaigns share the immutable Promotion revision engine. The existing
-- version-7 payload and every scheduler function/table remain unchanged.
-- Popup presentation lives in an immutable one-to-one revision companion.
create function public.cms_valid_campaign_placement(value text)
returns boolean language sql immutable set search_path='' as $$
  select value = any(array[
    'global:site','home:home','page:about','page:services',
    'service:delicate-upholstery-cleaning','service:sofa-cleaning','service:mattress-cleaning',
    'service:carpet-cleaning','service:car-upholstery-cleaning','service:armchair-chair-cleaning',
    'service:air-conditioner-cleaning','service:window-cleaning','service:post-renovation-cleaning']);
$$;

create function public.cms_valid_campaign_payload(p jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb;
begin
  if not public.cms_page_keys(p,array['schemaVersion','publicTitle','h1','seoTitle','seoDescription',
    'description','enabled','displayMode','badgeText','showPrice','currentPrice','oldPrice',
    'currency','benefitText','cta','terms','delaySeconds','frequency','placements']) or
    p->'schemaVersion'<>'13'::jsonb or not public.cms_page_plain(p->'publicTitle',120) or
    not public.cms_page_plain(p->'h1',180) or not public.cms_page_plain(p->'seoTitle',120) or
    not public.cms_page_plain(p->'seoDescription',320) or not public.cms_page_plain(p->'description',2000) or
    jsonb_typeof(p->'enabled')<>'boolean' or p->>'displayMode' not in ('popup','inline') or
    not public.cms_page_plain(p->'badgeText',80) or jsonb_typeof(p->'showPrice')<>'boolean' or
    p->>'currency'<>'ILS' or not public.cms_page_cta(p->'cta') or
    not public.cms_page_plain(p->'terms',700) or p->>'frequency' not in ('every-visit','session','24-hours') or
    jsonb_typeof(p->'delaySeconds')<>'number' or (p->>'delaySeconds') !~ '^(0|[1-9]|1[0-5])$' or
    jsonb_typeof(p->'placements')<>'array' or jsonb_array_length(p->'placements') not between 1 and 13 then return false; end if;
  if (p->'showPrice'='true'::jsonb and not public.cms_page_plain(p->'currentPrice',40)) or
    (p->'showPrice'='false'::jsonb and (p->'currentPrice'<>'null'::jsonb or p->'oldPrice'<>'null'::jsonb)) or
    (p->'oldPrice'<>'null'::jsonb and not public.cms_page_plain(p->'oldPrice',40)) or
    (p->'benefitText'<>'null'::jsonb and not public.cms_page_plain(p->'benefitText',240)) then return false; end if;
  for item in select value from jsonb_array_elements(p->'placements') loop
    if jsonb_typeof(item)<>'string' or not public.cms_valid_campaign_placement(item#>>'{}') then return false; end if;
  end loop;
  return (select count(distinct value) from jsonb_array_elements(p->'placements'))=jsonb_array_length(p->'placements');
exception when others then return false;
end; $$;

create table public.cms_manual_campaign_revisions (
  revision_id uuid primary key references public.content_revisions(id),
  campaign_config jsonb not null check (public.cms_valid_campaign_payload(campaign_config))
);
create trigger cms_manual_campaign_revisions_immutable before update or delete on public.cms_manual_campaign_revisions
  for each row execute function public.cms_reject_revision_mutation();

create table public.cms_manual_campaign_placements (
  placement text primary key check (public.cms_valid_campaign_placement(placement)),
  document_id uuid not null references public.content_documents(id),
  revision_id uuid not null,
  activated_at timestamptz not null default now(),
  foreign key (document_id,revision_id) references public.content_revisions(document_id,id)
);
create index cms_manual_campaign_placements_document_idx on public.cms_manual_campaign_placements(document_id);

create table public.cms_manual_campaign_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.content_documents(id),
  revision_id uuid not null references public.content_revisions(id),
  actor_id uuid not null references auth.users(id),
  action text not null check (action in ('activate','disable')),
  occurred_at timestamptz not null default now()
);
create trigger cms_manual_campaign_events_immutable before update or delete on public.cms_manual_campaign_events
  for each row execute function public.cms_reject_revision_mutation();

do $$ declare t text; begin
  foreach t in array array['cms_manual_campaign_revisions','cms_manual_campaign_placements','cms_manual_campaign_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on table public.%I from public,anon,authenticated,service_role',t);
  end loop;
end $$;

create function public.cms_campaign_base_payload(p jsonb)
returns jsonb language sql immutable set search_path='' as $$
  select jsonb_build_object('schemaVersion',7,'publicTitle',p->'publicTitle','h1',p->'h1',
    'seoTitle',p->'seoTitle','seoDescription',p->'seoDescription','description',p->'description',
    'template','accent','enabled',p->'enabled','cta',p->'cta',
    'mediaVersionId',null,'mediaAlt',null);
$$;

create function public.cms_create_manual_campaign(payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare doc uuid:=gen_random_uuid(); rev uuid; base jsonb;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  if not public.cms_valid_campaign_payload(payload) then raise exception using errcode='22023',message='Invalid campaign'; end if;
  base:=public.cms_campaign_base_payload(payload);
  insert into public.content_documents(id,content_type,content_key)
    values(doc,'promotion','campaign-'||replace(doc::text,'-',''));
  insert into public.cms_promotion_identity(document_id,analytics_key)
    values(doc,'campaign-'||replace(doc::text,'-',''));
  insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body,created_by)
    values(doc,1,7,base->>'publicTitle',base->>'h1',base->>'seoTitle',base->>'seoDescription',
      base-array['schemaVersion','publicTitle','h1','seoTitle','seoDescription'],auth.uid()) returning id into rev;
  insert into public.cms_manual_campaign_revisions(revision_id,campaign_config) values(rev,payload);
  -- Required non-null pointer is initialized, but no publication event or
  -- active placement exists. A new campaign is therefore strictly draft-only.
  insert into public.content_publication_state(document_id,draft_revision_id,published_revision_id)
    values(doc,rev,rev);
  return doc;
end; $$;

create function public.cms_save_manual_campaign_draft(doc_id uuid,expected_generation bigint,base_revision uuid,payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state; rev uuid; n integer; base jsonb;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  select st.* into s from public.content_publication_state st
    join public.content_documents d on d.id=st.document_id and d.content_type='promotion'
    join public.cms_promotion_identity i on i.document_id=d.id and i.status='active'
    where st.document_id=doc_id and d.content_key like 'campaign-%' for update of st;
  if not found then raise exception using errcode='23503',message='Campaign unavailable'; end if;
  if s.generation is distinct from expected_generation or s.draft_revision_id is distinct from base_revision then
    raise exception using errcode='PT409',message='CMS edit conflict'; end if;
  if not public.cms_valid_campaign_payload(payload) then raise exception using errcode='22023',message='Invalid campaign'; end if;
  base:=public.cms_campaign_base_payload(payload);
  select max(revision_number)+1 into n from public.content_revisions where document_id=doc_id;
  insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body,created_by,base_revision_id)
    values(doc_id,n,7,base->>'publicTitle',base->>'h1',base->>'seoTitle',base->>'seoDescription',
      base-array['schemaVersion','publicTitle','h1','seoTitle','seoDescription'],auth.uid(),base_revision) returning id into rev;
  insert into public.cms_manual_campaign_revisions(revision_id,campaign_config) values(rev,payload);
  update public.content_publication_state set draft_revision_id=rev,generation=generation+1 where document_id=doc_id;
  update public.content_documents set updated_at=now() where id=doc_id;
  return rev;
end; $$;

create function public.cms_activate_manual_campaign(doc_id uuid,expected_generation bigint,revision uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state; p jsonb; place text;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  -- Serialize all manual activation decisions, including overlapping sets.
  perform pg_advisory_xact_lock(20260930,1);
  select st.* into s from public.content_publication_state st
    join public.content_documents d on d.id=st.document_id and d.content_type='promotion'
    join public.cms_promotion_identity i on i.document_id=d.id and i.status='active'
    where st.document_id=doc_id and d.content_key like 'campaign-%' for update of st;
  if not found then raise exception using errcode='23503',message='Campaign unavailable'; end if;
  if s.generation is distinct from expected_generation or s.draft_revision_id is distinct from revision then
    raise exception using errcode='PT409',message='CMS edit conflict'; end if;
  select c.campaign_config into p from public.cms_manual_campaign_revisions c where c.revision_id=revision;
  if p is null or not public.cms_valid_campaign_payload(p) or p->'enabled'<>'true'::jsonb then
    raise exception using errcode='22023',message='Campaign unavailable'; end if;
  if exists(select 1 from public.cms_manual_campaign_placements a
    where a.document_id<>doc_id and a.placement in (select value#>>'{}' from jsonb_array_elements(p->'placements'))) then
    raise exception using errcode='23505',message='Another campaign already owns a placement'; end if;
  -- Scheduled Promotions still own their existing slots. Reject a collision
  -- with an already active schedule; the public resolver also has fixed order.
  if exists(select 1 from public.cms_active_promotion_placements a
    where (a.placement_kind||':'||a.target_key) in
      (select value#>>'{}' from jsonb_array_elements(p->'placements'))) then
    raise exception using errcode='23505',message='Scheduled placement already active'; end if;
  delete from public.cms_manual_campaign_placements where document_id=doc_id;
  for place in select value#>>'{}' from jsonb_array_elements(p->'placements') loop
    insert into public.cms_manual_campaign_placements(placement,document_id,revision_id)
      values(place,doc_id,revision);
  end loop;
  update public.content_publication_state set published_revision_id=revision,generation=generation+1 where document_id=doc_id;
  insert into public.content_publication_events(document_id,revision_id,previous_revision_id,published_by,kind)
    values(doc_id,revision,s.published_revision_id,auth.uid(),'publish');
  insert into public.cms_manual_campaign_events(document_id,revision_id,actor_id,action)
    values(doc_id,revision,auth.uid(),'activate');
  return revision;
end; $$;

create function public.cms_disable_manual_campaign(doc_id uuid,expected_generation bigint)
returns void language plpgsql security definer set search_path='' as $$
declare s public.content_publication_state;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  perform pg_advisory_xact_lock(20260930,1);
  select st.* into s from public.content_publication_state st
    join public.content_documents d on d.id=st.document_id and d.content_type='promotion'
    where st.document_id=doc_id and d.content_key like 'campaign-%' for update of st;
  if not found then raise exception using errcode='23503',message='Campaign unavailable'; end if;
  if s.generation is distinct from expected_generation then raise exception using errcode='PT409',message='CMS edit conflict'; end if;
  delete from public.cms_manual_campaign_placements where document_id=doc_id;
  update public.content_publication_state set generation=generation+1 where document_id=doc_id;
  insert into public.cms_manual_campaign_events(document_id,revision_id,actor_id,action)
    values(doc_id,s.published_revision_id,auth.uid(),'disable');
end; $$;

create function public.cms_read_manual_campaigns()
returns jsonb language sql stable security definer set search_path='' as $$
  select case when public.is_cms_admin_aal2() then coalesce((select jsonb_agg(jsonb_build_object(
    'documentId',d.id,'key',d.content_key,'name',r.public_title,'generation',s.generation,
    'draftRevisionId',s.draft_revision_id,'publishedRevisionId',s.published_revision_id,
    'active',exists(select 1 from public.cms_manual_campaign_placements a where a.document_id=d.id),
    'activePlacements',(select coalesce(jsonb_agg(a.placement order by a.placement),'[]'::jsonb)
      from public.cms_manual_campaign_placements a where a.document_id=d.id))
    order by d.updated_at desc)
    from public.content_documents d join public.content_publication_state s on s.document_id=d.id
    join public.content_revisions r on r.id=s.draft_revision_id
    where d.content_type='promotion' and d.content_key like 'campaign-%'), '[]'::jsonb)
    else null end;
$$;

create function public.cms_read_manual_campaign_editor(doc_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  return (select jsonb_build_object('documentId',d.id,'key',d.content_key,'generation',s.generation,
    'draftRevisionId',s.draft_revision_id,'publishedRevisionId',s.published_revision_id,
    'active',exists(select 1 from public.cms_manual_campaign_placements a where a.document_id=d.id),
    'draft',c.campaign_config,'history',(select coalesce(jsonb_agg(jsonb_build_object('id',h.id,
      'number',h.revision_number) order by h.revision_number desc),'[]'::jsonb)
      from public.content_revisions h where h.document_id=d.id))
    from public.content_documents d join public.content_publication_state s on s.document_id=d.id
    join public.cms_manual_campaign_revisions c on c.revision_id=s.draft_revision_id
    where d.id=doc_id and d.content_type='promotion' and d.content_key like 'campaign-%');
end; $$;

create function public.cms_read_manual_campaign_revision(target_revision uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501',message='CMS access denied'; end if;
  return (select jsonb_build_object('id',r.id,'number',r.revision_number,'payload',c.campaign_config)
    from public.content_revisions r join public.cms_manual_campaign_revisions c on c.revision_id=r.id
    join public.content_documents d on d.id=r.document_id and d.content_type='promotion'
    where r.id=target_revision and d.content_key like 'campaign-%');
end; $$;

-- Preserve legacy scheduled banners. Version-7 campaign documents can also be
-- scheduled, but their presentation is resolved by the unified campaign reader
-- below, so they must not render a second legacy inline banner.
alter function public.cms_read_active_promotion_placement(text,text)
  rename to cms_read_active_legacy_promotion_placement;
revoke all on function public.cms_read_active_legacy_promotion_placement(text,text)
  from public,anon,authenticated,service_role;
create function public.cms_read_active_promotion_placement(kind text,target text)
returns jsonb language sql stable security definer set search_path='' as $$
  with candidate as (select public.cms_read_active_legacy_promotion_placement(kind,target) as row)
  select case when row->>'promotionKey' like 'campaign-%' then null else row end from candidate;
$$;

-- One read-only public projection across manual and scheduled campaigns. The
-- specific slot beats global, then manual beats scheduled at the same slot.
-- Old scheduled Promotions continue through their pre-existing banner reader.
create function public.cms_read_public_manual_campaign(public_path text)
returns jsonb language sql stable security definer set search_path='' as $$
  with requested as (select case public_path
    when '/' then 'home:home' when '/about' then 'page:about'
    when '/services' then 'page:services'
    when '/contact' then 'global:site' when '/gallery' then 'global:site'
    when '/privacy-policy' then 'global:site'
    when '/accessibility-statement' then 'global:site'
    when '/data-deletion' then 'global:site'
    when '/delicate-upholstery-cleaning' then 'service:delicate-upholstery-cleaning'
    when '/sofa-cleaning' then 'service:sofa-cleaning'
    when '/mattress-cleaning' then 'service:mattress-cleaning'
    when '/carpet-cleaning' then 'service:carpet-cleaning'
    when '/car-upholstery-cleaning' then 'service:car-upholstery-cleaning'
    when '/armchair-chair-cleaning' then 'service:armchair-chair-cleaning'
    when '/air-conditioner-cleaning' then 'service:air-conditioner-cleaning'
    when '/window-cleaning' then 'service:window-cleaning'
    when '/post-renovation-cleaning' then 'service:post-renovation-cleaning'
    else null end as slot),
  candidates as (
    select a.placement,a.document_id,a.revision_id,'manual'::text as source
      from public.cms_manual_campaign_placements a
    union all
    select a.placement_kind||':'||a.target_key,s.promotion_document_id,a.promotion_revision_id,'scheduled'::text
      from public.cms_active_promotion_placements a
      join public.cms_promotion_schedules s on s.id=a.schedule_id and s.status='active'
        and s.promotion_revision_id=a.promotion_revision_id
      where s.starts_at <= now() and (s.ends_at is null or s.ends_at > now())
  ),
  chosen as (select a.*,r.id as valid_revision,c.campaign_config from candidates a
    join public.content_documents d on d.id=a.document_id and d.content_type='promotion'
    join public.cms_promotion_identity i on i.document_id=d.id and i.status='active'
    join public.content_publication_state st on st.document_id=d.id
    join public.content_revisions r on r.id=a.revision_id and r.document_id=d.id and r.schema_version=7
    join public.cms_manual_campaign_revisions c on c.revision_id=r.id
    cross join requested q
    where q.slot is not null and a.placement in (q.slot,'global:site')
      and d.content_key like 'campaign-%' and c.campaign_config->'enabled'='true'::jsonb
      and public.cms_valid_campaign_payload(c.campaign_config)
      and (a.source='scheduled' or st.published_revision_id=r.id)
      and exists(select 1 from public.content_publication_events e where e.document_id=d.id
        and e.revision_id=r.id and e.kind='publish')
    order by case when a.placement=q.slot then 0 else 1 end,
      case when a.source='manual' then 0 else 1 end limit 1)
  select jsonb_build_object('revisionId',r.id,'campaign',jsonb_build_object(
      'enabled',c.campaign_config->'enabled','displayMode',c.campaign_config->'displayMode',
      'badgeText',c.campaign_config->'badgeText','h1',c.campaign_config->'h1',
      'showPrice',c.campaign_config->'showPrice','currentPrice',c.campaign_config->'currentPrice',
      'oldPrice',c.campaign_config->'oldPrice','currency',c.campaign_config->'currency',
      'benefitText',c.campaign_config->'benefitText','description',c.campaign_config->'description',
      'cta',c.campaign_config->'cta','terms',c.campaign_config->'terms',
      'delaySeconds',c.campaign_config->'delaySeconds','frequency',c.campaign_config->'frequency'))
    from chosen a join public.content_revisions r on r.id=a.valid_revision
    join public.cms_manual_campaign_revisions c on c.revision_id=r.id;
$$;

do $$ declare f regprocedure; begin
  for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in (
    'cms_valid_campaign_placement','cms_valid_campaign_payload','cms_campaign_base_payload',
    'cms_create_manual_campaign','cms_save_manual_campaign_draft','cms_activate_manual_campaign',
    'cms_disable_manual_campaign','cms_read_manual_campaigns','cms_read_manual_campaign_editor',
    'cms_read_manual_campaign_revision','cms_read_public_manual_campaign',
    'cms_read_active_promotion_placement') loop
    execute format('alter function %s owner to postgres',f);
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f);
  end loop;
end $$;
grant execute on function public.cms_create_manual_campaign(jsonb) to authenticated;
grant execute on function public.cms_save_manual_campaign_draft(uuid,bigint,uuid,jsonb) to authenticated;
grant execute on function public.cms_activate_manual_campaign(uuid,bigint,uuid) to authenticated;
grant execute on function public.cms_disable_manual_campaign(uuid,bigint) to authenticated;
grant execute on function public.cms_read_manual_campaigns() to authenticated;
grant execute on function public.cms_read_manual_campaign_editor(uuid) to authenticated;
grant execute on function public.cms_read_manual_campaign_revision(uuid) to authenticated;
grant execute on function public.cms_read_public_manual_campaign(text) to anon,authenticated;
grant execute on function public.cms_read_active_promotion_placement(text,text) to anon,authenticated;

commit;
