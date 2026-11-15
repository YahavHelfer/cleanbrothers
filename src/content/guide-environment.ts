import "server-only";
import { isGuideSlug } from "./guide-routes";

// Treat an allowlisted guide as CMS-owned even when its source flag or hosting
// identity is invalid. Configuration failures must not revive launch content.
export function guideUsesCms(slug: string): boolean {
  if (!isGuideSlug(slug)) return false;
  const intended = (process.env.CMS_NEW_PAGE_ALLOWLIST || "").split(",").map(value => value.trim());
  return intended.includes(slug) || intended.includes("*");
}
