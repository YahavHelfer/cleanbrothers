import { buildConsentSnapshotFromCookie, type ConsentSnapshot } from "./consent.ts";
import { appendWhatsAppAttributionMarker } from "./whatsapp-attribution.ts";
import type { MarketingAttribution } from "./marketing-attribution-shared.ts";

export const WHATSAPP_PILOT = {
  campaign: "23984473561",
  content: "cb_wa_site_pilot_ac_829688140730",
  service: "air-conditioner-cleaning",
} as const;

export function isWhatsAppPilotWindowOpen(env: Record<string, string | undefined>, now = Date.now()) {
  const start = Date.parse(env.WHATSAPP_ATTRIBUTION_PILOT_START_AT ?? "");
  const end = Date.parse(env.WHATSAPP_ATTRIBUTION_PILOT_END_AT ?? "");
  return env.WHATSAPP_ATTRIBUTION_PILOT_ENABLED === "1" &&
    Number.isFinite(start) && Number.isFinite(end) &&
    end > start && end - start <= 14 * 86400000 && now >= start && now < end;
}

export function isWhatsAppPilotAttribution(service: unknown, attribution: MarketingAttribution) {
  return service === WHATSAPP_PILOT.service && attribution.utm_source === "google" &&
    attribution.utm_medium === "cpc" && attribution.utm_campaign === WHATSAPP_PILOT.campaign &&
    attribution.utm_content === WHATSAPP_PILOT.content;
}

export function getWhatsAppPilotHref(service: unknown, attribution: MarketingAttribution) {
  if (!isWhatsAppPilotAttribution(service, attribution)) return null;
  return `/api/whatsapp/pilot?service=${encodeURIComponent(WHATSAPP_PILOT.service)}`;
}

export async function buildWhatsAppPilotMessage({
  enabled, service, attribution, consent, humanMessage, requestToken,
}: {
  enabled: boolean;
  service: unknown;
  attribution: MarketingAttribution;
  consent: string | undefined;
  humanMessage: string;
  requestToken: (attribution: MarketingAttribution, snapshot: ConsentSnapshot) => Promise<string | null>;
}) {
  // A UTM label is a cohort marker, never proof that a Google click occurred.
  // Initial pilot requires a present GCLID; its real validity is checked by Google.
  if (!enabled || !isWhatsAppPilotAttribution(service, attribution) ||
      !attribution.gclid || !/^[A-Za-z0-9_-]{1,220}$/.test(attribution.gclid)) return humanMessage;
  const snapshot = buildConsentSnapshotFromCookie(consent);
  if (!snapshot) return humanMessage;
  try {
    const token = await requestToken(attribution, snapshot);
    return token ? appendWhatsAppAttributionMarker(humanMessage, token) : humanMessage;
  } catch {
    return humanMessage;
  }
}
