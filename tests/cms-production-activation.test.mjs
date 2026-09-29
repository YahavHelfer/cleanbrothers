import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createSourceLoader } from "./helpers/source-module.mjs";

const url = "https://plbwefnwussxlglscfpn.supabase.co";
const key = "sb_publishable_synthetic_test_only";
const production = {
  VERCEL: "1", VERCEL_ENV: "production",
  VERCEL_PROJECT_ID: "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
  VERCEL_GIT_COMMIT_REF: "main", CMS_SUPABASE_URL: url,
  CMS_SUPABASE_PUBLISHABLE_KEY: key,
};
const preview = { ...production, VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation" };
const local = { CMS_SUPABASE_URL: "http://127.0.0.1:56321",
  CMS_SUPABASE_PUBLISHABLE_KEY: key };
const get = (env, file) => createSourceLoader({ env })(file);

test("Stage 0 Production without activation variables keeps every public CMS source disabled", () => {
  const off = { VERCEL: "1", VERCEL_ENV: "production",
    VERCEL_PROJECT_ID: production.VERCEL_PROJECT_ID, VERCEL_GIT_COMMIT_REF: "main" };
  assert.throws(() => get(off, "src/cms/config.ts").getCmsConfig());
  assert.equal(get(off, "src/cms/content/environment.ts").usesCmsSource("sofa-cleaning"), false);
  assert.equal(get(off, "src/cms/pages/environment.ts").usesCmsPageSource("about"), false);
  assert.equal(get(off, "src/cms/pages/new-environment.ts").newPagePublicAllowed("cms-test-page"), false);
  assert.equal(get(off, "src/cms/home/environment.ts").usesCmsHomeSource(), false);
  assert.equal(get(off, "src/cms/site/environment.ts").usesCmsSiteSource(), false);
  assert.equal(get(off, "src/cms/schedules/public-environment.ts")
    .usesScheduledPublicPlacement("home", "home"), false);
  assert.equal(get(off, "src/cms/reviews/environment.ts").liveGoogleReviewsConfig(), null);
  assert.equal(get(off, "src/cms/media/environment.ts").mediaCloudEnabled(), false);
});

test("Production CMS identity and Admin require the exact project, main branch, CMS URL and publishable key", () => {
  const config = get(production, "src/cms/config.ts");
  assert.equal(config.getCmsConfig().url, url);
  assert.equal(config.getCmsAppOrigin(), "https://www.cleanbrothers.co.il");
  assert.deepEqual({ secure: config.cmsCookieOptions.secure, httpOnly: config.cmsCookieOptions.httpOnly,
    sameSite: config.cmsCookieOptions.sameSite, path: config.cmsCookieOptions.path },
  { secure: true, httpOnly: true, sameSite: "lax", path: "/admin" });
  assert.equal(get(preview, "src/cms/config.ts").getCmsConfig().url, url);
  assert.equal(get(local, "src/cms/config.ts").getCmsConfig().url, local.CMS_SUPABASE_URL);
  for (const change of [
    { VERCEL: undefined }, { VERCEL_ENV: "development" },
    { VERCEL_PROJECT_ID: "other" }, { VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation" },
    { VERCEL_GIT_COMMIT_REF: "release/cms-stage0-v2" }, { CMS_SUPABASE_URL: "https://other.supabase.co" },
    { CMS_SUPABASE_URL: `${url}.evil.example` }, { CMS_SUPABASE_URL: `${url}/` },
    { CMS_SUPABASE_PUBLISHABLE_KEY: undefined }, { CMS_SUPABASE_PUBLISHABLE_KEY: "sb_secret_not_allowed" },
  ]) assert.throws(() => get({ ...production, ...change }, "src/cms/config.ts").getCmsConfig(),
    /CMS configuration unavailable/);
});

test("service source requires its own Production source flag and exact allowlist", () => {
  const file = "src/cms/content/environment.ts", service = "sofa-cleaning";
  const enabled = { ...production, CMS_CONTENT_SOURCE: "published",
    CMS_CONTENT_SERVICE_ALLOWLIST: service };
  assert.equal(get(enabled, file).usesCmsSource(service), true);
  assert.equal(get({ ...preview, CMS_PILOT_CONTENT_SOURCE: "published",
    CMS_CONTENT_SERVICE_ALLOWLIST: service }, file).usesCmsSource(service), true);
  assert.equal(get({ ...local, CMS_PILOT_CONTENT_SOURCE: "published",
    CMS_CONTENT_SERVICE_ALLOWLIST: service }, file).usesCmsSource(service), true);
  for (const env of [production, { ...enabled, CMS_CONTENT_SOURCE: undefined },
    { ...enabled, CMS_CONTENT_SOURCE: "all" }, { ...enabled, CMS_CONTENT_SERVICE_ALLOWLIST: "*" },
    { ...enabled, CMS_CONTENT_SERVICE_ALLOWLIST: "all" },
    { ...enabled, VERCEL_PROJECT_ID: "other" },
    { ...enabled, VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation" },
    { ...enabled, CMS_SUPABASE_URL: "https://other.supabase.co" },
    { ...enabled, CMS_SUPABASE_PUBLISHABLE_KEY: undefined },
    { ...preview, CMS_CONTENT_SOURCE: "published", CMS_CONTENT_SERVICE_ALLOWLIST: service },
  ]) assert.equal(get(env, file).usesCmsSource(service), false);
});

test("about and new-page sources stay independently allowlisted in Production", () => {
  const pages = "src/cms/pages/environment.ts";
  const newPages = "src/cms/pages/new-environment.ts";
  assert.equal(get({ ...production, CMS_PAGE_SOURCE: "published", CMS_PAGE_ALLOWLIST: "about" }, pages)
    .usesCmsPageSource("about"), true);
  assert.equal(get({ ...production, CMS_NEW_PAGE_SOURCE: "published",
    CMS_NEW_PAGE_ALLOWLIST: "cms-test-page" }, newPages).newPagePublicAllowed("cms-test-page"), true);
  for (const change of [{}, { CMS_PAGE_SOURCE: "published" },
    { CMS_PAGE_SOURCE: "published", CMS_PAGE_ALLOWLIST: "*" },
    { CMS_PAGE_SOURCE: "published", CMS_PAGE_ALLOWLIST: "all" },
    { CMS_PAGE_SOURCE: "published", CMS_PAGE_ALLOWLIST: "about", VERCEL_PROJECT_ID: "other" },
    { CMS_PAGE_SOURCE: "published", CMS_PAGE_ALLOWLIST: "about", VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation" },
    { CMS_PAGE_SOURCE: "published", CMS_PAGE_ALLOWLIST: "about", CMS_SUPABASE_URL: "https://other.supabase.co" },
  ]) assert.equal(get({ ...production, ...change }, pages).usesCmsPageSource("about"), false);
  assert.equal(get(production, newPages).newPagePublicAllowed("cms-test-page"), false);
  assert.equal(get({ ...production, CMS_NEW_PAGE_SOURCE: "published", CMS_NEW_PAGE_ALLOWLIST: "*" }, newPages)
    .newPagePublicAllowed("cms-test-page"), false);
});

test("Homepage and Site Chrome each require distinct exact Production flags", () => {
  const home = "src/cms/home/environment.ts", site = "src/cms/site/environment.ts";
  assert.equal(get({ ...production, CMS_HOME_SOURCE: "published", CMS_HOME_ALLOWLIST: "home" }, home)
    .usesCmsHomeSource(), true);
  assert.equal(get({ ...production, CMS_SITE_SOURCE: "published",
    CMS_SITE_ALLOWLIST: "settings,navigation,footer" }, site).usesCmsSiteSource("settings"), true);
  for (const change of [{}, { CMS_HOME_SOURCE: "published" },
    { CMS_HOME_SOURCE: "published", CMS_HOME_ALLOWLIST: "*" },
    { CMS_HOME_SOURCE: "published", CMS_HOME_ALLOWLIST: "home", VERCEL_PROJECT_ID: "other" },
    { CMS_HOME_SOURCE: "published", CMS_HOME_ALLOWLIST: "home", VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation" },
    { CMS_HOME_SOURCE: "published", CMS_HOME_ALLOWLIST: "home", CMS_SUPABASE_URL: "https://other.supabase.co" },
  ]) assert.equal(get({ ...production, ...change }, home).usesCmsHomeSource(), false);
  for (const change of [{}, { CMS_SITE_SOURCE: "published" },
    { CMS_SITE_SOURCE: "published", CMS_SITE_ALLOWLIST: "*" },
    { CMS_SITE_SOURCE: "published", CMS_SITE_ALLOWLIST: "navigation", VERCEL_PROJECT_ID: "other" },
  ]) assert.equal(get({ ...production, ...change }, site).usesCmsSiteSource(), false);
});

test("public scheduled placements require their own Production source and exact placement", () => {
  const file = "src/cms/schedules/public-environment.ts";
  const enabled = { ...production, CMS_SCHEDULED_PROMOTIONS_SOURCE: "active",
    CMS_SCHEDULED_PROMOTIONS_ALLOWLIST: "home:home" };
  assert.equal(get(enabled, file).usesScheduledPublicPlacement("home", "home"), true);
  for (const change of [{ CMS_SCHEDULED_PROMOTIONS_SOURCE: undefined },
    { CMS_SCHEDULED_PROMOTIONS_ALLOWLIST: "*" },
    { CMS_SCHEDULED_PROMOTIONS_ALLOWLIST: "service:*" },
    { VERCEL_PROJECT_ID: "other" }, { VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation" },
    { CMS_SUPABASE_URL: "https://other.supabase.co" },
  ]) assert.equal(get({ ...enabled, ...change }, file).usesScheduledPublicPlacement("home", "home"), false);
});

test("Admin schedule controls accept only the configured CMS Production identity", () => {
  const file = "src/cms/schedules/environment.ts";
  assert.equal(get(production, file).schedulesEnvironmentAllowed(), true);
  assert.equal(get(preview, file).schedulesEnvironmentAllowed(), true);
  for (const change of [{ VERCEL_PROJECT_ID: "other" },
    { VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation" },
    { CMS_SUPABASE_URL: "https://other.supabase.co" },
    { CMS_SUPABASE_PUBLISHABLE_KEY: undefined }])
    assert.equal(get({ ...production, ...change }, file).schedulesEnvironmentAllowed(), false);
});

test("Google live source needs exact Production identity and separate source, key and Place ID", () => {
  const file = "src/cms/reviews/environment.ts";
  const google = { ...production, GOOGLE_REVIEWS_SOURCE: "google",
    GOOGLE_REVIEWS_PLACE_ID: "ChIJM6V_e13OrmgRCjbDT5abAqA",
    GOOGLE_PLACES_API_KEY: "synthetic-server-only-key" };
  assert.equal(get(google, file).liveGoogleReviewsConfig().placeId, google.GOOGLE_REVIEWS_PLACE_ID);
  assert.equal(get(production, file).liveGoogleReviewsConfig(), null);
  for (const change of [{ GOOGLE_REVIEWS_SOURCE: undefined }, { GOOGLE_PLACES_API_KEY: undefined },
    { GOOGLE_REVIEWS_PLACE_ID: undefined }, { VERCEL_PROJECT_ID: "other" },
    { VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation" },
    { CMS_SUPABASE_URL: "https://other.supabase.co" },
    { VERCEL_ENV: "preview" },
  ]) assert.equal(get({ ...google, ...change }, file).liveGoogleReviewsConfig(), null);
  assert.equal(get({ ...preview, GOOGLE_REVIEWS_SOURCE: "google",
    GOOGLE_REVIEWS_PLACE_ID: google.GOOGLE_REVIEWS_PLACE_ID,
    GOOGLE_PLACES_API_KEY: google.GOOGLE_PLACES_API_KEY }, file).liveGoogleReviewsConfig().placeId,
  google.GOOGLE_REVIEWS_PLACE_ID);
  assert.match(readFileSync("src/cms/reviews/google-provider.ts", "utf8"), /server-only/);
  assert.doesNotMatch(readFileSync("src/cms/reviews/GoogleReviewsCarousel.tsx", "utf8"), /GOOGLE_PLACES_API_KEY|places\.googleapis\.com/);
});

test("Production media gate is independent and unavailable without explicit media activation", () => {
  const file = "src/cms/media/environment.ts";
  const service = { ...production, CMS_CONTENT_SOURCE: "published",
    CMS_CONTENT_SERVICE_ALLOWLIST: "sofa-cleaning" };
  assert.equal(get(service, file).mediaCloudEnabled(), false);
  assert.equal(get({ ...service, CMS_MEDIA_PRODUCTION_ENABLED: "1" }, file).mediaCloudEnabled(), false);
  const enabled = { ...service, CMS_MEDIA_PRODUCTION_ENABLED: "1",
    CMS_MEDIA_SERVER_KEY: "synthetic-server-only-key" };
  assert.equal(get(enabled, file).mediaCloudEnabled(), true);
  assert.equal(get({ ...enabled, VERCEL_PROJECT_ID: "other" }, file).mediaCloudEnabled(), false);
});
