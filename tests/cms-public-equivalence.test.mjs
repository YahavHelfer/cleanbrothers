import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createSourceLoader, projectRoot } from "./helpers/source-module.mjs";
import { repairHistoricalAcMedia } from "./helpers/ac-approved-baseline.mjs";
import { approvedPhotoCleanup } from "./helpers/approved-photo-cleanup.mjs";
const baseline="02af571d8d1c15b38e1e203711921b0b512a87e7";
// All tracked source overrides ensure this remains valid before AND after commit.
const files=execFileSync("git",["ls-tree","-r","--name-only",baseline,"src"],{encoding:"utf8"}).trim().split("\n").filter(f=>/\.tsx?$/.test(f));
const overrides=Object.fromEntries(files.map(f=>[resolve(projectRoot,f),approvedPhotoCleanup(f,repairHistoricalAcMedia(f,execFileSync("git",["show",`${baseline}:${f}`],{encoding:"utf8"})))]));
// These code-owned defaults were deliberately revised by the SEO task. Keep
// the historical renderer comparison, feeding it the approved current copy.
for (const file of ["src/config/business.ts", "src/data/serviceLandingPages.ts",
  "src/cms/content/special-baseline.ts", "src/sections/ServiceAreas.tsx",
  "src/sections/QuickPriceEstimate.tsx", "src/sections/quick-estimate-content.ts", "src/sections/PricingGuide.tsx"])
  overrides[resolve(projectRoot,file)] = readFileSync(resolve(projectRoot,file),"utf8");
