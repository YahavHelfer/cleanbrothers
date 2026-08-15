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
const SITE_ORIGIN = "https://cleanbrothers.co.il";
const SYNTHETIC_TOKEN = "AbCdEfGhIjKlMnOpQrStUv";
const ATTRIBUTION_ENDPOINT = new URL(
  "https://cleanbrothers-crm.vercel.app/api/integrations/whatsapp/attribution",
);
const ATTRIBUTION_REQUEST = {
  endpoint: ATTRIBUTION_ENDPOINT,
  secret: "SECRET_VALUE_SENTINEL",
  marketingAttribution: { utm_source: "UTM_VALUE_SENTINEL" },
  timeoutMs: 10,
};
const buildWhatsAppRedirectMessage = loadRedirectHelper();
const requestWhatsAppAttributionToken = loadAttributionRequestHelper();

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

test("public WhatsApp route exposes no temporary diagnostic state", () => {
  const route = readFileSync(
    new URL("../src/app/api/whatsapp/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(route, /NextResponse\.redirect\([\s\S]*307/);
  assert.match(route, /buildDirectWhatsAppLink\(outboundMessage\)/);
  assert.doesNotMatch(route, /cb_attribution_debug|X-CB-|AttributionDiagnostic/);
});

test("missing environment fails open without calling CRM", async () => {
  let calls = 0;
  const token = await requestWhatsAppAttributionToken({
    ...ATTRIBUTION_REQUEST,
    secret: undefined,
    fetchImpl: async () => {
      calls += 1;
      throw new Error("must not run");
    },
  });
  assert.equal(calls, 0);
  assert.equal(token, null);
});

test("CRM failures and malformed responses fail open", async () => {
  for (const status of [400, 401, 403, 404, 422, 500]) {
    const token = await requestWhatsAppAttributionToken({
      ...ATTRIBUTION_REQUEST,
      fetchImpl: responseWith(status),
    });
    assert.equal(token, null);
  }
  const networkFailure = await requestWhatsAppAttributionToken({
    ...ATTRIBUTION_REQUEST,
    fetchImpl: async () => {
      throw new Error("synthetic network failure");
    },
  });
  const malformed = await requestWhatsAppAttributionToken({
    ...ATTRIBUTION_REQUEST,
    fetchImpl: responseWith(200, { token: "not-valid!" }),
  });
  assert.equal(networkFailure, null);
  assert.equal(malformed, null);
});

test("successful CRM response returns only a valid opaque token", async () => {
  const token = await requestWhatsAppAttributionToken({
    ...ATTRIBUTION_REQUEST,
    fetchImpl: responseWith(200, { token: SYNTHETIC_TOKEN }),
  });
  assert.equal(token, SYNTHETIC_TOKEN);
});

test("permanent token request code logs no secret, token, attribution, or PII", () => {
  const helper = readFileSync(
    new URL("../src/lib/whatsapp-attribution-request.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(helper, /console\.(?:log|info|warn|error)/);
  assert.doesNotMatch(helper, /X-CB-|cb_attribution_debug/);
});

function responseWith(status, body = { error: "SAFE_TEST_ERROR" }) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

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

function loadAttributionRequestHelper() {
  const source = readFileSync(
    new URL("../src/lib/whatsapp-attribution-request.ts", import.meta.url),
    "utf8",
  )
    .replace(
      'import type { MarketingAttribution } from "./marketing-attribution-shared";',
      "",
    )
    .replace(
      'import { WHATSAPP_ATTRIBUTION_TOKEN_PATTERN } from "./whatsapp-attribution";',
      "const WHATSAPP_ATTRIBUTION_TOKEN_PATTERN = globalThis.__tokenPattern;",
    );
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const context = vm.createContext({
    __tokenPattern: /^[A-Za-z0-9_-]{22}$/,
    AbortSignal,
    Error,
    JSON,
    Object,
    URL,
    console,
    exports: {},
    module: { exports: {} },
  });
  context.exports = context.module.exports;
  vm.runInContext(javascript, context);
  return context.module.exports.requestWhatsAppAttributionToken;
}
