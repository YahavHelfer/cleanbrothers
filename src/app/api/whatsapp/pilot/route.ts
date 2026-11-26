import { NextRequest, NextResponse } from "next/server";
import { isSiteReview } from "@/lib/site-review";
import { buildDirectWhatsAppLink } from "@/lib/whatsapp";
import { getWhatsAppNavigationMessage, isWhatsAppService } from "@/lib/whatsapp-messages";
import { readWhatsAppAttributionCookie } from "@/lib/whatsapp-redirect";
import { requestWhatsAppAttributionToken, type WhatsAppTokenRequestOutcome } from "@/lib/whatsapp-attribution-request";
import {
  buildWhatsAppPilotMessage, isWhatsAppPilotWindowOpen, type WhatsAppPilotCohort, type WhatsAppPilotGate,
} from "@/lib/whatsapp-measurement-pilot";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // The review environment must never issue a token in the live CRM.
  if (isSiteReview()) return new Response("סביבת תצוגה — פתיחת WhatsApp מושבתת.", { status: 403 });
  const requested = request.nextUrl.searchParams.get("service");
  const service = isWhatsAppService(requested) ? requested : "general";
  const attribution = readWhatsAppAttributionCookie(request.cookies.get("cb_first_touch_attribution")?.value);
  const humanMessage = getWhatsAppNavigationMessage(service, attribution);
  const consent = request.cookies.get("cb_analytics_consent")?.value;
  const speculative = [request.headers.get("sec-purpose"), request.headers.get("purpose")]
    .some((header) => header && /\b(?:prefetch|prerender)\b/i.test(header));
  const observe = request.method === "GET" && consent === "accepted" && !speculative;
  const observation: {
    gate: WhatsAppPilotGate | null;
    cohort: WhatsAppPilotCohort | null;
    token_request: WhatsAppTokenRequestOutcome | "not_attempted";
  } = { gate: null, cohort: null, token_request: "not_attempted" };
  const message = await buildWhatsAppPilotMessage({
    enabled: isWhatsAppPilotWindowOpen(process.env, Date.now(), service, attribution.utm_content),
    service, attribution, humanMessage,
    consent,
    onGate: observe ? (gate, cohort) => {
      observation.gate = gate;
      observation.cohort = cohort;
    } : undefined,
    requestToken: (marketingAttribution, consentSnapshot) => requestWhatsAppAttributionToken({
      endpoint: new URL("https://cleanbrothers-crm.vercel.app/api/integrations/whatsapp/attribution"),
      secret: process.env.CRM_WEBHOOK_SECRET,
      marketingAttribution, consentSnapshot, timeoutMs: 800,
      onOutcome: observe ? (outcome) => { observation.token_request = outcome; } : undefined,
    }),
  });
  const response = NextResponse.redirect(buildDirectWhatsAppLink(message), 307);
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (observe && observation.gate && observation.gate !== "consent_unavailable") {
    try {
      // One category-only record for this request. Never log the URL or response Location.
      console.info(JSON.stringify({ event: "whatsapp_pilot_v1", ...observation, redirect: "issued" }));
    } catch {
      // The redirect must still be returned if the log sink fails.
    }
  }
  return response;
}
