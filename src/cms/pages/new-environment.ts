import "server-only";
import { getCmsConfig } from "@/cms/config";
import { validateNewPageSlug } from "./routes";

// Phase 3B1 is deliberately local. The future protected Preview rollout must
// replace this gate explicitly; Vercel variables alone cannot activate it.
export function newPagesEnvironmentAllowed(): boolean {
  return !process.env.VERCEL && !process.env.VERCEL_ENV &&
    process.env.CMS_SUPABASE_URL === "http://127.0.0.1:56321";
}
export function requireNewPagesEnvironment(): void {
  if (!newPagesEnvironmentAllowed()) throw new Error("New CMS pages unavailable");
  getCmsConfig();
}
export function newPagePublicAllowed(slug: unknown): boolean {
  if (!newPagesEnvironmentAllowed() || process.env.CMS_NEW_PAGE_SOURCE !== "published") return false;
  let key: string;
  try { key = validateNewPageSlug(slug); } catch { return false; }
  const values = (process.env.CMS_NEW_PAGE_ALLOWLIST || "").split(",");
  return values.length > 0 && values.every(value => {
    try { return validateNewPageSlug(value) === value; } catch { return false; }
  }) && new Set(values).size === values.length && values.includes(key);
}
export function allowedNewPageSlugs(): string[] {
  if (!newPagesEnvironmentAllowed() || process.env.CMS_NEW_PAGE_SOURCE !== "published") return [];
  const values = (process.env.CMS_NEW_PAGE_ALLOWLIST || "").split(",");
  try {
    if (new Set(values).size !== values.length) return [];
    return values.map(validateNewPageSlug);
  } catch { return []; }
}
