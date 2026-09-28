// Temporary diagnostic only. The browser-visible host can differ from Request.url on Vercel.
export function diagnosticTransportAllowed(request: Request): boolean {
  if (request.method !== "POST" || request.headers.get("sec-fetch-site") !== "same-origin") return false;
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (!origin || !forwardedHost || forwardedProto !== "https" ||
      !/^[a-z0-9.-]+(?::443)?$/i.test(forwardedHost)) return false;
  try {
    return new URL(origin).origin === `https://${forwardedHost.replace(/:443$/, "")}`;
  } catch { return false; }
}
