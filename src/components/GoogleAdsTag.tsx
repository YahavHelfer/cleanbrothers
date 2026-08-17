"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";
import {
  getStoredConsent,
  hasAdStorageConsent,
  subscribeToConsentChanges,
} from "@/lib/consent";
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
      if (getStoredConsent() === "accepted") configureGoogleCallTracking();
    }, 0);
    const unsubscribe = subscribeToConsentChanges((choice) => {
      if (choice === "accepted") {
        configureGoogleCallTracking();
      } else {
        restoreOriginalGoogleCallNumbers(phoneConversionCssClass);
      }
    });

    return () => {
      window.clearTimeout(hydrationTimeout);
      unsubscribe();
    };
  }, [configureGoogleCallTracking, phoneConversionCssClass]);

  function configureGoogleAds() {
    googleTagLoadedRef.current = true;

    if (
      !window.__cleanBrothersGoogleAdsConfigured &&
      typeof window.gtag === "function"
    ) {
      window.__cleanBrothersGoogleAdsConfigured = true;
      window.gtag("js", new Date());
      window.gtag("config", adsId);
    }

    configureGoogleCallTracking();
  }

  return (
    <Script
      id="google-ads-gtag-loader"
      src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`}
      strategy="afterInteractive"
      onLoad={configureGoogleAds}
    />
  );
}
