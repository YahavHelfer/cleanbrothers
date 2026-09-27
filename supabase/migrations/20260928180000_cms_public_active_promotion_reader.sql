begin;

-- A public, revision-pinned presentation projection. The active row alone is
-- never sufficient: eligibility is checked against database time and the
-- immutable Promotion/document/publication/media relations on every read.
create or replace function public.cms_read_active_promotion_placement(kind text, target text)
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
         'car-upholstery-cleaning','armchair-chair-cleaning','air-conditioner-cleaning','window-cleaning')))
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
          and v.storage_provider in ('static','local','supabase')));
$$;

alter function public.cms_read_active_promotion_placement(text,text) owner to postgres;
revoke all on function public.cms_read_active_promotion_placement(text,text) from public,anon,authenticated,service_role;
grant execute on function public.cms_read_active_promotion_placement(text,text) to anon,authenticated;

commit;
