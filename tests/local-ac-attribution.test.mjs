import assert from "node:assert/strict";
import { test } from "node:test";
import { createSourceLoader, elementTree, plain } from "./helpers/source-module.mjs";

const origin = "https://local-ac-preview.invalid";
const syntheticCrm = "https://synthetic-crm.invalid/api/integrations/leads/website";
const syntheticSecret = "fixture-only-secret";
const utm = {
  utm_source: "google",
  utm_medium: "cpc",
  utm_campaign: "qa-local-ac",
  utm_content: "qa-creative",
  utm_term: "ניקוי מזגן",
};

function storage() {
  const values = new Map();
  return {
    setItem(key, value) { values.set(key, value); },
    getItem(key) { return values.get(key) ?? null; },
  };
}

function makeHarness({ city, slug, consent, fields, siteReview = false }) {
  const path = `/air-conditioner-cleaning/${slug}`;
  const location = new URL(`${origin}${path}?${new URLSearchParams(fields)}`);
  const jar = new Map();
  const document = {
    referrer: "",
    get cookie() { return [...jar].map(([key, value]) => `${key}=${value}`).join("; "); },
    set cookie(value) {
      const [pair, ...options] = value.split("; ");
      const equals = pair.indexOf("=");
      const name = pair.slice(0, equals);
      if (options.includes("Max-Age=0")) jar.delete(name);
      else jar.set(name, pair.slice(equals + 1));
    },
  };
  const window = {
    location,
    sessionStorage: storage(),
    localStorage: storage(),
    addEventListener() {},
    removeEventListener() {},
  };
  window.localStorage.setItem("cleanbrothers-cookie-consent", consent);

  const delivered = [];
  const reported = [];
  const loadServer = createSourceLoader({
    env: {
      CRM_LEAD_ENDPOINT: syntheticCrm,
      CRM_WEBHOOK_SECRET: syntheticSecret,
      SITE_REVIEW_MODE: siteReview ? "1" : "0",
    },
    async fetchImpl(url, init) {
      assert.equal(url, syntheticCrm);
      assert.equal(init.method, "POST");
      assert.equal(init.headers["x-webhook-secret"], syntheticSecret);
      const lead = JSON.parse(init.body);
      delivered.push(lead);
      return Response.json({
        status: "converted",
        leadId: "synthetic-lead",
        eventId: "synthetic-event",
        duplicate: false,
        created: true,
        conversionEligible: true,
        submissionId: lead.referenceId,
        conversionTransactionId: lead.referenceId,
      });
    },
  });
  const handler = loadServer("src/app/api/contact-lead/route.ts").POST;
  const states = [];
  const refs = [];
  let stateIndex = 0;
  let refIndex = 0;
  let formRequest;
  let formStatus;
  const loadBrowser = createSourceLoader({
    browser: { window, document },
    mocks: {
      react: {
        useEffect: effect => effect(),
        useState(initial) {
          const index = stateIndex++;
          if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
          return [states[index], value => {
            states[index] = typeof value === "function" ? value(states[index]) : value;
          }];
        },
        useRef(initial) {
          const index = refIndex++;
          refs[index] ??= { current: initial };
          return refs[index];
        },
      },
      "@/lib/google-ads": { reportGoogleAdsLeadConversion: () => reported.push("ads") },
      "@/lib/google-analytics": { trackGoogleAnalyticsEvent: () => reported.push("analytics") },
      "@/lib/meta-pixel": { trackMetaPixelEvent: () => reported.push("meta") },
    },
    async fetchImpl(url, init) {
      assert.equal(url, "/api/contact-lead");
      formRequest = JSON.parse(init.body);
      const response = await handler(new Request(origin + url, init));
      formStatus = response.status;
      return response;
    },
  });

  function renderForm() {
    stateIndex = 0;
    refIndex = 0;
    return loadBrowser("src/components/ContactForm.tsx").ContactForm({ initialService: "ניקוי מזגנים" });
  }

  async function submit() {
    const nodes = elementTree(renderForm());
    for (const [id, value] of Object.entries({ fullName: "Synthetic QA", phone: "0500000000", city })) {
      const input = nodes.find(node => node.props.id === id);
      assert.ok(input, id);
      input.props.onChange({ target: { value } });
    }
    await renderForm().props.onSubmit({ preventDefault() {} });
    assert.match(formRequest.message, new RegExp(path));
    return { formRequest, formStatus, delivered, reported };
  }

  return {
    capture() { loadBrowser("src/components/MarketingAttributionTracker.tsx").MarketingAttributionTracker(); },
    attribution: () => plain(loadBrowser("src/lib/marketing-attribution.ts").getStoredMarketingAttribution()),
    submit,
    path,
    location,
  };
}

for (const [slug, city, ids] of [
  ["petah-tikva", "פתח תקווה", { gclid: "qa_GCLID", gbraid: "qa_GBRAID", wbraid: "qa_WBRAID" }],
  ["rosh-haayin", "ראש העין", { gclid: "qa_GCLID" }],
  ["herzliya", "הרצליה", { gbraid: "qa_GBRAID" }],
  ["tel-aviv", "תל אביב", { wbraid: "qa_WBRAID" }],
]) {
  test(`${slug}: tracker, form and real handler deliver exact attribution to an isolated CRM fixture`, async () => {
    const fields = { ...utm, ...ids, google_ads_campaign_id: "123456" };
    const harness = makeHarness({ slug, city, fields, consent: "accepted" });
    harness.capture();
    const expected = { ...fields, landing_page: harness.path };
    assert.deepEqual(harness.attribution(), expected);

    harness.location.search = "?utm_source=overwritten";
    harness.capture();
    assert.deepEqual(harness.attribution(), expected);

    const { delivered, formRequest, formStatus, reported } = await harness.submit();
    assert.equal(formStatus, 200);
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].referenceId, formRequest.submissionId);
    assert.equal(delivered[0].city, city);
    assert.deepEqual(delivered[0].marketingAttribution, expected);
    assert.deepEqual(reported.sort(), ["ads", "analytics", "meta"]);
  });
}

for (const consent of ["rejected", "analytics", "marketing"]) {
  test(`consent ${consent}: the isolated CRM receives the form without marketing attribution`, async () => {
    const harness = makeHarness({
      slug: "petah-tikva", city: "פתח תקווה", fields: { ...utm, gclid: "qa_GCLID" }, consent,
    });
    harness.capture();
    assert.deepEqual(harness.attribution(), {});
    const { delivered, formStatus } = await harness.submit();
    assert.equal(formStatus, 200);
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].marketingAttribution, undefined);
  });
}

test("review server rejects even a populated synthetic attribution payload before the CRM transport", async () => {
  const harness = makeHarness({
    slug: "petah-tikva", city: "פתח תקווה", fields: { ...utm, gclid: "qa_GCLID" },
    consent: "accepted", siteReview: true,
  });
  harness.capture();
  const { formRequest, formStatus, delivered, reported } = await harness.submit();
  assert.equal(formRequest.marketingAttribution.gclid, "qa_GCLID");
  assert.equal(formStatus, 403);
  assert.deepEqual(delivered, []);
  assert.deepEqual(reported, []);
});
