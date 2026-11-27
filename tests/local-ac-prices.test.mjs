import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { createSourceLoader, elementTree, plain } from "./helpers/source-module.mjs";

const require = createRequire(import.meta.url);
const { tryToParsePath } = require("next/dist/lib/try-to-parse-path");
const buildEnv = { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "review/local-ac-seo" };

const approved = {
  "ביקור ובדיקת מזגן": 250,
  "ניקוי בסיסי למזגן עילי": 250,
  "ניקוי עמוק למזגן עילי": 250,
  "ניקוי מזגן עם ריח לא נעים": 350,
  "ניקוי מזגן עם סימני עובש": 400,
  "ניקוי מאיץ וסוללה פנימית": 450,
  "פתיחת סתימה וניקוי תעלת ניקוז": 350,
  "ניקוי מזגן מיני מרכזי": 600,
  "ניקוי משולב עם בדיקת טפטוף": 350,
};

test("every city agrees with the approved price matrix and keeps its own canonical and noindex", async () => {
  const load = createSourceLoader({ env: buildEnv });
  const route = load("src/app/(site)/air-conditioner-cleaning/[city]/page.tsx");
  const { localAcCityLinks, localAcBasePath } = load("src/content/local-ac-pilot.ts");
  const titles = new Set();
  const descriptions = new Set();
  for (const { path, name } of localAcCityLinks) {
    const props = { params: Promise.resolve({ city: path.slice(localAcBasePath.length + 1) }) };
    const metadata = await route.generateMetadata(props);
    assert.equal(metadata.alternates.canonical, `https://www.cleanbrothers.co.il${path}`);
    assert.deepEqual(plain(metadata.robots), { index: false, follow: false });
    assert.match(metadata.description, /החל מ־250 ₪/);
    assert.ok(metadata.title.includes(name));
    titles.add(metadata.title);
    descriptions.add(metadata.description);

    const node = await route.default(props);
    const { AcPriceTable } = load("src/components/AcPriceTable.tsx");
    const nodes = [...elementTree(node), ...elementTree(AcPriceTable())];
    const rows = Object.fromEntries(nodes.filter(x => x.type === "tr" && x.key).map(row => {
      const [label, price] = row.props.children;
      return [label.props.children, price.props.children];
    }));
    assert.deepEqual(rows, Object.fromEntries(Object.entries(approved).map(([name, amount]) => [name, `החל מ־${amount} ₪`])));
    const visibleCopy = nodes.flatMap(x => [x.props.children].flat(Infinity).filter(value => typeof value === "string"));
    const copy = visibleCopy.join(" ") + JSON.stringify(metadata);
    assert.doesNotMatch(copy, /(?:^|[^\d])(199|398)(?!\d)|הנחת כמות|תוספת חניה|מינימום הזמנה/);
    for (const text of ["כוללים מע״מ", "מחירי פתיחה", "כפופים לבדיקה", "ניקוי בסיסי", "ניקוי עמוק", "טיפול בבעיה ספציפית"]) {
      assert.ok(copy.includes(text), text);
    }
  }
  assert.equal(titles.size, 4);
  assert.equal(descriptions.size, 4);
});

