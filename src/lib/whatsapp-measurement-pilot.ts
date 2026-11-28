import { buildConsentSnapshotFromCookie, type ConsentSnapshot } from "./consent.ts";
import { appendWhatsAppAttributionMarker } from "./whatsapp-attribution.ts";
import type { MarketingAttribution } from "./marketing-attribution-shared.ts";

export const WHATSAPP_PILOT = {
  campaign: "23984473561",
  content: "cb_wa_site_pilot_ac_829688140730",
  service: "air-conditioner-cleaning",
} as const;

const wallAcPilotContents = new Set(["cb_wa_site_pilot_ac_wash_20261119", "cb_wa_site_pilot_ac_831708035924"]);
const MINI_CENTRAL_SERVICE = "mini-central-air-conditioner-cleaning";
const MINI_CENTRAL_CAMPAIGN = "24326429732";
const miniCentralCreatives = new Set([
  "829563936387",
  "828718026646",
  "832970587188",
  "832970559246",
]);
const maximumPilotDuration = 14 * 86400000;

export type WhatsAppPilotCohort = "mini_central" | "wall_wash" | "original_ac";
export type WhatsAppPilotGate =
  | "campaign_not_approved"
  | "pilot_closed_or_disabled"
  | "gclid_missing_or_invalid"
  | "consent_unavailable"
  | "eligible";

export function isWhatsAppPilotWindowOpen(env: Record<string, string | undefined>, now = Date.now(), service?: string, content?: string) {
  const wallWash = service === WHATSAPP_PILOT.service && wallAcPilotContents.has(content ?? "");
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

function getWhatsAppPilotCohort(service: unknown, attribution: MarketingAttribution): WhatsAppPilotCohort | null {
  if (attribution.utm_source !== "google" || attribution.utm_medium !== "cpc") return null;
  const campaign = attribution.utm_campaign;
  if (attribution.google_ads_campaign_id && attribution.google_ads_campaign_id !== campaign) return null;
  const content = attribution.utm_content ?? "";
  if (service === MINI_CENTRAL_SERVICE) {
    return campaign === MINI_CENTRAL_CAMPAIGN && miniCentralCreatives.has(content) ? "mini_central" : null;
  }
  if (service !== WHATSAPP_PILOT.service || campaign !== WHATSAPP_PILOT.campaign) return null;
  if (content === WHATSAPP_PILOT.content) return "original_ac";
  return wallAcPilotContents.has(content) ? "wall_wash" : null;
}

export function isWhatsAppPilotAttribution(service: unknown, attribution: MarketingAttribution): service is string {
  return getWhatsAppPilotCohort(service, attribution) !== null;
}

export function getWhatsAppPilotHref(service: unknown, attribution: MarketingAttribution) {
  if (!isWhatsAppPilotAttribution(service, attribution)) return null;
  return `/api/whatsapp/pilot?service=${encodeURIComponent(service)}`;
}

export async function buildWhatsAppPilotMessage({
  enabled, service, attribution, consent, humanMessage, requestToken, onGate,
}: {
  enabled: boolean;
  service: unknown;
  attribution: MarketingAttribution;
  consent: string | undefined;
  humanMessage: string;
  requestToken: (attribution: MarketingAttribution, snapshot: ConsentSnapshot) => Promise<string | null>;
  onGate?: (gate: WhatsAppPilotGate, cohort: WhatsAppPilotCohort | null) => void;
}) {
  const cohort = getWhatsAppPilotCohort(service, attribution);
  if (!cohort) {
    onGate?.("campaign_not_approved", null);
    return humanMessage;
  }
  if (!enabled) {
    onGate?.("pilot_closed_or_disabled", cohort);
    return humanMessage;
  }
  // A UTM label is a cohort marker, never proof that a Google click occurred.
  // Initial pilot requires a present GCLID; its real validity is checked by Google.
  if (!attribution.gclid || !/^[A-Za-z0-9_-]{1,220}$/.test(attribution.gclid)) {
    onGate?.("gclid_missing_or_invalid", cohort);
    return humanMessage;
  }
  const snapshot = buildConsentSnapshotFromCookie(consent);
  if (!snapshot) {
    onGate?.("consent_unavailable", cohort);
    return humanMessage;
  }
  onGate?.("eligible", cohort);
  try {
    const marketingAttribution = { ...attribution, google_ads_campaign_id: attribution.utm_campaign };
    const token = await requestToken(marketingAttribution, snapshot);
    return token ? appendWhatsAppAttributionMarker(humanMessage, token) : humanMessage;
  } catch {
    return humanMessage;
  }
}
