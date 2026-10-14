import { managedServiceKeys } from "@/content/service-registry";

// Explicit route ownership: shared by the sitemap and the pre-render 404 guard.
// Published CMS slugs are resolved separately, through their existing allowlist.
export const publicPagePaths = [
  "/", "/services", ...managedServiceKeys.map(key => `/${key}`),
  "/gallery", "/about", "/contact", "/privacy-policy",
  "/accessibility-statement", "/data-deletion",
] as const;

export function isPublicPagePath(path: string): boolean {
  return publicPagePaths.some(candidate => candidate === path);
}
