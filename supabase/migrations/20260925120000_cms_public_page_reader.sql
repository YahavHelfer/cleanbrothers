begin;

-- The public surface has no revision selector. It projects only the current
-- published /about revision, visible blocks, and promotion revisions that the
-- published page pins and that have themselves been published at least once.
create function public.cms_read_public_page(target_key text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'revisionId', r.id,
    'payload', public.cms_revision_payload(r) || jsonb_build_object('blocks',
      (select coalesce(jsonb_agg(jsonb_build_object(
        'id', b.block_id, 'position', b.public_position, 'type', b.block_type,
        'schemaVersion', b.schema_version, 'hidden', false, 'payload', b.payload,
        'mediaVersionId', b.media_version_id, 'promotionRevisionId', b.promotion_revision_id
      ) order by b.position), '[]'::jsonb)
       from (select blocks.*, (row_number() over (order by blocks.position) - 1)::integer as public_position
             from public.page_revision_blocks blocks
             where blocks.revision_id=r.id and not blocks.hidden) b)),
    'promotions',
      (select coalesce(jsonb_object_agg(p.id::text, public.cms_revision_payload(p)), '{}'::jsonb)
       from public.content_revisions p
       join public.content_documents pd on pd.id=p.document_id
       where pd.content_type='promotion' and pd.content_key='about-intro'
         and p.id in (select b.promotion_revision_id from public.page_revision_blocks b
                      where b.revision_id=r.id and not b.hidden and b.promotion_revision_id is not null)
         and exists(select 1 from public.content_publication_events e where e.revision_id=p.id)),
    'media',
      (select coalesce(jsonb_agg(jsonb_build_object(
        'media_version_id', refs.media_version_id, 'usage_role', refs.usage_role,
        'position', refs.position, 'alt_text', refs.alt_text,
        'provider', v.storage_provider
      ) order by refs.revision_id, refs.position), '[]'::jsonb)
       from public.revision_media_refs refs
       join public.media_versions v on v.id=refs.media_version_id
       where (refs.revision_id=r.id and refs.usage_role in ('page-hero','page-image')
              and exists(select 1 from public.page_revision_blocks b
                         where b.revision_id=r.id and b.position=refs.position and not b.hidden))
          or (refs.usage_role='promotion' and refs.revision_id in
              (select b.promotion_revision_id from public.page_revision_blocks b
               where b.revision_id=r.id and not b.hidden and b.promotion_revision_id is not null)))
  )
  from public.content_documents d
  join public.content_publication_state s on s.document_id=d.id
  join public.content_revisions r on r.id=s.published_revision_id and r.document_id=d.id
  where target_key='about' and d.content_type='page' and d.content_key='about'
    and r.schema_version=6
    and not exists (
      select 1 from public.page_revision_blocks b
      where b.revision_id=r.id and not b.hidden and b.promotion_revision_id is not null
        and not exists (
          select 1 from public.content_revisions p
          join public.content_documents pd on pd.id=p.document_id
          where p.id=b.promotion_revision_id and pd.content_type='promotion'
            and pd.content_key='about-intro' and exists (
              select 1 from public.content_publication_events e where e.revision_id=p.id))
    );
$$;

alter function public.cms_read_public_page(text) owner to postgres;
revoke all on function public.cms_read_public_page(text) from public, anon, authenticated, service_role;
grant execute on function public.cms_read_public_page(text) to anon, authenticated;

commit;
