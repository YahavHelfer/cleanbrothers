import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";
import { syntheticGoogleReviews } from "../src/cms/reviews/fixture.ts";
import { validateGoogleReviews } from "../src/cms/reviews/model.ts";

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

test("homepage baseline adds one hidden reviews block without changing public HTML", () => {
  const page = draft();
  assert.deepEqual(page.blocks.map(block => block.type), ["homeHero", "homeTrust", "homeServices", "homeProcess",
    "homeBeforeAfter", "homeWhyUs", "homeGoogleReviews", "homePricing", "homeEstimate", "homeAreas", "homeFaq", "homeFinalCta"]);
  assert.equal(page.blocks[6].hidden, true);
  assert.equal(page.blocks[6].id, "d4000000-0000-4000-8000-000000000012");
  assert.deepEqual(page.blocks.filter(block => block.type !== "homeGoogleReviews").map(block => block.id),
    Array.from({ length: 11 }, (_, index) => `d4000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`));
  assert.equal(validateHomeDraft(page).canonical, "/");
  const html = render(page);
  assert.ok(html.includes(page.h1));
  assert.ok(html.includes("/images/hero/hero-sofa-cleaning.jpg"));
  assert.ok(html.includes("/api/whatsapp"));
  assert.ok(html.includes("tel:"));
  assert.ok(!html.includes("Google Maps"));
});

test("review source validation keeps attribution, drops missing links and rejects malformed data", () => {
  const fixture = structuredClone(syntheticGoogleReviews);
  const checked = validateGoogleReviews(fixture);
  assert.equal(checked.reviews.length, 4);
  assert.deepEqual(checked.reviews.map(review => review.rating), [5, 4, 5, 3]);
  assert.match(checked.reviews[0].text, /דוגמת בדיקה/);
  assert.match(checked.reviews[1].text, /Sample review/);
  assert.equal(checked.reviews[0].author.photoUri, null);
  assert.equal(checked.reviews[1].relativePublishTimeDescription, null);
  fixture.reviews[0].googleMapsUri = null;
  assert.equal(validateGoogleReviews(fixture).reviews.length, 3);
  fixture.reviews = [];
  assert.equal(validateGoogleReviews(fixture).reviews.length, 0);
  fixture.rating = 6;
  assert.equal(validateGoogleReviews(fixture), null);
  fixture.rating = 4.7;
  fixture.reviews = [{ rating: NaN, text: "bad" }];
  assert.equal(validateGoogleReviews(fixture).reviews.length, 0);
});

test("Maps attribution accepts exact Google hosts without requiring a /maps path", () => {
  const validLinks = [
    "https://maps.google.com/",
    "https://maps.google.com/?q=CleanBrothers",
    "https://www.google.com/maps/place/example",
    "https://google.com/maps/place/example",
    "https://maps.app.goo.gl/example",
  ];
  for (const link of validLinks) {
    const fixture = structuredClone(syntheticGoogleReviews);
    fixture.googleMapsUri = link;
    fixture.reviews[0].googleMapsUri = link;
    fixture.reviews[0].author.uri = link;
    const checked = validateGoogleReviews(fixture);
    assert.equal(checked.googleMapsUri, link);
    assert.equal(checked.reviews[0].googleMapsUri, link);
    assert.equal(checked.reviews[0].author.uri, link);
  }
  const unsafeLinks = [
    "http://maps.google.com/",
    "https://evil.example/maps/place/example",
    "https://google.com.evil.example/maps/place/example",
    "https://user:pass@google.com/maps/place/example",
    "https://google.com:444/maps/place/example",
    "javascript:alert(1)",
    "data:text/html,hello",
  ];
  for (const link of unsafeLinks) {
    const fixture = structuredClone(syntheticGoogleReviews);
    fixture.googleMapsUri = link;
    assert.equal(validateGoogleReviews(fixture), null, link);
    fixture.googleMapsUri = "https://maps.google.com/";
    fixture.reviews[0].googleMapsUri = link;
    assert.equal(validateGoogleReviews(fixture).reviews.length, 3, link);
    fixture.reviews[0].googleMapsUri = "https://maps.google.com/";
    fixture.reviews[0].author.uri = link;
    assert.equal(validateGoogleReviews(fixture).reviews.length, 3, link);
  }
});

test("server review source fails closed on public pages and permits only explicit local fixtures", async () => {
  const source = env => createSourceLoader({ env })("src/cms/reviews/source.ts").getGoogleReviews;
  assert.equal(await source({})("public"), null);
  assert.equal(await source({ GOOGLE_REVIEWS_SOURCE: "google" })("public"), null);
  assert.equal(await source({ GOOGLE_REVIEWS_SOURCE: "fixture", VERCEL: "1" })("public"), null);
  assert.equal((await source({ GOOGLE_REVIEWS_SOURCE: "fixture" })("public")).reviews.length, 4);
  assert.equal((await source({})("preview")).reviews.length, 4);
});

