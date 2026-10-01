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
  assert.equal(placementKeys.length, 13);
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

test("manual campaign remains separate from scheduled runtime and Production fails closed", () => {
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
