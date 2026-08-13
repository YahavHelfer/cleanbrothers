import { hasAnalyticsConsent } from "@/lib/consent";

export const GA4_MEASUREMENT_ID = "G-B0KGLSC7VG";

export type GoogleAnalyticsBusinessEvent =
  | "generate_lead"
  | "click_whatsapp"
  | "click_phone"
  | "promotion_popup_impression"
  | "promotion_popup_close"
  | "promotion_whatsapp_click";

const SAFE_PATHNAME_PATTERN = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?\/?$/;
const MAX_PATHNAME_LENGTH = 120;

function getSafePagePath() {
  const pathname = window.location.pathname;

  if (
    pathname.length > MAX_PATHNAME_LENGTH ||
    !SAFE_PATHNAME_PATTERN.test(pathname)
  ) {
    return "/";
  }

  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
}

export function trackGoogleAnalyticsEvent(
  eventName: GoogleAnalyticsBusinessEvent,
) {
  if (
    typeof window === "undefined" ||
    typeof window.gtag !== "function" ||
    !hasAnalyticsConsent()
  ) {
    return false;
  }

  if (eventName === "generate_lead") {
    try {
      window.gtag("event", eventName, {
        send_to: GA4_MEASUREMENT_ID,
        form_name: "contact_form",
      });
      return true;
    } catch {
      return false;
    }
  }

  if (eventName !== "click_whatsapp" && eventName !== "click_phone") {
    if (
      eventName !== "promotion_popup_impression" &&
      eventName !== "promotion_popup_close" &&
      eventName !== "promotion_whatsapp_click"
    ) {
      return false;
    }
  }

  try {
    window.gtag("event", eventName, {
      send_to: GA4_MEASUREMENT_ID,
      page_path: getSafePagePath(),
      ...(eventName.startsWith("promotion_")
        ? { promotion_name: "summer_ac_cleaning_2026" }
        : {}),
    });
    return true;
  } catch {
    return false;
  }
}
