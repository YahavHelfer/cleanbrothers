import "server-only";
import { approvedPagePreview } from "@/cms/pages/environment";
import { configuredCmsProduction } from "@/cms/production-environment";

const LOCAL_URL = "http://127.0.0.1:56321";
export function manualCampaignAdminAllowed(): boolean {
  return (!process.env.VERCEL && !process.env.VERCEL_ENV && process.env.CMS_SUPABASE_URL === LOCAL_URL) ||
    approvedPagePreview() || configuredCmsProduction();
}

// Admin access is independent of the explicitly activated public source.
export function manualCampaignPublicAllowed(): boolean {
  const local = !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === LOCAL_URL &&
    process.env.CMS_MANUAL_PROMOTIONS_LOCAL_ENABLED === "true";
  return (local || approvedPagePreview() || configuredCmsProduction()) &&
    process.env.CMS_MANUAL_PROMOTIONS_SOURCE === "active";
}
