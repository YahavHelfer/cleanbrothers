export type ConsentChoice = "unknown" | "accepted" | "rejected";

export type GoogleConsentState = {
  analytics_storage: "granted" | "denied";
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
};

export const CONSENT_STORAGE_KEY = "cleanbrothers-cookie-consent";
export const CONSENT_CHANGE_EVENT = "cleanbrothers:consent-change";
export const CONSENT_PREFERENCES_EVENT = "cleanbrothers:open-consent-preferences";

const DENIED_CONSENT: GoogleConsentState = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};

const GRANTED_CONSENT: GoogleConsentState = {
  analytics_storage: "granted",
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
};

let currentPageConsent: ConsentChoice = "unknown";

type GoogleTagFunction = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: GoogleTagFunction;
  }
}

export function parseStoredConsentValue(value: string | null): ConsentChoice {
  if (value === "accepted" || value === "yes" || value === "approved") {
    return "accepted";
  }

  if (value === "rejected" || value === "no") {
    return "rejected";
  }

  return "unknown";
}

export function getConsentState(choice: ConsentChoice): GoogleConsentState {
  return choice === "accepted" ? GRANTED_CONSENT : DENIED_CONSENT;
}

export function getStoredConsent(): ConsentChoice {
  if (typeof window === "undefined") {
    return "unknown";
  }

  if (currentPageConsent !== "unknown") {
    return currentPageConsent;
  }

  try {
    currentPageConsent = parseStoredConsentValue(
      window.localStorage.getItem(CONSENT_STORAGE_KEY),
    );
    return currentPageConsent;
  } catch {
    return "unknown";
  }
}

export function hasAnalyticsConsent() {
  return getStoredConsent() === "accepted";
}

export function hasAdStorageConsent() {
  return getStoredConsent() === "accepted";
}

export function hasAdUserDataConsent() {
  return getStoredConsent() === "accepted";
}

export function updateConsent(choice: Exclude<ConsentChoice, "unknown">) {
  if (typeof window === "undefined") {
    return;
  }

  currentPageConsent = choice;

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Consent still applies for the current page even if storage is unavailable.
  }

  try {
    window.gtag?.("consent", "update", getConsentState(choice));
  } finally {
    window.dispatchEvent(
      new CustomEvent<ConsentChoice>(CONSENT_CHANGE_EVENT, { detail: choice }),
    );
  }
}

export function subscribeToConsentChanges(
  listener: (choice: ConsentChoice) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleConsentChange = (event: Event) => {
    listener((event as CustomEvent<ConsentChoice>).detail);
  };
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === CONSENT_STORAGE_KEY) {
      currentPageConsent = parseStoredConsentValue(event.newValue);
      listener(currentPageConsent);
    }
  };

  window.addEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

export function requestConsentPreferences() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CONSENT_PREFERENCES_EVENT));
  }
}

export function subscribeToConsentPreferenceRequests(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(CONSENT_PREFERENCES_EVENT, listener);
  return () => window.removeEventListener(CONSENT_PREFERENCES_EVENT, listener);
}

export function getGoogleConsentBootstrapScript() {
  const storageKey = JSON.stringify(CONSENT_STORAGE_KEY);

  return `
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500
    });
    try {
      var storedConsent = window.localStorage.getItem(${storageKey});
      var acceptedConsent = storedConsent === 'accepted' || storedConsent === 'yes' || storedConsent === 'approved';
      var rejectedConsent = storedConsent === 'rejected' || storedConsent === 'no';
      if (acceptedConsent || rejectedConsent) {
        var consentValue = acceptedConsent ? 'granted' : 'denied';
        window.gtag('consent', 'update', {
          analytics_storage: consentValue,
          ad_storage: consentValue,
          ad_user_data: consentValue,
          ad_personalization: consentValue
        });
      }
    } catch (error) {
      // Keep the denied defaults when browser storage is unavailable.
    }
  `;
}
