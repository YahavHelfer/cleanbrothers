// Temporary diagnostic only. Vercel may rewrite Request.url and forwarded hosts.
const APPROVED_BRANCH_ORIGIN =
  "https://cleanbrothers-git-feature-cms-c-061c94-yahavs-projects-6b5e850f.vercel.app";

export function diagnosticTransportAllowed(request: Request): boolean {
  if (request.method !== "POST" || request.headers.get("sec-fetch-site") !== "same-origin") return false;
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (!origin || !forwardedHost || forwardedProto !== "https" ||
      !/^[a-z0-9.-]+(?::443)?$/i.test(forwardedHost)) return false;
  return origin === APPROVED_BRANCH_ORIGIN;
}
