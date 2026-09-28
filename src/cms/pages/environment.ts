import "server-only";
import { getCmsConfig } from "@/cms/config";

const LOCAL_CMS_URL = "http://127.0.0.1:56321";
const CLOUD_CMS_URL = "https://plbwefnwussxlglscfpn.supabase.co";
const PREVIEW_PROJECT_ID = "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A";
const PREVIEW_BRANCH = "feature/cms-cloud-foundation";

export function approvedPagePreview(): boolean {
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_PROJECT_ID === PREVIEW_PROJECT_ID &&
    process.env.VERCEL_GIT_COMMIT_REF === PREVIEW_BRANCH &&
    process.env.CMS_SUPABASE_URL === CLOUD_CMS_URL;
}

export function pagesEnvironmentAllowed(): boolean {
  const local = !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === LOCAL_CMS_URL;
  return local || approvedPagePreview();
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
