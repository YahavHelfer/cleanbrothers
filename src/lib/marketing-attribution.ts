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

const ATTRIBUTION_COOKIE_NAME = "cb_first_touch_attribution";
const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
const ATTRIBUTION_FIELDS = [
  "gclid",
  "gbraid",
  "wbraid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

function parseCookieValue(name: string) {
  if (typeof document === "undefined") {
    return "";
  }

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));

  return cookie ? cookie.slice(name.length + 1) : "";
}

function getCookieOptions() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";

  return `Path=/; Max-Age=${ATTRIBUTION_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

function normalizeStoredAttribution(value: unknown): MarketingAttribution {
  if (!value || typeof value !== "object") {
    return {};
  }

  const data = value as Record<string, unknown>;
  const attribution: MarketingAttribution = {};

  for (const field of [...ATTRIBUTION_FIELDS, "landing_page", "referrer"] as const) {
    const fieldValue = data[field];

    if (typeof fieldValue === "string" && fieldValue.trim()) {
      attribution[field] = fieldValue.trim();
    }
  }

  return attribution;
}

export function getStoredMarketingAttribution(): MarketingAttribution {
  const cookieValue = parseCookieValue(ATTRIBUTION_COOKIE_NAME);

  if (!cookieValue) {
    return {};
  }

  try {
    return normalizeStoredAttribution(
      JSON.parse(decodeURIComponent(cookieValue)),
    );
  } catch {
    return {};
  }
}

export function captureFirstTouchMarketingAttribution() {
  if (typeof window === "undefined") {
    return;
  }

  const existingAttribution = getStoredMarketingAttribution();

  if (Object.keys(existingAttribution).length > 0) {
    return;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const attribution: MarketingAttribution = {
    landing_page: window.location.pathname || "/",
  };

  for (const field of ATTRIBUTION_FIELDS) {
    const value = searchParams.get(field)?.trim();

    if (value) {
      attribution[field] = value;
    }
  }

  if (document.referrer) {
    attribution.referrer = document.referrer;
  }

  document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(attribution),
  )}; ${getCookieOptions()}`;
}
