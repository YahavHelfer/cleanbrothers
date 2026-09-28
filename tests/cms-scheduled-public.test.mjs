import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { createSourceLoader, elementTree } from "./helpers/source-module.mjs";

const preview = { VERCEL: "1", VERCEL_ENV: "preview",
  VERCEL_PROJECT_ID: "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
  VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation",
  CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co",
  CMS_SCHEDULED_PROMOTIONS_SOURCE: "active",
  CMS_SCHEDULED_PROMOTIONS_ALLOWLIST: "global:site,home:home,service:sofa-cleaning" };
const revisionId = "70000000-0000-4000-8000-000000000001";
const mediaId = "70000000-0000-4000-8000-000000000002";
const promotion = { schemaVersion: 7, publicTitle: "מבצע", h1: "מבצע", seoTitle: "מבצע",
  seoDescription: "תיאור", description: "תיאור", template: "accent", enabled: true,
  cta: { label: "צרו קשר", target: { kind: "internal", path: "/contact" } },
  mediaVersionId: null, mediaAlt: null };
const row = { kind: "global", target: "site", promotionKey: "summer-offer",
  promotionRevisionId: revisionId, promotion, media: null };

test("scheduled public gate requires exact Preview identities and an explicit, valid allowlist", () => {
  const allowed = env => createSourceLoader({ env })("src/cms/schedules/public-environment.ts")
    .usesScheduledPublicPlacement("global", "site");
  assert.equal(allowed(preview), true);
  assert.equal(allowed({ ...preview, CMS_SCHEDULED_PROMOTIONS_ALLOWLIST: "home:home" }), false);
  for (const key of ["VERCEL", "VERCEL_ENV", "VERCEL_PROJECT_ID", "VERCEL_GIT_COMMIT_REF",
    "CMS_SUPABASE_URL", "CMS_SCHEDULED_PROMOTIONS_SOURCE", "CMS_SCHEDULED_PROMOTIONS_ALLOWLIST"]) {
    const env = { ...preview }; delete env[key]; assert.equal(allowed(env), false, key);
  }
  for (const env of [
    { ...preview, VERCEL_ENV: "production" }, { ...preview, VERCEL_PROJECT_ID: "other" },
    { ...preview, VERCEL_GIT_COMMIT_REF: "main" },
    { ...preview, CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co.evil.example" },
    { ...preview, CMS_SCHEDULED_PROMOTIONS_SOURCE: "published" },
    { ...preview, CMS_SCHEDULED_PROMOTIONS_ALLOWLIST: "all" },
    { ...preview, CMS_SCHEDULED_PROMOTIONS_ALLOWLIST: "service:*" },
    { ...preview, CMS_SCHEDULED_PROMOTIONS_ALLOWLIST: "global:site,service:unknown" },
    { ...preview, CMS_SCHEDULED_PROMOTIONS_ALLOWLIST: "global:site,global:site" },
    { ...preview, CMS_SCHEDULED_PROMOTIONS_ALLOWLIST: "global:site, home:home" },
  ]) assert.equal(allowed(env), false);
  const local = { CMS_SCHEDULED_PROMOTIONS_LOCAL_ENABLED: "true", CMS_SCHEDULED_PROMOTIONS_SOURCE: "active",
    CMS_SCHEDULED_PROMOTIONS_ALLOWLIST: "service:sofa-cleaning", CMS_SUPABASE_URL: "http://127.0.0.1:56321" };
  assert.equal(createSourceLoader({ env: local })("src/cms/schedules/public-environment.ts")
    .usesScheduledPublicPlacement("service", "sofa-cleaning"), true);
});

test("public active projection validates exact fields, identity, Promotion schema and immutable media", () => {
  const { validatePublicActivePromotion: validate } = createSourceLoader()("src/cms/schedules/public-source.ts");
  assert.equal(validate(row, "global", "site").key, "summer-offer");
  assert.equal(validate(row, "global", "site").media, null);
  for (const bad of [
    { ...row, scheduleId: revisionId }, { ...row, kind: "service" },
    { ...row, promotionKey: "about-intro<script>" },
    { ...row, promotion: { ...promotion, enabled: false } },
    { ...row, promotion: { ...promotion, html: "<script>" } },
    { ...row, media: { mediaVersionId: mediaId, provider: "supabase", altText: "x" } },
    { ...row, promotionRevisionId: "not-a-revision" },
  ]) assert.throws(() => validate(bad, "global", "site"));
  const withMedia = { ...promotion, mediaVersionId: mediaId, mediaAlt: "תמונת מבצע" };
  const mediaRow = { ...row, promotion: withMedia,
    media: { mediaVersionId: mediaId, provider: "supabase", altText: "תמונת מבצע" } };
  assert.equal(validate(mediaRow, "global", "site").media.src, `/cms-media/${mediaId}`);
  assert.throws(() => validate({ ...mediaRow, media: { ...mediaRow.media, mediaVersionId: revisionId } }, "global", "site"));
  assert.throws(() => validate({ ...mediaRow, media: { ...mediaRow.media, provider: "remote" } }, "global", "site"));
});

test("public reader performs only narrow no-store RPC and fails closed without leaking errors", async () => {
  let current = row, calls = 0, requestDependent = 0, networkCache;
  const load = createSourceLoader({ env: preview,
    mocks: {
      "react": { cache: fn => fn },
      "next/server": { connection: async () => { requestDependent++; } },
      "@/cms/config": { getCmsConfig: () => ({ url: preview.CMS_SUPABASE_URL, key: "publishable" }) },
      "@supabase/supabase-js": { createClient: (_url, _key, options) => ({ rpc: async (name, args) => {
        calls++; assert.equal(name, "cms_read_active_promotion_placement");
        assert.deepEqual(JSON.parse(JSON.stringify(args)), { kind: "global", target: "site" });
        await options.global.fetch("https://example.test", {});
        return { data: current, error: null };
      } }) },
    }, fetchImpl: async (_input, init) => { networkCache = init.cache; return new Response(null); } });
  const { getPublicActivePromotion } = load("src/cms/schedules/public-source.ts");
  assert.equal((await getPublicActivePromotion("global", "site")).revisionId, revisionId);
  assert.equal(networkCache, "no-store");
  current = null;
  assert.equal(await getPublicActivePromotion("global", "site"), null);
  current = { ...row, status: "draft" };
  assert.equal(await getPublicActivePromotion("global", "site"), null);
  assert.equal(calls, 3);
  assert.equal(requestDependent, 3);
  assert.equal(await getPublicActivePromotion("service", "carpet-cleaning"), null);
  assert.equal(calls, 3);
});

test("shared banner renders exact identity, safe CTA and immutable media without schedule metadata", () => {
  const load = createSourceLoader({ mocks: { "next/image": props =>
    createElement("img", { src: props.src, alt: props.alt }) } });
  const { PromotionBannerView } = load("src/cms/pages/PromotionBannerView.tsx");
  const html = renderToStaticMarkup(PromotionBannerView({ promotion, template: "accent",
    identity: "summer-offer", media: null, preview: false }));
  assert.match(html, /data-promotion-identity="summer-offer"/);
  assert.match(html, /href="\/contact"/);
  assert.doesNotMatch(html, /scheduleId|startsAt|endsAt|audit|about-intro/);
  const previewHtml = renderToStaticMarkup(PromotionBannerView({ promotion, template: "accent",
    identity: "summer-offer", media: null, preview: true }));
  assert.doesNotMatch(previewHtml, /href=/);
  const withMedia = { ...promotion, mediaVersionId: mediaId, mediaAlt: "תמונת מבצע" };
  const mediaHtml = renderToStaticMarkup(PromotionBannerView({ promotion: withMedia, template: "quiet",
    identity: "summer-offer", media: { src: `/cms-media/${mediaId}`, altText: "תמונת מבצע" }, preview: false }));
  assert.match(mediaHtml, new RegExp(`/cms-media/${mediaId}`));
  assert.match(mediaHtml, /alt="תמונת מבצע"/);
});

test("global, homepage and service placements stay independent at their route boundaries", async () => {
  const requested = [];
  const load = createSourceLoader({ mocks: { "@/cms/schedules/public-source": {
    getPublicActivePromotion: async (kind, target) => {
      requested.push(`${kind}:${target}`);
      return ["global:site", "home:home", "service:sofa-cleaning"].includes(`${kind}:${target}`)
        ? { key: `${kind}-offer`, revisionId, promotion, media: null } : null;
    },
  } } });
  const home = await load("src/app/(site)/page.tsx").default();
  const layout = await load("src/app/(site)/layout.tsx").default({ children: home });
  const global = elementTree(layout).find(node => node.props.active?.key === "global-offer");
  const homepage = elementTree(home).find(node => node.props.active?.key === "home-offer");
  assert.ok(global && homepage, "global and home banners both render on homepage");
  const sofa = await load("src/app/(site)/sofa-cleaning/page.tsx").default();
  assert.ok(elementTree(sofa).some(node => node.props.active?.key === "service-offer"));
  const carpet = await load("src/app/(site)/carpet-cleaning/page.tsx").default();
  assert.ok(!elementTree(carpet).some(node => node.props.active), "sofa placement cannot leak to carpet");
  assert.deepEqual(requested.sort(), ["global:site", "home:home", "service:carpet-cleaning", "service:sofa-cleaning"]);
});

test("placement positions, pinned Promotion separation and SEO isolation are explicit", () => {
  const layout = readFileSync("src/app/(site)/layout.tsx", "utf8");
  const home = readFileSync("src/app/(site)/page.tsx", "utf8");
  assert.ok(layout.indexOf("<Navbar") < layout.indexOf("<PublicScheduledPromotion") &&
    layout.indexOf("<PublicScheduledPromotion") < layout.indexOf("<main"));
  assert.ok(home.indexOf("<PublicScheduledPromotion") < home.indexOf("<HomeBlocksView"));
  for (const key of ["delicate-upholstery-cleaning", "sofa-cleaning", "mattress-cleaning", "carpet-cleaning",
    "car-upholstery-cleaning", "armchair-chair-cleaning", "air-conditioner-cleaning", "window-cleaning"]) {
    const route = readFileSync(`src/app/(site)/${key}/page.tsx`, "utf8");
    assert.match(route, new RegExp(`getPublicActivePromotion\\("service", "${key}"\\)`));
    assert.match(route, /return active \? <><PublicScheduledPromotion active=\{active\} \/>\{(?:page|landing)\}<\/> : (?:page|landing)/);
    assert.ok(route.lastIndexOf("getPublicActivePromotion") > route.indexOf("generateMetadata"));
  }
  assert.doesNotMatch(readFileSync("src/app/(site)/services/page.tsx", "utf8"), /PublicScheduledPromotion/);
  const pinned = readFileSync("src/cms/pages/PageBlocksView.tsx", "utf8");
  assert.match(pinned, /identity="about-intro"/);
  assert.doesNotMatch(readFileSync("src/cms/schedules/public-source.ts", "utf8"), /cms_process_due|service_role|CMS_MEDIA_SERVER_KEY/);
});
