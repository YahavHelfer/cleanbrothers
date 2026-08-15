export type MarketingAttribution = Partial<
  Record<
    | "gclid"
    | "gbraid"
    | "wbraid"
    | "utm_source"
    | "utm_medium"
    | "utm_campaign"
    | "utm_content"
    | "utm_term"
    | "landing_page"
    | "referrer",
    string
  >
>;

export const ATTRIBUTION_COOKIE_NAME = "cb_first_touch_attribution";
export const CONSENT_COOKIE_NAME = "cb_analytics_consent";
export const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export const ATTRIBUTION_FIELD_LIMITS = {
  gclid: 220,
  gbraid: 220,
  wbraid: 220,
  utm_source: 120,
  utm_medium: 120,
  utm_campaign: 180,
  utm_content: 180,
  utm_term: 180,
  landing_page: 500,
  referrer: 500,
} as const;

export const CAMPAIGN_ATTRIBUTION_FIELDS = [
  "gclid",
  "gbraid",
  "wbraid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export function sanitizeMarketingAttribution(
  value: unknown,
): MarketingAttribution {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const output: MarketingAttribution = {};
  for (const [field, maxLength] of Object.entries(
    ATTRIBUTION_FIELD_LIMITS,
  ) as Array<
    [keyof typeof ATTRIBUTION_FIELD_LIMITS, number]
  >) {
    const raw = input[field];
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (trimmed) output[field] = trimmed.slice(0, maxLength);
  }
  return output;
}

export function isExternalAttributionReferrer(
  referrer: string | undefined,
  siteOrigin: string,
) {
  if (!referrer) return false;
  try {
    const referrerUrl = new URL(referrer);
    const siteUrl = new URL(siteOrigin);
    return (
      (referrerUrl.protocol === "http:" || referrerUrl.protocol === "https:") &&
      referrerUrl.origin !== siteUrl.origin
    );
  } catch {
    return false;
  }
}

export function hasMeaningfulAcquisitionEvidence(
  attribution: MarketingAttribution,
  siteOrigin: string,
) {
  return Boolean(
    CAMPAIGN_ATTRIBUTION_FIELDS.some((field) => attribution[field]) ||
      isExternalAttributionReferrer(attribution.referrer, siteOrigin),
  );
}

export function chooseFirstTouchAttribution(
  existingValue: unknown,
  candidateValue: unknown,
  siteOrigin: string,
) {
  const existing = sanitizeMarketingAttribution(existingValue);
  const candidate = sanitizeMarketingAttribution(candidateValue);
  if (hasMeaningfulAcquisitionEvidence(existing, siteOrigin)) return existing;
  if (hasMeaningfulAcquisitionEvidence(candidate, siteOrigin)) return candidate;
  return Object.keys(existing).length ? existing : candidate;
}
