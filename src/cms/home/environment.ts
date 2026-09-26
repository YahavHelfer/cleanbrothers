import "server-only";
import { getCmsConfig } from "@/cms/config";
import { approvedPagePreview, pagesEnvironmentAllowed } from "@/cms/pages/environment";

export function approvedHomePreview(): boolean { return approvedPagePreview(); }
export function homeEnvironmentAllowed(): boolean { return pagesEnvironmentAllowed(); }
export function requireHomeEnvironment(): void {
  if (!homeEnvironmentAllowed()) throw new Error("CMS homepage environment unavailable");
  getCmsConfig();
}
export function usesCmsHomeSource(): boolean {
  return homeEnvironmentAllowed() && process.env.CMS_HOME_SOURCE === "published" &&
    process.env.CMS_HOME_ALLOWLIST === "home";
}
