import "server-only";
import { isManagedServiceKey, isSpecialServiceKey } from "@/content/service-registry";
import { getCmsConfig } from "@/cms/config";
import { approvedCmsPreviewIdentity } from "@/cms/preview-environment";
import { configuredCmsProduction } from "@/cms/production-environment";

// Content is confined to the isolated test stack or the dedicated CMS branch.
// Authentication/AAL2 is still checked independently by every repository call.
export function requireContentEnvironment() {
  const local = !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === "http://127.0.0.1:56321";
  const preview = approvedCmsPreviewIdentity();
  if (!local && !preview && !configuredCmsProduction()) {
    throw new Error("CMS content environment unavailable");
  }
  getCmsConfig();
}

export function usesCmsSource(key: unknown): boolean {
  if (!isManagedServiceKey(key)) return false;
  const production = process.env.VERCEL_ENV === "production";
  if ((production ? process.env.CMS_CONTENT_SOURCE : process.env.CMS_PILOT_CONTENT_SOURCE) !== "published") return false;
  // Special-page cloud rollout is also bound to the approved Vercel project.
  if (isSpecialServiceKey(key) && (process.env.VERCEL || process.env.VERCEL_ENV) &&
    process.env.VERCEL_PROJECT_ID !== "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A") return false;
  const keys = (process.env.CMS_CONTENT_SERVICE_ALLOWLIST || "").split(",");
  if (!keys.every(isManagedServiceKey) || new Set(keys).size !== keys.length || !keys.includes(key)) return false;
  if (production) return configuredCmsProduction();
  // Every service requires the exact CMS project and approved Preview branch
  // (or isolated local stack), in addition to both explicit content gates.
  try { requireContentEnvironment(); } catch { return false; }
  return true;
}
