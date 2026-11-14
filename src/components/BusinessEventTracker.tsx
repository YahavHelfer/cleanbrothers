"use client";

import { useEffect } from "react";
import { businessConfig } from "@/config/business";
import { trackGoogleAnalyticsEvent } from "@/lib/google-analytics";
import { getWhatsAppClickContext, prepareWhatsAppNavigation } from "@/lib/whatsapp-click-context";
import { getStoredMarketingAttribution } from "@/lib/marketing-attribution";

function normalizeBusinessPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (/^05\d{8}$/.test(digits)) {
    return `972${digits.slice(1)}`;
  }

  return digits;
}

const CLEANBROTHERS_PHONE = normalizeBusinessPhone(businessConfig.phoneDisplay);
const handledWhatsAppClicks = new WeakSet<Event>();
const CLEANBROTHERS_WHATSAPP_PHONE = normalizeBusinessPhone(
  businessConfig.whatsappPhone,
);

function isCleanBrothersWhatsAppLink(anchor: HTMLAnchorElement) {
  try {
    const destination = new URL(anchor.href, window.location.origin);

    return (
      (destination.origin === window.location.origin &&
        (destination.pathname === "/api/whatsapp" || destination.pathname === "/api/whatsapp/pilot")) ||
      (destination.protocol === "https:" &&
        destination.hostname === "wa.me" &&
        normalizeBusinessPhone(destination.pathname) ===
          CLEANBROTHERS_WHATSAPP_PHONE)
    );
  } catch {
    return false;
  }
}

function isCleanBrothersPhoneLink(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");

  if (!href?.toLowerCase().startsWith("tel:")) return false;

  const originalHref = anchor.dataset.googleCallOriginalHref ?? href;
  return normalizeBusinessPhone(originalHref.slice(4)) === CLEANBROTHERS_PHONE;
}

export function BusinessEventTracker() {
  useEffect(() => {
    const trackBusinessLink = (event: MouseEvent) => {
      if (event.type === "auxclick" && event.button !== 1) return;
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");

      if (!anchor) {
        return;
      }

      if (isCleanBrothersWhatsAppLink(anchor)) {
        if (handledWhatsAppClicks.has(event)) return;
        handledWhatsAppClicks.add(event);
        const attribution = getStoredMarketingAttribution();
        const context = getWhatsAppClickContext(
          anchor, window.location.pathname, attribution.utm_source,
        );
        prepareWhatsAppNavigation(anchor, context.service, attribution);
        trackGoogleAnalyticsEvent("click_whatsapp", context);
        return;
      }

      if (event.type === "click" && isCleanBrothersPhoneLink(anchor)) {
        trackGoogleAnalyticsEvent("click_phone");
      }
    };

    document.addEventListener("click", trackBusinessLink, {
      capture: true,
      passive: true,
    });
    document.addEventListener("auxclick", trackBusinessLink, { capture: true, passive: true });

    return () => {
      document.removeEventListener("click", trackBusinessLink, {
        capture: true,
      });
      document.removeEventListener("auxclick", trackBusinessLink, { capture: true });
    };
  }, []);

  return null;
}
