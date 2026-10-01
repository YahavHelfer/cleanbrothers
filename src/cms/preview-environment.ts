import "server-only";

const CMS_PREVIEW_PROJECT_ID = "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A";
const CMS_PREVIEW_SUPABASE_URL = "https://plbwefnwussxlglscfpn.supabase.co";
const CMS_PREVIEW_BRANCHES = [
  "feature/cms-cloud-foundation",
  "feature/cms-manual-promotions",
] as const;

export function approvedCmsPreviewIdentity(): boolean {
  return process.env.VERCEL === "1" &&
    process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_PROJECT_ID === CMS_PREVIEW_PROJECT_ID &&
    process.env.CMS_SUPABASE_URL === CMS_PREVIEW_SUPABASE_URL &&
    CMS_PREVIEW_BRANCHES.some(branch => process.env.VERCEL_GIT_COMMIT_REF === branch);
}
