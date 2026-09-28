import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";

let publicSource = { source: "static" };
const load = createSourceLoader({ mocks: {
  "next/image": { __esModule: true, default: props => createElement("img", props) },
  "next/script": { __esModule: true, default: props => createElement("script", props) },
  "@/cms/pages/public-source": { getPublicAbout: async () => publicSource },
} });
const model = load("src/cms/pages/model.ts");
const { aboutBaseline, aboutPromotionBaseline } = load("src/cms/pages/baseline.ts");
const { PageBlocksView, pageRevisionMetadata } = load("src/cms/pages/PageBlocksView.tsx");
const { default: AboutPage, generateMetadata } = load("src/app/(site)/about/page.tsx");
const copy = () => structuredClone(plain(aboutBaseline));
const plainText = html => html.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/g, "")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
  .replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
  .replace(/\s+/g, " ").trim();

test("/about Revision 1 preserves static visible copy, section order, links, headings and SEO", async () => {
  const staticHtml = renderToStaticMarkup(await AboutPage());
  const cmsHtml = renderToStaticMarkup(createElement(PageBlocksView, { page: aboutBaseline,
    revisionId: "b0000000-0000-4000-8000-000000000001", preview: false }));
  assert.equal(plainText(cmsHtml), plainText(staticHtml));
  const tags = html => [...html.matchAll(/<(h[1-6]|a)\b([^>]*)>([\s\S]*?)<\/\1>/g)]
    .map(match => [match[1], plainText(match[3]), match[2].match(/href="([^"]*)"/)?.[1] || ""]);
  assert.deepEqual(tags(cmsHtml), tags(staticHtml));
  assert.equal(cmsHtml.includes("data-page-revision="), true);
  assert.deepEqual(plain(pageRevisionMetadata(aboutBaseline)), plain(await generateMetadata()));
  assert.equal(aboutBaseline.blocks.length, 2);
  assert.equal(aboutBaseline.blocks[0].type, "hero");
  assert.equal(aboutBaseline.blocks[1].type, "aboutOverview");
});

test("block registry is closed, versioned, accessible and has safe defaults", () => {
  assert.deepEqual(Object.keys(plain(model.blockDefinitions)), ["hero", "richText", "imageText", "faq", "cta", "promotionBanner", "spacer", "aboutOverview"]);
  for (const [type, definition] of Object.entries(model.blockDefinitions)) {
    assert.ok(definition.label && definition.description && definition.accessibility);
    assert.equal(model.defaultBlock(type, 2).schemaVersion, 1);
  }
  const page = copy();
  page.blocks[0].type = "<script>";
  assert.throws(() => model.validatePageDraft(page));
  page.blocks[0].type = "hero";
  page.blocks[0].schemaVersion = 2;
  assert.throws(() => model.validatePageDraft(page));
  page.blocks[0].schemaVersion = 1;
  page.blocks[0].payload.className = "fixed inset-0";
  assert.throws(() => model.validatePageDraft(page));
});

test("safe CTA resolver preserves current phone and WhatsApp routing and disables preview actions", () => {
  assert.equal(model.resolveSafeTarget({ kind: "internal", path: "/contact" }), "/contact");
  assert.match(model.resolveSafeTarget({ kind: "phone" }), /^tel:[0-9+]+$/);
  assert.match(model.resolveSafeTarget({ kind: "whatsapp", message: "היי" }), /^\/api\/whatsapp\?message=/);
  assert.equal(model.resolveSafeTarget({ kind: "whatsapp", message: "היי" }, true), undefined);
  for (const value of [
    { kind: "internal", path: "javascript:alert(1)" }, { kind: "internal", path: "data:text/html" },
    { kind: "internal", path: "//evil.example" }, { kind: "external", url: "https://evil.example" },
    { kind: "whatsapp", message: "<script>" }, { kind: "phone", number: "123" },
  ]) assert.throws(() => model.validateTarget(value));
});

test("page validator rejects duplicate IDs/order, hidden hero, HTML, malformed media and draft SEO leakage", async () => {
  const page = copy();
  page.blocks[1].id = page.blocks[0].id;
  assert.throws(() => model.validatePageDraft(page));
  page.blocks[1].id = "a0000000-0000-4000-8000-000000000002";
  page.blocks[1].position = 0;
  assert.throws(() => model.validatePageDraft(page));
  page.blocks[1].position = 1;
  page.blocks[0].hidden = true;
  assert.throws(() => model.validatePageDraft(page));
  page.blocks[0].hidden = false;
  page.blocks[0].payload.title = "<script>";
  assert.throws(() => model.validatePageDraft(page));
  page.blocks[0].payload.title = aboutBaseline.h1;
  page.blocks[0].mediaVersionId = "not-a-uuid";
  assert.throws(() => model.validatePageDraft(page));
  page.blocks[0].mediaVersionId = null;
  page.seoTitle = "טיוטת SEO";
  assert.equal(pageRevisionMetadata(aboutBaseline).title, (await generateMetadata()).title);
  assert.notEqual(pageRevisionMetadata(page).title, (await generateMetadata()).title);
});

test("hidden blocks remain in revision data but are absent from rendering", () => {
  const page = copy();
  page.blocks[1].hidden = true;
  const html = renderToStaticMarkup(createElement(PageBlocksView, { page,
    revisionId: "b0000000-0000-4000-8000-000000000002", preview: true }));
  assert.ok(page.blocks[1].payload.heading);
  assert.ok(!html.includes(page.blocks[1].payload.heading));
  assert.ok(html.includes(page.blocks[0].payload.title));
  assert.ok(!html.includes("/api/whatsapp"));
  assert.ok(html.includes('aria-disabled="true"'));
});

test("page pins exact promotion revision while later copy changes do not alter history", () => {
  const page = copy();
  const pinned = "b0000000-0000-4000-8000-000000000003";
  page.blocks.push({ id: "a0000000-0000-4000-8000-000000000003", position: 2, type: "promotionBanner",
    schemaVersion: 1, hidden: false, payload: { template: "accent" }, mediaVersionId: null, promotionRevisionId: pinned });
  const changed = { ...plain(aboutPromotionBaseline), description: "תיאור מאוחר שאינו שייך לעמוד ההיסטורי" };
  const html = renderToStaticMarkup(createElement(PageBlocksView, { page,
    revisionId: "b0000000-0000-4000-8000-000000000004", preview: true,
    promotions: { [pinned]: aboutPromotionBaseline, "b0000000-0000-4000-8000-000000000005": changed } }));
  assert.ok(html.includes(aboutPromotionBaseline.description));
  assert.ok(!html.includes(changed.description));
  assert.ok(!html.includes("href="));
  assert.throws(() => renderToStaticMarkup(createElement(PageBlocksView, { page,
    revisionId: "b0000000-0000-4000-8000-000000000004", preview: true, promotions: {} })));
});

test("page Admin and public gates require the exact local or approved Preview environment", () => {
  const moduleFor = env => createSourceLoader({ env })("src/cms/pages/environment.ts");
  const local = { CMS_SUPABASE_URL: "http://127.0.0.1:56321" };
  const preview = { VERCEL: "1", VERCEL_ENV: "preview",
    VERCEL_PROJECT_ID: "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
    VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation",
    CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co" };
  assert.equal(moduleFor(local).pagesEnvironmentAllowed(), true);
  assert.equal(moduleFor(preview).pagesEnvironmentAllowed(), true);
  assert.equal(moduleFor(preview).usesCmsPageSource("about"), false);
  const enabled = { ...preview, CMS_PAGE_SOURCE: "published", CMS_PAGE_ALLOWLIST: "about" };
  assert.equal(moduleFor(enabled).usesCmsPageSource("about"), true);
  assert.equal(moduleFor({ ...local, CMS_PAGE_SOURCE: "published", CMS_PAGE_ALLOWLIST: "about" }).usesCmsPageSource("about"), true);
  for (const env of [
    { ...enabled, VERCEL_ENV: "production" }, { ...enabled, VERCEL_PROJECT_ID: "other" },
    { ...enabled, VERCEL_GIT_COMMIT_REF: "main" }, { ...enabled, CMS_SUPABASE_URL: "https://crm.example" },
    { ...enabled, VERCEL: undefined }, { ...enabled, CMS_PAGE_SOURCE: "draft" },
    { ...enabled, CMS_PAGE_ALLOWLIST: "" }, { ...enabled, CMS_PAGE_ALLOWLIST: "about,contact" },
    { ...enabled, CMS_PAGE_ALLOWLIST: "*" }, { ...enabled, CMS_PAGE_ALLOWLIST: "about,about" },
    { ...enabled, CMS_PAGE_ALLOWLIST: " about" },
  ]) assert.equal(moduleFor(env).usesCmsPageSource("about"), false);
  assert.equal(moduleFor(enabled).usesCmsPageSource("contact"), false);
  assert.equal(moduleFor({ ...preview, CMS_CONTENT_ENABLED: "true", CMS_PILOT_CONTENT_SOURCE: "published",
    CMS_CONTENT_SERVICE_ALLOWLIST: "sofa-cleaning" }).usesCmsPageSource("about"), false);
});

test("/about switches HTML and metadata together to the published page snapshot", async () => {
  const page = copy();
  page.seoTitle = "כותרת CMS מפורסמת";
  page.blocks[1].hidden = true;
  publicSource = { source: "cms", revisionId: "b0000000-0000-4000-8000-000000000006",
    page, media: {}, promotions: {} };
  try {
    const html = renderToStaticMarkup(await AboutPage());
    assert.ok(html.includes('data-page-revision="b0000000-0000-4000-8000-000000000006"'));
    assert.ok(!html.includes("שירות מקצועי בגובה העיניים"));
    assert.equal((await generateMetadata()).title, page.seoTitle);
  } finally { publicSource = { source: "static" }; }
});

test("public page source calls only the published-key RPC and fails closed on incomplete snapshots", async () => {
  const calls = [];
  const env = { CMS_SUPABASE_URL: "http://127.0.0.1:56321", CMS_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    CMS_PAGE_SOURCE: "published", CMS_PAGE_ALLOWLIST: "about" };
  let result = { revisionId: "b0000000-0000-4000-8000-000000000001", payload: plain(aboutBaseline),
    promotions: {}, media: [] };
  const mocks = { "react": { cache: fn => fn }, "next/server": { connection: async () => {} },
    "@supabase/supabase-js": { createClient: () => ({ rpc: async (name, args) => {
      calls.push([name, args]); return { data: result, error: null };
    } }) } };
  const source = createSourceLoader({ env, mocks })("src/cms/pages/public-source.ts");
  const published = await source.getPublicAbout();
  assert.equal(published.source, "cms");
  assert.equal(published.revisionId, result.revisionId);
  assert.deepEqual(plain(calls), [["cms_read_public_page", { target_key: "about" }]]);
  const badPage = plain(aboutBaseline);
  badPage.blocks.push({ id: "a0000000-0000-4000-8000-000000000009", position: 2,
    type: "promotionBanner", schemaVersion: 1, hidden: false, payload: { template: "accent" },
    mediaVersionId: null, promotionRevisionId: "b0000000-0000-4000-8000-000000000009" });
  result = { ...result, payload: badPage };
  await assert.rejects(() => source.getPublicAbout(), /promotion/i);
  const disabled = createSourceLoader({ env: { ...env, CMS_PAGE_ALLOWLIST: "" }, mocks })("src/cms/pages/public-source.ts");
  assert.equal((await disabled.getPublicAbout()).source, "static");
  assert.equal(calls.length, 2);
});

test("approved Preview /about is request-rendered before allowlisting; Production remains static", async () => {
  let requests = 0;
  const preview = { VERCEL: "1", VERCEL_ENV: "preview",
    VERCEL_PROJECT_ID: "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
    VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation",
    CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co" };
  const mocks = { "react": { cache: fn => fn }, "next/server": { connection: async () => { requests++; } },
    "@supabase/supabase-js": { createClient: () => { throw new Error("static source must not open CMS"); } } };
  const previewSource = createSourceLoader({ env: preview, mocks })("src/cms/pages/public-source.ts");
  assert.equal((await previewSource.getPublicAbout()).source, "static");
  assert.equal(requests, 1);
  const productionSource = createSourceLoader({ env: { ...preview, VERCEL_ENV: "production",
    CMS_PAGE_SOURCE: "published", CMS_PAGE_ALLOWLIST: "about" }, mocks })("src/cms/pages/public-source.ts");
  assert.equal((await productionSource.getPublicAbout()).source, "static");
  assert.equal(requests, 1);
});