test("only the isolated preview redirects legacy pages and preserves city, API and asset routes", async () => {
  const config = createSourceLoader({ env: buildEnv })("next.config.ts").default;
  const redirects = await config.redirects();
  assert.ok(redirects.every(r => r.permanent === false && r.destination === "/air-conditioner-cleaning/petah-tikva"));
  const matchers = redirects.map(({ source }) => {
    const parsed = tryToParsePath(source);
    assert.equal(parsed.error, undefined);
    return new RegExp(parsed.regexStr);
  });
  for (const path of ["/", "/air-conditioner-cleaning", "/mini-central-air-conditioner-cleaning", "/services", "/guides/nested", "/admin/login"]) {
    assert.ok(matchers.some(regex => regex.test(path)), path);
  }
  for (const path of ["/air-conditioner-cleaning/petah-tikva", "/air-conditioner-cleaning/unknown", "/api/contact-lead", "/api/whatsapp/pilot", "/_next/image", "/images/services/photo.jpg", "/sitemap.xml", "/robots.txt"]) {
    assert.ok(!matchers.some(regex => regex.test(path)), path);
  }
  for (const env of [{ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main" }, { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "another-branch" }]) {
    const different = createSourceLoader({ env })("next.config.ts").default;
    assert.deepEqual(plain(await different.redirects()), []);
  }
});

test("the release candidate enables Petah Tikva only and uses the real shared contact affordances", async () => {
  const load = createSourceLoader({ env: { VERCEL_ENV: "production" } });
  const route = load("src/app/(site)/air-conditioner-cleaning/[city]/page.tsx");
  const props = { params: Promise.resolve({ city: "petah-tikva" }) };
  const nodes = elementTree(await route.default(props));
  assert.ok(nodes.some(node => node.type === "a" && node.props.href.startsWith("tel:")));
  assert.ok(nodes.some(node => node.type === "a" && node.props.href.startsWith("https://wa.me/") &&
    node.props["data-whatsapp-service"] === "air-conditioner-cleaning"));
  assert.ok(nodes.some(node => node.type.name === "ContactForm" && node.props.initialService));
  assert.equal((await route.generateMetadata(props)).robots, undefined);
  const cityLinks = load("src/content/local-ac-pilot.ts").publishedLocalAcLinks;
  assert.deepEqual(plain(cityLinks.map(link => link.path)), ["/air-conditioner-cleaning/petah-tikva"]);
  const citySitemap = async read => (await read("src/app/sitemap.ts").default())
    .map(item => item.url).filter(url => url.includes("/air-conditioner-cleaning/"));
  assert.deepEqual(plain(await citySitemap(load)), ["https://www.cleanbrothers.co.il/air-conditioner-cleaning/petah-tikva"]);
  const preview = createSourceLoader({ env: { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "review/ac-price-release-rc" } });
  assert.deepEqual(plain(await citySitemap(preview)), []);
  assert.equal((await preview("src/app/(site)/air-conditioner-cleaning/[city]/page.tsx").generateMetadata(props)).robots.index, false);
  for (const city of ["rosh-haayin", "herzliya", "tel-aviv"]) {
    await assert.rejects(route.default({ params: Promise.resolve({ city }) }), /404/);
  }
});

test("old CMS copy, guide amounts and AC-only promotional offers are aligned in the public presentation", () => {
  const load = createSourceLoader();
  const { applyAcPriceRevision, isUnalignedAcOffer } = load("src/content/ac-price-revision.ts");
  const old = "מזגן עילי בכל הספק: 199 ₪. מיני מרכזי: 450 ₪, ותעלות בתוספת 250 ₪ לכל התעלות יחד.";
  assert.equal(applyAcPriceRevision(old), "מזגן עילי החל מ־250 ₪. מיני מרכזי החל מ־600 ₪.");
  assert.equal(applyAcPriceRevision("ניקוי ריפודים ב־700 ₪"), "ניקוי ריפודים ב־700 ₪");
  assert.equal(isUnalignedAcOffer({ h1: "ניקוי מזגן", currentPrice: 199 }), true);
  assert.equal(isUnalignedAcOffer({ h1: "ניקוי מזרן", currentPrice: 199 }), false);
  const { getCodeGuidePage } = load("src/content/guide-pages.ts");
  const { alignAcGuide } = load("src/content/align-ac-guide.ts");
  for (const slug of ["before-booking-ac-cleaning", "ac-mini-central-and-ducts"]) {
    const original = getCodeGuidePage(slug);
    const page = alignAcGuide(slug, original);
    const copy = JSON.stringify(page);
    assert.doesNotMatch(copy, /(?:199|398|450|550|700)\s*₪|250\s*₪ לכל התעלות/);
    assert.match(copy, /החל מ־250 ₪/);
    assert.match(copy, /החל מ־600 ₪/);
    assert.equal(page.canonical, original.canonical);
    load("src/cms/pages/model.ts").validatePageDraft(page);
  }
});
