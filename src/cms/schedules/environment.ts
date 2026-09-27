import "server-only";

export function schedulesLocalEnabled(): boolean {
  if (process.env.CMS_SCHEDULE_LOCAL_ENABLED !== "true" || process.env.VERCEL || process.env.VERCEL_ENV) return false;
  return process.env.CMS_SUPABASE_URL === "http://127.0.0.1:56321";
}

export function requireLocalSchedules(): void {
  if (!schedulesLocalEnabled()) throw new Error("Scheduled Promotions are local-only in Phase 4A1");
}
