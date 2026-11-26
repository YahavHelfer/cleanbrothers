import type { ConsentSnapshot } from "./consent";
import type { MarketingAttribution } from "./marketing-attribution-shared";
import { WHATSAPP_ATTRIBUTION_TOKEN_PATTERN } from "./whatsapp-attribution";

type FetchLike = (
  input: URL,
  init: RequestInit,
) => Promise<Pick<Response, "ok" | "json" | "status">>;

export type WhatsAppTokenRequestOutcome =
  | "not_configured"
  | "issued"
  | "rejected"
  | "http_failure"
  | "invalid_response"
  | "timeout"
  | "transport_failure";

export async function requestWhatsAppAttributionToken({
  endpoint,
  secret,
  marketingAttribution,
  consentSnapshot,
  timeoutMs,
  fetchImpl = fetch,
  onOutcome,
}: {
  endpoint: URL;
  secret: string | undefined;
  marketingAttribution: MarketingAttribution;
  consentSnapshot?: ConsentSnapshot | null;
  timeoutMs: number;
  fetchImpl?: FetchLike;
  onOutcome?: (outcome: WhatsAppTokenRequestOutcome) => void;
}) {
  function finish(outcome: WhatsAppTokenRequestOutcome, token: string | null = null) {
    try {
      onOutcome?.(outcome);
    } catch {
      // Observation must never change the token returned to the caller.
    }
    return token;
  }
  const normalizedSecret = secret?.trim();
  if (!normalizedSecret) return finish("not_configured");

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": normalizedSecret,
      },
      body: JSON.stringify({
        marketingAttribution,
        ...(consentSnapshot ? { consentSnapshot } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      const { status } = response;
      const rejected = status >= 400 && status < 500 && status !== 408 && status !== 429;
      return finish(rejected ? "rejected" : "http_failure");
    }

    const data = (await response.json().catch(() => null)) as {
      token?: unknown;
    } | null;
    return typeof data?.token === "string" &&
      WHATSAPP_ATTRIBUTION_TOKEN_PATTERN.test(data.token)
      ? finish("issued", data.token)
      : finish("invalid_response");
  } catch (error) {
    return finish(error instanceof Error && error.name === "TimeoutError" ? "timeout" : "transport_failure");
  }
}
