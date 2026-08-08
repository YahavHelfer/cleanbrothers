import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const analyticsSource = readSource("../src/lib/google-analytics.ts");
const trackerSource = readSource("../src/components/BusinessEventTracker.tsx");
const contactFormSource = readSource("../src/components/ContactForm.tsx");
const googleAdsSource = readSource("../src/lib/google-ads.ts");
const metaPixelSource = readSource("../src/lib/meta-pixel.ts");

function loadAnalyticsHelper({
  consent,
  pathname = "/sofa-cleaning",
  gtagThrows = false,
}) {
  const instrumentedSource = analyticsSource.replace(
    'import { hasAnalyticsConsent } from "@/lib/consent";',
    "const hasAnalyticsConsent = globalThis.__hasAnalyticsConsent;",
  );
  const javascript = ts.transpileModule(instrumentedSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const calls = [];
  const context = vm.createContext({
    __hasAnalyticsConsent: () => consent === "accepted",
    exports: {},
    module: { exports: {} },
    window: {
      location: { pathname },
      gtag: (...args) => {
        if (gtagThrows) {
          throw new Error("synthetic gtag failure");
        }
        calls.push(args);
      },
    },
  });
  context.exports = context.module.exports;
  vm.runInContext(javascript, context);
  return { calls, helper: context.module.exports };
}

function assertSafeGa4Call(call, eventName) {
  assert.deepEqual(call.slice(0, 2), ["event", eventName]);
  assert.equal(call[2].send_to, "G-B0KGLSC7VG");
  assert.doesNotMatch(JSON.stringify(call), /AW-18271875274|DNSiCK3vzcUcEMrh2ohE/);
  assert.doesNotMatch(
    JSON.stringify(call[2]),
    /phone|email|address|city|message|lead.?id|customer.?id|transaction|href|url|query|referrer|gclid|gbraid|wbraid|utm|marketingAttribution/i,
  );
}

test("accepted consent routes each allowlisted event only to GA4", () => {
  const { calls, helper } = loadAnalyticsHelper({ consent: "accepted" });
  for (const eventName of ["generate_lead", "click_whatsapp", "click_phone"]) {
    assert.equal(helper.trackGoogleAnalyticsEvent(eventName), true);
  }
  assert.equal(calls.length, 3);
  assertSafeGa4Call(calls[0], "generate_lead");
  assert.equal(calls[0][2].form_name, "contact_form");
  assertSafeGa4Call(calls[1], "click_whatsapp");
  assert.equal(calls[1][2].page_path, "/sofa-cleaning");
  assertSafeGa4Call(calls[2], "click_phone");
  assert.equal(calls[2][2].page_path, "/sofa-cleaning");
});

test("rejected and unknown consent suppress every GA4 business event", () => {
  for (const consent of ["rejected", "unknown"]) {
    const { calls, helper } = loadAnalyticsHelper({ consent });
    for (const eventName of ["generate_lead", "click_whatsapp", "click_phone"]) {
      assert.equal(helper.trackGoogleAnalyticsEvent(eventName), false);
    }
    assert.deepEqual(calls, []);
  }
});

test("runtime allowlist rejects an unsupported event name", () => {
  const { calls, helper } = loadAnalyticsHelper({ consent: "accepted" });
  assert.equal(helper.trackGoogleAnalyticsEvent("page_view"), false);
  assert.deepEqual(calls, []);
});

test("a gtag failure cannot escape into form or navigation behavior", () => {
  const { calls, helper } = loadAnalyticsHelper({
    consent: "accepted",
    gtagThrows: true,
  });
  assert.equal(helper.trackGoogleAnalyticsEvent("generate_lead"), false);
  assert.equal(helper.trackGoogleAnalyticsEvent("click_whatsapp"), false);
  assert.deepEqual(calls, []);
});

test("page_path is pathname-only and unsafe values fall back to root", () => {
  const safe = loadAnalyticsHelper({
    consent: "accepted",
    pathname: "/air-conditioner-cleaning",
  });
  safe.helper.trackGoogleAnalyticsEvent("click_phone");
  assert.equal(safe.calls[0][2].page_path, "/air-conditioner-cleaning");

  const unsafe = loadAnalyticsHelper({
    consent: "accepted",
    pathname: "/contact?phone=0500000000",
  });
  unsafe.helper.trackGoogleAnalyticsEvent("click_phone");
  assert.equal(unsafe.calls[0][2].page_path, "/");
});

test("generate_lead stays inside the successful-submission duplicate guard", () => {
  assert.match(
    contactFormSource,
    /if \(conversionReportedForSubmissionRef\.current !== submissionId\)[\s\S]*reportGoogleAdsLeadConversion\(leadId, values\.phone\);[\s\S]*trackGoogleAnalyticsEvent\("generate_lead"\);/,
  );
  assert.equal(
    (contactFormSource.match(/trackGoogleAnalyticsEvent\("generate_lead"\)/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(
    analyticsSource,
    /leadId|phone_number|full_name|message|marketingAttribution/,
  );
});

test("one passive delegated tracker covers dynamic business links", () => {
  assert.match(trackerSource, /document\.addEventListener\("click"/);
  assert.match(
    trackerSource,
    /target\.closest<HTMLAnchorElement>\("a\[href\]"/,
  );
  assert.match(trackerSource, /destination\.hostname === "wa\.me"/);
  assert.match(trackerSource, /trackGoogleAnalyticsEvent\("click_whatsapp"\)/);
  assert.match(trackerSource, /trackGoogleAnalyticsEvent\("click_phone"\)/);
  assert.match(trackerSource, /passive: true/);
  assert.doesNotMatch(trackerSource, /location\.href|location\.search/);
});

test("Google Ads and Meta remain isolated", () => {
  assert.match(
    googleAdsSource,
    /AW-18271875274\/DNSiCK3vzcUcEMrh2ohE/,
  );
  assert.match(googleAdsSource, /transaction_id: transactionId/);
  assert.match(
    googleAdsSource,
    /finally[\s\S]*gtag\("set", "user_data", \{\}\)/,
  );
  assert.doesNotMatch(googleAdsSource, /G-B0KGLSC7VG/);
  assert.doesNotMatch(
    metaPixelSource,
    /generate_lead|click_whatsapp|click_phone/,
  );
});
