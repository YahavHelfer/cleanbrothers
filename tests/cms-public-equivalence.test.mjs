import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createSourceLoader, projectRoot, plain } from "./helpers/source-module.mjs";

// Frozen production release, independently verified against all 324 Vercel
// source-file SHA1 values. Never derive the baseline from the working tree.
const baseline = "995a756e8ffd4f3becd6683e0c5326a58e6fcfbc";
const files = execFileSync("git", ["ls-tree", "-r", "--name-only", baseline, "src"], { encoding: "utf8" })
  .trim().split("\n").filter(file => /\.tsx?$/.test(file));
const overrides = Object.fromEntries(files.map(file => [resolve(projectRoot, file),
  execFileSync("git", ["show", `${baseline}:${file}`], { encoding: "utf8" })]));
const env = { VERCEL: "1", VERCEL_ENV: "production", VERCEL_PROJECT_ID: "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A", VERCEL_GIT_COMMIT_REF: "main" };
const before = createSourceLoader({ env, sourceOverrides: overrides });
const after = createSourceLoader({ env });
// The AC page is intentionally changed in this PR. Freeze its prepared
// revision separately; the other 18 pages still use the verified production
// baseline above. This snapshot is not a claim that it has been deployed.
const acRelevanceRevision = "295d2154cc227f50d201fa5942bd8319bd62c42f";
const acFiles = execFileSync("git", ["ls-tree", "-r", "--name-only", acRelevanceRevision, "src"], { encoding: "utf8" })
  .trim().split("\n").filter(file => /\.tsx?$/.test(file));
const acExpected = createSourceLoader({ env, sourceOverrides: Object.fromEntries(acFiles.map(file => [resolve(projectRoot, file),
  execFileSync("git", ["show", `${acRelevanceRevision}:${file}`], { encoding: "utf8" })])) });
const pages = files.filter(file => file.startsWith("src/app/(site)/") && file.endsWith("/page.tsx") && !file.includes("[slug]"));
assert.equal(pages.length, 19);
function canonicalReactIds(html) {
  const ids = new Map();
  return html.replace(/_R_[a-z0-9]+_/gi, id => {
    if (!ids.has(id)) ids.set(id, `_R_CANON_${ids.size}_`);
    return ids.get(id);
  });
}
function approvedPropertyCopy(html) {
  // Only the four requested landing-page clarifications may differ from live.
  return html
    .replace('>אחרי שיפוץ</h3>', '>ניקיון אחרי שיפוץ</h3>')
    .replace('>לפני אכלוס</h3>', '>ניקיון לפני אכלוס ודירה חדשה מקבלן</h3>')
    .replace('מתכננים ניקיון לדירה חדשה או יד שנייה לקראת הכניסה.', 'מתכננים ניקיון לדירה חדשה מקבלן או לדירה יד שנייה לפני כניסה.')
    .replace('הגישה לנכס, זמינות מים וחשמל ומועד הכניסה המתוכנן.', 'היישוב, הקומה, המעלית והחניה לציוד; זמינות מים וחשמל ומועד הכניסה המתוכנן.');
}
function approvedDuctCopy(html) {
  const priorCopy = "ניקוי תעלות אינו כלול ב־450 ₪. אפשר להזמין ניקוי תעלות בתוספת 250 ₪ לכל התעלות יחד, באמצעות מברשת ייעודית ושואב תעשייתי. מספר התעלות והיקף העבודה מסוכמים לפני התיאום.";
  const revisedCopy = "היקף ניקוי התעלות והמחיר נקבעים לאחר בדיקת גישה ומוסכמים לפני התיאום.";
  assert.equal(html.split(priorCopy).length, 2, "frozen service card must contain exactly one old price statement");
  return html.replace(priorCopy, revisedCopy);
}
for (const file of pages) test(`${file.endsWith('/air-conditioner-cleaning/page.tsx') ? 'prepared AC relevance revision' : 'verified deployed page content, links and metadata'} retained: ${file}`, async () => {
  const oldPage = file.endsWith('/air-conditioner-cleaning/page.tsx') ? acExpected(file) : before(file), newPage = after(file);
  const original = renderToStaticMarkup(await oldPage.default());
  const current = renderToStaticMarkup(await newPage.default());
  const expected = file.endsWith('/post-renovation-cleaning/page.tsx') ? approvedPropertyCopy(original) :
    file.endsWith('/services/page.tsx') ? approvedDuctCopy(original) : original;
  assert.equal(canonicalReactIds(current), canonicalReactIds(expected));
  const metadata = async page => plain(page.metadata ?? await page.generateMetadata());
  assert.deepEqual(await metadata(newPage), await metadata(oldPage));
});
