import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";

const load = createSourceLoader();
const { defaultCampaign, validateCampaignDraft, validatePublicCampaign, validatePlacements, placementKeys } = load("src/cms/promotions/model.ts");
const { shouldShowPromotion } = load("src/cms/promotions/PromotionPopupView.tsx");
const draft = () => plain(defaultCampaign());

test("campaign uses closed typed placements and plain content", () => {
  const campaign = draft();
  assert.equal(campaign.displayMode, "popup");
  assert.equal(campaign.delaySeconds, 2);
  assert.equal(campaign.frequency, "session");
  assert.equal(placementKeys.length, 14);
  assert.deepEqual(plain(validatePlacements(["home:home", "service:post-renovation-cleaning"])),
    ["home:home", "service:post-renovation-cleaning"]);
  for (const bad of [[], ["global:*"], ["service:unknown"], ["home:home", "home:home"], ["/about"]])
    assert.throws(() => validatePlacements(bad));
  for (const patch of [{ h1: "<script>" }, { headline: "unknown" }, { delaySeconds: 16 },
    { delaySeconds: -1 }, { frequency: "forever" }, { displayMode: "iframe" },
    { cta: { label: "Go", target: { kind: "internal", path: "https://evil.example" } } }])
    assert.throws(() => validateCampaignDraft({ ...campaign, ...patch }));
  campaign.showPrice = true;
  campaign.currentPrice = "199";
  campaign.oldPrice = "299";
  assert.equal(validateCampaignDraft(campaign).currentPrice, "199");
});

test("popup frequency records only revision identity and timestamp", () => {
  const id = "73000000-0000-4000-8000-000000000001";
  const now = 2_000_000_000;
  const dismissed = JSON.stringify({ revisionId: id, dismissedAt: now - 1000 });
  assert.equal(shouldShowPromotion(id, "every-visit", dismissed, dismissed, now), true);
  assert.equal(shouldShowPromotion(id, "session", dismissed, null, now), false);
  assert.equal(shouldShowPromotion(id, "session", null, dismissed, now), true);
  assert.equal(shouldShowPromotion(id, "24-hours", null, dismissed, now), false);
  assert.equal(shouldShowPromotion(id, "24-hours", null, dismissed, now + 86_400_000), true);
  assert.equal(shouldShowPromotion("73000000-0000-4000-8000-000000000002", "session", dismissed, null, now), true);
});

test("public projection contains presentation only", () => {
  const full = draft();
  const publicData = Object.fromEntries(["enabled", "displayMode", "badgeText", "h1", "showPrice",
    "currentPrice", "oldPrice", "currency", "benefitText", "description", "cta", "terms",
    "delaySeconds", "frequency"].map(key => [key, full[key]]));
  assert.equal(validatePublicCampaign(publicData).h1, full.h1);
  for (const privateKey of ["publicTitle", "seoTitle", "seoDescription", "placements", "history", "editorId"])
    assert.throws(() => validatePublicCampaign({ ...publicData, [privateKey]: "secret" }));
});

