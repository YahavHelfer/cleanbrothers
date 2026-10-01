import "server-only";
import { getCmsConfig } from "@/cms/config";
import { approvedCmsPreviewIdentity } from "@/cms/preview-environment";
import { configuredCmsProduction } from "@/cms/production-environment";
import type { SiteDocumentKind } from "./model";

const LOCAL_CMS_URL = "http://127.0.0.1:56321";
// Admin access and public source selection have independent gates.
export function siteEnvironmentAllowed(): boolean {
  const local = !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === LOCAL_CMS_URL;
  const preview = approvedCmsPreviewIdentity();
  return local || preview || configuredCmsProduction();
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
