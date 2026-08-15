import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

import {
  chooseFirstTouchAttribution,
  hasMeaningfulAcquisitionEvidence,
  sanitizeMarketingAttribution,
} from "../src/lib/marketing-attribution-shared.ts";
import {
  appendWhatsAppAttributionMarker,
} from "../src/lib/whatsapp-attribution.ts";
import {
  buildWhatsAppAttributionFailureDiagnostic,
} from "../src/lib/whatsapp-attribution-diagnostics.ts";

const SITE_ORIGIN = "https://cleanbrothers.co.il";
const SYNTHETIC_TOKEN = "AbCdEfGhIjKlMnOpQrStUv";
const buildWhatsAppRedirectMessage = loadRedirectHelper();

test("direct placeholder first-touch upgrades to later paid evidence", () => {
  assert.deepEqual(
    chooseFirstTouchAttribution(
      { landing_page: "/" },
      {
        landing_page: "/sofa-cleaning",
        utm_source: "google",
        utm_medium: "cpc",
      },
      SITE_ORIGIN,
    ),
    {
      landing_page: "/sofa-cleaning",
      utm_source: "google",
      utm_medium: "cpc",
    },
  );
});

test("meaningful first-touch remains sticky against later evidence", () => {
  const first = { utm_source: "google", utm_medium: "cpc" };
  assert.deepEqual(
    chooseFirstTouchAttribution(
      first,
      { utm_source: "social", utm_campaign: "later" },
      SITE_ORIGIN,
    ),
    first,
  );
});

test("same-origin referrer is a placeholder while external Google is meaningful", () => {
  assert.equal(
    hasMeaningfulAcquisitionEvidence(
      { landing_page: "/contact", referrer: `${SITE_ORIGIN}/` },
      SITE_ORIGIN,
    ),
    false,
  );
  assert.equal(
    hasMeaningfulAcquisitionEvidence(
      { referrer: "https://www.google.co.il/" },
      SITE_ORIGIN,
    ),
    true,
  );
});

test("rejected consent and missing attribution keep ordinary WhatsApp behavior", async () => {
  let calls = 0;
  const requestToken = async () => {
    calls += 1;
    return SYNTHETIC_TOKEN;
  };
  const rejected = await buildWhatsAppRedirectMessage({
    consent: "rejected",
    attributionCookie: encodeURIComponent(JSON.stringify({ utm_source: "google" })),
    humanMessage: "Hello",
    requestToken,
  });
  const missing = await buildWhatsAppRedirectMessage({
    consent: "accepted",
    attributionCookie: undefined,
    humanMessage: "Hello",
    requestToken,
  });
  assert.equal(rejected, "Hello");
  assert.equal(missing, "Hello");
  assert.equal(calls, 0);
});

test("token endpoint failure fails open without blocking WhatsApp", async () => {
  const message = await buildWhatsAppRedirectMessage({
    consent: "accepted",
    attributionCookie: encodeURIComponent(JSON.stringify({ utm_source: "google" })),
    humanMessage: "Hello",
    requestToken: async () => {
      throw new Error("synthetic local failure");
    },
  });
  assert.equal(message, "Hello");
});

test("successful bridge exposes only an opaque marker, never attribution values", async () => {
  const clickIdSentinel = "CLICK_ID_SENTINEL";
  const message = await buildWhatsAppRedirectMessage({
    consent: "accepted",
    attributionCookie: encodeURIComponent(
      JSON.stringify({ gclid: clickIdSentinel, utm_source: "google" }),
    ),
    humanMessage: "Hello",
    requestToken: async () => SYNTHETIC_TOKEN,
  });
  assert.equal(message, appendWhatsAppAttributionMarker("Hello", SYNTHETIC_TOKEN));
  assert.doesNotMatch(message, new RegExp(clickIdSentinel));
  assert.doesNotMatch(message, /gclid|utm_source/i);
});

