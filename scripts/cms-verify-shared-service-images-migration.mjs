import { readFileSync } from "node:fs";
import { localSql } from "./cms-local.mjs";
import { createSourceLoader, plain } from "../tests/helpers/source-module.mjs";
const load = createSourceLoader();
const literal = value => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const migration = name => readFileSync(`supabase/migrations/${name}.sql`, "utf8").replace(/^begin;\s*/, "").replace(/\s*commit;\s*$/, "");
const old = migration("20261003200000_cms_home_service_images");
const next = migration("20261004100000_cms_shared_service_images");
const baseline = plain(load("src/cms/home/baseline.ts").homeBaseline);
const cards = baseline.blocks.find(b => b.type === "homeServices").payload.cards;
cards["sofa-cleaning"].images = [cards["sofa-cleaning"].images[2], { ...cards["sofa-cleaning"].images[0], alt: "Published editor alt" }];
cards["mattress-cleaning"].images = [];
const draft = structuredClone(baseline);
draft.seoTitle = "Unpublished editor SEO";
draft.blocks.find(b => b.type === "homeServices").payload.cards["sofa-cleaning"].images.reverse();
draft.blocks.find(b => b.type === "homeServices").payload.cards["sofa-cleaning"].images[0].alt = "Unpublished editor alt";
const { sharedServiceKeys } = load("src/content/service-registry.ts");
const { serviceBaseline } = load("src/cms/content/baseline.ts");
const imports = sharedServiceKeys.map(key => `select cms_import_shared_baseline('${key}',${literal(serviceBaseline(key))});`).join("\n");
const delicate = plain(serviceBaseline("delicate-upholstery-cleaning"));
delicate.images = ["1733a278-1a4c-4230-860d-0db0e62cc57a"];
delicate.imageAlt = "Private delicate image";
delicate.schemaVersion = 2;
const snapshot = `select jsonb_build_object('states',(select jsonb_agg(to_jsonb(s) order by document_id) from content_publication_state s),
 'revisions',(select jsonb_agg(to_jsonb(r) order by id) from content_revisions r),
 'blocks',(select jsonb_agg(to_jsonb(b) order by revision_id,position) from page_revision_blocks b),
 'refs',(select jsonb_agg(to_jsonb(m) order by revision_id,usage_role,position) from revision_media_refs m),
 'media',(select jsonb_agg(to_jsonb(v) order by id) from media_versions v),
 'events',(select jsonb_agg(to_jsonb(e) order by id) from content_publication_events e),
 'collections',(select jsonb_agg(to_jsonb(c) order by revision_id,service_key) from cms_service_image_collections c))`;
