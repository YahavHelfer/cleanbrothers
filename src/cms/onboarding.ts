import "server-only";
import { redirect } from "next/navigation";
import { CmsAccessError, requireCmsMemberForOnboarding, type CmsOnboardingStep } from "./authorization";

export function cmsStepDestination(step: CmsOnboardingStep): string {
  return { password: "/admin/onboarding/password", "mfa-setup": "/admin/mfa/setup",
    "mfa-challenge": "/admin/mfa/challenge", admin: "/admin" }[step];
}

export function cmsAccessDestination(error: unknown): string {
  const reason = error instanceof CmsAccessError ? error.reason : "unavailable";
  if (reason === "password" || reason === "mfa-setup" || reason === "mfa-challenge") return cmsStepDestination(reason);
  return reason === "anonymous" ? "/admin/login" : `/admin/login?error=${reason}`;
}

export async function requireCmsOnboardingPage(step: Exclude<CmsOnboardingStep, "admin">) {
  const member = await requireCmsMemberForOnboarding().catch((error: unknown) => redirect(cmsAccessDestination(error)));
  if (member.step !== step) redirect(cmsStepDestination(member.step));
  return member;
}
