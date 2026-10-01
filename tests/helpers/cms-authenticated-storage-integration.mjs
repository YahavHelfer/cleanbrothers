// Isolated local Storage/RLS integration; no Production or cloud endpoint is contacted.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { createSourceLoader } from "./source-module.mjs";
import { getLocalStack, localSql } from "../../scripts/cms-local.mjs";

const stack = getLocalStack();
const input = JSON.parse(readFileSync(0, "utf8"));
assert.match(input.actor, /^[0-9a-f-]{36}$/);
assert.match(input.baseline, /^[0-9a-f-]{36}$/);
const actor = createClient(stack.url, stack.key, { auth: { persistSession: false, autoRefreshToken: false } });
const anonymous = createClient(stack.url, stack.key, { auth: { persistSession: false, autoRefreshToken: false } });
const cleanup = createClient(stack.url, stack.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const bucket = "cms-media-production";
const uploaded = [];
let stage = "local authentication";
try {
  assert.equal((await actor.auth.setSession(input.session)).error, null);
  const load = createSourceLoader({ env: {
    CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co",
    CMS_SUPABASE_PUBLISHABLE_KEY: stack.key,
    VERCEL: "1", VERCEL_ENV: "production",
    VERCEL_PROJECT_ID: "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
    VERCEL_GIT_COMMIT_REF: "main",
    CMS_MEDIA_PRODUCTION_ENABLED: "1",
    CMS_CONTENT_SOURCE: "published",
    CMS_CONTENT_SERVICE_ALLOWLIST: "delicate-upholstery-cleaning",
  }, mocks: {
    "@/cms/server": { createCmsServerClient: async () => actor },
    "./server": { createCmsServerClient: async () => actor },
  }, fetchImpl: async (url, init) => {
    const u = new URL(url);
    assert.equal(u.origin, "https://plbwefnwussxlglscfpn.supabase.co");
    assert.match(u.pathname, /^\/(storage|rest)\/v1\//);
    return fetch(stack.url + u.pathname + u.search, init);
  } });
  const repo = load("src/cms/media/repository.ts");
  const route = load("src/app/cms-media/[id]/route.ts");
  const state = () => JSON.parse(localSql("select row_to_json(s) from content_publication_state s"));
  const payload = (id) => JSON.parse(localSql(`select cms_revision_payload(r) from content_revisions r where id='${id}'`));
  const publicImage = (id) => route.GET(new Request(`http://127.0.0.1:56301/cms-media/${id}`),
    { params: Promise.resolve({ id }) });
  const image = async (color) => sharp({ create: { width: 24, height: 16, channels: 3, background: color } }).png().toBuffer();
  const saveAndPublish = async (id) => {
    const s = state();
    const draft = await actor.rpc("cms_save_service_draft", {
      expected_generation: s.generation, base_revision: s.draft_revision_id,
      payload: { ...payload(input.baseline), schemaVersion: 2, images: [id] },
    });
    assert.equal(draft.error, null);
    assert.equal((await actor.rpc("cms_publish_service_revision", {
      expected_generation: state().generation, revision: draft.data,
    })).error, null);
    return draft.data;
  };

  stage = "AAL2 upload A";
  const asset = await repo.uploadMedia(await image("red"), "a.png", "image/png",
    { altText: "A", caption: "", folder: "" });
  const a = localSql(`select current_version_id from media_assets where id='${asset}'`);
  uploaded.push(`${a}.webp`);
  assert.equal((await publicImage(a)).status, 404);
  assert.equal((await anonymous.storage.from(bucket).download(`${a}.webp`)).data, null);
  assert.equal((await anonymous.storage.from(bucket).list()).data?.length ?? 0, 0);
  assert.equal((await actor.storage.from(bucket).download(`${a}.webp`)).error, null);
  stage = "publish A";
  const aRevision = await saveAndPublish(a);
  const aResponse = await publicImage(a);
  assert.equal(aResponse.status, 200);
  assert.equal((await anonymous.storage.from(bucket).download(`${a}.webp`)).error, null);
  assert.equal((await anonymous.storage.from(bucket).list()).data?.length ?? 0, 0);
  const aHash = createHash("sha256").update(Buffer.from(await aResponse.arrayBuffer())).digest("hex");

  stage = "AAL2 upload B and immutable A";
  assert.equal(await repo.uploadMedia(await image("blue"), "b.png", "image/png",
    { altText: "B", caption: "", folder: "" }, asset, 1), asset);
  const b = localSql(`select current_version_id from media_assets where id='${asset}'`);
  uploaded.push(`${b}.webp`);
  assert.notEqual(b, a);
  assert.equal((await publicImage(b)).status, 404);
  assert.equal((await anonymous.storage.from(bucket).download(`${b}.webp`)).data, null);
  assert.equal(state().published_revision_id, aRevision);
  assert.equal(createHash("sha256").update(Buffer.from(await (await publicImage(a)).arrayBuffer())).digest("hex"), aHash);

  stage = "publish B and rollback A";
  const bRevision = await saveAndPublish(b);
  assert.equal((await publicImage(b)).status, 200);
  assert.equal((await publicImage(a)).status, 404);
  assert.equal((await anonymous.storage.from(bucket).download(`${a}.webp`)).data, null);
  assert.equal((await actor.storage.from(bucket).download(`${a}.webp`)).error, null);
  const s = state();
  const restored = await actor.rpc("cms_save_service_draft", {
    expected_generation: s.generation, base_revision: s.draft_revision_id,
    payload: null, restore_revision: aRevision,
  });
  assert.equal(restored.error, null);
  assert.equal((await actor.rpc("cms_publish_service_revision", {
    expected_generation: state().generation, revision: restored.data,
  })).error, null);
  assert.equal(createHash("sha256").update(Buffer.from(await (await publicImage(a)).arrayBuffer())).digest("hex"), aHash);
  assert.equal((await publicImage(b)).status, 404);
  assert.equal((await anonymous.storage.from(bucket).download(`${b}.webp`)).data, null);
  assert.equal((await actor.storage.from(bucket).download(`${b}.webp`)).error, null);
  assert.equal(payload(state().published_revision_id).images[0], a);
  assert.equal(payload(bRevision).images[0], b);
} catch {
  console.error(`Local authenticated Storage integration failed at: ${stage}`);
  process.exitCode = 1;
} finally {
  // Test-only privileged cleanup of exact synthetic objects; runtime uses no such key.
  if (uploaded.length) assert.equal((await cleanup.storage.from(bucket).remove(uploaded)).error, null);
}
if (!process.exitCode) console.log("Local AAL2 Storage upload and A/B/rollback integration passed; synthetic objects removed.");