const home = `document_id='d4000000-0000-4000-8000-000000000000'`;
const sql = `begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
truncate cms_service_image_collections,cms_manual_campaign_events,cms_manual_campaign_placements,cms_manual_campaign_revisions,
 cms_promotion_schedule_audit,cms_promotion_schedule_attempts,cms_active_promotion_placements,cms_promotion_schedule_placements,cms_promotion_schedules,
 cms_page_route_events,cms_page_routes,cms_new_page_identity,page_revision_blocks,promotion_revision_media,cms_promotion_identity,
 media_audit_events,revision_media_refs,cms_media_upload_attempts,media_versions,media_assets,content_publication_events,content_publication_state,content_revisions,content_documents;
${old}
select cms_import_shared_media();
${imports}
select cms_import_home_baseline(${literal(baseline)});
insert into auth.users(id,invited_at) values('55000000-0000-4000-8000-000000000097',null);
insert into cms_admin_members(user_id,is_active) values('55000000-0000-4000-8000-000000000097',true);
select set_config('request.jwt.claims','{"sub":"55000000-0000-4000-8000-000000000097","aal":"aal2","role":"authenticated"}',true);
select cms_save_managed_draft('delicate-upholstery-cleaning',1,(cms_read_service_editor('delicate-upholstery-cleaning')->>'draftRevisionId')::uuid,${literal(delicate)});
select cms_save_home_draft(1,(select draft_revision_id from content_publication_state where ${home}),${literal(draft)});
create temporary table fixture(before_state jsonb,after_state jsonb);
insert into fixture(before_state) ${snapshot};
${next}
update fixture set after_state=(${snapshot});
select is(cms_read_public_home()->'serviceImages'->'sofa-cleaning',${literal(cards["sofa-cleaning"].images)},'published homepage edits retain order and alt');
select is(cms_read_home_editor()->'serviceImages'->'sofa-cleaning',${literal(draft.blocks.find(b=>b.type==="homeServices").payload.cards["sofa-cleaning"].images)},'unpublished edits retain separate order and alt');
select is(cms_read_public_home()->'serviceImages'->'mattress-cleaning','[]'::jsonb,'intentional empty published collection stays empty');
select is(cms_read_home_editor()->'serviceImages'->'mattress-cleaning','[]'::jsonb,'intentional empty draft collection stays empty');
select is(cms_read_home_editor()->'draft'->>'seoTitle','Unpublished editor SEO','unpublished SEO preserved');
select is(cms_read_public_home()->'serviceImages'->'delicate-upholstery-cleaning'->0->>'versionId','d1000000-0000-4000-8000-000000000001','never-configured service seeds published images');
select is(cms_read_home_editor()->'serviceImages'->'delicate-upholstery-cleaning'->0->>'versionId','1733a278-1a4c-4230-860d-0db0e62cc57a','never-configured service seeds private images separately');
select is(cms_read_home_editor()->'serviceImages'->'delicate-upholstery-cleaning'->0->>'alt','Private delicate image','legacy private alt preserved');
select is((select count(*)::integer from cms_service_image_collections),18,'nine canonical rows per current immutable snapshot');
select ok(not exists(select 1 from page_revision_blocks b join content_publication_state s on b.revision_id in(s.draft_revision_id,s.published_revision_id) where ${home.replace('document_id','s.document_id')} and b.block_type='homeServices' and exists(select 1 from jsonb_each(b.payload->'cards') c where c.value ? 'images')),'new blocks store text only, without duplicate image data');
select ok((after_state->'revisions') @> (before_state->'revisions'),'all historical revisions unchanged') from fixture;
select ok((after_state->'blocks') @> (before_state->'blocks'),'historical block payloads unchanged') from fixture;
select ok((after_state->'refs') @> (before_state->'refs'),'all historical media references unchanged') from fixture;
select is(after_state->'media',before_state->'media','media versions unchanged') from fixture;
select ok((after_state->'events') @> (before_state->'events'),'publication history preserved') from fixture;
select is((select jsonb_agg(v order by v->>'document_id') from jsonb_array_elements(after_state->'states') v where v->>'document_id'<>'d4000000-0000-4000-8000-000000000000'),(select jsonb_agg(v order by v->>'document_id') from jsonb_array_elements(before_state->'states') v where v->>'document_id'<>'d4000000-0000-4000-8000-000000000000'),'service draft and published pointers unchanged') from fixture;
${next}
select is((${snapshot}),after_state,'migration rerun changes no content or pointers') from fixture;
select ok(not has_table_privilege('authenticated','cms_service_image_collections','select'),'no direct collection table access');
select ok(not has_function_privilege('anon','cms_save_home_shared_draft(bigint,uuid,jsonb,jsonb,uuid)','execute'),'anonymous mutation denied');
select throws_ok($$update cms_service_image_collections set images='[]'$$,'55000',null,'collections immutable');
select ok(not cms_valid_service_image_collections(cms_default_service_images()-'sofa-cleaning'),'missing service rejected');
select ok(not cms_valid_service_image_collections(cms_default_service_images()||'{"Unknown title":[]}'::jsonb),'title or unknown identity rejected');
select throws_ok($$select cms_save_home_shared_draft((select generation from content_publication_state where ${home}),
 (select draft_revision_id from content_publication_state where ${home}),cms_read_home_editor()->'draft','{}')$$,'22023',null,'invalid shared collection write rejected');
select cms_save_home_shared_draft((select generation from content_publication_state where ${home}),
 (select draft_revision_id from content_publication_state where ${home}),cms_read_home_editor()->'draft',jsonb_set(cms_read_home_editor()->'serviceImages','{sofa-cleaning}','[]'));
select is(cms_read_home_editor()->'serviceImages'->'sofa-cleaning','[]'::jsonb,'removing final image saves intentional empty collection');
select is(cms_read_public_home()->'serviceImages'->'sofa-cleaning',${literal(cards["sofa-cleaning"].images)},'save cannot publish shared image changes');
update fixture set after_state=(${snapshot});
${next}
select is((${snapshot}),after_state,'rerun after editor save cannot overwrite empty collection') from fixture;
select is((select count(*)::integer from pg_trigger where tgname in('revision_media_scope','page_promotion_media_scope','publication_media_scope') and tgenabled='O'),3,'all scope guards restored');
select set_config('request.jwt.claims','{"sub":"55000000-0000-4000-8000-000000000097","aal":"aal1","role":"authenticated"}',true);
select throws_ok($$select cms_save_home_shared_draft(1,'d4000000-0000-4000-8000-000000000000',null,null)$$,'42501',null,'AAL1 shared image writes denied');
-- A single legacy home pointer can still have separate unpublished service photos.
select set_config('request.jwt.claims','{"sub":"55000000-0000-4000-8000-000000000097","aal":"aal2","role":"authenticated"}',true);
truncate content_documents cascade;
${old}
${imports}
select cms_import_home_baseline(${literal(baseline)});
select cms_save_managed_draft('delicate-upholstery-cleaning',1,(cms_read_service_editor('delicate-upholstery-cleaning')->>'draftRevisionId')::uuid,${literal(delicate)});
select is((select draft_revision_id from content_publication_state where ${home}),(select published_revision_id from content_publication_state where ${home}),'legacy home starts with one draft/published pointer');
${next}
select isnt((select draft_revision_id from content_publication_state where ${home}),(select published_revision_id from content_publication_state where ${home}),'private legacy service images create a separate home successor');
select is(cms_read_public_home()->'serviceImages'->'delicate-upholstery-cleaning'->0->>'versionId','d1000000-0000-4000-8000-000000000001','shared old home pointer cannot publish private legacy photos');
select is(cms_read_home_editor()->'serviceImages'->'delicate-upholstery-cleaning'->0->>'alt','Private delicate image','shared old home pointer retains private legacy alt');
update fixture set after_state=(${snapshot});
${next}
select is((${snapshot}),after_state,'rerun preserves split successors from a formerly shared pointer') from fixture;
select * from finish();
rollback;`;
let output;
try { output = localSql(sql); } catch(error) { process.stderr.write(error.stderr?.toString() || error.message); process.exit(1); }
const results = output.split("\n").filter(line => /^(?:not )?ok \d+|Looks like you failed/.test(line));
for(const line of results) console.log(line);
if(results.some(line => /not ok|Looks like you failed/.test(line)) || results.length !== 33) throw new Error("Shared image local migration verification failed");
console.log("Local Supabase preservation/rerun verification passed; fixtures and schema replacements rolled back.");
