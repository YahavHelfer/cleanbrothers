type GoogleAdsGtag = (
  command: "event",
  eventName: "conversion",
  parameters: {
    send_to: string;
  },
) => void;

declare global {
  interface Window {
    gtag?: GoogleAdsGtag;
  }
}

const GOOGLE_ADS_LEAD_CONVERSION_SEND_TO =
  "AW-18271875274/DNSiCK3vzcUcEMrh2ohE";

export function reportGoogleAdsLeadConversion() {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", "conversion", {
    send_to: GOOGLE_ADS_LEAD_CONVERSION_SEND_TO,
  });
}
