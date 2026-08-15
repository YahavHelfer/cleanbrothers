import { hasAnalyticsConsent } from "@/lib/consent";
import {
  ATTRIBUTION_COOKIE_NAME,
  ATTRIBUTION_MAX_AGE_SECONDS,
  CAMPAIGN_ATTRIBUTION_FIELDS,
  chooseFirstTouchAttribution,
  sanitizeMarketingAttribution,
  type MarketingAttribution,
} from "@/lib/marketing-attribution-shared";

export type { MarketingAttribution } from "@/lib/marketing-attribution-shared";

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

export function getStoredMarketingAttribution(): MarketingAttribution {
  if (!hasAnalyticsConsent()) {
    return {};
  }

  const cookieValue = parseCookieValue(ATTRIBUTION_COOKIE_NAME);

  if (!cookieValue) {
    return {};
  }

  try {
    return sanitizeMarketingAttribution(
      JSON.parse(decodeURIComponent(cookieValue)),
    );
  } catch {
    return {};
  }
}

export function captureFirstTouchMarketingAttribution() {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) {
    return;
  }

  const existingAttribution = getStoredMarketingAttribution();

  const searchParams = new URLSearchParams(window.location.search);
  const attribution: MarketingAttribution = {
    landing_page: window.location.pathname || "/",
  };

  for (const field of CAMPAIGN_ATTRIBUTION_FIELDS) {
    const value = searchParams.get(field)?.trim();

    if (value) {
      attribution[field] = value;
    }
  }

  if (document.referrer) {
    attribution.referrer = document.referrer;
  }

  const selectedAttribution = chooseFirstTouchAttribution(
    existingAttribution,
    attribution,
    window.location.origin,
  );

  if (
    JSON.stringify(selectedAttribution) === JSON.stringify(existingAttribution)
  ) {
    return;
  }

  document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(selectedAttribution),
  )}; ${getCookieOptions()}`;
}
