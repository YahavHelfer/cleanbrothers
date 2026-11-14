import { NextRequest, NextResponse } from "next/server";
import { isSiteReview } from "@/lib/site-review";
import { buildDirectWhatsAppLink } from "@/lib/whatsapp";
import { getWhatsAppNavigationMessage, isWhatsAppService } from "@/lib/whatsapp-messages";
import { readWhatsAppAttributionCookie } from "@/lib/whatsapp-redirect";
import { requestWhatsAppAttributionToken } from "@/lib/whatsapp-attribution-request";
import { buildWhatsAppPilotMessage, isWhatsAppPilotWindowOpen } from "@/lib/whatsapp-measurement-pilot";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // The review environment must never issue a token in the live CRM.
  if (isSiteReview()) return new Response("סביבת תצוגה — פתיחת WhatsApp מושבתת.", { status: 403 });
  const requested = request.nextUrl.searchParams.get("service");
  const service = isWhatsAppService(requested) ? requested : "general";
  const attribution = readWhatsAppAttributionCookie(request.cookies.get("cb_first_touch_attribution")?.value);
  const humanMessage = getWhatsAppNavigationMessage(service, attribution);
  const message = await buildWhatsAppPilotMessage({
    enabled: isWhatsAppPilotWindowOpen(process.env),
    service, attribution, humanMessage,
    consent: request.cookies.get("cb_analytics_consent")?.value,
    requestToken: (marketingAttribution, consentSnapshot) => requestWhatsAppAttributionToken({
      endpoint: new URL("https://cleanbrothers-crm.vercel.app/api/integrations/whatsapp/attribution"),
      secret: process.env.CRM_WEBHOOK_SECRET,
      marketingAttribution, consentSnapshot, timeoutMs: 800,
    }),
  });
  const response = NextResponse.redirect(buildDirectWhatsAppLink(message), 307);
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
