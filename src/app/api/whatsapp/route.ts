import { NextRequest, NextResponse } from "next/server";
import { businessConfig } from "@/config/business";
import {
  ATTRIBUTION_COOKIE_NAME,
  CONSENT_COOKIE_NAME,
  type MarketingAttribution,
} from "@/lib/marketing-attribution-shared";
import {
  WHATSAPP_ATTRIBUTION_TOKEN_PATTERN,
} from "@/lib/whatsapp-attribution";
import { buildDirectWhatsAppLink } from "@/lib/whatsapp";
import { buildWhatsAppRedirectMessage } from "@/lib/whatsapp-redirect";

export const dynamic = "force-dynamic";

const CRM_ATTRIBUTION_ENDPOINT =
  "https://cleanbrothers-crm.vercel.app/api/integrations/whatsapp/attribution";
const MAX_MESSAGE_LENGTH = 2000;
const TOKEN_REQUEST_TIMEOUT_MS = 3500;

export async function GET(request: NextRequest) {
  const requestedMessage = request.nextUrl.searchParams.get("message") ?? "";
  const humanMessage =
    requestedMessage.trim().slice(0, MAX_MESSAGE_LENGTH) ||
    businessConfig.whatsappDefaultMessage;
  const outboundMessage = await buildWhatsAppRedirectMessage({
    consent: request.cookies.get(CONSENT_COOKIE_NAME)?.value,
    attributionCookie: request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value,
    humanMessage,
    requestToken: requestAttributionToken,
  });

  const response = NextResponse.redirect(
    buildDirectWhatsAppLink(outboundMessage),
    307,
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

async function requestAttributionToken(
  marketingAttribution: MarketingAttribution,
) {
  const secret = process.env.CRM_WEBHOOK_SECRET?.trim();
  if (!secret) return null;
  try {
    const response = await fetch(CRM_ATTRIBUTION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": secret,
      },
      body: JSON.stringify({ marketingAttribution }),
      cache: "no-store",
      signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const data = (await response.json().catch(() => null)) as {
      token?: unknown;
    } | null;
    return typeof data?.token === "string" &&
      WHATSAPP_ATTRIBUTION_TOKEN_PATTERN.test(data.token)
      ? data.token
      : null;
  } catch {
    return null;
  }
}
