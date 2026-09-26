import "server-only";
import { getCmsConfig } from "@/cms/config";
import { pagesEnvironmentAllowed } from "./environment";
import { validateNewPageSlug } from "./routes";

// Reuse the exact local/CMS-project/Preview-branch boundary used by managed pages.
// Public routing still requires the independent source and slug allowlist below.
export function newPagesEnvironmentAllowed(): boolean {
  return pagesEnvironmentAllowed();
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
