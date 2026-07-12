type GoogleAdsGtag = {
  (
    command: "set",
    target: "user_data",
    parameters: {
      phone_number: string;
    },
  ): void;
  (
    command: "event",
    eventName: "conversion",
    parameters: {
      send_to: string;
      transaction_id: string;
    },
  ): void;
};

declare global {
  interface Window {
    gtag?: GoogleAdsGtag;
  }
}

const GOOGLE_ADS_LEAD_CONVERSION_SEND_TO =
  "AW-18271875274/DNSiCK3vzcUcEMrh2ohE";

export function normalizeIsraeliMobileForGoogleAds(phone: string) {
  const trimmedPhone = phone.trim();

  if (!/^[\d+\s().,\-/]+$/.test(trimmedPhone)) {
    return null;
  }

  const compactPhone = trimmedPhone.replace(/[\s().,\-/]/g, "");

  if (/^05\d{8}$/.test(compactPhone)) {
    return `+972${compactPhone.slice(1)}`;
  }

  if (/^\+9725\d{8}$/.test(compactPhone)) {
    return compactPhone;
  }

  return null;
}

export function reportGoogleAdsLeadConversion(
  transactionId: string,
  phone: string,
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  const normalizedTransactionId = transactionId.trim();

  if (!normalizedTransactionId) {
    return;
  }

  const normalizedPhone = normalizeIsraeliMobileForGoogleAds(phone);

  if (normalizedPhone) {
    window.gtag("set", "user_data", {
      phone_number: normalizedPhone,
    });
  }

  window.gtag("event", "conversion", {
    send_to: GOOGLE_ADS_LEAD_CONVERSION_SEND_TO,
    transaction_id: normalizedTransactionId,
  });
}
