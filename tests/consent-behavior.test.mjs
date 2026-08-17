import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_STORAGE_KEY,
  getConsentState,
  getGoogleConsentBootstrapScript,
  getStoredConsent,
  parseStoredConsentValue,
  updateConsent,
} from "../src/lib/consent.ts";

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

function executeBootstrap(storedValue) {
  const cookies = [];
  const context = {
    localStorage: {
      getItem: () => storedValue,
    },
    location: { protocol: "https:" },
    document: {
      set cookie(value) {
        cookies.push(value);
      },
    },
  };
  context.window = context;
  vm.runInNewContext(getGoogleConsentBootstrapScript(), context);

  return context.dataLayer.map((entry) => Array.from(entry));
}

function assertConsentValues(actual, expected) {
  assert.deepEqual(
    {
      analytics_storage: actual.analytics_storage,
      ad_storage: actual.ad_storage,
      ad_user_data: actual.ad_user_data,
      ad_personalization: actual.ad_personalization,
    },
    {
      analytics_storage: expected,
      ad_storage: expected,
      ad_user_data: expected,
      ad_personalization: expected,
    },
  );
}

test("scenario A: an unknown visitor starts with all Consent Mode values denied", () => {
  const calls = executeBootstrap(null);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 2), ["consent", "default"]);
  assertConsentValues(calls[0][2], "denied");
  assert.equal(calls[0][2].wait_for_update, 500);
});

test("stored and legacy values resolve without silently accepting unknown values", () => {
  assert.equal(parseStoredConsentValue("accepted"), "accepted");
  assert.equal(parseStoredConsentValue("yes"), "accepted");
  assert.equal(parseStoredConsentValue("approved"), "accepted");
  assert.equal(parseStoredConsentValue("rejected"), "rejected");
  assert.equal(parseStoredConsentValue("no"), "rejected");
  assert.equal(parseStoredConsentValue(null), "unknown");
  assert.equal(parseStoredConsentValue("unexpected"), "unknown");
});

test("scenario B/E: stored acceptance restores all four values as granted", () => {
  for (const storedValue of ["accepted", "yes", "approved"]) {
    const calls = executeBootstrap(storedValue);
    assert.deepEqual(calls[1].slice(0, 2), ["consent", "update"]);
    assertConsentValues(calls[1][2], "granted");
  }
});

test("scenario C: stored rejection keeps all four values denied", () => {
  for (const storedValue of ["rejected", "no"]) {
    const calls = executeBootstrap(storedValue);
    assert.deepEqual(calls[1].slice(0, 2), ["consent", "update"]);
    assertConsentValues(calls[1][2], "denied");
  }
});

test("scenario D/E: changing consent persists and publishes matching updates", () => {
  const originalWindow = globalThis.window;
  const originalCustomEvent = globalThis.CustomEvent;
  const originalDocument = globalThis.document;
  const stored = new Map();
  const gtagCalls = [];
  const browserWindow = new EventTarget();
  browserWindow.localStorage = {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  };
  browserWindow.gtag = (...args) => gtagCalls.push(args);
  browserWindow.location = { protocol: "https:" };
  globalThis.document = { cookie: "" };
  globalThis.CustomEvent = class CustomEvent extends Event {
    constructor(type, options) {
      super(type);
      this.detail = options?.detail;
    }
  };
  globalThis.window = browserWindow;

  const choices = [];
  browserWindow.addEventListener(CONSENT_CHANGE_EVENT, (event) => {
    choices.push(event.detail);
  });

  try {
    updateConsent("accepted");
    assert.equal(stored.get(CONSENT_STORAGE_KEY), "accepted");
    assert.equal(getStoredConsent(), "accepted");
    assertConsentValues(getConsentState(getStoredConsent()), "granted");

    updateConsent("rejected");
    assert.equal(stored.get(CONSENT_STORAGE_KEY), "rejected");
    assert.equal(getStoredConsent(), "rejected");
    assertConsentValues(getConsentState(getStoredConsent()), "denied");
    assert.deepEqual(choices, ["accepted", "rejected"]);
    assertConsentValues(gtagCalls.at(-1)[2], "denied");
  } finally {
    globalThis.window = originalWindow;
    globalThis.CustomEvent = originalCustomEvent;
    globalThis.document = originalDocument;
  }
});

