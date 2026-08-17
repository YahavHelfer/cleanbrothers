import { hasAdStorageConsent } from "@/lib/consent";

export const GOOGLE_CALL_CONVERSION_NUMBER_CLASS =
  "google-call-conversion-number";

type GoogleCallTrackingState = {
  formattedNumber: string;
  mobileNumber: string;
  originalNumber: string;
  observer?: MutationObserver;
};

declare global {
  interface Window {
    __cleanBrothersGoogleCallTracking?: GoogleCallTrackingState;
  }
}

function isValidForwardingNumber(value: string) {
  return /^\+?[\d\s().-]+$/.test(value) && /\d/.test(value);
}

function updateTrackedNumbers(
  cssClass: string,
  formattedNumber: string,
  mobileNumber: string,
  originalNumber: string,
) {
  for (const element of document.getElementsByClassName(cssClass)) {
    const trackedNumber = element as HTMLElement;
    if (trackedNumber.textContent !== formattedNumber) {
      trackedNumber.textContent = formattedNumber;
    }
  }

  const originalDigits = originalNumber.replace(/\D/g, "");
  for (const phoneLink of document.querySelectorAll<HTMLAnchorElement>(
    'a[href^="tel:"]',
  )) {
    const currentHref = phoneLink.getAttribute("href") || "";
    if (
      !phoneLink.dataset.googleCallOriginalHref &&
      currentHref.replace(/\D/g, "") !== originalDigits
    ) {
      continue;
    }

    if (!phoneLink.dataset.googleCallOriginalHref) {
      phoneLink.dataset.googleCallOriginalHref = currentHref;
    }
    const forwardingHref = `tel:${mobileNumber}`;
    if (phoneLink.getAttribute("href") !== forwardingHref) {
      phoneLink.setAttribute("href", forwardingHref);
    }
  }
}

function observeLateRenderedNumbers(cssClass: string) {
  const state = window.__cleanBrothersGoogleCallTracking;
  if (!state || state.observer || !document.body) return;

  state.observer = new MutationObserver(() => {
    const currentState = window.__cleanBrothersGoogleCallTracking;
    if (!currentState || !hasAdStorageConsent()) return;

    updateTrackedNumbers(
      cssClass,
      currentState.formattedNumber,
      currentState.mobileNumber,
      currentState.originalNumber,
    );
  });
  state.observer.observe(document.body, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

export function receiveGoogleCallConversion(
  formattedNumber: string,
  mobileNumber: string,
  originalNumber: string,
  cssClass = GOOGLE_CALL_CONVERSION_NUMBER_CLASS,
) {
  const formatted = formattedNumber.trim();
  const mobile = mobileNumber.trim();
  const original = originalNumber.trim();
  if (
    !formatted ||
    !mobile ||
    !original ||
    !isValidForwardingNumber(formatted) ||
    !isValidForwardingNumber(mobile) ||
    !isValidForwardingNumber(original)
  ) {
    return false;
  }

  window.__cleanBrothersGoogleCallTracking = {
    formattedNumber: formatted,
    mobileNumber: mobile,
    originalNumber: original,
  };

  if (!hasAdStorageConsent()) {
    restoreOriginalGoogleCallNumbers(cssClass);
    return false;
  }

  updateTrackedNumbers(cssClass, formatted, mobile, original);
  observeLateRenderedNumbers(cssClass);
  return true;
}

export function resumeGoogleCallConversion(
  cssClass = GOOGLE_CALL_CONVERSION_NUMBER_CLASS,
) {
  const state = window.__cleanBrothersGoogleCallTracking;
  if (!state || !hasAdStorageConsent()) return false;

  updateTrackedNumbers(
    cssClass,
    state.formattedNumber,
    state.mobileNumber,
    state.originalNumber,
  );
  observeLateRenderedNumbers(cssClass);
  return true;
}

export function restoreOriginalGoogleCallNumbers(
  cssClass = GOOGLE_CALL_CONVERSION_NUMBER_CLASS,
) {
  const state = window.__cleanBrothersGoogleCallTracking;
  state?.observer?.disconnect();
  if (state) state.observer = undefined;

  for (const element of document.getElementsByClassName(cssClass)) {
    const trackedNumber = element as HTMLElement;
    const originalNumber = trackedNumber.dataset.googleCallOriginalNumber;
    if (originalNumber) trackedNumber.textContent = originalNumber;
  }

  for (const phoneLink of document.querySelectorAll<HTMLAnchorElement>(
    "a[data-google-call-original-href]",
  )) {
    const originalHref = phoneLink.dataset.googleCallOriginalHref;
    if (originalHref) {
      phoneLink.setAttribute("href", originalHref);
      delete phoneLink.dataset.googleCallOriginalHref;
    }
  }
}
