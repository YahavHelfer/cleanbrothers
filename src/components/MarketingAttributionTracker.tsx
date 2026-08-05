"use client";

import { useEffect } from "react";
import {
  getStoredConsent,
  subscribeToConsentChanges,
} from "@/lib/consent";
import { captureFirstTouchMarketingAttribution } from "@/lib/marketing-attribution";

export function MarketingAttributionTracker() {
  useEffect(() => {
    if (getStoredConsent() === "accepted") {
      captureFirstTouchMarketingAttribution();
    }

    return subscribeToConsentChanges((choice) => {
      if (choice === "accepted") {
        captureFirstTouchMarketingAttribution();
      }
    });
  }, []);

  return null;
}
