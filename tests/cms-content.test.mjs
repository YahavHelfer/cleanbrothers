import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createSourceLoader, elementTree, plain } from "./helpers/source-module.mjs";

const load = createSourceLoader();
const model = load("src/cms/content/pilot-model.ts");
const baseline = () => load("src/cms/content/baseline.ts").pilotBaseline();
const localEnv = { CMS_SUPABASE_URL: "http://127.0.0.1:56321", CMS_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test" };
const publishedEnv = { CMS_PILOT_CONTENT_SOURCE: "published", CMS_CONTENT_SERVICE_ALLOWLIST: model.PILOT_KEY };
const previewEnv = { ...localEnv, VERCEL: "1", VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation", CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co" };
const revision = "a0000000-0000-4000-8000-000000000001";

test("baseline model round-trips every existing pilot value with no copy edits", () => {
  const { delicateUpholsteryLanding } = load("src/data/serviceLandingPages.ts");
  const { toServiceLandingProps } = load("src/content/service-landing-adapter.ts");
  assert.deepEqual(plain(toServiceLandingProps(model.toPilotLanding(baseline())).config), plain(delicateUpholsteryLanding));
});

test("CMS baseline and static source render identical text, links, images, form, FAQ JSON-LD and metadata", () => {
  const { staticContentSource } = load("src/content/static-source.ts");
  const { toServiceLandingProps } = load("src/content/service-landing-adapter.ts");
  const { ServiceLandingPage, buildServiceLandingMetadata } = load("src/components/ServiceLandingPage.tsx");
  const cms = toServiceLandingProps(model.toPilotLanding(baseline()));
  const existing = toServiceLandingProps(staticContentSource.getServiceLanding(model.PILOT_KEY));
  const html = renderToStaticMarkup(ServiceLandingPage(cms));
  assert.equal(html, renderToStaticMarkup(ServiceLandingPage(existing)));
  const faq = elementTree(ServiceLandingPage(cms)).find((node) => node.type.name === "JsonLd");
  assert.deepEqual(plain(faq.props.data.mainEntity.map((item) => ({ question: item.name, answer: item.acceptedAnswer.text }))), plain(baseline().faqs));
  assert.match(html, /ניקוי ריפודים עדינים/);
  assert.deepEqual(plain(buildServiceLandingMetadata(cms.config)), plain(buildServiceLandingMetadata(existing.config)));
  assert.equal(buildServiceLandingMetadata(cms.config).alternates.canonical, load("src/config/business.ts").businessConfig.siteUrl + model.PILOT_PATH);
});

test("all editable titles and paragraphs remain separate from CRM identity and canonical", () => {
  const edited = baseline();
  for (const key of Object.keys(model.pilotTextFields)) edited[key] = "כותרת ערוכה";
  const props = load("src/content/service-landing-adapter.ts").toServiceLandingProps(model.toPilotLanding(edited));
  assert.equal(props.crmServiceName, "ניקוי ריפודים עדינים");
  assert.equal(props.config.path, model.PILOT_PATH);
  assert.equal(props.config.serviceName, "כותרת ערוכה");
});

const invalids = {
  "unknown top-level field": (p) => { p.crmServiceName = "other"; },
  "editable routing": (p) => { p.path = "/other"; },
  "missing field": (p) => { delete p.h1; },
  "schema version": (p) => { p.schemaVersion = 2; },
  "empty title": (p) => { p.publicTitle = "  \n"; },
  "HTML": (p) => { p.intro = "<img src=x onerror=alert(1)>"; },
  "control character": (p) => { p.intro = "test\u0001"; },
  "SEO title length": (p) => { p.seoTitle = "x".repeat(121); },
  "SEO description length": (p) => { p.seoDescription = "x".repeat(321); },
  "remote image": (p) => { p.images = ["https://example.invalid/photo.jpg"]; },
  "other local asset": (p) => { p.images = ["/images/services/sofa-cleaning.jpeg"]; },
  "duplicate images": (p) => { p.images.push(p.images[0]); },
  "no images": (p) => { p.images = []; },
  "script link": (p) => { p.relatedLinks[0].href = "javascript:alert(1)"; },
  "external link": (p) => { p.relatedLinks[0].href = "https://example.invalid"; },
  "link query attribution": (p) => { p.relatedLinks[0].href += "?utm_source=cms"; },
  "link extra behavior": (p) => { p.relatedLinks[0].onClick = "evil()"; },
  "duplicate link": (p) => { p.relatedLinks[1] = p.relatedLinks[0]; },
  "FAQ shape": (p) => { p.faqs[0].html = "content"; },
  "FAQ empty answer": (p) => { p.faqs[0].answer = ""; },
  "FAQ duplicate question": (p) => { p.faqs[1].question = p.faqs[0].question; },
  "FAQ overflow": (p) => { p.faqs = Array.from({ length: 21 }, (_, i) => ({ question: `Q${i}`, answer: "A" })); },
  "empty list": (p) => { p.process = []; },
  "list duplicate": (p) => { p.benefits.push(p.benefits[0]); },
  "list object": (p) => { p.signs[0] = { text: "no" }; },
};
for (const [name, mutate] of Object.entries(invalids)) test(`strict payload rejects ${name}`, () => {
  const p = baseline(); mutate(p); assert.throws(() => model.validatePilotDraft(p));
});

test("plain text remains Unicode-safe, exact and defensively copied", () => {
  const p = baseline(); p.publicTitle = "😀".repeat(120); p.intro = "  שורה\nנוספת\t "; p.relatedLinks = [];
  const result = model.validatePilotDraft(p);
  assert.equal(result.intro, p.intro); assert.equal(result.publicTitle, p.publicTitle);
  result.signs[0] = "edited"; assert.notEqual(result.signs[0], p.signs[0]);
});

test("revision and generation parsers refuse missing, malformed or unsafe identifiers", () => {
  for (const value of [null, undefined, [], "latest", "x", `${revision}?other=1`]) assert.throws(() => model.parseRevisionId(value));
  for (const value of [null, "0", "-1", "1.5", "1e2", "9999999999999999"]) assert.throws(() => model.parseGeneration(value));
  assert.equal(model.parseRevisionId(revision), revision); assert.equal(model.parseGeneration("12"), 12);
});

for (const operation of ["editor", "revision", "save", "publish", "restore"]) test(`${operation} independently denies before accessing storage`, async () => {
  let authCalls = 0; let dbCalls = 0;
  const repository = createSourceLoader({ env: localEnv, mocks: {
    "@/cms/authorization": { requireCmsAdmin: async () => { authCalls++; throw Error("denied"); } },
    "@/cms/server": { createCmsServerClient: async () => { dbCalls++; throw Error("must not access"); } },
  } })("src/cms/content/repository.ts");
  const run = operation === "editor" ? () => repository.getPilotEditor() : operation === "revision" ? () => repository.getPilotRevision(revision)
    : () => repository.mutatePilot({ kind: operation, generation: 1, revision, payload: baseline(), source: revision });
  await assert.rejects(run, /denied/); assert.equal(authCalls, 1); assert.equal(dbCalls, 0);
});

for (const code of ["PT409", "40001"]) test(`stale editor (${code}) returns a Hebrew conflict without retrying a new generation`, async () => {
  let calls = 0;
  const repository = createSourceLoader({ env: localEnv, mocks: {
    "@/cms/authorization": { requireCmsAdmin: async () => ({ userId: "local" }) },
    "@/cms/server": { createCmsServerClient: async () => ({ rpc: async () => { calls++; return { error: { code } }; } }) },
  } })("src/cms/content/repository.ts");
  await assert.rejects(() => repository.mutatePilot({ kind: "save", generation: 1, revision, payload: baseline() }), /עורך אחר/);
  assert.equal(calls, 1);
});

test("Server Action does not trust a layout or caller-supplied previous success", async () => {
  let writes = 0;
  const actions = createSourceLoader({ mocks: {
    "@/cms/authorization": { requireCmsAdmin: async () => { throw Error("denied"); } },
    "./repository": { mutatePilot: async () => { writes++; } },
  } })("src/cms/content/actions.ts");
  const result = await actions.contentAction({ ok: true, revision }, new FormData());
  assert.equal(result.ok, false); assert.equal(writes, 0);
});

test("static selection does not query CMS or require its environment", async () => {
  let calls = 0;
  const source = createSourceLoader({ mocks: { "@supabase/supabase-js": { createClient: () => { calls++; throw Error("unexpected"); } } } })("src/cms/content/public-source.ts");
  assert.equal((await source.getPublicPilot()).revisionId, null); assert.equal(calls, 0);
});

test("public source requires both independent flags and the exact pilot allowlist", async () => {
  for (const flags of [{}, { CMS_PILOT_CONTENT_SOURCE: "published" },
    { CMS_CONTENT_SERVICE_ALLOWLIST: model.PILOT_KEY },
    { ...publishedEnv, CMS_PILOT_CONTENT_SOURCE: "static" },
    ...["", "*", "sofa-cleaning", `${model.PILOT_KEY},unknown-service`].map((value) => ({ ...publishedEnv, CMS_CONTENT_SERVICE_ALLOWLIST: value }))]) {
    let calls = 0;
    const source = createSourceLoader({ env: { ...previewEnv, ...flags }, mocks: {
      "@supabase/supabase-js": { createClient: () => { calls++; throw Error("unexpected"); } },
    } })("src/cms/content/public-source.ts");
    assert.equal((await source.getPublicPilot()).revisionId, null);
    assert.equal(calls, 0);
  }
});

for (const [name, env] of Object.entries({
  "local cloud URL": { ...localEnv, CMS_SUPABASE_URL: previewEnv.CMS_SUPABASE_URL },
  "hosted loopback": { ...previewEnv, CMS_SUPABASE_URL: localEnv.CMS_SUPABASE_URL },
  "Production with both flags": { ...previewEnv, VERCEL_ENV: "production" },
  "other Preview branch": { ...previewEnv, VERCEL_GIT_COMMIT_REF: "feature/other" },
  "main Preview": { ...previewEnv, VERCEL_GIT_COMMIT_REF: "main" },
  "missing branch": { ...previewEnv, VERCEL_GIT_COMMIT_REF: "" },
  "other Supabase project": { ...previewEnv, CMS_SUPABASE_URL: "https://unrelated.supabase.co" },
  "unverified hosting": { ...previewEnv, VERCEL: "" },
  "missing public key": { ...previewEnv, CMS_SUPABASE_PUBLISHABLE_KEY: "" },
})) {
  test(`content fails closed for ${name}, including direct repository access`, async () => {
    let calls = 0;
    const guarded = createSourceLoader({ env: { ...env, ...publishedEnv }, mocks: {
      "@/cms/authorization": { requireCmsAdmin: async () => ({ userId: "test" }) },
      "@/cms/server": { createCmsServerClient: async () => { calls++; throw Error("unexpected"); } },
      "@supabase/supabase-js": { createClient: () => { calls++; throw Error("unexpected"); } },
    } });
    await assert.rejects(() => guarded("src/cms/content/public-source.ts").getPublicPilot(), /unavailable/);
    await assert.rejects(() => guarded("src/cms/content/repository.ts").getPilotEditor(), /unavailable/);
    assert.equal(calls, 0);
  });
}

for (const [name, env] of Object.entries({ local: localEnv, preview: previewEnv })) test(`${name} published adapter queries only no-argument projection with uncached requests`, async () => {
  const calls = []; let options; let fetchOptions;
  const source = createSourceLoader({ env: { ...env, ...publishedEnv }, fetchImpl: async (_input, init) => { fetchOptions = init; }, mocks: {
    "next/server": { connection: async () => {} },
    "@supabase/supabase-js": { createClient: (url, key, config) => { options = config; return { rpc: async (...args) => {
      calls.push(args); return { data: { revisionId: revision, payload: baseline() } };
    } }; } },
  } })("src/cms/content/public-source.ts");
  assert.equal((await source.getPublicPilot()).revisionId, revision);
  assert.deepEqual(calls, [["cms_read_published_pilot"]]);
  assert.equal(options.auth.persistSession, false);
  await options.global.fetch("https://example.invalid", { cache: "force-cache" });
  assert.equal(fetchOptions.cache, "no-store");
});

test("preview presentation contains no lead form, active contact link, public navigation, schema or marketing", () => {
  const { ServiceLandingView } = load("src/components/ServiceLandingView.tsx");
  const { PreviewContact } = load("src/cms/content/PreviewContact.tsx");
  const config = load("src/content/service-landing-adapter.ts").toServiceLandingProps(model.toPilotLanding(baseline())).config;
  const html = renderToStaticMarkup(ServiceLandingView({ config, preview: true, phoneNumber: "055-957-7731", contact: PreviewContact({ serviceName: config.serviceName }) }));
  assert.doesNotMatch(html, /<form|href="(?:tel:|https?:|\/)|application\/ld\+json|googletagmanager|facebook|utm_|\/api\//);
  assert.match(html, /<fieldset disabled/);
  assert.match(html, /פעולות יצירת הקשר מושבתים/);
});
