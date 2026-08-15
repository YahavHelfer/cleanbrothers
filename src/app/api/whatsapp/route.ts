import { NextRequest, NextResponse } from "next/server";
import { businessConfig } from "@/config/business";
import {
  ATTRIBUTION_COOKIE_NAME,
  CONSENT_COOKIE_NAME,
} from "@/lib/marketing-attribution-shared";
import { requestWhatsAppAttributionToken } from "@/lib/whatsapp-attribution-request";
import { buildDirectWhatsAppLink } from "@/lib/whatsapp";
import { buildWhatsAppRedirectMessage } from "@/lib/whatsapp-redirect";

export const dynamic = "force-dynamic";

const CRM_ATTRIBUTION_ENDPOINT =
  "https://cleanbrothers-crm.vercel.app/api/integrations/whatsapp/attribution";
const MAX_MESSAGE_LENGTH = 2000;
const TOKEN_REQUEST_TIMEOUT_MS = 3500;

export async function GET(request: NextRequest) {
  const requestedMessage = request.nextUrl.searchParams.get("message") ?? "";
  const consent = request.cookies.get(CONSENT_COOKIE_NAME)?.value;
  const attributionCookie = request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value;
  const secret = process.env.CRM_WEBHOOK_SECRET?.trim();
  const humanMessage =
    requestedMessage.trim().slice(0, MAX_MESSAGE_LENGTH) ||
    businessConfig.whatsappDefaultMessage;
  const outboundMessage = await buildWhatsAppRedirectMessage({
    consent,
    attributionCookie,
    humanMessage,
    requestToken: (marketingAttribution) =>
      requestWhatsAppAttributionToken({
        endpoint: new URL(CRM_ATTRIBUTION_ENDPOINT),
        secret,
        marketingAttribution,
        timeoutMs: TOKEN_REQUEST_TIMEOUT_MS,
      }),
  });

  const response = NextResponse.redirect(
    buildDirectWhatsAppLink(outboundMessage),
    307,
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
