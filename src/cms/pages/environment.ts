import "server-only";
import { getCmsConfig } from "@/cms/config";

// Phase 3A1 deliberately has no hosted Preview or Production activation path.
export function pagesLocalOnly(): boolean {
  return !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === "http://127.0.0.1:56321";
}
export function requirePagesLocalEnvironment(): void {
  if (!pagesLocalOnly()) throw new Error("CMS page pilot is local only");
  getCmsConfig();
}
