export const WHATSAPP_ATTRIBUTION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function appendWhatsAppAttributionMarker(message: string, token: string) {
  if (!WHATSAPP_ATTRIBUTION_TOKEN_PATTERN.test(token)) return message;
  const normalized = message.trimEnd();
  return `${normalized}${normalized ? "\n" : ""}[CBREF:${token}]`;
}
