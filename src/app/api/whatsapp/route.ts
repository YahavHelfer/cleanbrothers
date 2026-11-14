import { isSiteReview } from "@/lib/site-review";
import { NextRequest, NextResponse } from "next/server";
import { buildDirectWhatsAppLink } from "@/lib/whatsapp";
import { getWhatsAppMessage, isWhatsAppService, resolveWhatsAppService } from "@/lib/whatsapp-messages";

export const dynamic = "force-dynamic";

// Compatibility for previously saved URLs. New links navigate directly to wa.me.
export async function GET(request: NextRequest) {
  if (isSiteReview()) return new Response("סביבת תצוגה — פתיחת WhatsApp מושבתת כדי למנוע פניות אמיתיות.", { status: 403 });
  const requestedMessage = request.nextUrl.searchParams.get("message") ?? "";
  let pagePath = "/";
  try {
    const referrer = new URL(request.headers.get("referer") ?? "");
    if (referrer.origin === request.nextUrl.origin) pagePath = referrer.pathname;
  } catch { /* A missing referrer uses the general message. */ }
  const requestedService = request.nextUrl.searchParams.get("service");
  const service = isWhatsAppService(requestedService) && requestedService !== "general"
    ? requestedService : resolveWhatsAppService(pagePath, requestedMessage.slice(0, 2000));
  const humanMessage = getWhatsAppMessage(service);
  const response = NextResponse.redirect(
    buildDirectWhatsAppLink(humanMessage),
    307,
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
