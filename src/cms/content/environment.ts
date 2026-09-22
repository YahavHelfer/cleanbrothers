import "server-only";
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
