import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";

const load = createSourceLoader({ mocks: {
  "next/image": { __esModule: true, default: props => createElement("img", props) },
  "next/script": { __esModule: true, default: props => createElement("script", props) },
} });
const { homeBaseline } = load("src/cms/home/baseline.ts");
const { validateHomeDraft } = load("src/cms/home/model.ts");
const { HomeBlocksView, homeFaqJsonLd } = load("src/cms/home/HomeBlocksView.tsx");
const draft = () => structuredClone(plain(homeBaseline));
const render = (page, preview = false, promotions = {}) => renderToStaticMarkup(createElement(HomeBlocksView,
  { page, revisionId: "d4000000-0000-4000-8000-000000000001", preview, promotions }));

test("homepage Revision 1 has the audited 11 sections in exact order and renders approved media", () => {
  const page = draft();
  assert.deepEqual(page.blocks.map(block => block.type), ["homeHero", "homeTrust", "homeServices", "homeProcess",
    "homeBeforeAfter", "homeWhyUs", "homePricing", "homeEstimate", "homeAreas", "homeFaq", "homeFinalCta"]);
  assert.equal(validateHomeDraft(page).canonical, "/");
  const html = render(page);
  assert.ok(html.includes(page.h1));
  assert.ok(html.includes("/images/hero/hero-sofa-cleaning.jpg"));
  assert.ok(html.includes("/api/whatsapp"));
  assert.ok(html.includes("tel:"));
});

test("static and CMS Revision 1 homepage produce identical HTML, metadata and JSON-LD", async () => {
  const settings = load("src/cms/site/baseline.ts").siteSettingsBaseline;
  let source = "static";
  const pageModule = createSourceLoader({ mocks: {
    "next/image": { __esModule: true, default: props => createElement("img", props) },
    "next/script": { __esModule: true, default: props => createElement("script", props) },
    "@/cms/site/public-source": { getPublicSiteChrome: async () => ({ settings }) },
    "@/cms/home/public-source": { getPublicHome: async () => ({ source, revisionId: source === "cms" ?
      "d4000000-0000-4000-8000-000000000001" : null, page: homeBaseline, media: load("src/cms/home/HomeBlocksView.tsx").staticHomeMedia,
      promotions: {} }) },
  } })("src/app/(site)/page.tsx");
  const staticHtml = renderToStaticMarkup(await pageModule.default());
  const staticMetadata = plain(await pageModule.generateMetadata());
  source = "cms";
  assert.equal(renderToStaticMarkup(await pageModule.default()), staticHtml);
  assert.deepEqual(plain(await pageModule.generateMetadata()), staticMetadata);
  assert.ok(staticHtml.includes("FAQPage"));
  assert.ok(staticHtml.includes("Service"));
});

test("home block validation rejects identity, executable copy, unknown fields, order and singleton violations", () => {
  for (const mutate of [
    page => { page.canonical = "/new-home"; },
    page => { page.blocks[0].hidden = true; },
    page => { page.blocks[0].position = 1; },
    page => { page.blocks[0].payload.title = "<script>alert(1)</script>"; },
    page => { page.blocks[0].payload.href = "javascript:alert(1)"; },
    page => { page.blocks[2].payload.cards[page.blocks[2].payload.serviceKeys[0]].trackingId = "evil"; },
    page => { page.blocks[2].payload.serviceKeys[0] = "arbitrary-service"; },
    page => { page.blocks[4].payload.items[0].beforeVersionId = "https://elsewhere.invalid/pic"; },
    page => { page.blocks.splice(0, 1); page.blocks.forEach((block, index) => { block.position = index; }); },
    page => { page.blocks.push({ ...page.blocks[1], id: "d4000000-0000-4000-8000-000000000999", position: page.blocks.length }); },
    page => { page.blocks[1].type = "customHtml"; },
  ]) { const page = draft(); mutate(page); assert.throws(() => validateHomeDraft(page)); }
});

test("hidden and draft homepage FAQ never enters visible HTML or JSON-LD", () => {
  const published = draft(), unpublished = draft();
  unpublished.blocks.find(block => block.type === "homeFaq").payload.items[0].answer = "תשובת טיוטה בלבד";
  assert.ok(!JSON.stringify(homeFaqJsonLd(published)).includes("תשובת טיוטה בלבד"));
  assert.ok(!render(published).includes("תשובת טיוטה בלבד"));
  unpublished.blocks.find(block => block.type === "homeFaq").hidden = true;
  assert.equal(homeFaqJsonLd(unpublished), null);
  assert.ok(!render(unpublished).includes("תשובת טיוטה בלבד"));
});

test("functional preview disables phone and WhatsApp side effects", () => {
  const html = render(draft(), true);
  assert.ok(!html.includes("/api/whatsapp"));
  assert.ok(!html.includes("tel:"));
  assert.ok(!html.includes("/api/contact"));
  assert.ok(!html.includes("GTM-"));
  assert.ok(!html.includes("google-call-conversion-number"));
});

test("homepage source requires its own exact Preview/local environment and two explicit flags", () => {
  const moduleFor = env => createSourceLoader({ env })("src/cms/home/environment.ts");
  const local = { CMS_SUPABASE_URL: "http://127.0.0.1:56321" };
  const preview = { VERCEL: "1", VERCEL_ENV: "preview", VERCEL_PROJECT_ID: "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
    VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation", CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co" };
  assert.equal(moduleFor(local).usesCmsHomeSource(), false);
  assert.equal(moduleFor({ ...local, CMS_PAGE_SOURCE: "published", CMS_CONTENT_ENABLED: "true", CMS_SITE_SOURCE: "published" }).usesCmsHomeSource(), false);
  assert.equal(moduleFor({ ...local, CMS_HOME_SOURCE: "published", CMS_HOME_ALLOWLIST: "home" }).usesCmsHomeSource(), true);
  assert.equal(moduleFor({ ...preview, CMS_HOME_SOURCE: "published", CMS_HOME_ALLOWLIST: "home" }).usesCmsHomeSource(), true);
  for (const change of [{ VERCEL_ENV: "production" }, { VERCEL_GIT_COMMIT_REF: "main" },
    { VERCEL_PROJECT_ID: "other" }, { CMS_SUPABASE_URL: "https://other.supabase.co" },
    { CMS_HOME_ALLOWLIST: "*" }, { CMS_HOME_ALLOWLIST: "home,about" }, { CMS_HOME_SOURCE: "draft" }])
    assert.equal(moduleFor({ ...preview, CMS_HOME_SOURCE: "published", CMS_HOME_ALLOWLIST: "home", ...change }).usesCmsHomeSource(), false);
});
