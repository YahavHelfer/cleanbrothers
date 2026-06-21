type MetaPixelFunction = (
  action: "init" | "track",
  eventOrPixelId: string,
  parameters?: Record<string, unknown>,
) => void;

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
  }
}

export function trackMetaPixelEvent(eventName: string) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return;
  }

  window.fbq("track", eventName);
}

export function trackMetaPixelPageView() {
  trackMetaPixelEvent("PageView");
}
