"use client";

import { useEffect } from "react";
import {
  getStoredConsent,
  subscribeToConsentChanges,
  synchronizeConsentCookie,
} from "@/lib/consent";
import { captureFirstTouchMarketingAttribution } from "@/lib/marketing-attribution";

export function MarketingAttributionTracker() {
  useEffect(() => {
    const storedConsent = getStoredConsent();
    synchronizeConsentCookie(storedConsent);
    if (storedConsent === "accepted") {
      captureFirstTouchMarketingAttribution();
    }

    return subscribeToConsentChanges((choice) => {
      synchronizeConsentCookie(choice);
      if (choice === "accepted") {
        captureFirstTouchMarketingAttribution();
      }
    });
  }, []);

  return null;
}
