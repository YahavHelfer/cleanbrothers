// Temporary diagnostic only. Vercel may rewrite Request.url and forwarded hosts.
const APPROVED_BRANCH_ORIGIN =
  "https://cleanbrothers-git-feature-cms-c-061c94-yahavs-projects-6b5e850f.vercel.app";

export function diagnosticTransportFacts(request: Request) {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  return {
    methodPost: request.method === "POST",
    fetchSiteSameOrigin: request.headers.get("sec-fetch-site") === "same-origin",
    originApproved: origin === APPROVED_BRANCH_ORIGIN,
    forwardedProtoHttps: forwardedProto === "https",
    forwardedHostValid: !!forwardedHost && /^[a-z0-9.-]+(?::443)?$/i.test(forwardedHost),
    originPresent: origin !== null,
    originOpaqueNull: origin === "null",
    originMatchesForwardedHost: !!forwardedHost && origin === `https://${forwardedHost}`,
    originMatchesRequestUrl: origin === new URL(request.url).origin,
  };
}

export function diagnosticTransportAllowed(request: Request): boolean {
  const facts = diagnosticTransportFacts(request);
  return facts.methodPost && facts.fetchSiteSameOrigin && facts.originApproved &&
    facts.forwardedProtoHttps && facts.forwardedHostValid;
}
