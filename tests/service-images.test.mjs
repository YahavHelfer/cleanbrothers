import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { serviceImages } from "../src/data/serviceImages.ts";
import { getServiceImages, getPrimaryServiceImage } from "../src/lib/service-images.ts";

test("air conditioner carousel and poster use only existing approved images", () => {
  const images = serviceImages.airConditioner;
  assert.deepEqual(images, [
    "/images/services/Air-conditioner-cleaning4.JPG",
    "/images/services/Air-conditioner-cleaning.PNG",
    "/images/services/Air-conditioner-cleaning2.PNG",
  ]);
  assert.equal(new Set(images).size, images.length);
  for (const path of images) {
    assert.ok(readFileSync(new URL(`../public${path}`, import.meta.url)).length > 0, path);
  }

  const landing = readFileSync(new URL("../src/data/serviceLandingPages.ts", import.meta.url), "utf8");
  const poster = landing.match(/poster:\s*"([^"]+)"/)?.[1];
  assert.equal(poster, images[0]);
});

test("car upholstery uses every replacement asset with exact casing and no duplicates", () => {
  const directory = new URL("../public/images/services/", import.meta.url);
  const files = readdirSync(directory).filter((name) => /^car-upholstery-cleaning\d*\./i.test(name));
  const configured = serviceImages.carUpholstery;
  assert.equal(configured.length, 4);
  assert.deepEqual([...configured].sort(), files.map((name) => `/images/services/${name}`).sort());
  const hashes = configured.map((path) => createHash("sha256")
    .update(readFileSync(new URL(`../public${path}`, import.meta.url))).digest("hex"));
  assert.equal(new Set(hashes).size, configured.length);
  assert.deepEqual(getServiceImages({ images: configured, image: configured[0] }), configured);
  assert.equal(getPrimaryServiceImage({ images: configured }), configured[0]);
});

test("car before/after references still resolve with exact filenames", () => {
  const directory = new URL("../public/images/before-after/", import.meta.url);
  const files = readdirSync(directory);
  for (const name of ["car-before.jpeg", "car-after.jpeg"]) {
    assert.ok(files.includes(name), name);
    assert.ok(readFileSync(new URL(name, directory)).length > 0);
  }
});
