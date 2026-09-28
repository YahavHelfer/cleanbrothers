import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCmsServerClient } from "./server";

export class CmsAccessError extends Error {
  constructor(public readonly reason: "anonymous" | "forbidden" | "unavailable" | "password" | "mfa-setup" | "mfa-challenge") {
    super("CMS access denied");
  }
}

export type CmsAdmin = Readonly<{ userId: string; email: string; role: "admin" }>;
export type CmsOnboardingStep = "password" | "mfa-setup" | "mfa-challenge" | "admin";
export type CmsOnboardingMember = Readonly<{
  userId: string;
  email: string;
  step: CmsOnboardingStep;
  currentLevel: "aal1" | "aal2";
  nextLevel: "aal1" | "aal2";
  factors: ReadonlyArray<{ id: string; status: "verified" | "unverified" }>;
}>;

// Onboarding only: this context must NEVER authorize a CMS data read/mutation.
export async function verifyCmsMemberForOnboarding(client: SupabaseClient): Promise<CmsOnboardingMember> {
  try {
    // A fresh Auth-server lookup: never trust the user object in stored cookies.
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) throw new CmsAccessError("anonymous");
    // getClaims verifies the JWT signature/expiry. Do not decode an unverified
    // cookie or call the no-argument, session-only AAL convenience method.
    const { data, error: claimsError } = await client.auth.getClaims();
    const claims = data?.claims;
    if (claimsError || !claims || claims.sub !== user.id || claims.role !== "authenticated" ||
        (claims.aal !== "aal1" && claims.aal !== "aal2")) throw new CmsAccessError("anonymous");
    const membership = await client.rpc("is_cms_member_for_onboarding");
    if (membership.error) throw new CmsAccessError("unavailable");
    if (membership.data !== true) throw new CmsAccessError("forbidden");
    const invitation = await client.rpc("cms_invite_password_pending");
    if (invitation.error || typeof invitation.data !== "boolean") throw new CmsAccessError("unavailable");
    const factors = (user.factors ?? []).filter((factor) => factor.factor_type === "totp")
      .map(({ id, status }) => ({ id, status }));
    const hasVerifiedFactor = factors.some(({ status }) => status === "verified");
    let step: CmsOnboardingStep;
    if (invitation.data) {
      // token_hash verification currently issues amr=otp (not always invite).
      // The DB independently proves this invited member has not completed setup.
      if (!claims.amr?.some((entry) => typeof entry === "object" && (entry.method === "invite" || entry.method === "otp"))) {
        throw new CmsAccessError("forbidden");
      }
      step = "password";
    } else if (claims.aal === "aal2" && hasVerifiedFactor) {
      step = "admin";
    } else {
      // A pending, unverified enrollment can be completed after a page reload
      // using the authenticator already scanned. Never disclose its secret again.
      step = factors.length ? "mfa-challenge" : "mfa-setup";
    }
    const currentLevel = claims.aal === "aal2" ? "aal2" : "aal1";
    return { userId: user.id, email: user.email ?? "", step,
      currentLevel, nextLevel: hasVerifiedFactor ? "aal2" : currentLevel, factors };
  } catch (error) {
    if (error instanceof CmsAccessError) throw error;
    throw new CmsAccessError("unavailable");
  }
}

export async function requireCmsMemberForOnboarding(): Promise<CmsOnboardingMember> {
  try {
    return await verifyCmsMemberForOnboarding(await createCmsServerClient());
  } catch (error) {
    if (error instanceof CmsAccessError) throw error;
    throw new CmsAccessError("unavailable");
  }
}

export async function verifyCmsAdmin(client: SupabaseClient): Promise<CmsAdmin> {
  const member = await verifyCmsMemberForOnboarding(client);
  if (member.step !== "admin" || member.currentLevel !== "aal2") {
    throw new CmsAccessError(member.step === "admin" ? "mfa-challenge" : member.step);
  }
  // Independently query the AAL2 RLS-protected row, never reuse onboarding as
  // the final data privilege. Revocation remains effective on every call.
  const membership = await client.from("cms_admin_members")
    .select("user_id, role, is_active").eq("user_id", member.userId).maybeSingle();
  if (membership.error) throw new CmsAccessError("unavailable");
  if (membership.data?.user_id !== member.userId || membership.data.role !== "admin" ||
      membership.data.is_active !== true) throw new CmsAccessError("forbidden");
  return { userId: member.userId, email: member.email, role: "admin" };
}

// Call this in every future CMS read/mutation. No identity arguments, shared
// client, persistent cache, service key, or caller-supplied authorization result.
export async function requireCmsAdmin(): Promise<CmsAdmin> {
  try {
    return await verifyCmsAdmin(await createCmsServerClient());
  } catch (error) {
    if (error instanceof CmsAccessError) throw error;
    throw new CmsAccessError("unavailable");
  }
}
