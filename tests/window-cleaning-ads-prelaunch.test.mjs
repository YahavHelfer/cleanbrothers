import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("window cleaning landing page uses its dedicated route and CRM service", () => {
  const page = source("../src/app/(site)/window-cleaning/page.tsx");
  const landing = source("../src/components/WindowCleaningLandingPage.tsx");
  const registry = source("../src/content/service-registry.ts");
  assert.match(page, /getPublicSpecialService\("window-cleaning"\)/);
  assert.match(landing, /initialService=\{serviceRegistry\["window-cleaning"\]\.crmName\}/);
  assert.match(registry, /"window-cleaning": \{ crmName: "ניקוי חלונות"/);
});

test("window cleaning form asks for relevant residential and business details", () => {
  const form = source("../src/components/ContactForm.tsx");
  assert.match(form, /defaultService === "ניקוי חלונות"/);
  assert.match(form, /בבית או בעסק, מספר החלונות, הגישה אליהם/);
  assert.match(form, /marketingAttribution: getStoredMarketingAttribution\(\)/);
  assert.match(form, /reportEligibleContactLeadEvents\(/);
});

test("WhatsApp click analytics is not confused with qualified CRM lead", () => {
  const tracker = source("../src/components/BusinessEventTracker.tsx");
  const form = source("../src/components/ContactForm.tsx");
  assert.match(tracker, /trackGoogleAnalyticsEvent\("click_whatsapp"\)/);
  assert.match(form, /reportGoogleAds: reportGoogleAdsLeadConversion/);
  assert.doesNotMatch(tracker, /reportGoogleAdsLeadConversion/);
});
