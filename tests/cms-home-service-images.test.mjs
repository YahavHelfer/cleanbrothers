import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";

const load = createSourceLoader({ mocks: {
  "next/image": { __esModule: true, default: props => createElement("img", Object.fromEntries(Object.entries(props).filter(([key]) => !["fill", "preload", "unoptimized"].includes(key)))) },
} });
const { homeBaseline } = load("src/cms/home/baseline.ts");
const { validateHomeDraft } = load("src/cms/home/model.ts");
const { Services } = load("src/sections/Services.tsx");
const { staticHomeMedia } = load("src/cms/home/HomeBlocksView.tsx");
const { services } = load("src/data/site.ts");
const page = () => plain(homeBaseline);
const section = draft => draft.blocks.find(block => block.type === "homeServices");
const render = (content, media = staticHomeMedia) => renderToStaticMarkup(createElement(Services, { content, media }));

test("homepage card seed preserves every existing image, order and crop", () => {
  const content = section(page()).payload;
  for (const key of content.serviceKeys) {
    const service = services.find(row => row.landingPath === `/${key}`);
    const images = content.cards[key].images;
    assert.deepEqual(images.map(image => staticHomeMedia[image.versionId].src), plain(service.images));
    assert.deepEqual(images.map(image => image.position), plain(service.images.map(src => service.imagePositions?.[src] || service.imagePosition)));
  }
  assert.match(render(content), /Air-conditioner-cleaning4.JPG/);
});

test("old revisions gain missing images without replacing editor text or explicit empty lists", () => {
  const draft = page();
  const cards = section(draft).payload.cards;
  cards["sofa-cleaning"].title = "כותרת של העורך";
  delete cards["sofa-cleaning"].images;
  cards["carpet-cleaning"].images = [];
  const checked = section(plain(validateHomeDraft(draft))).payload.cards;
  assert.equal(checked["sofa-cleaning"].title, "כותרת של העורך");
  assert.equal(checked["sofa-cleaning"].images.length, 4);
  assert.deepEqual(checked["carpet-cleaning"].images, []);
});

test("add, replace, delete, reorder and alt changes survive serialized draft validation", () => {
  const draft = page(), content = section(draft).payload;
  const card = content.cards["sofa-cleaning"];
  card.images.push({ ...content.cards["mattress-cleaning"].images[0], alt: "תמונה נוספת" });
  card.images[0] = { ...content.cards["carpet-cleaning"].images[0], alt: "תמונה מוחלפת" };
  card.images.splice(1, 1);
  card.images.reverse();
  const saved = plain(validateHomeDraft(JSON.parse(JSON.stringify(draft))));
  assert.deepEqual(section(saved).payload.cards["sofa-cleaning"].images, card.images);
  const html = render({ ...section(saved).payload, serviceKeys: ["sofa-cleaning"] });
  assert.match(html, /alt="תמונה נוספת"/);
  assert.match(html, /mattress-cleaning.jpeg/);
  assert.doesNotMatch(html, /sofa-cleaning.png/);
});

test("single image and empty card hide carousel controls; windows can use CMS images", () => {
  const content = section(page()).payload;
  const single = render({ ...content, serviceKeys: ["mattress-cleaning"] });
  assert.doesNotMatch(single, /aria-roledescription="carousel"|בחירת תמונה|התמונה הבאה/);
  content.cards["mattress-cleaning"].images = [];
  const empty = render({ ...content, serviceKeys: ["mattress-cleaning"] });
  assert.match(empty, /role="img"/);
  assert.doesNotMatch(empty, /<img|aria-roledescription="carousel"/);
  content.cards["window-cleaning"].images = [{ ...content.cards["carpet-cleaning"].images[0], alt: "חלון נקי" }];
  assert.match(render({ ...content, serviceKeys: ["window-cleaning"] }), /alt="חלון נקי"/);
});

test("card contract rejects arbitrary URLs, duplicate media, unsafe alts, crops and extra fields", () => {
  for (const mutate of [
    images => { images[0].versionId = "https://example.com/image.jpg"; },
    images => { images.push(images[0]); },
    images => { images[0].alt = "<script>"; },
    images => { images[0].alt = ""; },
    images => { images[0].position = "absolute"; },
    images => { images[0].src = "/arbitrary.jpg"; },
    images => { while (images.length < 9) images.push(images[0]); },
  ]) {
    const draft = page();
    mutate(section(draft).payload.cards["sofa-cleaning"].images);
    assert.throws(() => validateHomeDraft(draft));
  }
});
