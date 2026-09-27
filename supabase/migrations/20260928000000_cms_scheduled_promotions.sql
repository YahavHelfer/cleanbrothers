begin;
-- Phase 4A1, local only. Scheduling is separate from immutable promotion and page revisions.

create table public.cms_promotion_schedules (
  id uuid primary key default gen_random_uuid(),
  promotion_document_id uuid not null references public.content_documents(id),
  promotion_revision_id uuid not null references public.content_revisions(id),
  promotion_revision_number integer not null check (promotion_revision_number > 0),
  label text not null check (length(btrim(label)) between 1 and 120 and label !~ '[<>]'),
  starts_at timestamptz not null,
  ends_at timestamptz,
  display_timezone text not null default 'Asia/Jerusalem' check (display_timezone = 'Asia/Jerusalem'),
  status text not null default 'draft' check (status in ('draft','scheduled','active','completed','cancelled','failed')),
  failure_action text check (failure_action in ('activate','expire')),
  failure_category text check (failure_category in ('placement_conflict','revision_unavailable','transient','integrity')),
  retryable boolean not null default false,
  retry_after timestamptz,
  created_by uuid not null references auth.users(id),
  cancelled_by uuid references auth.users(id),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0),
  check (ends_at is null or ends_at > starts_at),
  check ((status = 'failed') = (failure_action is not null)),
  check (status = 'failed' or (failure_category is null and not retryable and retry_after is null)),
  check ((status = 'cancelled') = (cancelled_at is not null))
);

create table public.cms_promotion_schedule_placements (
  schedule_id uuid not null references public.cms_promotion_schedules(id) on delete restrict,
  placement_kind text not null check (placement_kind in ('home','service','global')),
  target_key text not null check (length(target_key) between 1 and 80),
  primary key (schedule_id, placement_kind, target_key),
  check ((placement_kind = 'home' and target_key = 'home') or
         (placement_kind = 'global' and target_key = 'site') or
         (placement_kind = 'service' and target_key in
           ('delicate-upholstery-cleaning','sofa-cleaning','mattress-cleaning','carpet-cleaning',
            'car-upholstery-cleaning','armchair-chair-cleaning','air-conditioner-cleaning','window-cleaning')))
);

create table public.cms_active_promotion_placements (
  placement_kind text not null,
  target_key text not null,
  schedule_id uuid not null references public.cms_promotion_schedules(id) on delete restrict,
  promotion_revision_id uuid not null references public.content_revisions(id),
  activated_at timestamptz not null,
  primary key (placement_kind, target_key),
  foreign key (schedule_id, placement_kind, target_key)
    references public.cms_promotion_schedule_placements(schedule_id, placement_kind, target_key)
);

create table public.cms_promotion_schedule_attempts (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.cms_promotion_schedules(id) on delete restrict,
  action text not null check (action in ('activate','expire')),
  intended_at timestamptz not null,
  attempted_at timestamptz not null,
  attempt_number integer not null check (attempt_number > 0),
  outcome text not null check (outcome in ('success','skipped_window','retryable_failure','terminal_failure')),
  failure_category text check (failure_category in ('placement_conflict','revision_unavailable','transient','integrity')),
  completed_at timestamptz not null,
  unique (schedule_id, action, attempt_number),
  check ((outcome in ('retryable_failure','terminal_failure')) = (failure_category is not null))
);

create table public.cms_promotion_schedule_audit (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.cms_promotion_schedules(id) on delete restrict,
  event_kind text not null check (event_kind in
    ('create','edit','schedule','cancel','activate','expire','retry','failure','skip_window')),
  actor_id uuid references auth.users(id),
  schedule_version bigint not null,
  occurred_at timestamptz not null default now(),
  failure_category text check (failure_category in ('placement_conflict','revision_unavailable','transient','integrity'))
);

create index cms_promotion_schedules_due_idx on public.cms_promotion_schedules(status, starts_at, ends_at, retry_after);
create index cms_promotion_schedule_attempts_schedule_idx on public.cms_promotion_schedule_attempts(schedule_id, attempted_at);

