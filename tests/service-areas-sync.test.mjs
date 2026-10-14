import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";

test("published business area additions, removals and ordering reach homepage and footer together", async () => {
  const baseline = createSourceLoader();
  const page = plain(baseline("src/cms/home/baseline.ts").homeBaseline);
  const settings = plain(baseline("src/cms/site/baseline.ts").siteSettingsBaseline);
  for (const areas of [["קריית אונו", "ראש העין"], ["ראש העין", "גבעת שמואל", "והסביבה"]]) {
    const current = { ...settings, serviceAreas: areas };
    const load = createSourceLoader({ mocks: {
      "@/cms/site/public-source": { getPublicSiteChrome: async () => ({ settings: current }) },
      "@/cms/home/public-source": { getPublicHome: async () => ({ page, source: "cms", revisionId: "test", promotions: {} }) },
      "@/cms/schedules/public-source": { getPublicActivePromotion: async () => null },
      "@/cms/reviews/source": { getGoogleReviews: async () => null },
    } });
    const home = renderToStaticMarkup(await load("src/app/(site)/page.tsx").default());
    const region = home.split('aria-label="ערי שירות"')[1].split("</section>")[0];
    const { Footer } = load("src/sections/Footer.tsx");
    const footer = renderToStaticMarkup(createElement(Footer, { settings: current }));
    for (const html of [region, footer]) {
      const offsets = areas.map(area => html.indexOf(area));
      assert.ok(offsets.every(offset => offset >= 0));
      assert.deepEqual(offsets, [...offsets].sort((a, b) => a - b));
      assert.ok(!html.includes("פתח תקווה"), "removed baseline areas must not remain");
    }
  }
});
