import "server-only";
import { isManagedServiceKey } from "@/content/service-registry";
import { configuredCmsProduction } from "@/cms/production-environment";

export type PublicPlacement = { kind: "global"; target: "site" } |
  { kind: "home"; target: "home" } | { kind: "service"; target: string };

export function isPublicPlacement(kind: unknown, target: unknown): kind is PublicPlacement["kind"] {
  return kind === "global" && target === "site" || kind === "home" && target === "home" ||
    kind === "service" && isManagedServiceKey(target);
}

export function scheduledPublicEnvironmentAllowed(): boolean {
  const local = !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SCHEDULED_PROMOTIONS_LOCAL_ENABLED === "true" &&
    process.env.CMS_SUPABASE_URL === "http://127.0.0.1:56321";
  const preview = process.env.VERCEL === "1" && process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_PROJECT_ID === "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A" &&
    process.env.VERCEL_GIT_COMMIT_REF === "feature/cms-cloud-foundation" &&
    process.env.CMS_SUPABASE_URL === "https://plbwefnwussxlglscfpn.supabase.co";
  return local || preview || configuredCmsProduction();
}

export function usesScheduledPublicPlacement(kind: unknown, target: unknown): boolean {
  if (!isPublicPlacement(kind, target) || !scheduledPublicEnvironmentAllowed() ||
    process.env.CMS_SCHEDULED_PROMOTIONS_SOURCE !== "active") return false;
  const tokens = (process.env.CMS_SCHEDULED_PROMOTIONS_ALLOWLIST || "").split(",");
  if (tokens.length === 0 || tokens.some(token => {
    const parts = token.split(":");
    return parts.length !== 2 || !isPublicPlacement(parts[0], parts[1]);
  }) || new Set(tokens).size !== tokens.length) return false;
  return tokens.includes(`${kind}:${target}`);
}