-- No table is directly selectable or writable by browser roles. All admin operations use
-- narrow SECURITY DEFINER functions with a fresh AAL2 membership check.
do $$ declare t text; begin
  foreach t in array array['cms_promotion_schedules','cms_promotion_schedule_placements',
    'cms_active_promotion_placements','cms_promotion_schedule_attempts','cms_promotion_schedule_audit'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role',t);
  end loop;
end $$;

create function public.cms_schedule_validate_promotion(doc_id uuid, revision_id uuid)
returns integer language plpgsql stable security definer set search_path='' as $$
declare n integer;
begin
  select r.revision_number into n from public.content_documents d
    join public.cms_promotion_identity i on i.document_id=d.id and i.status='active'
    join public.content_revisions r on r.document_id=d.id and r.id=revision_id
  where d.id=doc_id and d.content_type='promotion' and d.content_key='about-intro'
    and r.schema_version=7 and public.cms_valid_promotion_revision(public.cms_revision_payload(r))
    and (public.cms_revision_payload(r)->>'enabled')::boolean
    and exists (select 1 from public.content_publication_events e
                where e.document_id=d.id and e.revision_id=r.id and e.kind in ('baseline','publish'));
  if n is null then raise exception using errcode='23503', message='Promotion revision is not published-safe'; end if;
  return n;
end; $$;

create function public.cms_schedule_validate_placements(items jsonb)
returns void language plpgsql stable security definer set search_path='' as $$
declare item jsonb; n integer; k text; target text; seen text[]:=array[]::text[];
begin
  if jsonb_typeof(items)<>'array' or jsonb_array_length(items) not between 1 and 12 then
    raise exception using errcode='22023', message='Invalid placements'; end if;
  for item,n in select value,ordinality from jsonb_array_elements(items) with ordinality loop
    if not public.cms_page_keys(item,array['kind','target']) then
      raise exception using errcode='22023', message='Invalid placement shape'; end if;
    k:=item->>'kind'; target:=item->>'target';
    if not ((k='home' and target='home') or (k='global' and target='site') or
      (k='service' and target in ('delicate-upholstery-cleaning','sofa-cleaning','mattress-cleaning',
        'carpet-cleaning','car-upholstery-cleaning','armchair-chair-cleaning',
        'air-conditioner-cleaning','window-cleaning') and exists (
          select 1 from public.content_documents d where d.content_type='service' and d.content_key=target))) or
      k||':'||target=any(seen) then
      raise exception using errcode='22023', message='Invalid or duplicate placement'; end if;
    seen:=array_append(seen,k||':'||target);
  end loop;
end; $$;

create function public.cms_create_promotion_schedule(doc_id uuid, revision_id uuid, name text,
  start_time timestamptz, end_time timestamptz, placements jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare sid uuid; item jsonb; rev_number integer;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501', message='CMS access denied'; end if;
  if name is null or length(btrim(name)) not between 1 and 120 or name ~ '[<>]' or
    start_time is null or (end_time is not null and end_time<=start_time) then
    raise exception using errcode='22023', message='Invalid schedule'; end if;
  rev_number:=public.cms_schedule_validate_promotion(doc_id,revision_id);
  perform public.cms_schedule_validate_placements(placements);
  insert into public.cms_promotion_schedules(promotion_document_id,promotion_revision_id,
    promotion_revision_number,label,starts_at,ends_at,created_by)
    values(doc_id,revision_id,rev_number,btrim(name),start_time,end_time,auth.uid()) returning id into sid;
  for item in select value from jsonb_array_elements(placements) loop
    insert into public.cms_promotion_schedule_placements values(sid,item->>'kind',item->>'target');
  end loop;
  insert into public.cms_promotion_schedule_audit(schedule_id,event_kind,actor_id,schedule_version)
    values(sid,'create',auth.uid(),1);
  return sid;
end; $$;

create function public.cms_edit_promotion_schedule(sid uuid, expected_version bigint,
  revision_id uuid, name text, start_time timestamptz, end_time timestamptz, placements jsonb)
returns bigint language plpgsql security definer set search_path='' as $$
declare s public.cms_promotion_schedules; item jsonb;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501', message='CMS access denied'; end if;
  select * into s from public.cms_promotion_schedules where id=sid for update;
  if not found or s.status<>'draft' then raise exception using errcode='55000', message='Draft schedule required'; end if;
  if s.version<>expected_version then raise exception using errcode='PT409', message='Schedule edit conflict'; end if;
  if name is null or length(btrim(name)) not between 1 and 120 or name ~ '[<>]' or
    start_time is null or (end_time is not null and end_time<=start_time) then
    raise exception using errcode='22023', message='Invalid schedule'; end if;
  perform public.cms_schedule_validate_placements(placements);
  update public.cms_promotion_schedules set promotion_revision_id=revision_id,
    promotion_revision_number=public.cms_schedule_validate_promotion(s.promotion_document_id,revision_id),
    label=btrim(name),starts_at=start_time,ends_at=end_time,version=version+1,updated_at=now() where id=sid;
  delete from public.cms_promotion_schedule_placements where schedule_id=sid;
  for item in select value from jsonb_array_elements(placements) loop
    insert into public.cms_promotion_schedule_placements values(sid,item->>'kind',item->>'target');
  end loop;
  insert into public.cms_promotion_schedule_audit(schedule_id,event_kind,actor_id,schedule_version)
    values(sid,'edit',auth.uid(),s.version+1);
  return s.version+1;
end; $$;

create function public.cms_schedule_promotion(sid uuid, expected_version bigint)
returns bigint language plpgsql security definer set search_path='' as $$
declare s public.cms_promotion_schedules;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501', message='CMS access denied'; end if;
  -- Serializes overlap decisions across all workers and admin sessions.
  perform pg_advisory_xact_lock(20260928,1);
  select * into s from public.cms_promotion_schedules where id=sid for update;
  if not found or s.status<>'draft' then raise exception using errcode='55000', message='Draft schedule required'; end if;
  if s.version<>expected_version then raise exception using errcode='PT409', message='Schedule edit conflict'; end if;
  perform public.cms_schedule_validate_promotion(s.promotion_document_id,s.promotion_revision_id);
  if not exists(select 1 from public.cms_promotion_schedule_placements where schedule_id=sid) then
    raise exception using errcode='22023', message='Placement required'; end if;
  if exists (
    select 1 from public.cms_promotion_schedule_placements p
      join public.cms_promotion_schedule_placements other on other.placement_kind=p.placement_kind
        and other.target_key=p.target_key and other.schedule_id<>sid
      join public.cms_promotion_schedules o on o.id=other.schedule_id
    where p.schedule_id=sid and o.status in ('scheduled','active','failed')
      and tstzrange(s.starts_at,s.ends_at,'[)') && tstzrange(o.starts_at,o.ends_at,'[)')) then
    raise exception using errcode='23505', message='Overlapping schedule'; end if;
  update public.cms_promotion_schedules set status='scheduled',version=version+1,updated_at=now() where id=sid;
  insert into public.cms_promotion_schedule_audit(schedule_id,event_kind,actor_id,schedule_version)
    values(sid,'schedule',auth.uid(),s.version+1);
  return s.version+1;
end; $$;

create function public.cms_cancel_promotion_schedule(sid uuid, expected_version bigint)
returns bigint language plpgsql security definer set search_path='' as $$
declare s public.cms_promotion_schedules;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501', message='CMS access denied'; end if;
  select * into s from public.cms_promotion_schedules where id=sid for update;
  if not found then raise exception using errcode='23503', message='Schedule missing'; end if;
  if s.status='cancelled' then return s.version; end if;
  if s.status='completed' then raise exception using errcode='55000', message='Completed schedule is historical'; end if;
  if s.version<>expected_version then raise exception using errcode='PT409', message='Schedule edit conflict'; end if;
  delete from public.cms_active_promotion_placements where schedule_id=sid;
  update public.cms_promotion_schedules set status='cancelled',cancelled_by=auth.uid(),cancelled_at=now(),
    failure_action=null,failure_category=null,retryable=false,retry_after=null,
    version=version+1,updated_at=now() where id=sid;
  insert into public.cms_promotion_schedule_audit(schedule_id,event_kind,actor_id,schedule_version)
    values(sid,'cancel',auth.uid(),s.version+1);
  return s.version+1;
end; $$;

create function public.cms_retry_promotion_schedule(sid uuid, expected_version bigint)
returns bigint language plpgsql security definer set search_path='' as $$
declare s public.cms_promotion_schedules;
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501', message='CMS access denied'; end if;
  select * into s from public.cms_promotion_schedules where id=sid for update;
  if not found or s.status<>'failed' or not s.retryable then
    raise exception using errcode='55000', message='Retriable schedule required'; end if;
  if s.version<>expected_version then raise exception using errcode='PT409', message='Schedule edit conflict'; end if;
  update public.cms_promotion_schedules set retry_after=now(),version=version+1,updated_at=now() where id=sid;
  insert into public.cms_promotion_schedule_audit(schedule_id,event_kind,actor_id,schedule_version)
    values(sid,'retry',auth.uid(),s.version+1);
  return s.version+1;
end; $$;

create function public.cms_read_promotion_schedules()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501', message='CMS access denied'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',s.id,'promotionDocumentId',s.promotion_document_id,'promotionRevisionId',s.promotion_revision_id,
    'promotionRevisionNumber',s.promotion_revision_number,'label',s.label,'startsAt',s.starts_at,
    'endsAt',s.ends_at,'timezone',s.display_timezone,'status',s.status,'version',s.version,
    'retryable',s.retryable,'failureCategory',s.failure_category,
    'placements',(select jsonb_agg(jsonb_build_object('kind',p.placement_kind,'target',p.target_key)
                  order by p.placement_kind,p.target_key) from public.cms_promotion_schedule_placements p where p.schedule_id=s.id),
    'attempts',(select coalesce(jsonb_agg(jsonb_build_object('action',a.action,'intendedAt',a.intended_at,
                  'attemptedAt',a.attempted_at,'number',a.attempt_number,'outcome',a.outcome,
                  'failureCategory',a.failure_category,'completedAt',a.completed_at)
                  order by a.attempted_at desc), '[]'::jsonb)
                  from public.cms_promotion_schedule_attempts a where a.schedule_id=s.id))
    order by s.created_at desc) from public.cms_promotion_schedules s), '[]'::jsonb);
