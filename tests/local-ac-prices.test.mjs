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
    const nodes = elementTree(node);
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
