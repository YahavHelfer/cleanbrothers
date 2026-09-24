import "server-only";
import { isManagedServiceKey, isSpecialServiceKey } from "@/content/service-registry";
import { PILOT_KEY } from "./pilot-model";
import { getCmsConfig } from "@/cms/config";

// Content is confined to the isolated test stack or the dedicated CMS branch.
// Authentication/AAL2 is still checked independently by every repository call.
export function requireContentEnvironment() {
  const local = !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === "http://127.0.0.1:56321";
  const preview = process.env.VERCEL === "1" && process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_GIT_COMMIT_REF === "feature/cms-cloud-foundation" &&
    process.env.CMS_SUPABASE_URL === "https://plbwefnwussxlglscfpn.supabase.co";
  if (!local && !preview) {
    throw new Error("CMS content environment unavailable");
  }
  getCmsConfig();
}

export function usesCmsSource(key: unknown): boolean {
  if (!isManagedServiceKey(key) || process.env.CMS_PILOT_CONTENT_SOURCE !== "published") return false;
  // Special-page cloud rollout is also bound to the approved Vercel project.
  if (isSpecialServiceKey(key) && (process.env.VERCEL || process.env.VERCEL_ENV) &&
    process.env.VERCEL_PROJECT_ID !== "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A") return false;
  const keys = (process.env.CMS_CONTENT_SERVICE_ALLOWLIST || "").split(",");
  if (!keys.every(isManagedServiceKey) || new Set(keys).size !== keys.length || !keys.includes(key)) return false;
  // Shared and special services require the exact CMS project and Preview
  // branch (or isolated local stack), in addition to both explicit content gates.
  if (key !== PILOT_KEY) {
    try { requireContentEnvironment(); } catch { return false; }
  }
  return true;
}
