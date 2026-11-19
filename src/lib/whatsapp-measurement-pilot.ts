import { buildConsentSnapshotFromCookie, type ConsentSnapshot } from "./consent.ts";
import { appendWhatsAppAttributionMarker } from "./whatsapp-attribution.ts";
import type { MarketingAttribution } from "./marketing-attribution-shared.ts";

export const WHATSAPP_PILOT = {
  campaign: "23984473561",
  content: "cb_wa_site_pilot_ac_829688140730",
  service: "air-conditioner-cleaning",
} as const;

const WALL_AC_WASH_CONTENT = "cb_wa_site_pilot_ac_wash_20261119";
const MINI_CENTRAL_SERVICE = "mini-central-air-conditioner-cleaning";
const MINI_CENTRAL_CAMPAIGN = "24326429732";
const miniCentralCreatives = new Set(["829563936387", "828718026646"]);
const maximumPilotDuration = 14 * 86400000;

export function isWhatsAppPilotWindowOpen(env: Record<string, string | undefined>, now = Date.now(), service?: string, content?: string) {
  const wallWash = service === WHATSAPP_PILOT.service && content === WALL_AC_WASH_CONTENT;
  if (service === MINI_CENTRAL_SERVICE || wallWash) {
    if (wallWash && env.WHATSAPP_ATTRIBUTION_PILOT_ENABLED !== "1") return false;
    const startAt = wallWash ? env.WHATSAPP_WALL_WASH_PILOT_START_AT : env.WHATSAPP_MINI_CENTRAL_PILOT_START_AT;
    const start = Date.parse(startAt ?? "");
    return now >= start && now < start + maximumPilotDuration;
  }
  const start = Date.parse(env.WHATSAPP_ATTRIBUTION_PILOT_START_AT ?? "");
  const end = Date.parse(env.WHATSAPP_ATTRIBUTION_PILOT_END_AT ?? "");
  return env.WHATSAPP_ATTRIBUTION_PILOT_ENABLED === "1" &&
    Number.isFinite(start) && Number.isFinite(end) &&
    end > start && end - start <= maximumPilotDuration && now >= start && now < end;
}

export function isWhatsAppPilotAttribution(service: unknown, attribution: MarketingAttribution): service is string {
  if (attribution.utm_source !== "google" || attribution.utm_medium !== "cpc") return false;
  if (service === MINI_CENTRAL_SERVICE) {
    return attribution.utm_campaign === MINI_CENTRAL_CAMPAIGN &&
      (!attribution.google_ads_campaign_id || attribution.google_ads_campaign_id === MINI_CENTRAL_CAMPAIGN) &&
      miniCentralCreatives.has(attribution.utm_content ?? "");
  }
  return service === WHATSAPP_PILOT.service && attribution.utm_campaign === WHATSAPP_PILOT.campaign &&
    (!attribution.google_ads_campaign_id || attribution.google_ads_campaign_id === WHATSAPP_PILOT.campaign) &&
    (attribution.utm_content === WHATSAPP_PILOT.content || attribution.utm_content === WALL_AC_WASH_CONTENT);
}

export function getWhatsAppPilotHref(service: unknown, attribution: MarketingAttribution) {
  if (!isWhatsAppPilotAttribution(service, attribution)) return null;
  return `/api/whatsapp/pilot?service=${encodeURIComponent(service)}`;
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
    const marketingAttribution = { ...attribution, google_ads_campaign_id: attribution.utm_campaign };
    const token = await requestToken(marketingAttribution, snapshot);
    return token ? appendWhatsAppAttributionMarker(humanMessage, token) : humanMessage;
  } catch {
    return humanMessage;
  }
}
