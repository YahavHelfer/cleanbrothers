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
const DIAGNOSTIC_ENDPOINT = new URL(
  "https://cleanbrothers-crm.vercel.app/api/integrations/whatsapp/attribution",
);
const DIAGNOSTIC_REQUEST = {
  endpoint: DIAGNOSTIC_ENDPOINT,
  secret: "SECRET_VALUE_SENTINEL",
  marketingAttribution: { utm_source: "UTM_VALUE_SENTINEL" },
  timeoutMs: 10,
};
const buildWhatsAppRedirectMessage = loadRedirectHelper();
const {
  fallbackWhatsAppAttributionDiagnostic,
  getWhatsAppAttributionDiagnosticHeaders,
  requestWhatsAppAttributionToken,
} = loadDiagnosticHelper();

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

test("debug flag absent adds no X-CB diagnostic headers", () => {
  const headers = getWhatsAppAttributionDiagnosticHeaders(
    false,
    fallbackWhatsAppAttributionDiagnostic({
      failure: "missing_env",
      hasSecret: false,
      hasAttribution: true,
    }),
  );
  assert.equal(Object.keys(headers).length, 0);
});

test("missing environment is deterministic and does not call CRM", async () => {
  let calls = 0;
  const result = await runDiagnosticRequest({
    ...DIAGNOSTIC_REQUEST,
    secret: undefined,
    fetchImpl: async () => {
      calls += 1;
      throw new Error("must not run");
    },
  });
  assert.equal(calls, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(result.diagnostic)), {
    result: "fallback",
    failure: "missing_env",
    upstreamStatus: null,
    hasSecret: false,
    hasAttribution: true,
  });
});

test("CRM statuses map to deterministic safe failures", async () => {
  for (const [status, failure] of [
    [400, "bad_request"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [422, "unprocessable"],
    [500, "upstream_error"],
  ]) {
    const result = await runDiagnosticRequest({
      ...DIAGNOSTIC_REQUEST,
      fetchImpl: responseWith(status),
    });
    assert.equal(result.token, null);
    assert.equal(result.diagnostic.failure, failure);
    assert.equal(result.diagnostic.upstreamStatus, status);
  }
});

test("timeout is reported without exposing the thrown error", async () => {
  const timeout = new Error("PRIVATE_TIMEOUT_DETAIL");
  timeout.name = "TimeoutError";
  const result = await runDiagnosticRequest({
    ...DIAGNOSTIC_REQUEST,
    fetchImpl: async () => {
      throw timeout;
    },
  });
  assert.equal(result.diagnostic.failure, "timeout");
  assert.equal(result.diagnostic.upstreamStatus, null);
});

test("malformed success response is reported safely", async () => {
  const result = await runDiagnosticRequest({
    ...DIAGNOSTIC_REQUEST,
    fetchImpl: responseWith(200, { token: "not-valid!" }),
  });
  assert.equal(result.token, null);
  assert.equal(result.diagnostic.failure, "malformed_response");
  assert.equal(result.diagnostic.upstreamStatus, 200);
});

test("successful token response reports success without putting token in headers", async () => {
  const result = await runDiagnosticRequest({
    ...DIAGNOSTIC_REQUEST,
    fetchImpl: responseWith(200, { token: SYNTHETIC_TOKEN }),
  });
  assert.equal(result.token, SYNTHETIC_TOKEN);
  assert.deepEqual(JSON.parse(JSON.stringify(result.diagnostic)), {
    result: "success",
    failure: "none",
    upstreamStatus: 200,
    hasSecret: true,
    hasAttribution: true,
  });
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        getWhatsAppAttributionDiagnosticHeaders(true, result.diagnostic),
      ),
    ),
    {
      "X-CB-Attribution-Result": "success",
      "X-CB-Attribution-Failure": "none",
      "X-CB-Upstream-Status": "200",
      "X-CB-Has-Secret": "true",
      "X-CB-Has-Attribution": "true",
    },
  );
});

test("diagnostic headers expose no token, secret, attribution values, or PII", () => {
  const sensitiveSentinels = {
    CRM_WEBHOOK_SECRET: "SECRET_VALUE_SENTINEL",
    token: SYNTHETIC_TOKEN,
    gclid: "GCLID_VALUE_SENTINEL",
    gbraid: "GBRAID_VALUE_SENTINEL",
    wbraid: "WBRAID_VALUE_SENTINEL",
    utm_source: "UTM_VALUE_SENTINEL",
    message: "MESSAGE_VALUE_SENTINEL",
    email: "EMAIL_VALUE_SENTINEL",
    phone: "PHONE_VALUE_SENTINEL",
  };
  const diagnostic = fallbackWhatsAppAttributionDiagnostic({
    failure: "unauthorized",
    upstreamStatus: 401,
    hasSecret: true,
    hasAttribution: true,
    ...sensitiveSentinels,
  });
  const headers = getWhatsAppAttributionDiagnosticHeaders(true, diagnostic);
  const serialized = JSON.stringify(headers);

  assert.deepEqual(Object.keys(headers).sort(), [
    "X-CB-Attribution-Failure",
    "X-CB-Attribution-Result",
    "X-CB-Has-Attribution",
    "X-CB-Has-Secret",
    "X-CB-Upstream-Status",
  ]);
  for (const sentinel of Object.values(sensitiveSentinels)) {
    assert.doesNotMatch(serialized, new RegExp(sentinel));
  }
  assert.doesNotMatch(
    serialized,
    /CRM_WEBHOOK_SECRET|token|CBREF|gclid|gbraid|wbraid|utm_|referrer|phone|email|message/i,
  );
});

function responseWith(status, body = { error: "SAFE_TEST_ERROR" }) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

async function runDiagnosticRequest(input) {
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    return await requestWhatsAppAttributionToken(input);
  } finally {
    console.error = originalConsoleError;
  }
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

function loadDiagnosticHelper() {
  const source = readFileSync(
    new URL("../src/lib/whatsapp-attribution-diagnostics.ts", import.meta.url),
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
  return context.module.exports;
}
