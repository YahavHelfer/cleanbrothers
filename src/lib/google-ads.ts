import { hasAdUserDataConsent } from "@/lib/consent";

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

async function hashEnhancedConversionValue(value: string) {
  if (!window.crypto?.subtle) {
    return null;
  }

  const digest = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function fireGoogleAdsLeadConversion(
  gtag: NonNullable<Window["gtag"]>,
  transactionId: string,
  hashedPhone: string | null,
) {
  const canSendEnhancedConversion =
    Boolean(hashedPhone) && hasAdUserDataConsent();
  let enhancedConversionDataWasSet = false;

  if (canSendEnhancedConversion) {
    try {
      gtag("set", "user_data", {
        sha256_phone_number: hashedPhone,
      });
      enhancedConversionDataWasSet = true;
    } catch {
      // The Ads conversion must still be reported without enhanced data.
    }
  }

  try {
    gtag("event", "conversion", {
      send_to: GOOGLE_ADS_LEAD_CONVERSION_SEND_TO,
      transaction_id: transactionId,
    });
  } finally {
    if (enhancedConversionDataWasSet) {
      try {
        gtag("set", "user_data", {});
      } catch {
        // Do not expose or log user data when clearing fails unexpectedly.
      }
    }
  }
}

export function reportGoogleAdsLeadConversion(
  transactionId: string,
  phone: string,
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  const gtag = window.gtag;

  const normalizedTransactionId = transactionId.trim();

  if (!normalizedTransactionId) {
    return;
  }

  const normalizedPhone = normalizeIsraeliMobileForGoogleAds(phone);

  if (!normalizedPhone || !hasAdUserDataConsent()) {
    fireGoogleAdsLeadConversion(gtag, normalizedTransactionId, null);
    return;
  }

  void hashEnhancedConversionValue(normalizedPhone)
    .then(
      (hashedPhone) => {
        fireGoogleAdsLeadConversion(gtag, normalizedTransactionId, hashedPhone);
      },
      () => {
        fireGoogleAdsLeadConversion(gtag, normalizedTransactionId, null);
      },
    )
    .catch(() => undefined);
}