const googlePreview = {
  VERCEL: "1", VERCEL_ENV: "preview", VERCEL_PROJECT_ID: "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
  VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation",
  CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co",
  GOOGLE_REVIEWS_SOURCE: "google", GOOGLE_REVIEWS_PLACE_ID: "ChIJM6V_e13OrmgRCjbDT5abAqA",
  GOOGLE_PLACES_API_KEY: "synthetic-test-key-never-real",
};
const googlePayload = () => ({
  displayName: { text: "CleanBrothers" }, rating: 4.8, userRatingCount: 317,
  googleMapsUri: "https://www.google.com/maps/place/example",
  reviews: Array.from({ length: 5 }, (_, index) => ({
    rating: index === 1 ? 4 : 5,
    text: { text: index === 0 ? "שירות מעולה" : `Excellent service ${index}` },
    ...(index === 1 ? {} : { relativePublishTimeDescription: "1 month ago" }),
    authorAttribution: {
      displayName: `Reviewer ${index}`,
      uri: `https://www.google.com/maps/contrib/example-${index}`,
      ...(index === 0 ? {} : { photoUri: "https://lh3.googleusercontent.com/example-avatar" }),
    },
    googleMapsUri: `https://www.google.com/maps/reviews/example-${index}`,
  })),
});

test("live Google source uses exact Place Details fields, validates five reviews and never returns the key", async () => {
  let calls = 0;
  const response = googlePayload();
  const source = createSourceLoader({ env: googlePreview, fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, `https://places.googleapis.com/v1/places/${googlePreview.GOOGLE_REVIEWS_PLACE_ID}`);
    assert.equal(options.cache, "no-store");
    assert.equal(options.headers["X-Goog-Api-Key"], googlePreview.GOOGLE_PLACES_API_KEY);
    assert.equal(options.headers["X-Goog-FieldMask"], [
      "displayName.text", "rating", "userRatingCount", "googleMapsUri", "reviews.rating", "reviews.text.text",
      "reviews.relativePublishTimeDescription", "reviews.authorAttribution.displayName",
      "reviews.authorAttribution.uri", "reviews.authorAttribution.photoUri", "reviews.googleMapsUri",
    ].join(","));
    assert.ok(options.signal);
    return new Response(JSON.stringify(response), { status: 200 });
  } })("src/cms/reviews/source.ts").getGoogleReviews;
  const result = plain(await source("public"));
  assert.equal(calls, 1);
  assert.equal(result.placeName, "CleanBrothers");
  assert.equal(result.rating, 4.8);
  assert.equal(result.userRatingCount, 317);
  assert.equal(result.reviews.length, 5);
  assert.equal(result.reviews[0].text, "שירות מעולה");
  assert.match(result.reviews[1].text, /Excellent/);
  assert.equal(result.reviews[0].author.photoUri, null);
  assert.equal(result.reviews[1].relativePublishTimeDescription, null);
  assert.equal(result.reviews[0].googleMapsUri, response.reviews[0].googleMapsUri);
  assert.ok(!JSON.stringify(result).includes(googlePreview.GOOGLE_PLACES_API_KEY));
  assert.ok(!JSON.stringify(result).includes("authorAttribution"));
});

test("live Google source accepts safe non-/maps attribution paths in a synthetic response", async () => {
  const response = googlePayload();
  response.googleMapsUri = "https://maps.google.com/";
  response.reviews[0].googleMapsUri = "https://maps.google.com/?q=review";
  response.reviews[0].authorAttribution.uri = "https://maps.google.com/?q=contributor";
  const source = createSourceLoader({ env: googlePreview,
    fetchImpl: async () => new Response(JSON.stringify(response), { status: 200 }) })("src/cms/reviews/source.ts");
  const result = plain(await source.getGoogleReviews("public"));
  assert.equal(result.googleMapsUri, response.googleMapsUri);
  assert.equal(result.reviews.length, 5);
  assert.equal(result.reviews[0].googleMapsUri, response.reviews[0].googleMapsUri);
  assert.equal(result.reviews[0].author.uri, response.reviews[0].authorAttribution.uri);
});

test("live Google source fails closed for missing or mismatched Preview identities and secrets", async () => {
  for (const change of [
    { GOOGLE_REVIEWS_SOURCE: "fixture" }, { VERCEL: "" }, { VERCEL_ENV: "production" },
    { VERCEL_PROJECT_ID: "wrong" }, { VERCEL_GIT_COMMIT_REF: "main" },
    { CMS_SUPABASE_URL: "https://other.supabase.co" }, { GOOGLE_REVIEWS_PLACE_ID: "" },
    { GOOGLE_REVIEWS_PLACE_ID: "ChIJnotTheApprovedPlaceId123" }, { GOOGLE_PLACES_API_KEY: "" },
  ]) {
    let calls = 0;
    const source = createSourceLoader({ env: { ...googlePreview, ...change },
      fetchImpl: async () => { calls++; throw Error("Google must not be called"); } })("src/cms/reviews/source.ts");
    assert.equal(await source.getGoogleReviews("public"), null);
    assert.equal(calls, 0);
  }
});

