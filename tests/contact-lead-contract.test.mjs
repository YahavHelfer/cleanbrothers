import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  isValidContactSubmissionId,
  parseContactLeadOutcome,
} from "../src/lib/contact-lead-contract.ts";
import {
  getOrCreateContactSubmissionAttempt,
  hasReportedContactSubmission,
  markContactSubmissionReported,
  reportEligibleContactLeadEvents,
} from "../src/lib/contact-lead-submission.ts";

const SUBMISSION_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_SUBMISSION_ID = "22222222-2222-4222-8222-222222222222";

function makeOutcome(overrides = {}) {
  return {
    status: "converted",
    leadId: "lead_synthetic",
    eventId: "event_synthetic",
    duplicate: false,
    created: true,
    conversionEligible: true,
    submissionId: SUBMISSION_ID,
    conversionTransactionId: SUBMISSION_ID,
    ...overrides,
  };
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

function readProjectSources(directoryUrl) {
  const sources = [];
  for (const entry of readdirSync(directoryUrl, { withFileTypes: true })) {
    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directoryUrl);
    if (entry.isDirectory()) {
      sources.push(...readProjectSources(entryUrl));
    } else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
      sources.push([entryUrl, readFileSync(entryUrl, "utf8")]);
    }
  }
  return sources;
}

function runEventReporting(outcome, alreadyReported = false, throwing = false) {
  const calls = [];
  const reporters = {
    reportGoogleAds(transactionId) {
      calls.push(["ads", transactionId]);
      if (throwing) throw new Error("synthetic ads failure");
    },
    reportGoogleAnalytics() {
      calls.push(["ga4"]);
      if (throwing) throw new Error("synthetic ga4 failure");
    },
    reportMeta(eventId) {
      calls.push(["meta", eventId]);
      if (throwing) throw new Error("synthetic meta failure");
    },
    markReported() {
      calls.push(["reported"]);
    },
  };
  const reported = reportEligibleContactLeadEvents({
    outcome,
    phone: "synthetic-input-not-retained",
    alreadyReported,
    reporters,
  });
  return { calls, reported };
}

test("CRM contract accepts converted and both duplicate_submission outcomes", () => {
  const outcomes = [
    makeOutcome(),
    makeOutcome({
      status: "duplicate_submission",
      duplicate: true,
      created: false,
    }),
    makeOutcome({
      status: "duplicate_submission",
      duplicate: true,
      created: false,
      conversionEligible: false,
      conversionTransactionId: null,
    }),
    makeOutcome({
      status: "duplicate_contact",
      duplicate: true,
      created: false,
      conversionEligible: false,
      conversionTransactionId: null,
    }),
  ];

  for (const outcome of outcomes) {
    assert.deepEqual(
      parseContactLeadOutcome(outcome, SUBMISSION_ID),
      outcome,
    );
  }
});

test("duplicate_submission rejects every inconsistent truth-table combination", () => {
  const invalidOutcomes = [
    makeOutcome({
      status: "duplicate_submission",
      duplicate: true,
      created: false,
      conversionTransactionId: null,
    }),
    makeOutcome({
      status: "duplicate_submission",
      duplicate: true,
      created: false,
      conversionTransactionId: OTHER_SUBMISSION_ID,
    }),
    makeOutcome({
      status: "duplicate_submission",
      duplicate: true,
      created: false,
      conversionEligible: false,
      conversionTransactionId: SUBMISSION_ID,
    }),
    makeOutcome({
      status: "duplicate_submission",
      duplicate: true,
      created: true,
    }),
    makeOutcome({
      status: "duplicate_submission",
      duplicate: false,
      created: false,
    }),
  ];

  for (const outcome of invalidOutcomes) {
    assert.equal(parseContactLeadOutcome(outcome, SUBMISSION_ID), null);
  }
});

