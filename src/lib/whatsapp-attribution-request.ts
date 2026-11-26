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

  let signal: AbortSignal | undefined;
  try {
    signal = AbortSignal.timeout(timeoutMs);
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
      signal,
    });
    if (!response.ok) {
      const { status } = response;
      const rejected = status >= 400 && status < 500 && status !== 408 && status !== 429;
      return finish(rejected ? "rejected" : "http_failure");
    }

    let data: { token?: unknown } | null;
    try {
      data = await response.json();
    } catch (error) {
      if (error instanceof SyntaxError) return finish("invalid_response");
      throw error;
    }
    return typeof data?.token === "string" &&
      WHATSAPP_ATTRIBUTION_TOKEN_PATTERN.test(data.token)
      ? finish("issued", data.token)
      : finish("invalid_response");
  } catch (error) {
    const timedOut = error instanceof Error && (
      error.name === "TimeoutError" ||
      (error.name === "AbortError" && signal?.aborted && signal.reason?.name === "TimeoutError")
    );
    return finish(timedOut ? "timeout" : "transport_failure");
  }
}