test("all website WhatsApp CTAs use the shared same-origin helper", () => {
  const sourceFiles = listSourceFiles(fileURLToPath(new URL("../src", import.meta.url)));
  const directWaMeFiles = sourceFiles.filter((file) =>
    /https:\/\/wa\.me\//.test(readFileSync(file, "utf8")),
  );
  assert.equal(directWaMeFiles.length, 1);
  assert.match(directWaMeFiles[0].replaceAll("\\", "/"), /src\/lib\/whatsapp\.ts$/);

  const helper = readFileSync(
    new URL("../src/lib/whatsapp.ts", import.meta.url),
    "utf8",
  );
  const tracker = readFileSync(
    new URL("../src/components/BusinessEventTracker.tsx", import.meta.url),
    "utf8",
  );
  assert.match(helper, /\/api\/whatsapp\?message=/);
  assert.match(tracker, /destination\.pathname === "\/api\/whatsapp"/);
});

test("GA4 WhatsApp event remains free of tokens, attribution, and PII", () => {
  const analytics = readFileSync(
    new URL("../src/lib/google-analytics.ts", import.meta.url),
    "utf8",
  );
  assert.match(analytics, /page_path: getSafePagePath\(\)/);
  assert.doesNotMatch(
    analytics,
    /CBREF|token|gclid|gbraid|wbraid|utm_source|phone_number|email/i,
  );
});

test("upstream diagnostics expose only safe request metadata", () => {
  const sensitiveSentinels = {
    CRM_WEBHOOK_SECRET: "SECRET_VALUE_SENTINEL",
    token: SYNTHETIC_TOKEN,
    gclid: "GCLID_VALUE_SENTINEL",
    gbraid: "GBRAID_VALUE_SENTINEL",
    wbraid: "WBRAID_VALUE_SENTINEL",
    utm_source: "UTM_VALUE_SENTINEL",
    message: "MESSAGE_VALUE_SENTINEL",
  };
  const diagnostic = buildWhatsAppAttributionFailureDiagnostic({
    endpoint: new URL(
      "https://cleanbrothers-crm.vercel.app/api/integrations/whatsapp/attribution",
    ),
    status: 401,
    failureClass: "unauthorized",
    requestHasSecret: true,
    requestHasAttribution: true,
    ...sensitiveSentinels,
  });
  const serialized = JSON.stringify(diagnostic);

  assert.deepEqual(Object.keys(diagnostic).sort(), [
    "event",
    "failure_class",
    "http_status",
    "request_has_attribution",
    "request_has_secret",
    "response_ok",
    "upstream_host",
    "upstream_path",
  ]);
  for (const sentinel of Object.values(sensitiveSentinels)) {
    assert.doesNotMatch(serialized, new RegExp(sentinel));
  }
  assert.doesNotMatch(serialized, /CRM_WEBHOOK_SECRET|token|gclid|gbraid|wbraid|utm_|message/i);
});

function listSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? listSourceFiles(path)
      : /\.[cm]?[jt]sx?$/.test(entry.name)
        ? [path]
        : [];
  });
}

function loadRedirectHelper() {
  const source = readFileSync(
    new URL("../src/lib/whatsapp-redirect.ts", import.meta.url),
    "utf8",
  )
    .replace(
      'import { sanitizeMarketingAttribution } from "./marketing-attribution-shared";',
      "const sanitizeMarketingAttribution = globalThis.__sanitizeMarketingAttribution;",
    )
    .replace(
      'import { appendWhatsAppAttributionMarker } from "./whatsapp-attribution";',
      "const appendWhatsAppAttributionMarker = globalThis.__appendWhatsAppAttributionMarker;",
    );
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const context = vm.createContext({
    __sanitizeMarketingAttribution: sanitizeMarketingAttribution,
    __appendWhatsAppAttributionMarker: appendWhatsAppAttributionMarker,
    decodeURIComponent,
    JSON,
    Object,
    exports: {},
    module: { exports: {} },
  });
  context.exports = context.module.exports;
  vm.runInContext(javascript, context);
  return context.module.exports.buildWhatsAppRedirectMessage;
}