test("malformed 2xx payload shapes fail closed", () => {
  const invalidOutcomes = [
    { ...makeOutcome(), eventId: undefined },
    { ...makeOutcome(), duplicate: undefined },
    { ...makeOutcome(), status: "unknown" },
    { ...makeOutcome(), created: "true" },
    { ...makeOutcome(), submissionId: OTHER_SUBMISSION_ID },
    { ...makeOutcome(), conversionTransactionId: null },
    {
      ...makeOutcome({
        status: "duplicate_contact",
        duplicate: true,
        created: false,
        conversionEligible: false,
      }),
      conversionTransactionId: SUBMISSION_ID,
    },
    {
      ...makeOutcome(),
      status: "duplicate_contact",
      duplicate: true,
      created: true,
    },
  ];

  for (const outcome of invalidOutcomes) {
    assert.equal(parseContactLeadOutcome(outcome, SUBMISSION_ID), null);
  }

  const route = readFileSync(
    new URL("../src/app/api/contact-lead/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    route,
    /if \(!outcome\)[\s\S]*NextResponse\.json\([\s\S]*status: 502/,
  );
});

test("submission IDs use UUID format and CRM transaction IDs must match them", () => {
  assert.equal(isValidContactSubmissionId(SUBMISSION_ID), true);
  assert.equal(isValidContactSubmissionId("not-a-uuid"), false);
  assert.equal(
    parseContactLeadOutcome(
      makeOutcome({ conversionTransactionId: OTHER_SUBMISSION_ID }),
      SUBMISSION_ID,
    ),
    null,
  );
});

test("new and unreported duplicate submissions emit all three events once", () => {
  for (const outcome of [
    makeOutcome(),
    makeOutcome({
      status: "duplicate_submission",
      duplicate: true,
      created: false,
    }),
  ]) {
    const first = runEventReporting(outcome);
    assert.equal(first.reported, true);
    assert.deepEqual(first.calls, [
      ["ads", SUBMISSION_ID],
      ["ga4"],
      ["meta", "event_synthetic"],
      ["reported"],
    ]);

    const repeated = runEventReporting(outcome, true);
    assert.equal(repeated.reported, false);
    assert.deepEqual(repeated.calls, []);
  }
});

test("duplicate contacts emit no Ads, GA4, or Meta lead event", () => {
  for (const status of ["duplicate_contact", "duplicate_submission"]) {
    const outcome = makeOutcome({
      status,
      duplicate: true,
      created: false,
      conversionEligible: false,
      conversionTransactionId: null,
    });
    assert.deepEqual(parseContactLeadOutcome(outcome, SUBMISSION_ID), outcome);

    const result = runEventReporting(outcome);
    assert.equal(result.reported, false);
    assert.deepEqual(result.calls, []);
  }
});

test("response-loss retry after duplicate_contact is accepted and reaches success without events", () => {
  const retryOutcome = makeOutcome({
    status: "duplicate_submission",
    duplicate: true,
    created: false,
    conversionEligible: false,
    conversionTransactionId: null,
  });
  assert.deepEqual(
    parseContactLeadOutcome(retryOutcome, SUBMISSION_ID),
    retryOutcome,
  );
  assert.deepEqual(runEventReporting(retryOutcome).calls, []);

  const form = readFileSync(
    new URL("../src/components/ContactForm.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    form,
    /parseContactLeadOutcome[\s\S]*reportEligibleContactLeadEvents[\s\S]*setSubmitted\(true\)[\s\S]*submissionAttemptRef\.current = null/,
  );
});

test("analytics provider failures never escape and every provider is attempted", () => {
  const result = runEventReporting(makeOutcome(), false, true);
  assert.equal(result.reported, true);
  assert.deepEqual(result.calls, [
    ["ads", SUBMISSION_ID],
    ["ga4"],
    ["meta", "event_synthetic"],
    ["reported"],
  ]);
});

test("network and 500 retries retain one logical submission ID", () => {
  let created = 0;
  const createId = () => {
    created += 1;
    return created === 1 ? SUBMISSION_ID : OTHER_SUBMISSION_ID;
  };
  const initial = getOrCreateContactSubmissionAttempt(null, 3, createId);
  const networkRetry = getOrCreateContactSubmissionAttempt(initial, 3, createId);
  const serverRetry = getOrCreateContactSubmissionAttempt(
    networkRetry,
    3,
    createId,
  );
  assert.equal(initial.submissionId, SUBMISSION_ID);
  assert.equal(networkRetry.submissionId, SUBMISSION_ID);
  assert.equal(serverRetry.submissionId, SUBMISSION_ID);
  assert.equal(created, 1);
});

test("a field revision or cleared successful attempt creates a new submission ID", () => {
  const initial = getOrCreateContactSubmissionAttempt(null, 1, () => SUBMISSION_ID);
  const changed = getOrCreateContactSubmissionAttempt(
    initial,
    2,
    () => OTHER_SUBMISSION_ID,
  );
  const afterSuccess = getOrCreateContactSubmissionAttempt(
    null,
    3,
    () => OTHER_SUBMISSION_ID,
  );
  assert.equal(changed.submissionId, OTHER_SUBMISSION_ID);
  assert.equal(afterSuccess.submissionId, OTHER_SUBMISSION_ID);
});

test("reported state stores only an opaque submission ID with a short TTL", () => {
  const storage = createMemoryStorage();
  const now = 1_000_000;
  markContactSubmissionReported(storage, SUBMISSION_ID, now);
  assert.equal(hasReportedContactSubmission(storage, SUBMISSION_ID, now), true);
  assert.equal(
    hasReportedContactSubmission(
      storage,
      SUBMISSION_ID,
      now + 7 * 60 * 60 * 1000,
    ),
    false,
  );
  const serialized = [...storage.getItem(
    "cleanbrothers:reported-lead-submissions:v1",
  )];
  assert.equal(serialized.length > 0, true);
  assert.doesNotMatch(serialized.join(""), /phone|name|city|message|service/i);
});

test("form source preserves double-click guard, retry ID, and success clearing", () => {
  const form = readFileSync(
    new URL("../src/components/ContactForm.tsx", import.meta.url),
    "utf8",
  );
  const route = readFileSync(
    new URL("../src/app/api/contact-lead/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(form, /if \(isSubmissionInFlightRef\.current\)[\s\S]*return/);
  assert.match(form, /submissionAttemptRef\.current = submissionAttempt/);
  assert.match(form, /body: JSON\.stringify\([\s\S]*submissionId/);
  assert.match(form, /submissionAttemptRef\.current = null/);
  assert.match(route, /hasSubmissionId[\s\S]*crypto\.randomUUID\(\)/);
  assert.match(
    route,
    /hasSubmissionId && !isValidContactSubmissionId\(data\.submissionId\)[\s\S]*status: 400/,
  );
  assert.match(route, /referenceId,/);
  assert.doesNotMatch(route, /extractStableLeadId|fallbackLeadId/);
  assert.doesNotMatch(form, /reportGoogleAdsLeadConversion\(leadId/);
  assert.match(form, /reportGoogleAds: reportGoogleAdsLeadConversion/);
});

test("one shared ContactForm owns every website lead POST", () => {
  const sources = readProjectSources(new URL("../src/", import.meta.url));
  const formOwners = sources.filter(([, source]) => source.includes("<form"));
  const leadPosters = sources.filter(([, source]) =>
    source.includes('fetch("/api/contact-lead"'),
  );
  assert.equal(formOwners.length, 1);
  assert.equal(leadPosters.length, 1);
  assert.match(formOwners[0][0].pathname, /ContactForm\.tsx$/);
  assert.match(leadPosters[0][0].pathname, /ContactForm\.tsx$/);
});

test("Meta receives the stable CRM event ID and logs expose no identifiers", () => {
  const form = readFileSync(
    new URL("../src/components/ContactForm.tsx", import.meta.url),
    "utf8",
  );
  const meta = readFileSync(
    new URL("../src/lib/meta-pixel.ts", import.meta.url),
    "utf8",
  );
  const route = readFileSync(
    new URL("../src/app/api/contact-lead/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(form, /trackMetaPixelEvent\("Lead", eventId\)/);
  assert.match(meta, /\{ eventID: eventId \}/);
  assert.doesNotMatch(
    route,
    /console\.(?:log|info|warn|error)\([^\n]*(?:leadId|eventId|submissionId|referenceId)/,
  );
});