test("live Google source omits empty, malformed, unsafe and unavailable reviews without breaking the page", async () => {
  const run = async (payload, status = 200) => {
    const source = createSourceLoader({ env: googlePreview,
      fetchImpl: async () => new Response(JSON.stringify(payload), { status }) })("src/cms/reviews/source.ts");
    return source.getGoogleReviews("public");
  };
  const empty = googlePayload(); empty.reviews = [];
  assert.equal(await run(empty), null);
  const malformed = googlePayload(); malformed.reviews[0].rating = 9;
  assert.equal((await run(malformed)).reviews.length, 4);
  const unsafe = googlePayload(); unsafe.reviews[0].googleMapsUri = "https://evil.example/maps/review";
  assert.equal((await run(unsafe)).reviews.length, 4);
  const unsafePlace = googlePayload(); unsafePlace.googleMapsUri = "https://evil.example/maps/place";
  assert.equal(await run(unsafePlace), null);
  const tooMany = googlePayload(); tooMany.reviews.push(tooMany.reviews[0]);
  assert.equal(await run(tooMany), null);
  for (const status of [403, 429, 500]) assert.equal(await run({}, status), null);
  const timeout = createSourceLoader({ env: googlePreview, fetchImpl: async () => {
    throw Object.assign(Error("timeout"), { name: "TimeoutError" });
  } })("src/cms/reviews/source.ts");
  assert.equal(await timeout.getGoogleReviews("public"), null);
});

test("review config is closed, singleton and contains no external review or API fields", () => {
  const page = draft(), block = page.blocks[6];
  block.hidden = false;
  const validated = validateHomeDraft(page);
  assert.deepEqual(Object.keys(validated.blocks[6].payload).sort(),
    ["eyebrow", "title", "description", "showRatingSummary"].sort());
  block.payload.googleMapsUri = "https://www.google.com/maps/place/example";
  assert.throws(() => validateHomeDraft(page));
  delete block.payload.googleMapsUri;
  block.payload.apiKey = "example-secret";
  assert.throws(() => validateHomeDraft(page));
  delete block.payload.apiKey;
  block.payload.showRatingSummary = "true";
  assert.throws(() => validateHomeDraft(page));
  block.payload.showRatingSummary = true;
  page.blocks.push({ ...structuredClone(block), id: "d4000000-0000-4000-8000-000000000099", position: page.blocks.length });
  assert.throws(() => validateHomeDraft(page));
});

test("reviews render only when visible with separate valid runtime data", () => {
  const page = draft();
  assert.ok(!render(page).includes("Google Maps"));
  page.blocks[6].hidden = false;
  assert.ok(!render(page).includes("Google Maps"));
  const html = renderToStaticMarkup(createElement(HomeBlocksView,
    { page, revisionId: "fixture", reviews: validateGoogleReviews(syntheticGoogleReviews), preview: true }));
  assert.match(html, /Google Maps/);
  assert.match(html, /GoogleMaps_Logo_DarkGray\.svg/);
  assert.match(html, /לקוח לדוגמה/);
  assert.ok(!html.includes("href=\"https://www.google.com/maps/reviews/"));
  assert.ok(!JSON.stringify(page).includes("Sample reviewer"));
  const one = structuredClone(syntheticGoogleReviews);
  one.reviews = [one.reviews[0]];
  one.reviews[0].author.photoUri = "https://lh3.googleusercontent.com/example-avatar";
  const oneHtml = renderToStaticMarkup(createElement(HomeBlocksView,
    { page, revisionId: "fixture", reviews: validateGoogleReviews(one) }));
  assert.match(oneHtml, /disabled="" aria-label="ביקורת הבאה"|aria-label="ביקורת הבאה" disabled=""/);
  assert.match(oneHtml, /example-avatar/);
  assert.match(oneHtml, /href="https:\/\/www.google.com\/maps\/place\/example"/);
  assert.match(oneHtml, /href="https:\/\/www.google.com\/maps\/reviews\/example-a"/);
  assert.match(oneHtml, /href="https:\/\/www.google.com\/maps\/contrib\/example-a"/);
  const empty = { ...syntheticGoogleReviews, reviews: [] };
  const emptyHtml = renderToStaticMarkup(createElement(HomeBlocksView,
    { page, revisionId: "fixture", reviews: validateGoogleReviews(empty) }));
  assert.ok(!emptyHtml.includes("ביקורות ב־Google Maps"));
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
