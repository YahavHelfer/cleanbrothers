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
for(const file of pages)test(`approved public baseline unchanged: ${file}`,async()=>{
 const a=before(file),b=after(file);
 assert.equal(renderToStaticMarkup(await b.default()),renderToStaticMarkup(await a.default()));
 assert.deepEqual(JSON.parse(JSON.stringify(b.metadata??await b.generateMetadata())),JSON.parse(JSON.stringify(a.metadata??await a.generateMetadata())));
});
