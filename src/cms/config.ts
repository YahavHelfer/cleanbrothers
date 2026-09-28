import "server-only";

export const CMS_COOKIE_NAME = "cb-cms-auth";
const LOCAL_CMS_URL = "http://127.0.0.1:56321";
// Dedicated Free CMS project, verified in Phase 1B-B1. Never a CRM endpoint.
const CLOUD_CMS_URL = "https://plbwefnwussxlglscfpn.supabase.co";
const CMS_PREVIEW_ORIGIN = "https://cleanbrothers-git-feature-cms-c-061c94-yahavs-projects-6b5e850f.vercel.app";

function isLocalCms() {
  return !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === LOCAL_CMS_URL;
}

export function isCmsCookie(name: string): boolean {
  return name === CMS_COOKIE_NAME || new RegExp(`^${CMS_COOKIE_NAME}\\.\\d+$`).test(name);
}

export function getCmsConfig() {
  const url = process.env.CMS_SUPABASE_URL;
  const key = process.env.CMS_SUPABASE_PUBLISHABLE_KEY;
  const isCmsPreview = process.env.VERCEL === "1" &&
    process.env.VERCEL_ENV === "preview" && url === CLOUD_CMS_URL;
  // Cloud is enabled only for this verified project on Vercel Preview.
  // Production, arbitrary hosted URLs and hosted loopback settings fail closed.
  if ((!isLocalCms() && !isCmsPreview) || !url || !key || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error("CMS configuration unavailable");
  }
  return { url, key };
}

export function getCmsAppOrigin(): string {
  getCmsConfig();
  return isLocalCms() ? "http://127.0.0.1:56300" : CMS_PREVIEW_ORIGIN;
}

export const cmsCookieOptions = {
  name: CMS_COOKIE_NAME,
  path: "/admin",
  httpOnly: true,
  sameSite: "lax" as const,
  // Only explicit local loopback HTTP may omit Secure, including local next start.
  // Hosted, missing and invalid configuration all retain HTTPS-only cookies.
  secure: !isLocalCms(),
};
