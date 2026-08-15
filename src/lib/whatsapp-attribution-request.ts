import type { MarketingAttribution } from "./marketing-attribution-shared";
import { WHATSAPP_ATTRIBUTION_TOKEN_PATTERN } from "./whatsapp-attribution";

type FetchLike = (
  input: URL,
  init: RequestInit,
) => Promise<Pick<Response, "ok" | "json">>;

export async function requestWhatsAppAttributionToken({
  endpoint,
  secret,
  marketingAttribution,
  timeoutMs,
  fetchImpl = fetch,
}: {
  endpoint: URL;
  secret: string | undefined;
  marketingAttribution: MarketingAttribution;
  timeoutMs: number;
  fetchImpl?: FetchLike;
}) {
  const normalizedSecret = secret?.trim();
  if (!normalizedSecret) return null;

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": normalizedSecret,
      },
      body: JSON.stringify({ marketingAttribution }),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
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
