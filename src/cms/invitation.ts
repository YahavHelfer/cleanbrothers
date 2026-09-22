import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCmsAppOrigin } from "./config";
import { verifyCmsMemberForOnboarding } from "./authorization";

export function cmsInvitationRequestUrl(url: string, host: string | null, forwardedProtocol: string | null): string {
  const expected = new URL(getCmsAppOrigin());
  const incoming = new URL(url);
  // Next can normalize the internal request URL to localhost. Validate the
  // actual HTTP authority against the fixed allowlist; never use it as a target.
  // Forwarded protocol is only compared, not trusted to choose a destination.
  if (host !== expected.host || (forwardedProtocol ?? incoming.protocol.slice(0, -1)) !== expected.protocol.slice(0, -1) || incoming.hash) {
    throw new Error("Invalid CMS invitation");
  }
  const canonical = new URL(incoming.pathname + incoming.search, expected.origin).href;
  parseCmsInvitation(canonical);
  return canonical;
}

export function parseCmsInvitation(url: string): string {
  const target = new URL(url);
  const params = target.searchParams;
  if (target.origin !== getCmsAppOrigin() || target.pathname !== "/admin/auth/confirm" || target.hash ||
      target.username || target.password || [...params.keys()].some((key) => key !== "token_hash" && key !== "type") ||
      params.getAll("type").length !== 1 || params.get("type") !== "invite" ||
      params.getAll("token_hash").length !== 1 || !/^[A-Za-z0-9_-]{32,256}$/.test(params.get("token_hash") ?? "")) {
    throw new Error("Invalid CMS invitation");
  }
  return params.get("token_hash")!;
}

export async function confirmCmsInvitation(client: SupabaseClient, url: string) {
  const token_hash = parseCmsInvitation(url);
  const { error } = await client.auth.verifyOtp({ token_hash, type: "invite" });
  if (error) throw new Error("Invalid CMS invitation");
  const member = await verifyCmsMemberForOnboarding(client);
  if (member.step !== "password") throw new Error("Invalid CMS invitation");
}

export function isStrongCmsPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 12 && password.length <= 128 &&
    /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9\s]/.test(password);
}
