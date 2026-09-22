import "server-only";

// Phase 2A1 cannot operate on cloud, even if its code is accidentally deployed.
export function requireLocalContentEnvironment() {
  if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.CMS_SUPABASE_URL !== "http://127.0.0.1:56321") {
    throw new Error("CMS content is available only in the isolated local environment");
  }
}
