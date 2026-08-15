import { NextRequest, NextResponse } from "next/server";
import { businessConfig } from "@/config/business";
import {
  ATTRIBUTION_COOKIE_NAME,
  CONSENT_COOKIE_NAME,
} from "@/lib/marketing-attribution-shared";
import {
  fallbackWhatsAppAttributionDiagnostic,
  getWhatsAppAttributionDiagnosticHeaders,
  requestWhatsAppAttributionToken,
  type WhatsAppAttributionDiagnostic,
} from "@/lib/whatsapp-attribution-diagnostics";
import { buildDirectWhatsAppLink } from "@/lib/whatsapp";
import {
  buildWhatsAppRedirectMessage,
  readWhatsAppAttributionCookie,
} from "@/lib/whatsapp-redirect";

export const dynamic = "force-dynamic";

const CRM_ATTRIBUTION_ENDPOINT =
  "https://cleanbrothers-crm.vercel.app/api/integrations/whatsapp/attribution";
const MAX_MESSAGE_LENGTH = 2000;
const TOKEN_REQUEST_TIMEOUT_MS = 3500;

export async function GET(request: NextRequest) {
  const requestedMessage = request.nextUrl.searchParams.get("message") ?? "";
  const debugEnabled =
    request.nextUrl.searchParams.get("cb_attribution_debug") === "1";
  const consent = request.cookies.get(CONSENT_COOKIE_NAME)?.value;
  const attributionCookie = request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value;
  const attribution = readWhatsAppAttributionCookie(attributionCookie);
  const hasAttribution = Object.keys(attribution).length > 0;
  const secret = process.env.CRM_WEBHOOK_SECRET?.trim();
  let diagnostic: WhatsAppAttributionDiagnostic =
    fallbackWhatsAppAttributionDiagnostic({
      failure: consent === "accepted" ? "no_attribution" : "no_consent",
      hasSecret: Boolean(secret),
      hasAttribution,
    });
  const humanMessage =
    requestedMessage.trim().slice(0, MAX_MESSAGE_LENGTH) ||
    businessConfig.whatsappDefaultMessage;
  const outboundMessage = await buildWhatsAppRedirectMessage({
    consent,
    attributionCookie,
    humanMessage,
    requestToken: async (marketingAttribution) => {
      const result = await requestWhatsAppAttributionToken({
        endpoint: new URL(CRM_ATTRIBUTION_ENDPOINT),
        secret,
        marketingAttribution,
        timeoutMs: TOKEN_REQUEST_TIMEOUT_MS,
      });
      diagnostic = result.diagnostic;
      return result.token;
    },
  });

  const response = NextResponse.redirect(
    buildDirectWhatsAppLink(outboundMessage),
    307,
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  for (const [name, value] of Object.entries(
    getWhatsAppAttributionDiagnosticHeaders(debugEnabled, diagnostic),
  )) {
    response.headers.set(name, value);
  }
  return response;
}
