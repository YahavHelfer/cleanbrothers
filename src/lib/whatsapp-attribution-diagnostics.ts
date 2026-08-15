import type { MarketingAttribution } from "./marketing-attribution-shared";
import { WHATSAPP_ATTRIBUTION_TOKEN_PATTERN } from "./whatsapp-attribution";

export type WhatsAppAttributionFailure =
  | "none"
  | "missing_env"
  | "timeout"
  | "network_error"
  | "unauthorized"
  | "bad_request"
  | "unprocessable"
  | "not_found"
  | "forbidden"
  | "upstream_error"
  | "malformed_response"
  | "no_attribution"
  | "no_consent";

export type WhatsAppAttributionDiagnostic = {
  result: "success" | "fallback";
  failure: WhatsAppAttributionFailure;
  upstreamStatus: number | null;
  hasSecret: boolean;
  hasAttribution: boolean;
};

type FetchLike = (
  input: URL,
  init: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "json">>;

type RequestInput = {
  endpoint: URL;
  secret: string | undefined;
  marketingAttribution: MarketingAttribution;
  timeoutMs: number;
  fetchImpl?: FetchLike;
};

export function fallbackWhatsAppAttributionDiagnostic({
  failure,
  upstreamStatus = null,
  hasSecret,
  hasAttribution,
}: {
  failure: Exclude<WhatsAppAttributionFailure, "none">;
  upstreamStatus?: number | null;
  hasSecret: boolean;
  hasAttribution: boolean;
}): WhatsAppAttributionDiagnostic {
  return {
    result: "fallback",
    failure,
    upstreamStatus,
    hasSecret,
    hasAttribution,
  };
}

export function getWhatsAppAttributionDiagnosticHeaders(
  debugEnabled: boolean,
  diagnostic: WhatsAppAttributionDiagnostic,
) {
  if (!debugEnabled) return {};
  return {
    "X-CB-Attribution-Result": diagnostic.result,
    "X-CB-Attribution-Failure": diagnostic.failure,
    "X-CB-Upstream-Status": diagnostic.upstreamStatus?.toString() ?? "none",
    "X-CB-Has-Secret": diagnostic.hasSecret ? "true" : "false",
    "X-CB-Has-Attribution": diagnostic.hasAttribution ? "true" : "false",
  };
}

export async function requestWhatsAppAttributionToken({
  endpoint,
  secret,
  marketingAttribution,
  timeoutMs,
  fetchImpl = fetch,
}: RequestInput): Promise<{
  token: string | null;
  diagnostic: WhatsAppAttributionDiagnostic;
}> {
  const normalizedSecret = secret?.trim();
  const hasAttribution = Object.keys(marketingAttribution).length > 0;
  if (!normalizedSecret) {
    const diagnostic = fallbackWhatsAppAttributionDiagnostic({
      failure: "missing_env",
      hasSecret: false,
      hasAttribution,
    });
    logWhatsAppAttributionFailure(endpoint, diagnostic);
    return { token: null, diagnostic };
  }

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
    if (!response.ok) {
      const diagnostic = fallbackWhatsAppAttributionDiagnostic({
        failure: classifyUpstreamStatus(response.status),
        upstreamStatus: response.status,
        hasSecret: true,
        hasAttribution,
      });
      logWhatsAppAttributionFailure(endpoint, diagnostic);
      return { token: null, diagnostic };
    }

    const data = (await response.json().catch(() => null)) as {
      token?: unknown;
    } | null;
    if (
      typeof data?.token !== "string" ||
      !WHATSAPP_ATTRIBUTION_TOKEN_PATTERN.test(data.token)
    ) {
      const diagnostic = fallbackWhatsAppAttributionDiagnostic({
        failure: "malformed_response",
        upstreamStatus: response.status,
        hasSecret: true,
        hasAttribution,
      });
      logWhatsAppAttributionFailure(endpoint, diagnostic);
      return { token: null, diagnostic };
    }

    return {
      token: data.token,
      diagnostic: {
        result: "success",
        failure: "none",
        upstreamStatus: response.status,
        hasSecret: true,
        hasAttribution,
      },
    };
  } catch (error) {
    const diagnostic = fallbackWhatsAppAttributionDiagnostic({
      failure: isTimeoutError(error) ? "timeout" : "network_error",
      hasSecret: true,
      hasAttribution,
    });
    logWhatsAppAttributionFailure(endpoint, diagnostic);
    return { token: null, diagnostic };
  }
}

function classifyUpstreamStatus(
  status: number,
): Exclude<WhatsAppAttributionFailure, "none"> {
  if (status === 400) return "bad_request";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 422) return "unprocessable";
  return "upstream_error";
}

function logWhatsAppAttributionFailure(
  endpoint: URL,
  diagnostic: WhatsAppAttributionDiagnostic,
) {
  console.error(
    JSON.stringify({
      event: "whatsapp_attribution_upstream",
      upstream_host: endpoint.host,
      upstream_path: endpoint.pathname,
      http_status: diagnostic.upstreamStatus,
      response_ok: false,
      failure_class: diagnostic.failure,
      request_has_secret: diagnostic.hasSecret,
      request_has_attribution: diagnostic.hasAttribution,
    }),
  );
}

function isTimeoutError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}
