import "server-only";
import { approvedPagePreview } from "@/cms/pages/environment";

const LOCAL_URL = "http://127.0.0.1:56321";
export function manualCampaignAdminAllowed(): boolean {
  return (!process.env.VERCEL && !process.env.VERCEL_ENV && process.env.CMS_SUPABASE_URL === LOCAL_URL) ||
    approvedPagePreview();
}

// Deliberately no Production branch. A future hosted rollout requires a
// separate reviewed gate, cloud migration, and explicit source activation.
export function manualCampaignPublicAllowed(): boolean {
  const local = !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === LOCAL_URL &&
    process.env.CMS_MANUAL_PROMOTIONS_LOCAL_ENABLED === "true";
  return (local || approvedPagePreview()) &&
    process.env.CMS_MANUAL_PROMOTIONS_SOURCE === "active";
}
