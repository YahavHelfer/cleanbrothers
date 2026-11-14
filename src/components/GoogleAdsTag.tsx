"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getStoredConsent,
  hasAnalyticsConsent,
  type ConsentChoice,
  hasAdStorageConsent,
  subscribeToConsentChanges,
} from "@/lib/consent";
import { GA4_MEASUREMENT_ID } from "@/lib/google-analytics";
import {
  receiveGoogleCallConversion,
  restoreOriginalGoogleCallNumbers,
  resumeGoogleCallConversion,
} from "@/lib/google-call-tracking";

declare global {
  interface Window {
    __cleanBrothersGoogleAdsConfigured?: boolean;
    __cleanBrothersGoogleCallTrackingConfigured?: boolean;
  }
}

type GoogleAdsTagProps = {
  adsId: string;
  phoneConversionId: string;
  phoneConversionNumber: string;
  phoneConversionCssClass: string;
};

export function GoogleAdsTag({
  adsId,
  phoneConversionId,
  phoneConversionNumber,
  phoneConversionCssClass,
}: GoogleAdsTagProps) {
  const googleTagLoadedRef = useRef(false);
  const initialized = useRef(false);
  const [consent, setConsent] = useState<ConsentChoice>("unknown");
  const [loaderId, setLoaderId] = useState<string | null>(null);
  const gaConfigured = useRef(false);

  const configureGoogleCallTracking = useCallback(() => {
    if (!googleTagLoadedRef.current || !hasAdStorageConsent()) return;

    if (window.__cleanBrothersGoogleCallTrackingConfigured) {
      resumeGoogleCallConversion(phoneConversionCssClass);
      return;
    }

    if (typeof window.gtag !== "function") return;

    window.__cleanBrothersGoogleCallTrackingConfigured = true;
    window.gtag("config", phoneConversionId, {
      phone_conversion_number: phoneConversionNumber,
      phone_conversion_css_class: phoneConversionCssClass,
      phone_conversion_callback: (
        formattedNumber: unknown,
        mobileNumber: unknown,
      ) => {
        receiveGoogleCallConversion(
          String(formattedNumber),
          String(mobileNumber),
          phoneConversionNumber,
          phoneConversionCssClass,
        );
      },
    });
  }, [
    phoneConversionCssClass,
    phoneConversionId,
    phoneConversionNumber,
  ]);

  useEffect(() => {
    const hydrationTimeout = window.setTimeout(() => {
      const stored = getStoredConsent();
      setConsent(stored);
      if (stored !== "unknown" && stored !== "rejected")
        setLoaderId(id => id ?? (stored === "analytics" ? GA4_MEASUREMENT_ID : adsId));
      if (hasAdStorageConsent()) configureGoogleCallTracking();
    }, 0);
    const unsubscribe = subscribeToConsentChanges((choice) => {
      setConsent(choice);
      if (choice !== "unknown" && choice !== "rejected")
        setLoaderId(id => id ?? (choice === "analytics" ? GA4_MEASUREMENT_ID : adsId));
      if (googleTagLoadedRef.current && window.gtag) {
        if (hasAnalyticsConsent() && !gaConfigured.current) {
          gaConfigured.current = true; window.gtag("config", GA4_MEASUREMENT_ID);
        }
        if (hasAdStorageConsent() && !window.__cleanBrothersGoogleAdsConfigured) {
          window.__cleanBrothersGoogleAdsConfigured = true; window.gtag("config", adsId);
        }
      }
      if (choice === "accepted" || choice === "marketing") {
        configureGoogleCallTracking();
      } else {
        restoreOriginalGoogleCallNumbers(phoneConversionCssClass);
      }
    });

    return () => {
      window.clearTimeout(hydrationTimeout);
      unsubscribe();
    };
  }, [adsId, configureGoogleCallTracking, phoneConversionCssClass]);

  function configureGoogleAds() {
    googleTagLoadedRef.current = true;
    if (!hasAnalyticsConsent() && !hasAdStorageConsent()) return;
    if (!initialized.current && window.gtag) {
      initialized.current = true; window.gtag("js", new Date());
    }

    if (
      hasAdStorageConsent() && !window.__cleanBrothersGoogleAdsConfigured &&
      typeof window.gtag === "function"
    ) {
      window.__cleanBrothersGoogleAdsConfigured = true;
      window.gtag("config", adsId);
    }

    if (hasAnalyticsConsent() && !gaConfigured.current && window.gtag) {
      gaConfigured.current = true;
      window.gtag("config", GA4_MEASUREMENT_ID);
    }
    configureGoogleCallTracking();
  }

  if (!loaderId || consent === "unknown" || consent === "rejected") return null;
  return (
    <Script
      id="google-ads-gtag-loader"
      src={`https://www.googletagmanager.com/gtag/js?id=${loaderId}`}
      strategy="afterInteractive"
      onLoad={configureGoogleAds}
      onReady={configureGoogleAds}
    />
  );
}
