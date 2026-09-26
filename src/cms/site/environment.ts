import "server-only";
import { getCmsConfig } from "@/cms/config";
import type { SiteDocumentKind } from "./model";

const LOCAL_CMS_URL = "http://127.0.0.1:56321";
const CLOUD_CMS_URL = "https://plbwefnwussxlglscfpn.supabase.co";
const PREVIEW_PROJECT_ID = "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A";
const PREVIEW_BRANCH = "feature/cms-cloud-foundation";

// Admin access and public source selection have independent gates. Even a fully
// configured Production deployment cannot enable this Phase 3C2 pilot.
export function siteEnvironmentAllowed(): boolean {
  const local = !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === LOCAL_CMS_URL;
  const preview = process.env.VERCEL === "1" && process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_PROJECT_ID === PREVIEW_PROJECT_ID &&
    process.env.VERCEL_GIT_COMMIT_REF === PREVIEW_BRANCH &&
    process.env.CMS_SUPABASE_URL === CLOUD_CMS_URL;
  return local || preview;
}
export function requireSiteEnvironment(): void {
  if (!siteEnvironmentAllowed()) throw new Error("CMS site environment unavailable");
  getCmsConfig();
}
export function usesCmsSiteSource(kind?: SiteDocumentKind): boolean {
  if (!siteEnvironmentAllowed() || process.env.CMS_SITE_SOURCE !== "published") return false;
  // Only these three explicit rollout stages are valid. There is no wildcard,
  // implicit all-documents mode or activation through service/page flags.
  const allowlist = process.env.CMS_SITE_ALLOWLIST;
  if (allowlist !== "navigation" && allowlist !== "navigation,footer" &&
    allowlist !== "settings,navigation,footer") return false;
  return kind ? allowlist.split(",").includes(kind) : true;
}
