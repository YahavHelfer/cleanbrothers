"use client";

import { useEffect } from "react";
import { businessConfig } from "@/config/business";
import { trackGoogleAnalyticsEvent } from "@/lib/google-analytics";

function normalizeBusinessPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (/^05\d{8}$/.test(digits)) {
    return `972${digits.slice(1)}`;
  }

  return digits;
}

const CLEANBROTHERS_PHONE = normalizeBusinessPhone(businessConfig.phoneDisplay);
const CLEANBROTHERS_WHATSAPP_PHONE = normalizeBusinessPhone(
  businessConfig.whatsappPhone,
);

function isCleanBrothersWhatsAppLink(anchor: HTMLAnchorElement) {
  try {
    const destination = new URL(anchor.href, window.location.origin);

    return (
      destination.protocol === "https:" &&
      destination.hostname === "wa.me" &&
      normalizeBusinessPhone(destination.pathname) ===
        CLEANBROTHERS_WHATSAPP_PHONE
    );
  } catch {
    return false;
  }
}

function isCleanBrothersPhoneLink(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");

  return (
    href?.toLowerCase().startsWith("tel:") === true &&
    normalizeBusinessPhone(href.slice(4)) === CLEANBROTHERS_PHONE
  );
}

export function BusinessEventTracker() {
  useEffect(() => {
    const trackBusinessLink = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");

      if (!anchor) {
        return;
      }

      if (isCleanBrothersWhatsAppLink(anchor)) {
        trackGoogleAnalyticsEvent("click_whatsapp");
        return;
      }

      if (isCleanBrothersPhoneLink(anchor)) {
        trackGoogleAnalyticsEvent("click_phone");
      }
    };

    document.addEventListener("click", trackBusinessLink, {
      capture: true,
      passive: true,
    });

    return () =>
      document.removeEventListener("click", trackBusinessLink, {
        capture: true,
      });
  }, []);

  return null;
}