test("manual campaign remains separate from scheduled runtime and unconfigured Production fails closed", () => {
  const env = { VERCEL: "1", VERCEL_ENV: "preview", VERCEL_PROJECT_ID: "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
    VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation",
    CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co", CMS_MANUAL_PROMOTIONS_SOURCE: "active" };
  const allowed = e => createSourceLoader({ env: e })("src/cms/promotions/environment.ts").manualCampaignPublicAllowed();
  assert.equal(allowed(env), true);
  assert.equal(allowed({ ...env, VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main" }), false);
  assert.equal(allowed({ ...env, VERCEL_PROJECT_ID: "other" }), false);
  assert.equal(allowed({ ...env, CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co.evil.example" }), false);
  assert.equal(allowed({ ...env, CMS_MANUAL_PROMOTIONS_SOURCE: "" }), false);
  const sql = readFileSync("supabase/migrations/20260930120000_cms_manual_promotion_campaigns.sql", "utf8");
  assert.match(sql, /placement text primary key/i);
  assert.match(sql, /pg_advisory_xact_lock\(20260930,1\)/);
  assert.doesNotMatch(sql, /create.*cron|alter.*cms_promotion_schedules|alter.*cms_active_promotion_placements/i);
});

test("manual campaigns use exact Production identity and independent public activation", () => {
  const production = { VERCEL: "1", VERCEL_ENV: "production",
    VERCEL_PROJECT_ID: "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
    VERCEL_GIT_COMMIT_REF: "main",
    CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co",
    CMS_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_test_only" };
  const gates = env => createSourceLoader({ env })("src/cms/promotions/environment.ts");
  assert.equal(gates(production).manualCampaignAdminAllowed(), true);
  assert.equal(gates(production).manualCampaignPublicAllowed(), false);
  assert.equal(gates({ ...production, CMS_MANUAL_PROMOTIONS_SOURCE: "active" }).manualCampaignPublicAllowed(), true);

  for (const patch of [
    { VERCEL: "" },
    { VERCEL_ENV: "preview" },
    { VERCEL_GIT_COMMIT_REF: "feature/cms-manual-promotions" },
    { VERCEL_PROJECT_ID: "wrong-project" },
    { CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co.evil.example" },
    { CMS_SUPABASE_URL: "not-a-url" },
    { CMS_SUPABASE_PUBLISHABLE_KEY: "" },
  ]) {
    const denied = gates({ ...production, CMS_MANUAL_PROMOTIONS_SOURCE: "active", ...patch });
    assert.equal(denied.manualCampaignAdminAllowed(), false, JSON.stringify(patch));
    assert.equal(denied.manualCampaignPublicAllowed(), false, JSON.stringify(patch));
  }
  for (const source of ["", "all", "*", "published", "ACTIVE", "active,*", "active "]) {
    assert.equal(gates({ ...production, CMS_MANUAL_PROMOTIONS_SOURCE: source }).manualCampaignPublicAllowed(), false, source);
  }

  const adminPage = readFileSync("src/app/(admin)/admin/(protected)/promotions/page.tsx", "utf8");
  const adminLayout = readFileSync("src/app/(admin)/admin/(protected)/layout.tsx", "utf8");
  const publicRoute = readFileSync("src/app/api/cms/public-promotion/route.ts", "utf8");
  const repository = readFileSync("src/cms/promotions/repository.ts", "utf8");
  assert.match(adminPage, /manualCampaignAdminAllowed\(\)/);
  assert.match(adminLayout, /requireCmsAdminPage\(\)/);
  assert.match(publicRoute, /readPublicCampaign\(path\)/);
  assert.match(repository, /if \(!paths\.has\(path\) \|\| !manualCampaignPublicAllowed\(\)\) return null/);
});

test("CMS Preview identity accepts only the two exact pilot branches", () => {
  const base = { VERCEL: "1", VERCEL_ENV: "preview",
    VERCEL_PROJECT_ID: "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
    CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co" };
  const approved = env => createSourceLoader({ env })("src/cms/preview-environment.ts").approvedCmsPreviewIdentity();
  for (const branch of ["feature/cms-cloud-foundation", "feature/cms-manual-promotions"])
    assert.equal(approved({ ...base, VERCEL_GIT_COMMIT_REF: branch }), true, branch);
  const pilot = { ...base, VERCEL_GIT_COMMIT_REF: "feature/cms-manual-promotions" };
  for (const patch of [
    { VERCEL_GIT_COMMIT_REF: "random-branch" },
    { VERCEL_GIT_COMMIT_REF: "main" },
    { VERCEL_GIT_COMMIT_REF: "feature/cms-manual-promotions-evil" },
    { VERCEL_PROJECT_ID: "wrong-project" },
    { CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co.evil.example" },
    { CMS_SUPABASE_URL: "not-a-url" },
    { VERCEL_ENV: "production" },
    { VERCEL: "" },
  ]) assert.equal(approved({ ...pilot, ...patch }), false, JSON.stringify(patch));
  const publicAllowed = env => createSourceLoader({ env })("src/cms/promotions/environment.ts").manualCampaignPublicAllowed();
  assert.equal(publicAllowed({ ...pilot, CMS_MANUAL_PROMOTIONS_SOURCE: "active" }), true);
  assert.equal(publicAllowed(pilot), false, "Preview identity does not activate the public source");
  assert.equal(publicAllowed({ ...pilot, VERCEL_ENV: "production", CMS_MANUAL_PROMOTIONS_SOURCE: "active" }), false);
  const production = env => createSourceLoader({ env })("src/cms/production-environment.ts").approvedCmsProductionIdentity();
  assert.equal(production({ ...pilot, VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main" }), true);
  assert.equal(production({ ...pilot, VERCEL_ENV: "production" }), false,
    "the Preview branch cannot satisfy Production identity");
});

test("both approved Preview branches retain independent CMS feature gates", () => {
  const base = { VERCEL: "1", VERCEL_ENV: "preview",
    VERCEL_PROJECT_ID: "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
    CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co",
    CMS_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_test_only",
    CMS_PILOT_CONTENT_SOURCE: "published", CMS_CONTENT_SERVICE_ALLOWLIST: "sofa-cleaning",
    CMS_MEDIA_PREVIEW_ENABLED: "1", CMS_SITE_SOURCE: "published",
    CMS_SITE_ALLOWLIST: "navigation", CMS_SCHEDULED_PROMOTIONS_SOURCE: "active",
    CMS_SCHEDULED_PROMOTIONS_ALLOWLIST: "home:home",
    GOOGLE_REVIEWS_SOURCE: "google", GOOGLE_REVIEWS_PLACE_ID: "ChIJM6V_e13OrmgRCjbDT5abAqA",
    GOOGLE_PLACES_API_KEY: "synthetic-key", CMS_MANUAL_PROMOTIONS_SOURCE: "active" };
  for (const branch of ["feature/cms-cloud-foundation", "feature/cms-manual-promotions"]) {
    const env = { ...base, VERCEL_GIT_COMMIT_REF: branch };
    const load = createSourceLoader({ env });
    assert.equal(load("src/cms/pages/environment.ts").approvedPagePreview(), true, branch);
    assert.equal(load("src/cms/home/environment.ts").approvedHomePreview(), true, branch);
    assert.equal(load("src/cms/site/environment.ts").usesCmsSiteSource("navigation"), true, branch);
    assert.equal(load("src/cms/content/environment.ts").usesCmsSource("sofa-cleaning"), true, branch);
    assert.equal(load("src/cms/media/environment.ts").mediaCloudEnabled(), true, branch);
    assert.equal(load("src/cms/schedules/public-environment.ts").usesScheduledPublicPlacement("home", "home"), true, branch);
    assert.ok(load("src/cms/reviews/environment.ts").liveGoogleReviewsConfig(), branch);
    assert.equal(load("src/cms/promotions/environment.ts").manualCampaignPublicAllowed(), true, branch);
    const noFlags = createSourceLoader({ env: { ...env, CMS_SITE_SOURCE: "", CMS_PILOT_CONTENT_SOURCE: "",
      CMS_SCHEDULED_PROMOTIONS_SOURCE: "", GOOGLE_REVIEWS_SOURCE: "",
      CMS_MANUAL_PROMOTIONS_SOURCE: "" } });
    assert.equal(noFlags("src/cms/site/environment.ts").usesCmsSiteSource("navigation"), false);
    assert.equal(noFlags("src/cms/content/environment.ts").usesCmsSource("sofa-cleaning"), false);
    assert.equal(noFlags("src/cms/schedules/public-environment.ts").usesScheduledPublicPlacement("home", "home"), false);
    assert.equal(noFlags("src/cms/reviews/environment.ts").liveGoogleReviewsConfig(), null);
    assert.equal(noFlags("src/cms/promotions/environment.ts").manualCampaignPublicAllowed(), false);
  }
});
