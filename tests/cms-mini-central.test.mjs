import assert from "node:assert/strict";
import test from "node:test";
import { createSourceLoader, plain, elementTree } from "./helpers/source-module.mjs";
import { renderToStaticMarkup } from "react-dom/server";
import { baselineMedia } from "./helpers/shared-service-media.mjs";
const load = createSourceLoader();
const key = "mini-central-air-conditioner-cleaning";
const { serviceBaseline } = load("src/cms/content/baseline.ts");
const { validateServiceDraft, toServiceLanding } = load("src/cms/content/service-model.ts");

test("mini-central editorial fields reject missing, extra, HTML and empty labels", () => {
  for (const mutate of [
    p => { delete p.pageCopy.contactTitle; },
    p => { p.pageCopy.href = "https://invalid.example"; },
    p => { p.pageCopy.heroCta = "<script>"; },
    p => { p.pageCopy.contactDescription = ""; },
  ]) {
    const draft = plain(serviceBaseline(key));
    mutate(draft);
    assert.throws(() => validateServiceDraft(key, draft));
  }
});
test("mini-central copy and shared image alt reach the renderer and SEO without changing CRM identity", () => {
  const draft = plain(serviceBaseline(key));
  draft.pageCopy.heroCta = "בדיקת התאמה מעודכנת";
  draft.pageCopy.contactTitle = "תיאום דרך ה-CMS";
  draft.seoDescription = "תיאור מעודכן מה-CMS";
  const page = toServiceLanding(key, draft, baselineMedia(draft));
  const props = load("src/content/service-landing-adapter.ts").toServiceLandingProps(page);
  const component = load("src/components/ServiceLandingPage.tsx");
  const html = renderToStaticMarkup(component.ServiceLandingPage(props));
  assert.match(html, /בדיקת התאמה מעודכנת/);
  assert.match(html, /תיאום דרך ה-CMS/);
  const nodes = elementTree(component.ServiceLandingPage(props));
  assert.ok(nodes.some(node => node.props?.data?.["@type"] === "BreadcrumbList"));
  assert.equal(props.crmServiceName, "ניקוי מזגן מיני מרכזי");
  assert.equal(component.buildServiceLandingMetadata(props.config).description, draft.seoDescription);
  const images = load("src/cms/home/service-card-images.ts").baselineServiceImages(key);
  assert.match(images[0].alt, /לא מזגן מיני מרכזי/);
});
test("historical nine-service image snapshots remain readable, preserving explicit empty collections", () => {
  const images = plain(load("src/cms/home/service-card-images.ts").baselineImageCollections());
  delete images[key];
  images["sofa-cleaning"] = [];
  const normalized = load("src/cms/service-images/model.ts").validateImageCollections(images);
  assert.deepEqual(plain(normalized[key]), []);
  assert.deepEqual(plain(normalized["sofa-cleaning"]), []);
});