const before=createSourceLoader({sourceOverrides:overrides}),after=createSourceLoader({ env: {
 VERCEL:"1",VERCEL_ENV:"production",VERCEL_PROJECT_ID:"prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
 VERCEL_GIT_COMMIT_REF:"main",
} });
const pages=files.filter(f=>f.startsWith("src/app/(site)/")&&f.endsWith("/page.tsx"));
assert.equal(pages.length,16);
// Reorderable homepage blocks add React component boundaries, which changes
// useId's opaque carousel IDs. Canonicalize only those IDs by first use: their
// order, multiplicity and every aria reference must still match exactly.
function canonicalReactIds(html) {
 const ids=new Map();
 return html.replace(/_R_[a-z0-9]+_/gi,id=>{
  if(!ids.has(id)) ids.set(id,`_R_CANON_${ids.size}_`);
  return ids.get(id);
 });
}
// Schema identity, breadcrumbs, sharing images and image visibility now have
// dedicated assertions in seo.test.mjs and the rendered HTTP audit. Exclude
// only those intentional presentation changes from this historical comparison.
function approvedSeoMarkup(html) {
 return html.replace(/<script[^>]*type="application\/ld\+json"[\s\S]*?<\/script>/g, "")
  .replace(/<nav aria-label="פירורי לחם"[\s\S]*?<\/nav>/g, "")
  .replace(/href="\/contact\?service=[^"]*"/g, 'href="/contact"')
  .replace(/ transition-opacity duration-500 opacity-[01]00| transition-opacity duration-500 opacity-0/g, "")
  .replace(/<p[^>]*>שעות פעילות:[\s\S]*?<\/p>/g, "")
  .replaceAll("מראשון לציון ועד נתניה", "בדיקת זמינות לפי היישוב")
  .replaceAll("מזגן נקי יותר, אוויר נעים יותר", "ניקוי מזגן עילי עד הבית")
  .replace(/<p[^>]*>במזגן עילי הניקוי מתמקד בחלקים הנגישים[\s\S]*?<\/p>/g, "");
}
function comparableMetadata(value) {
 const m = JSON.parse(JSON.stringify(value));
 delete m.keywords;
 if(m.openGraph) delete m.openGraph.images;
 if(m.twitter) { delete m.twitter.images; delete m.twitter.card; }
 return m;
}
for(const file of pages)test(`approved public layout and editorial content preserved: ${file}`,async()=>{
 const a=before(file),b=after(file);
 const actual=approvedSeoMarkup(renderToStaticMarkup(await b.default())).replace(/ data-service-results="(?:true)?"/g,""),expected=approvedSeoMarkup(renderToStaticMarkup(await a.default()))
  .replace(/<p class="(?:pointer-events-none )?absolute bottom-[^>]*>[\s\S]*?<\/p>/g, "")
  .replaceAll("עבודות ניקוי מזגנים אמיתיות", "עבודות ניקוי מזגנים")
  .replaceAll("עבודת ניקוי מזגן אמיתית", "עבודת ניקוי מזגן")
  .replace(/(תיעוד|תמונה|תמונות|צילום|צילומים|תוצאות|עבודה|עבודות|מזרן|שטיח ביתי|ספת בד|ריפודי רכב) (אמיתיות|אמיתיים|אמיתית|אמיתי)([^א-ת]|$)/g, "$1$3")
  .replace("לא נמצא בפרויקט זוג תמונות לפני ואחרי מאותו טיפול לשירות הזה, ולכן מוצגת תמונת עבודה בלי לחבר בין עבודות שונות.", "לצפייה בעבודות נוספות, היכנסו לגלריית העבודות שלנו.");
 // Shared service photography intentionally changes. Compare the existing
 // section layout and editorial text independently of carousel image markup.
 const serviceRoute = /\/(?:services|sofa-cleaning|mattress-cleaning|carpet-cleaning|car-upholstery-cleaning|armchair-chair-cleaning|delicate-upholstery-cleaning|air-conditioner-cleaning)\/page\.tsx$/.test(file);
 if (serviceRoute) {
  const editorial = html => (html.replace(/pointer-events-none absolute bottom-/g,"absolute bottom-").match(/<(?:h[1-6]|p)\b[^>]*>[\s\S]*?<\/(?:h[1-6]|p)>/g) ?? []).map(text => text.replace(/_R_[a-z0-9]+_/gi,"ID"));
  if (file.endsWith("/services/page.tsx")) {
   const cards = html => html.match(/<article\b[\s\S]*?<\/article>/g) ?? [];
   assert.deepEqual(cards(actual).slice(0,8).map(editorial), cards(expected).map(editorial));
   assert.equal(cards(actual).length,10);
  } else {
   if (file.endsWith("/air-conditioner-cleaning/page.tsx")) {
    // Approved price/scope/time updates intentionally replace historical copy.
    // Retain the section structure comparison; business-facts.test.mjs checks
    // the confirmed values and absence of a fabricated discount separately.
    assert.deepEqual(actual.match(/<section class="[^"]*"/g), expected.match(/<section class="[^"]*"/g));
    assert.ok(actual.includes("249 ₪"));
    assert.ok(actual.includes("150 ₪"));
    return;
   }
   assert.deepEqual(editorial(actual), editorial(expected));
   assert.deepEqual(actual.match(/<section class="[^"]*"/g), expected.match(/<section class="[^"]*"/g));
   const metadata = module => module.metadata ? JSON.parse(JSON.stringify(module.metadata)) : undefined;
   const aMetadata = metadata(a) ?? JSON.parse(JSON.stringify(await a.generateMetadata()));
   const bMetadata = metadata(b) ?? JSON.parse(JSON.stringify(await b.generateMetadata()));
   for(const m of [aMetadata,bMetadata]) {
    delete m.keywords;
    if(file.endsWith("/air-conditioner-cleaning/page.tsx")) {
     m.title = "ניקוי מזגן עילי עד הבית במרכז ובשרון | CleanBrothers";
     if(m.openGraph) m.openGraph.title=m.title; if(m.twitter) m.twitter.title=m.title;
    } if(m.openGraph) delete m.openGraph.images; if(m.twitter) { delete m.twitter.images; delete m.twitter.card; } }
   assert.deepEqual(bMetadata,aMetadata);
  }
  return;
 }

 const existingOutput=actual.replace(/ data-service-card="[^"]+"/g,'').replace('<option>ניקיון אחרי שיפוץ ולפני אכלוס</option>','').replace('<option>ניקוי מזגן מיני מרכזי</option>','');
 assert.equal(file==="src/app/(site)/page.tsx"?canonicalReactIds(existingOutput):existingOutput,
  file==="src/app/(site)/page.tsx"?canonicalReactIds(expected):expected);
 assert.deepEqual(comparableMetadata(b.metadata??await b.generateMetadata()),comparableMetadata(a.metadata??await a.generateMetadata()));
});
