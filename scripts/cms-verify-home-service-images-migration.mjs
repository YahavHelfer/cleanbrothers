import { readFileSync } from "node:fs";
import { localSql } from "./cms-local.mjs";
import { createSourceLoader, plain } from "../tests/helpers/source-module.mjs";

// All fixtures and schema replacements run in one rollback-only transaction.
// localSql refuses cloud/linked projects; this never touches production.
const load = createSourceLoader();
const baseline = plain(load("src/cms/home/baseline.ts").homeBaseline);
for (const block of baseline.blocks) if (block.type === "homeServices")
  for (const card of Object.values(block.payload.cards)) delete card.images;
const edited = structuredClone(baseline);
edited.seoTitle = "Editor SEO preserved by image migration";
edited.blocks.find(block => block.type === "homeServices").payload.cards["sofa-cleaning"].description = "מלל שהעורך שינה לפני המיגרציה";
const literal = value => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const migration = readFileSync("supabase/migrations/20261003200000_cms_home_service_images.sql", "utf8")
  .replace(/^begin;\s*/, "").replace(/\s*commit;\s*$/, "");
const legacyInserter = readFileSync("supabase/migrations/20260927150000_cms_homepage_blocks.sql", "utf8")
  .match(/create function public\.cms_insert_home_blocks\([\s\S]*?end; \$\$;/)[0]
  .replace("create function", "create or replace function");
const snapshot = `select jsonb_build_object('state',to_jsonb(s),'draft',public.cms_page_revision_payload(dr),
  'published',public.cms_page_revision_payload(pr),'history',(select jsonb_agg(to_jsonb(r) order by r.revision_number)
    from public.content_revisions r where r.document_id=s.document_id),
  'blocks',(select jsonb_agg(to_jsonb(b) order by b.revision_id,b.position) from public.page_revision_blocks b
    join public.content_revisions r on r.id=b.revision_id where r.document_id=s.document_id),
  'refs',(select jsonb_agg(to_jsonb(m) order by m.revision_id,m.usage_role,m.position) from public.revision_media_refs m
    join public.content_revisions r on r.id=m.revision_id where r.document_id=s.document_id),
  'events',(select jsonb_agg(to_jsonb(e) order by e.published_at,e.id) from public.content_publication_events e
    where e.document_id=s.document_id)) from public.content_publication_state s
  join public.content_documents d on d.id=s.document_id join public.content_revisions dr on dr.id=s.draft_revision_id
  join public.content_revisions pr on pr.id=s.published_revision_id where d.content_key='home'`;
const sql = `begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
truncate cms_manual_campaign_events,cms_manual_campaign_placements,cms_manual_campaign_revisions,
  cms_promotion_schedule_audit,cms_promotion_schedule_attempts,cms_active_promotion_placements,cms_promotion_schedule_placements,cms_promotion_schedules,
  cms_page_route_events,cms_page_routes,cms_new_page_identity,page_revision_blocks,promotion_revision_media,cms_promotion_identity,
  media_audit_events,revision_media_refs,cms_media_upload_attempts,media_versions,media_assets,content_publication_events,content_publication_state,
  content_revisions,content_documents;
${legacyInserter}
create temporary table migration_fixture(before_state jsonb, after_state jsonb);
select public.cms_import_home_baseline(${literal(baseline)});
insert into auth.users(id,invited_at) values ('55000000-0000-4000-8000-000000000098',null);
insert into public.cms_admin_members(user_id,is_active) values ('55000000-0000-4000-8000-000000000098',true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"55000000-0000-4000-8000-000000000098","aal":"aal2","role":"authenticated"}',true);
select public.cms_save_home_draft(1,(select draft_revision_id from public.content_publication_state
  where document_id='d4000000-0000-4000-8000-000000000000'),${literal(edited)});
reset role;
insert into migration_fixture(before_state) ${snapshot};
${migration}
update migration_fixture set after_state=(${snapshot});
select is(public.cms_page_revision_payload(dr)->>'seoTitle','Editor SEO preserved by image migration','unpublished editor SEO preserved')
  from public.content_publication_state s join public.content_revisions dr on dr.id=s.draft_revision_id
  where s.document_id='d4000000-0000-4000-8000-000000000000';
select is(public.cms_page_revision_payload(dr)->'blocks'->2->'payload'->'cards'->'sofa-cleaning'->>'description',
  'מלל שהעורך שינה לפני המיגרציה','unpublished editor card text preserved')
  from public.content_publication_state s join public.content_revisions dr on dr.id=s.draft_revision_id
  where s.document_id='d4000000-0000-4000-8000-000000000000';
select isnt(after_state->'state'->>'draft_revision_id',after_state->'state'->>'published_revision_id','migration does not publish separate draft') from migration_fixture;
select is(jsonb_array_length(after_state->'history'),jsonb_array_length(before_state->'history')+2,'one successor per current legacy revision') from migration_fixture;
select ok((after_state->'history') @> (before_state->'history'),'immutable historical revisions preserved') from migration_fixture;
select ok((after_state->'blocks') @> (before_state->'blocks'),'historical blocks preserved') from migration_fixture;
select ok((after_state->'refs') @> (before_state->'refs'),'historical media refs preserved') from migration_fixture;
select ok((after_state->'events') @> (before_state->'events'),'historical audit events preserved') from migration_fixture;
select is(after_state->'published'->>'seoTitle',before_state->'published'->>'seoTitle','published editor SEO preserved') from migration_fixture;
${migration}
select is((${snapshot}),after_state,'direct migration rerun changes no content, state, history or refs') from migration_fixture;
set local role authenticated;
select public.cms_save_home_draft((select generation from public.content_publication_state where document_id='d4000000-0000-4000-8000-000000000000'),
  (select draft_revision_id from public.content_publication_state where document_id='d4000000-0000-4000-8000-000000000000'),
  jsonb_set(jsonb_set((public.cms_read_home_editor()->'draft'),
    '{blocks,2,payload,cards,sofa-cleaning,images}','[]'),
    '{blocks,2,payload,cards,mattress-cleaning,images}',
    '[{"versionId":"bfaa5d53-8085-4fd4-826a-69b9a18ace18","alt":"תיאור שהעורך שינה","position":"object-center"}]'));
reset role;
update migration_fixture set after_state=(${snapshot});
${migration}
select is((${snapshot}),after_state,'rerun preserves editor images, custom alt and explicit empty lists') from migration_fixture;
select is((select count(*)::integer from pg_trigger where tgname in ('revision_media_scope','page_promotion_media_scope','publication_media_scope') and tgenabled='O'),3,'scope guards restored after migration and reruns');
select * from finish();
rollback;`;
const output = localSql(sql);
const failures = output.split("\n").filter(line => /not ok|Looks like you failed/.test(line));
const assertions = output.split("\n").filter(line => /^ok \d+/.test(line));
for (const line of [...assertions, ...failures]) console.log(line);
if (failures.length || assertions.length !== 12) throw new Error("Local homepage migration verification failed");
console.log("Local migration preservation/rerun verification passed; all fixtures and schema replacements rolled back.");
