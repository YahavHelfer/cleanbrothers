import "server-only";
import { approvedPagePreview } from "@/cms/pages/environment";
import { configuredCmsProduction } from "@/cms/production-environment";

function approvedCmsProjectUrl(): boolean {
  const raw = process.env.CMS_SUPABASE_URL;
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname === "plbwefnwussxlglscfpn.supabase.co" &&
      url.port === "" && url.username === "" && url.password === "" &&
      url.pathname === "/" && url.search === "" && url.hash === "";
  } catch {
    return false;
  }
}

export function schedulesEnvironmentAllowed(): boolean {
  const local = process.env.CMS_SCHEDULE_LOCAL_ENABLED === "true" &&
    !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === "http://127.0.0.1:56321";
  return local || (approvedPagePreview() && approvedCmsProjectUrl()) || configuredCmsProduction();
}

export function requireSchedulesEnvironment(): void {
  if (!schedulesEnvironmentAllowed()) throw new Error("Scheduled Promotions environment unavailable");
}
