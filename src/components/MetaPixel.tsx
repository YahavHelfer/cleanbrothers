"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  getStoredConsent,
  subscribeToConsentChanges,
  type ConsentChoice,
} from "@/lib/consent";
import {
  initializeMetaPixel,
  stopPendingMetaPixelInitialization,
  trackMetaPixelPageView,
} from "@/lib/meta-pixel";

type MetaPixelProps = {
  pixelId: string;
};

export function MetaPixel({ pixelId }: MetaPixelProps) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const pageViewReportedForConsentRef = useRef(false);
  const [consent, setConsent] = useState<ConsentChoice>("unknown");

  useEffect(() => {
    const hydrationTimeout = window.setTimeout(() => {
      setConsent(getStoredConsent());
    }, 0);
    const unsubscribe = subscribeToConsentChanges(setConsent);

    return () => {
      window.clearTimeout(hydrationTimeout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (consent === "rejected") {
      pageViewReportedForConsentRef.current = false;
      stopPendingMetaPixelInitialization();
      return;
    }

    if (
      consent !== "accepted" ||
      pageViewReportedForConsentRef.current ||
      !initializeMetaPixel(pixelId)
    ) {
      return;
    }

    pageViewReportedForConsentRef.current = true;
    trackMetaPixelPageView();
  }, [consent, pixelId]);

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }

    previousPathname.current = pathname;
    if (consent === "accepted") {
      trackMetaPixelPageView();
    }
  }, [consent, pathname]);

  return null;
}
