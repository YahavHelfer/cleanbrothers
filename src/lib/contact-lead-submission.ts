import type { ContactLeadOutcome } from "./contact-lead-contract";

export type ContactSubmissionAttempt = {
  submissionId: string;
  formRevision: number;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type LeadEventReporters = {
  reportGoogleAds: (transactionId: string, phone: string) => void;
  reportGoogleAnalytics: () => void;
  reportMeta: (eventId: string) => void;
  markReported: () => void;
};

const REPORTED_SUBMISSIONS_STORAGE_KEY =
  "cleanbrothers:reported-lead-submissions:v1";
const REPORTED_SUBMISSION_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_REPORTED_SUBMISSIONS = 20;

export function getOrCreateContactSubmissionAttempt(
  currentAttempt: ContactSubmissionAttempt | null,
  formRevision: number,
  createSubmissionId: () => string,
) {
  if (currentAttempt?.formRevision === formRevision) return currentAttempt;
  return {
    submissionId: createSubmissionId(),
    formRevision,
  };
}

function readReportedSubmissions(storage: StorageLike, now: number) {
  try {
    const value = JSON.parse(
      storage.getItem(REPORTED_SUBMISSIONS_STORAGE_KEY) || "{}",
    ) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(
          ([submissionId, reportedAt]) =>
            typeof reportedAt === "number" &&
            Number.isFinite(reportedAt) &&
            reportedAt <= now &&
            now - reportedAt <= REPORTED_SUBMISSION_TTL_MS &&
            /^[0-9a-f-]{36}$/i.test(submissionId),
        )
        .sort(([, left], [, right]) => (right as number) - (left as number))
        .slice(0, MAX_REPORTED_SUBMISSIONS),
    ) as Record<string, number>;
  } catch {
    return {};
  }
}

export function hasReportedContactSubmission(
  storage: StorageLike,
  submissionId: string,
  now = Date.now(),
) {
  return Boolean(readReportedSubmissions(storage, now)[submissionId]);
}

export function markContactSubmissionReported(
  storage: StorageLike,
  submissionId: string,
  now = Date.now(),
) {
  try {
    storage.setItem(
      REPORTED_SUBMISSIONS_STORAGE_KEY,
      JSON.stringify({
        ...readReportedSubmissions(storage, now),
        [submissionId]: now,
      }),
    );
  } catch {
    // The in-memory duplicate guard remains effective when storage is blocked.
  }
}

export function reportEligibleContactLeadEvents({
  outcome,
  phone,
  alreadyReported,
  reporters,
}: {
  outcome: ContactLeadOutcome;
  phone: string;
  alreadyReported: boolean;
  reporters: LeadEventReporters;
}) {
  if (
    !outcome.conversionEligible ||
    !outcome.conversionTransactionId ||
    alreadyReported
  ) {
    return false;
  }

  try {
    reporters.reportGoogleAds(outcome.conversionTransactionId, phone);
  } catch {
    // A provider failure must not turn a persisted CRM lead into a form failure.
  }
  try {
    reporters.reportGoogleAnalytics();
  } catch {
    // Continue attempting the remaining independent providers.
  }
  try {
    reporters.reportMeta(outcome.eventId);
  } catch {
    // The user-facing success state is independent of analytics availability.
  }
  try {
    reporters.markReported();
  } catch {
    // The in-memory caller guard still prevents duplicates in this component.
  }
  return true;
}
