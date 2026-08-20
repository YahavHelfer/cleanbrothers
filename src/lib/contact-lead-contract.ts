export const CONTACT_LEAD_STATUSES = [
  "converted",
  "duplicate_submission",
  "duplicate_contact",
] as const;

export type ContactLeadStatus = (typeof CONTACT_LEAD_STATUSES)[number];

export type ContactLeadOutcome = {
  status: ContactLeadStatus;
  leadId: string;
  eventId: string;
  duplicate: boolean;
  created: boolean;
  conversionEligible: boolean;
  submissionId: string;
  conversionTransactionId: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;

export function isValidContactSubmissionId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isValidOpaqueIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" && OPAQUE_IDENTIFIER_PATTERN.test(value)
  );
}

function hasExpectedStatusSemantics(
  status: ContactLeadStatus,
  duplicate: boolean,
  created: boolean,
  conversionEligible: boolean,
) {
  if (status === "converted") {
    return !duplicate && created && conversionEligible;
  }
  if (status === "duplicate_submission") {
    return duplicate && !created;
  }
  return duplicate && !created && !conversionEligible;
}

export function parseContactLeadOutcome(
  value: unknown,
  expectedSubmissionId: string,
): ContactLeadOutcome | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !isValidContactSubmissionId(expectedSubmissionId)
  ) {
    return null;
  }

  const data = value as Record<string, unknown>;
  if (
    !CONTACT_LEAD_STATUSES.includes(data.status as ContactLeadStatus) ||
    !isValidOpaqueIdentifier(data.leadId) ||
    !isValidOpaqueIdentifier(data.eventId) ||
    typeof data.duplicate !== "boolean" ||
    typeof data.created !== "boolean" ||
    typeof data.conversionEligible !== "boolean" ||
    data.submissionId !== expectedSubmissionId ||
    !isValidContactSubmissionId(data.submissionId)
  ) {
    return null;
  }

  const status = data.status as ContactLeadStatus;
  if (
    !hasExpectedStatusSemantics(
      status,
      data.duplicate,
      data.created,
      data.conversionEligible,
    )
  ) {
    return null;
  }

  if (data.conversionEligible) {
    if (
      !isValidContactSubmissionId(data.conversionTransactionId) ||
      data.conversionTransactionId !== expectedSubmissionId
    ) {
      return null;
    }
  } else if (data.conversionTransactionId !== null) {
    return null;
  }

  return {
    status,
    leadId: data.leadId,
    eventId: data.eventId,
    duplicate: data.duplicate,
    created: data.created,
    conversionEligible: data.conversionEligible,
    submissionId: data.submissionId,
    conversionTransactionId: data.conversionTransactionId as string | null,
  };
}
