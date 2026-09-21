import "server-only";

export const CMS_COOKIE_NAME = "cb-cms-auth";

export function isCmsCookie(name: string): boolean {
  return name === CMS_COOKIE_NAME || new RegExp(`^${CMS_COOKIE_NAME}\\.\\d+$`).test(name);
}

export function getCmsConfig() {
  const url = process.env.CMS_SUPABASE_URL;
  const key = process.env.CMS_SUPABASE_PUBLISHABLE_KEY;
  // Phase 1B-A deliberately cannot connect to any hosted or CRM project.
  if (url !== "http://127.0.0.1:56321" || !key || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error("CMS configuration unavailable");
  }
  return { url, key };
}

export const cmsCookieOptions = {
  name: CMS_COOKIE_NAME,
  path: "/admin",
  httpOnly: true,
  sameSite: "lax" as const,
  // The only supported origin in this phase is local HTTP. Cloud requires HTTPS.
  secure: false,
};
