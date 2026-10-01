import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
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
  const enabled = { ...service, CMS_MEDIA_PRODUCTION_ENABLED: "1" };
  assert.equal(get(enabled, file).mediaCloudEnabled(), true);
  assert.equal(get({ ...production, CMS_MEDIA_PRODUCTION_ENABLED: "1" }, file).mediaCloudEnabled(), true);
  assert.equal(get(enabled, file).authenticatedMediaEnvironmentEnabled(), true);
  assert.equal(get(enabled, file).trustedMediaEnvironmentEnabled(), false);
  assert.equal(get({ ...enabled, CMS_MEDIA_SERVER_KEY: "synthetic-unused-key" }, file).trustedMediaEnvironmentEnabled(), false);
  assert.equal(get({ ...enabled, VERCEL_PROJECT_ID: "other" }, file).mediaCloudEnabled(), false);
  assert.equal(get({ ...enabled, VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation" }, file).mediaCloudEnabled(), false);
});

test("Production media upload uses the AAL2 session for Storage and registration, never a privileged client", async () => {
  const service = { ...production, CMS_CONTENT_SOURCE: "published",
    CMS_CONTENT_SERVICE_ALLOWLIST: "sofa-cleaning", CMS_MEDIA_PRODUCTION_ENABLED: "1" };
  const calls = [];
  const actor = "a3000000-0000-4000-8000-000000000001";
  const repo = createSourceLoader({ env: service, mocks: {
    "@/cms/authorization": { requireCmsAdmin: async () => { calls.push("aal2"); return { userId: actor }; } },
    "@/cms/server": { createCmsServerClient: async () => ({ rpc: async (name, args) => {
      calls.push("register");
      assert.equal(name, "cms_register_authenticated_media_version");
      assert.equal(args.actor, actor);
      return { data: actor, error: null };
    } }) },
    "./validate-image": { validateImage: async () => { calls.push("decode"); return {
      bytes: Buffer.from("normalized"), mimeType: "image/webp", byteSize: 10,
      width: 12, height: 8, contentHash: "a".repeat(64), originalFilename: "image.png",
    }; } },
    "./authenticated-storage": { writeAuthenticatedImage: async () => { calls.push("write"); } },
    "./trusted-client": { createTrustedMediaClient: () => { throw Error("privileged client used"); } },
  } })("src/cms/media/repository.ts");
  assert.equal(await repo.uploadMedia(Buffer.from("input"), "image.png", "image/png",
    { altText: "Alt", caption: "", folder: "" }), actor);
  assert.deepEqual(calls, ["aal2", "decode", "write", "register"]);
});

test("Production media delivery honors independent Page, Homepage and new-page public gates", async () => {
  const media = { ...production, CMS_MEDIA_PRODUCTION_ENABLED: "1" };
  const id = "a3000000-0000-4000-8000-000000000001";
  for (const [flags, projection] of [
    [{ CMS_PAGE_SOURCE: "published", CMS_PAGE_ALLOWLIST: "about" },
      { pageKeys: ["about"] }],
    [{ CMS_HOME_SOURCE: "published", CMS_HOME_ALLOWLIST: "home" },
      { home: true }],
    [{ CMS_NEW_PAGE_SOURCE: "published", CMS_NEW_PAGE_ALLOWLIST: "cms-test-page" },
      { pageSlugs: ["cms-test-page"] }],
  ]) {
    const run = async (env) => {
      const route = createSourceLoader({ env, mocks: {
        "@supabase/supabase-js": { createClient: () => ({ rpc: async () => ({
          data: { id, serviceKeys: [], pageKeys: [], pageSlugs: [], home: false,
            promotion: false, ...projection }, error: null,
        }) }) },
        "@/cms/media/repository": { mediaBytes: async () => ({ bytes: Buffer.from("fixture") }) },
      } })("src/app/cms-media/[id]/route.ts");
      return route.GET(new Request(`https://www.cleanbrothers.co.il/cms-media/${id}`),
        { params: Promise.resolve({ id }) });
    };
    assert.equal((await run(media)).status, 404);
    assert.equal((await run({ ...media, ...flags })).status, 200);
  }
});

test("Production Admin can read static media metadata without a trusted key or public service flags", async () => {
  const gates = get(production, "src/cms/media/environment.ts");
  assert.equal(gates.mediaReadEnvironmentEnabled(), true);
  assert.equal(gates.trustedMediaEnvironmentEnabled(), false);
  assert.equal(gates.mediaCloudEnabled(), false);
  assert.doesNotThrow(() => gates.requireMediaReadEnvironment());
  assert.throws(() => gates.requireTrustedMediaEnvironment());
  const versionId = "d1000000-0000-4000-8000-000000000001";
  const item = { id: "d0000000-0000-4000-8000-000000000001",
    version: { id: versionId, storage_provider: "static" }, usageCount: 1, publishedUsageCount: 1 };
  const repo = createSourceLoader({ env: production, mocks: {
    "@/cms/authorization": { requireCmsAdmin: async () => ({ userId: "admin" }) },
    "@/cms/server": { createCmsServerClient: async () => ({
      rpc: async (name) => name === "cms_media_library"
        ? { data: [item], error: null }
        : { data: { asset: item, versions: [item.version], usages: [], audit: [] }, error: null },
      from: () => ({ select() { return this; }, order: async () => ({
        data: [{ ...item.version, asset_id: item.id, version_number: 1, original_filename: "static.jpeg" }], error: null,
      }) }),
    }) },
    "./trusted-client": { createTrustedMediaClient: () => { throw Error("privileged client must not be created"); } },
  } })("src/cms/media/repository.ts");
  assert.equal((await repo.listMedia())[0].previewSrc, "/images/services/delicate-upholstery-cleaning.jpeg");
  assert.ok(await repo.getMediaDetail(item.id));
  assert.equal((await repo.getMediaChoices())[0].src, "/images/services/delicate-upholstery-cleaning.jpeg");
  await repo.updateMedia(item.id, 1, "metadata", { altText: "תמונה", caption: "", folder: "" });
});

test("Production upload and private delivery remain closed without a media credential", async () => {
  const service = { ...production, CMS_CONTENT_SOURCE: "published",
    CMS_CONTENT_SERVICE_ALLOWLIST: "delicate-upholstery-cleaning" };
  let writes = 0;
  const repo = createSourceLoader({ env: service, mocks: {
    "@/cms/authorization": { requireCmsAdmin: async () => ({ userId: "admin" }) },
    "./validate-image": { validateImage: async () => { writes++; throw Error("unexpected"); } },
  } })("src/cms/media/repository.ts");
  await assert.rejects(() => repo.uploadMedia(new Uint8Array(), "x.jpg", "image/jpeg", {}), /העלאת מדיה אינה זמינה/);
  assert.equal(writes, 0);
  const uploadRoute = createSourceLoader({ env: service, mocks: {
    "@/cms/authorization": { requireCmsAdmin: async () => ({ userId: "admin" }) },
    "@/cms/media/repository": { uploadMedia: async () => { writes++; throw Error("unexpected"); } },
  } })("src/app/(admin)/admin/media/upload/route.ts");
  const uploadResponse = await uploadRoute.POST(new Request("https://www.cleanbrothers.co.il/admin/media/upload", { method: "POST" }));
  assert.equal(uploadResponse.status, 503);
  assert.match(uploadResponse.headers.get("cache-control"), /private.*no-store/);
  assert.equal(writes, 0);
  const route = createSourceLoader({ env: service, mocks: {
    "@/cms/media/repository": { mediaBytes: async () => { writes++; throw Error("unexpected"); } },
  } })("src/app/cms-media/[id]/route.ts");
  const response = await route.GET(new Request("https://www.cleanbrothers.co.il/cms-media/d1000000-0000-4000-8000-000000000001"),
    { params: Promise.resolve({ id: "d1000000-0000-4000-8000-000000000001" }) });
  assert.equal(response.status, 404);
  assert.equal(writes, 0);
  const storage = createSourceLoader({ env: service, mocks: {
    "./trusted-client": { createTrustedMediaClient: () => { writes++; throw Error("unexpected"); } },
  } })("src/cms/media/cloud-storage.ts");
  await assert.rejects(() => storage.readCloudImage("d1000000-0000-4000-8000-000000000001", "a".repeat(64)), /Cloud CMS media unavailable/);
  assert.equal(writes, 0);
});

test("Production Media Admin shows read-only library and hides upload controls", async () => {
  const page = createSourceLoader({ env: production, mocks: {
    "@/cms/authorization": { requireCmsAdmin: async () => ({ userId: "admin" }) },
    "@/cms/media/repository": { listMedia: async () => [] },
    "@/cms/media/Library": { Library: () => null },
    "@/cms/media/UploadForm": { UploadForm: () => { throw Error("upload control rendered"); } },
  } })("src/app/(admin)/admin/(protected)/media/page.tsx");
  const html = renderToStaticMarkup(await page.default());
  assert.match(html, /ספריית מדיה/);
  assert.match(html, /העלאה והחלפה של תמונות אינן זמינות/);
  assert.doesNotMatch(html, /העלאת תמונה חדשה/);
});

test("Production public media projection permits static versions but rejects private and local versions", () => {
  const service = { ...production, CMS_CONTENT_SOURCE: "published",
    CMS_CONTENT_SERVICE_ALLOWLIST: "delicate-upholstery-cleaning" };
  const resolve = get(service, "src/cms/media/resolve.ts").resolveMediaProjection;
  const row = { media_version_id: "d1000000-0000-4000-8000-000000000001",
    usage_role: "hero", position: 0, alt_text: "תמונה", provider: "static" };
  assert.equal(resolve([row], "public")[0].src, "/images/services/delicate-upholstery-cleaning.jpeg");
  assert.throws(() => resolve([{ ...row, provider: "supabase" }], "public"), /Private CMS media unavailable/);
  assert.throws(() => resolve([{ ...row, provider: "local" }], "public"), /Local CMS media unavailable/);
});

test("Production published service reads static media without creating a trusted client", async () => {
  const service = { ...production, CMS_CONTENT_SOURCE: "published",
    CMS_CONTENT_SERVICE_ALLOWLIST: "delicate-upholstery-cleaning" };
  const baseline = get(service, "src/cms/content/baseline.ts").pilotBaseline();
  const payload = { ...baseline, schemaVersion: 2,
    images: ["d1000000-0000-4000-8000-000000000001"] };
  const row = { media_version_id: payload.images[0], provider: "static", usage_role: "hero",
    position: 0, alt_text: "ניקוי ריפודים", width: 1600, height: 1200 };
  const makeSource = (provider) => createSourceLoader({ env: service, mocks: {
    "next/server": { connection: async () => {} },
    "@supabase/supabase-js": { createClient: (_url, key) => {
      assert.equal(key, production.CMS_SUPABASE_PUBLISHABLE_KEY);
      return { rpc: async () => ({ data: { revisionId: "a0000000-0000-4000-8000-000000000001",
        payload, media: [{ ...row, provider }, { ...row, provider, usage_role: "result" }] }, error: null }) };
    } },
    "@/cms/media/trusted-client": { createTrustedMediaClient: () => { throw Error("privileged client used"); } },
  } })("src/cms/content/public-source.ts");
  const publicPage = await makeSource("static").getPublicPilot();
  assert.equal(publicPage.page.content.images[0], "/images/services/delicate-upholstery-cleaning.jpeg");
  await assert.rejects(() => makeSource("supabase").getPublicPilot(), /Private CMS media unavailable/);
});

test("Production read gate fails closed for other project, branch and CMS identity", () => {
  for (const change of [{ VERCEL_PROJECT_ID: "other" }, { VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation" },
    { CMS_SUPABASE_URL: "https://other.supabase.co" }, { CMS_SUPABASE_PUBLISHABLE_KEY: undefined }]) {
    const gates = get({ ...production, ...change }, "src/cms/media/environment.ts");
    assert.equal(gates.mediaReadEnvironmentEnabled(), false);
    assert.throws(() => gates.requireMediaReadEnvironment());
  }
});