end; $$;

create function public.cms_read_promotion_schedule_choices()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_cms_admin_aal2() then raise exception using errcode='42501', message='CMS access denied'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('documentId',d.id,'revisionId',r.id,
    'number',r.revision_number,'title',r.public_title) order by r.revision_number desc)
    from public.content_documents d join public.cms_promotion_identity i on i.document_id=d.id and i.status='active'
      join public.content_revisions r on r.document_id=d.id
    where d.content_type='promotion' and d.content_key='about-intro'
      and public.cms_valid_promotion_revision(public.cms_revision_payload(r))
      and (public.cms_revision_payload(r)->>'enabled')::boolean
      and exists(select 1 from public.content_publication_events e
        where e.document_id=d.id and e.revision_id=r.id and e.kind in ('baseline','publish'))), '[]'::jsonb);
end; $$;

create function public.cms_read_active_promotion_placement(kind text, target text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('kind',a.placement_kind,'target',a.target_key,
    'promotionRevisionId',r.id,'promotionRevisionNumber',r.revision_number,
    'promotion',public.cms_revision_payload(r))
  from public.cms_active_promotion_placements a
    join public.cms_promotion_schedules s on s.id=a.schedule_id and s.status='active'
    join public.content_revisions r on r.id=a.promotion_revision_id and r.id=s.promotion_revision_id
  where a.placement_kind=kind and a.target_key=target
    and s.starts_at<=now()
    and (s.ends_at is null or s.ends_at>now())
    and exists(select 1 from public.content_publication_events e
      where e.document_id=s.promotion_document_id and e.revision_id=r.id and e.kind in ('baseline','publish'));
$$;

-- One row lock per schedule and a unique active-placement key make simultaneous workers
-- converge. Each schedule action is one transaction. Exceptions are caught in a subtransaction
-- so a failed attempt is still recorded without publishing a partial set of placements.
create function public.cms_process_due_promotion_schedules(trusted_now timestamptz, batch_limit integer default 100)
returns integer language plpgsql security definer set search_path='' as $$
declare s public.cms_promotion_schedules; action_name text; intended timestamptz;
  attempt_no integer; result_count integer:=0; category text; retry_ok boolean;
begin
  if trusted_now is null or batch_limit not between 1 and 500 then
    raise exception using errcode='22023', message='Invalid scheduler invocation'; end if;
  for s in select * from public.cms_promotion_schedules
      where (status='scheduled' and starts_at<=trusted_now)
         or (status='active' and ends_at is not null and ends_at<=trusted_now)
         or (status='failed' and retryable and retry_after<=trusted_now)
      order by starts_at,id for update skip locked limit batch_limit loop
    action_name:=case when s.status in ('scheduled','failed') and s.ends_at is not null
                            and s.ends_at<=trusted_now and (s.status='scheduled' or s.failure_action='activate') then 'expire'
      when s.status='failed' then s.failure_action
      when s.status='active' then 'expire'
      when s.ends_at is not null and s.ends_at<=trusted_now then 'expire'
      else 'activate' end;
    intended:=case when action_name='expire' then s.ends_at else s.starts_at end;
    select coalesce(max(attempt_number),0)+1 into attempt_no from public.cms_promotion_schedule_attempts
      where schedule_id=s.id and action=action_name;
    begin
      if action_name='activate' then
        perform public.cms_schedule_validate_promotion(s.promotion_document_id,s.promotion_revision_id);
        insert into public.cms_active_promotion_placements(placement_kind,target_key,schedule_id,promotion_revision_id,activated_at)
          select p.placement_kind,p.target_key,s.id,s.promotion_revision_id,trusted_now
          from public.cms_promotion_schedule_placements p where p.schedule_id=s.id;
        update public.cms_promotion_schedules set status='active',failure_action=null,failure_category=null,
          retryable=false,retry_after=null,version=version+1,updated_at=trusted_now where id=s.id;
      else
        delete from public.cms_active_promotion_placements where schedule_id=s.id;
        update public.cms_promotion_schedules set status='completed',failure_action=null,failure_category=null,
          retryable=false,retry_after=null,version=version+1,updated_at=trusted_now where id=s.id;
      end if;
      insert into public.cms_promotion_schedule_attempts(schedule_id,action,intended_at,attempted_at,
        attempt_number,outcome,completed_at) values(s.id,action_name,intended,trusted_now,attempt_no,
          case when action_name='expire' and (s.status='scheduled' or
            (s.status='failed' and s.failure_action='activate')) then 'skipped_window' else 'success' end,trusted_now);
      insert into public.cms_promotion_schedule_audit(schedule_id,event_kind,schedule_version,occurred_at)
        values(s.id,case when action_name='expire' and (s.status='scheduled' or
          (s.status='failed' and s.failure_action='activate')) then 'skip_window' else action_name end,
          s.version+1,trusted_now);
    exception when others then
      category:=case when sqlstate='23505' and exists (
          select 1 from public.cms_promotion_schedule_placements wanted
            join public.cms_active_promotion_placements blocking
              on blocking.placement_kind=wanted.placement_kind and blocking.target_key=wanted.target_key
            join public.cms_promotion_schedules owner_schedule on owner_schedule.id=blocking.schedule_id
          where wanted.schedule_id=s.id and owner_schedule.ends_at is not null
            and owner_schedule.ends_at<=trusted_now) then 'transient'
        when sqlstate='23505' then 'placement_conflict'
        when sqlstate='23503' then 'revision_unavailable'
        when sqlstate in ('40001','40P01','55P03','08000','08006') then 'transient'
        else 'integrity' end;
      retry_ok:=category='transient';
      update public.cms_promotion_schedules set status='failed',failure_action=action_name,
        failure_category=category,retryable=retry_ok,
        retry_after=case when retry_ok then trusted_now+interval '1 minute' else null end,
        version=version+1,updated_at=trusted_now where id=s.id;
      insert into public.cms_promotion_schedule_attempts(schedule_id,action,intended_at,attempted_at,
        attempt_number,outcome,failure_category,completed_at) values(s.id,action_name,intended,trusted_now,
        attempt_no,case when retry_ok then 'retryable_failure' else 'terminal_failure' end,category,trusted_now);
      insert into public.cms_promotion_schedule_audit(schedule_id,event_kind,schedule_version,occurred_at,failure_category)
        values(s.id,'failure',s.version+1,trusted_now,category);
    end;
    result_count:=result_count+1;
  end loop;
  return result_count;
end; $$;

do $$ declare f regprocedure; begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'cms_schedule_validate_promotion','cms_schedule_validate_placements',
      'cms_create_promotion_schedule','cms_edit_promotion_schedule','cms_schedule_promotion',
      'cms_cancel_promotion_schedule','cms_retry_promotion_schedule','cms_read_promotion_schedules',
      'cms_read_promotion_schedule_choices',
      'cms_read_active_promotion_placement','cms_process_due_promotion_schedules') loop
    execute format('alter function %s owner to postgres',f);
    execute format('revoke all on function %s from public, anon, authenticated, service_role',f);
  end loop;
end $$;
grant execute on function public.cms_create_promotion_schedule(uuid,uuid,text,timestamptz,timestamptz,jsonb),
  public.cms_edit_promotion_schedule(uuid,bigint,uuid,text,timestamptz,timestamptz,jsonb),
  public.cms_schedule_promotion(uuid,bigint),public.cms_cancel_promotion_schedule(uuid,bigint),
  public.cms_retry_promotion_schedule(uuid,bigint),public.cms_read_promotion_schedules() to authenticated;
grant execute on function public.cms_read_promotion_schedule_choices() to authenticated;
grant execute on function public.cms_read_active_promotion_placement(text,text) to anon,authenticated;
grant execute on function public.cms_process_due_promotion_schedules(timestamptz,integer) to service_role;

commit;
