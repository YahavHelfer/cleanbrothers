import { sanitizeMarketingAttribution } from "./marketing-attribution-shared";
import { appendWhatsAppAttributionMarker } from "./whatsapp-attribution";

export function readWhatsAppAttributionCookie(cookieValue: string | undefined) {
  if (!cookieValue) return {};
  try {
    return sanitizeMarketingAttribution(
      JSON.parse(decodeURIComponent(cookieValue)),
    );
  } catch {
    return {};
  }
}

export async function buildWhatsAppRedirectMessage({
  consent,
  attributionCookie,
  humanMessage,
  requestToken,
}: {
  consent: string | undefined;
  attributionCookie: string | undefined;
  humanMessage: string;
  requestToken: (
    attribution: ReturnType<typeof sanitizeMarketingAttribution>,
  ) => Promise<string | null>;
}) {
  if (consent !== "accepted") return humanMessage;
  const attribution = readWhatsAppAttributionCookie(attributionCookie);
  if (!Object.keys(attribution).length) return humanMessage;
  const token = await requestToken(attribution).catch(() => null);
  return token
    ? appendWhatsAppAttributionMarker(humanMessage, token)
    : humanMessage;
}
