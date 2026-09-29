import "server-only";

export const CMS_CLOUD_URL = "https://plbwefnwussxlglscfpn.supabase.co";
export const CMS_VERCEL_PROJECT_ID = "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A";
export const CMS_PRODUCTION_ORIGIN = "https://www.cleanbrothers.co.il";

export function approvedCmsProductionIdentity(): boolean {
  return process.env.VERCEL === "1" &&
    process.env.VERCEL_ENV === "production" &&
    process.env.VERCEL_PROJECT_ID === CMS_VERCEL_PROJECT_ID &&
    process.env.VERCEL_GIT_COMMIT_REF === "main" &&
    process.env.CMS_SUPABASE_URL === CMS_CLOUD_URL;
}

export function configuredCmsProduction(): boolean {
  return approvedCmsProductionIdentity() &&
    /^sb_publishable_[A-Za-z0-9_-]+$/.test(process.env.CMS_SUPABASE_PUBLISHABLE_KEY || "");
}
