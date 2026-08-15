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
import {
  logWhatsAppAttributionFailure,
  type WhatsAppAttributionFailureClass,
} from "@/lib/whatsapp-attribution-diagnostics";
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
  const endpoint = new URL(CRM_ATTRIBUTION_ENDPOINT);
  const secret = process.env.CRM_WEBHOOK_SECRET?.trim();
  const requestHasAttribution = Object.keys(marketingAttribution).length > 0;
  if (!secret) {
    logWhatsAppAttributionFailure({
      endpoint,
      status: null,
      failureClass: "missing_env",
      requestHasSecret: false,
      requestHasAttribution,
    });
    return null;
  }
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": secret,
      },
      body: JSON.stringify({ marketingAttribution }),
      cache: "no-store",
      signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      logWhatsAppAttributionFailure({
        endpoint,
        status: response.status,
        failureClass: classifyUpstreamStatus(response.status),
        requestHasSecret: true,
        requestHasAttribution,
      });
      return null;
    }
    const data = (await response.json().catch(() => null)) as {
      token?: unknown;
    } | null;
    if (
      typeof data?.token !== "string" ||
      !WHATSAPP_ATTRIBUTION_TOKEN_PATTERN.test(data.token)
    ) {
      logWhatsAppAttributionFailure({
        endpoint,
        status: response.status,
        failureClass: "malformed_response",
        requestHasSecret: true,
        requestHasAttribution,
      });
      return null;
    }
    return data.token;
  } catch (error) {
    logWhatsAppAttributionFailure({
      endpoint,
      status: null,
      failureClass: isTimeoutError(error) ? "timeout" : "network_error",
      requestHasSecret: true,
      requestHasAttribution,
    });
    return null;
  }
}

function classifyUpstreamStatus(
  status: number,
): WhatsAppAttributionFailureClass {
  if (status === 400 || status === 422) return "bad_request";
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 404) return "not_found";
  if (status >= 500) return "upstream_error";
  return "unexpected_status";
}

function isTimeoutError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}
