import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createSourceLoader, projectRoot } from "./helpers/source-module.mjs";
import { repairHistoricalAcMedia } from "./helpers/ac-approved-baseline.mjs";
const baseline="02af571d8d1c15b38e1e203711921b0b512a87e7";
// All tracked source overrides ensure this remains valid before AND after commit.
const files=execFileSync("git",["ls-tree","-r","--name-only",baseline,"src"],{encoding:"utf8"}).trim().split("\n").filter(f=>/\.tsx?$/.test(f));
const overrides=Object.fromEntries(files.map(f=>[resolve(projectRoot,f),repairHistoricalAcMedia(f,execFileSync("git",["show",`${baseline}:${f}`],{encoding:"utf8"}))]));
const before=createSourceLoader({sourceOverrides:overrides}),after=createSourceLoader();
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
for(const file of pages)test(`approved public baseline unchanged: ${file}`,async()=>{
 const a=before(file),b=after(file);
 const actual=renderToStaticMarkup(await b.default()),expected=renderToStaticMarkup(await a.default());
 assert.equal(file==="src/app/(site)/page.tsx"?canonicalReactIds(actual):actual,
  file==="src/app/(site)/page.tsx"?canonicalReactIds(expected):expected);
 assert.deepEqual(JSON.parse(JSON.stringify(b.metadata??await b.generateMetadata())),JSON.parse(JSON.stringify(a.metadata??await a.generateMetadata())));
});
