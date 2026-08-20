import { hasAdStorageConsent } from "@/lib/consent";

type MetaPixelFunction = (
  action: "init" | "track",
  eventOrPixelId: string,
  parameters?: Record<string, unknown>,
  options?: { eventID?: string },
) => void;

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
    _fbq?: MetaPixelFunction;
    __cleanBrothersMetaPixelId?: string;
  }
}

export function initializeMetaPixel(pixelId: string) {
  if (
    typeof window === "undefined" ||
    !pixelId ||
    !hasAdStorageConsent()
  ) {
    return false;
  }

  if (typeof window.fbq !== "function") {
    const fbq = function (...args: Parameters<MetaPixelFunction>) {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue.push(args);
      }
    } as MetaPixelFunction & {
      callMethod?: MetaPixelFunction;
      queue: Parameters<MetaPixelFunction>[];
      loaded: boolean;
      push: MetaPixelFunction;
      version: string;
    };

    fbq.queue = [];
    fbq.loaded = true;
    fbq.push = fbq;
    fbq.version = "2.0";
    window.fbq = fbq;
    window._fbq = fbq;
  }

  if (!document.getElementById("meta-pixel")) {
    const script = document.createElement("script");
    script.id = "meta-pixel";
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  if (!window.__cleanBrothersMetaPixelId) {
    window.fbq("init", pixelId);
    window.__cleanBrothersMetaPixelId = pixelId;
  }

  return true;
}

export function stopPendingMetaPixelInitialization() {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return;
  }

  const fbq = window.fbq as MetaPixelFunction & {
    callMethod?: MetaPixelFunction;
    queue?: Parameters<MetaPixelFunction>[];
  };

  if (!fbq.callMethod && Array.isArray(fbq.queue)) {
    fbq.queue.length = 0;
    window.__cleanBrothersMetaPixelId = undefined;
  }
}

export function trackMetaPixelEvent(eventName: string, eventId?: string) {
  if (
    typeof window === "undefined" ||
    typeof window.fbq !== "function" ||
    !hasAdStorageConsent()
  ) {
    return;
  }

  if (eventId) {
    window.fbq("track", eventName, {}, { eventID: eventId });
    return;
  }

  window.fbq("track", eventName);
}

export function trackMetaPixelPageView() {
  trackMetaPixelEvent("PageView");
}
