import "server-only";
import { getCmsConfig } from "@/cms/config";
import { approvedCmsPreviewIdentity } from "@/cms/preview-environment";
import { configuredCmsProduction } from "@/cms/production-environment";

const LOCAL_CMS_URL = "http://127.0.0.1:56321";
export function approvedPagePreview(): boolean {
  return approvedCmsPreviewIdentity();
}

export function pagesEnvironmentAllowed(): boolean {
  const local = !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === LOCAL_CMS_URL;
  return local || approvedPagePreview() || configuredCmsProduction();
}

export function requirePagesEnvironment(): void {
  if (!pagesEnvironmentAllowed()) throw new Error("CMS page environment unavailable");
  getCmsConfig();
}

// Page publication is independent of every service-content flag. The only
// public page in this phase is /about, selected by an exact allowlist entry.
export function usesCmsPageSource(key: unknown): boolean {
  if (key !== "about" || process.env.CMS_PAGE_SOURCE !== "published") return false;
  const keys = (process.env.CMS_PAGE_ALLOWLIST || "").split(",");
  return keys.length === 1 && keys[0] === "about" && pagesEnvironmentAllowed();
}
