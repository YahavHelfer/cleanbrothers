import "server-only";
import { getCmsConfig } from "@/cms/config";

const LOCAL_CMS_URL = "http://127.0.0.1:56321";

// Phase 3C1 is local-only. Hosted Preview and Production remain static even if
// someone accidentally adds every flag below to Vercel.
export function siteEnvironmentAllowed(): boolean {
  return !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === LOCAL_CMS_URL;
}
export function requireSiteEnvironment(): void {
  if (!siteEnvironmentAllowed()) throw new Error("CMS site environment unavailable");
  getCmsConfig();
}
export function usesCmsSiteSource(): boolean {
  return siteEnvironmentAllowed() && process.env.CMS_SITE_SOURCE === "published" &&
    process.env.CMS_SITE_ALLOWLIST === "settings,navigation,footer";
}
