import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const src = fileURLToPath(new URL("../src/", import.meta.url));
const token = "Abcdefghijkl1234567890";
const service = "mini-central-air-conditioner-cleaning";
const attribution = {
  utm_source: "google",
  utm_medium: "cpc",
  utm_campaign: "24326429732",
  utm_content: "829563936387",
  gclid: "synthetic_click_id",
};

function harness({ ageDays = 1, review = false, response, logFailure = false, secret = "synthetic_secret" } = {}) {
  const logs = [];
  const requests = [];
  const env = {
    VERCEL_ENV: review ? "preview" : "production",
    WHATSAPP_MINI_CENTRAL_PILOT_START_AT: new Date(Date.now() - ageDays * 86400000).toISOString(),
    CRM_WEBHOOK_SECRET: secret,
  };
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const javascript = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const module = { exports: {} };
    cache.set(path, module);
    function require(name) {
      if (name === "next/server") {
        return { NextResponse: { redirect: (url, status) => new Response(null, { status, headers: { Location: url } }) } };
      }
      const file = name.startsWith("@/") ? resolve(src, name.slice(2)) : resolve(dirname(path), name);
      return load(file.endsWith(".ts") ? file : file + ".ts");
    }
    function fakeFetch(url, options) {
      requests.push({ url, options });
      assert.equal(typeof response, "function", "Unexpected CRM request");
      return response();
    }
    const logger = {
      info(line) {
        if (logFailure) throw new Error("synthetic log sink unavailable");
        logs.push(line);
      },
    };
    new Function("require", "module", "exports", "process", "fetch", "console", javascript)(
      require, module, module.exports, { env }, fakeFetch, logger,
    );
    return module.exports;
  }
  const route = load(resolve(src, "app/api/whatsapp/pilot/route.ts"));
  return {
    logs, requests,
    run({ consent = "accepted", marker = attribution, headers, method = "GET" } = {}) {
      return route.GET({
        method,
        headers: new Headers(headers),
        nextUrl: new URL(`https://site.invalid/api/whatsapp/pilot?service=${service}`),
        cookies: {
          get(name) {
            if (name === "cb_analytics_consent") return consent ? { value: consent } : undefined;
            if (name === "cb_first_touch_attribution") return { value: encodeURIComponent(JSON.stringify(marker)) };
          },
        },
      });
    },
  };
}

function readObservation(logs) {
  assert.equal(logs.length, 1);
  const record = JSON.parse(logs[0]);
  assert.deepEqual(Object.keys(record).sort(), ["cohort", "event", "gate", "redirect", "token_request"]);
  assert.equal(record.event, "whatsapp_pilot_v1");
  assert.equal(record.redirect, "issued");
  return record;
}

const success = () => Response.json({ token });

test("a consented GCLID request returns the existing redirect and emits one category-only record", async () => {
  const testCase = harness({ response: success });
  const response = await testCase.run();
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.match(new URL(response.headers.get("location")).searchParams.get("text"), new RegExp(token));
  assert.equal(testCase.requests.length, 1);
  const upstream = JSON.parse(testCase.requests[0].options.body);
  assert.equal(upstream.marketingAttribution.gclid, attribution.gclid);
  assert.equal(upstream.marketingAttribution.google_ads_campaign_id, attribution.utm_campaign);
  assert.equal(upstream.consentSnapshot.adUserData, "granted");
  assert.deepEqual(readObservation(testCase.logs), {
    event: "whatsapp_pilot_v1", gate: "eligible", cohort: "mini_central", token_request: "issued", redirect: "issued",
  });
  for (const ignored of [token, attribution.gclid, attribution.utm_campaign, attribution.utm_content, "synthetic_secret", "wa.me"]) {
    assert.equal(testCase.logs[0].includes(ignored), false);
  }
});

test("consented campaign, time-window, and GCLID skips preserve the fallback", async () => {
  for (const [options, input, expected] of [
    [{}, { marker: { ...attribution, utm_content: "unapproved" } }, "campaign_not_approved"],
    [{ ageDays: 14 }, {}, "pilot_closed_or_disabled"],
    [{}, { marker: { ...attribution, gclid: "", gbraid: "synthetic_braid" } }, "gclid_missing_or_invalid"],
    [{}, { marker: { ...attribution, gclid: "not valid!" } }, "gclid_missing_or_invalid"],
  ]) {
    const testCase = harness(options);
    const response = await testCase.run(input);
    assert.equal(response.status, 307);
    assert.ok(!response.headers.get("location").includes(token));
    assert.equal(testCase.requests.length, 0);
    assert.equal(readObservation(testCase.logs).gate, expected);
    assert.equal(readObservation(testCase.logs).token_request, "not_attempted");
  }
});

test("declined and absent consent generate a redirect with no measurement and no token request", async () => {
  for (const consent of ["declined", "", "unknown"]) {
    const testCase = harness();
    const response = await testCase.run({ consent });
    assert.equal(response.status, 307);
    assert.ok(!response.headers.get("location").includes(token));
    assert.deepEqual(testCase.requests, []);
    assert.deepEqual(testCase.logs, []);
  }
});

test("preview, explicit prefetch, prerender and HEAD generate no measurement", async () => {
  const preview = harness({ review: true });
  assert.equal((await preview.run()).status, 403);
  assert.deepEqual(preview.logs, []);
  assert.deepEqual(preview.requests, []);
  for (const input of [
    { headers: { "sec-purpose": "prefetch;prerender" } },
    { headers: { purpose: "prefetch" } },
    { method: "HEAD" },
  ]) {
    const testCase = harness({ response: success });
    assert.equal((await testCase.run(input)).status, 307);
    assert.deepEqual(testCase.logs, []);
    assert.equal(testCase.requests.length, 1);
  }
});

test("request result categories preserve fallback without reattempting or delaying navigation", async () => {
  for (const [options, expected, attempts] of [
    [{ secret: "" }, "not_configured", 0],
    [{ response: () => new Response(null, { status: 401 }) }, "rejected", 1],
    [{ response: () => new Response(null, { status: 429 }) }, "http_failure", 1],
    [{ response: () => new Response(null, { status: 503 }) }, "http_failure", 1],
    [{ response: () => Response.json({ token: "malformed" }) }, "invalid_response", 1],
    [{ response: () => { throw new DOMException("synthetic", "TimeoutError"); } }, "timeout", 1],
    [{ response: () => { throw new Error("synthetic network error"); } }, "transport_failure", 1],
  ]) {
    const testCase = harness(options);
    const response = await testCase.run();
    assert.equal(response.status, 307);
    assert.ok(!response.headers.get("location").includes(token));
    assert.equal(testCase.requests.length, attempts);
    assert.equal(readObservation(testCase.logs).token_request, expected);
  }
});

test("failure of the log sink still returns the same token redirect", async () => {
  const testCase = harness({ response: success, logFailure: true });
  const response = await testCase.run();
  assert.equal(response.status, 307);
  assert.match(new URL(response.headers.get("location")).searchParams.get("text"), new RegExp(token));
  assert.equal(testCase.requests.length, 1);
});
