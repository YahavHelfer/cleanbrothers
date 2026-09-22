import "server-only";
import { getCmsConfig } from "@/cms/config";

export function mediaLocalEnabled() {
  return (
    process.env.CMS_MEDIA_LOCAL_ENABLED === "1" &&
    !process.env.VERCEL &&
    !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === "http://127.0.0.1:56321"
  );
}
export function requireMediaEnvironment() {
  if (!mediaLocalEnabled()) throw new Error("Local CMS media unavailable");
  getCmsConfig();
}
