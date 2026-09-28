import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import sharp from "sharp";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";
import { approvedAcImages, approvedAcGallery } from "./helpers/ac-approved-baseline.mjs";
test("AC approved repaired media exists, decodes and has no repeated carousel/gallery assets", async () => {
  const load = createSourceLoader();
  const { acBaseline } = load("src/cms/content/special-baseline.ts");
  const { specialMedia } = load("src/cms/content/special-view.ts");
  const acPageImages = specialMedia(acBaseline, "hero").map(image => image.src);
  const acGalleryImages = specialMedia(acBaseline, "gallery").map(image => image.src);
  assert.deepEqual(plain(acPageImages), approvedAcImages);
  assert.deepEqual(plain(acGalleryImages), approvedAcGallery);
  for (const list of [acPageImages, acGalleryImages]) {
    assert.equal(new Set(list).size, list.length);
    for (const path of list) {
      assert.ok(existsSync(`public${path}`), `Missing AC media: ${path}`);
      const image = await sharp(readFileSync(`public${path}`)).metadata();
      assert.ok(image.width >= 1000 && image.height >= 1000);
    }
  }
});
test("AC Open Graph uses the same existing asset as Hero", async () => {
  const load=createSourceLoader(),route=load("src/app/(site)/air-conditioner-cleaning/page.tsx");
  const metadata=route.metadata ?? await route.generateMetadata();
  assert.equal(metadata.openGraph.images[0].url, approvedAcImages[0]);
  assert.ok(existsSync(`public${metadata.openGraph.images[0].url}`));
});
