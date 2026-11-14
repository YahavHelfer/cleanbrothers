import { buildDirectWhatsAppLink } from "./whatsapp";
import { getWhatsAppPilotHref } from "./whatsapp-measurement-pilot";
import { getWhatsAppNavigationMessage, isWhatsAppService, resolveWhatsAppService } from "./whatsapp-messages";

export const whatsappButtonLocations = ["header", "footer", "floating", "hero", "promotion", "quote", "sticky", "contact", "content"] as const;
export const campaignSources = ["google", "facebook", "instagram", "meta", "bing", "tiktok", "email"] as const;
export type WhatsAppClickContext = {
  service?: string;
  button_location?: string;
  device_type?: string;
  campaign_source?: string;
};
export function sanitizeWhatsAppClickContext(context: WhatsAppClickContext = {}) {
  return {
    service: isWhatsAppService(context.service) ? context.service : "general",
    button_location: whatsappButtonLocations.find(value => value === context.button_location) ?? "content",
    device_type: ["mobile", "tablet", "desktop"].find(value => value === context.device_type) ?? "desktop",
    ...(campaignSources.some(value => value === context.campaign_source) ? { campaign_source: context.campaign_source } : {}),
  };
}
export function getWhatsAppClickContext(anchor: HTMLAnchorElement, pathname: string, source?: string): WhatsAppClickContext {
  const destination = new URL(anchor.href);
  const explicit = anchor.dataset.whatsappService;
  const linkedService = destination.searchParams.get("service");
  const location = anchor.dataset.whatsappLocation
    || (anchor.closest("header") ? "header"
      : anchor.closest("footer") ? "footer"
      : anchor.closest('[role="dialog"]') ? "promotion"
      : anchor.closest("#contact-form") ? "contact"
      : anchor.closest("main") ? (anchor.closest("section") === document.querySelector("main section") ? "hero" : "content")
      : "floating");
  return sanitizeWhatsAppClickContext({
    service: isWhatsAppService(explicit) ? explicit : isWhatsAppService(linkedService) && linkedService !== "general" ? linkedService : resolveWhatsAppService(pathname, destination.searchParams.get("message") ?? destination.searchParams.get("text") ?? ""),
    button_location: location,
    device_type: window.matchMedia("(max-width: 767px)").matches ? "mobile" : window.matchMedia("(max-width: 1023px)").matches ? "tablet" : "desktop",
    campaign_source: source?.toLowerCase(),
  });
}

// Preserve native link navigation (including new tabs); no awaited request or window.open.
export function prepareWhatsAppNavigation(anchor: HTMLAnchorElement, service: unknown, attribution: { utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string } = {}) {
  const destination = new URL(anchor.href);
  const legacy = destination.origin === window.location.origin && (destination.pathname === "/api/whatsapp" || destination.pathname === "/api/whatsapp/pilot");
  const direct = destination.protocol === "https:" && destination.hostname === "wa.me";
  if ((!legacy && !direct) || !isWhatsAppService(service)) return;
  anchor.href = getWhatsAppPilotHref(service, attribution) ?? buildDirectWhatsAppLink(getWhatsAppNavigationMessage(service, attribution));
}
