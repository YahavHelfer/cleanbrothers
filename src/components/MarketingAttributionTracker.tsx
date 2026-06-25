"use client";

import { useEffect } from "react";
import { captureFirstTouchMarketingAttribution } from "@/lib/marketing-attribution";

export function MarketingAttributionTracker() {
  useEffect(() => {
    captureFirstTouchMarketingAttribution();
  }, []);

  return null;
}
