export type WhatsAppAttributionFailureClass =
  | "missing_env"
  | "timeout"
  | "network_error"
  | "unauthorized"
  | "bad_request"
  | "not_found"
  | "upstream_error"
  | "unexpected_status"
  | "malformed_response";

type DiagnosticInput = {
  endpoint: URL;
  status: number | null;
  failureClass: WhatsAppAttributionFailureClass;
  requestHasSecret: boolean;
  requestHasAttribution: boolean;
};

export function buildWhatsAppAttributionFailureDiagnostic({
  endpoint,
  status,
  failureClass,
  requestHasSecret,
  requestHasAttribution,
}: DiagnosticInput) {
  return {
    event: "whatsapp_attribution_upstream",
    upstream_host: endpoint.host,
    upstream_path: endpoint.pathname,
    http_status: status,
    response_ok: false,
    failure_class: failureClass,
    request_has_secret: requestHasSecret,
    request_has_attribution: requestHasAttribution,
  } as const;
}

export function logWhatsAppAttributionFailure(input: DiagnosticInput) {
  console.warn(buildWhatsAppAttributionFailureDiagnostic(input));
}