test("tag integrations retain one loader and enforce consent gates", () => {
  const layout = readSource("../src/app/layout.tsx");
  const googleTag = readSource("../src/components/GoogleAdsTag.tsx");
  const trackedNumber = readSource(
    "../src/components/GoogleCallTrackingNumber.tsx",
  );
  const googleCallTracking = readSource(
    "../src/lib/google-call-tracking.ts",
  );
  const serviceLandingPage = readSource(
    "../src/components/ServiceLandingPage.tsx",
  );
  const googleAds = readSource("../src/lib/google-ads.ts");
  const metaComponent = readSource("../src/components/MetaPixel.tsx");
  const metaPixel = readSource("../src/lib/meta-pixel.ts");
  const attribution = readSource("../src/lib/marketing-attribution.ts");
  const contactForm = readSource("../src/components/ContactForm.tsx");

  assert.equal((googleTag.match(/googletagmanager\.com\/gtag\/js/g) ?? []).length, 1);
  assert.ok(
    layout.indexOf("google-consent-defaults") < layout.indexOf("<GoogleAdsTag"),
  );
  assert.doesNotMatch(googleTag, /G-B0KGLSC7VG|GTM-PZ7DLGNS/);
  assert.match(googleTag, /onLoad=\{configureGoogleAds\}/);
  assert.match(googleTag, /__cleanBrothersGoogleAdsConfigured/);
  assert.match(googleTag, /phone_conversion_number: phoneConversionNumber/);
  assert.match(googleTag, /phone_conversion_css_class: phoneConversionCssClass/);
  assert.match(googleTag, /phone_conversion_callback:/);
  assert.match(googleTag, /hasAdStorageConsent\(\)/);
  assert.match(googleTag, /subscribeToConsentChanges/);
  assert.match(
    googleTag,
    /choice === "accepted"[\s\S]*configureGoogleCallTracking\(\)[\s\S]*restoreOriginalGoogleCallNumbers/,
  );
  assert.match(layout, /AW-18271875274\/71I-CKLxmOMcEMrh2ohE/);
  assert.match(layout, /const googleAdsPhoneConversionNumber = "0559577731"/);
  assert.equal((layout.match(/<GoogleAdsTag/g) ?? []).length, 1);
  assert.match(
    googleCallTracking,
    /GOOGLE_CALL_CONVERSION_NUMBER_CLASS\s*=\s*\n\s*"google-call-conversion-number"/,
  );
  assert.match(trackedNumber, /className=\{GOOGLE_CALL_CONVERSION_NUMBER_CLASS\}/);
  assert.match(trackedNumber, /data-google-call-original-number/);
  assert.match(googleCallTracking, /trackedNumber\.textContent = formattedNumber/);
  assert.match(
    googleCallTracking,
    /const forwardingHref = `tel:\$\{mobileNumber\}`[\s\S]*phoneLink\.setAttribute\("href", forwardingHref\)/,
  );
  assert.match(
    googleCallTracking,
    /querySelectorAll<HTMLAnchorElement>[\s\S]*'a\[href\^="tel:"\]'/,
  );
  assert.match(googleCallTracking, /currentHref\.replace\(\/\\D\/g, ""\) !== originalDigits/);
  assert.match(googleCallTracking, /new MutationObserver/);
  assert.match(googleCallTracking, /characterData: true/);
  assert.match(googleCallTracking, /hasAdStorageConsent\(\)/);
  assert.match(googleCallTracking, /originalNumber[\s\S]*originalHref/);
  assert.match(
    serviceLandingPage,
    /<GoogleCallTrackingNumber>055-957-7731<\/GoogleCallTrackingNumber>/,
  );
  assert.match(serviceLandingPage, /const phoneHref = "tel:0559577731"/);
  assert.match(googleAds, /hasAdUserDataConsent\(\)/);
  assert.match(googleAds, /AW-18271875274\/DNSiCK3vzcUcEMrh2ohE/);
  assert.match(googleAds, /crypto\.subtle\.digest/);
  assert.match(googleAds, /sha256_phone_number: hashedPhone/);
  assert.doesNotMatch(googleAds, /\n\s*phone_number:\s*normalizedPhone/);
  assert.match(googleAds, /finally[\s\S]*gtag\("set", "user_data", \{\}\)/);
  assert.match(metaPixel, /hasAdStorageConsent\(\)/);
  assert.match(metaPixel, /__cleanBrothersMetaPixelId/);
  assert.match(metaPixel, /stopPendingMetaPixelInitialization/);
  assert.match(metaComponent, /pageViewReportedForConsentRef/);
  assert.match(attribution, /hasAnalyticsConsent\(\)/);
  assert.match(contactForm, /fetch\("\/api\/contact-lead"/);
  assert.match(contactForm, /reportGoogleAdsLeadConversion\(leadId, values\.phone\)/);
});
