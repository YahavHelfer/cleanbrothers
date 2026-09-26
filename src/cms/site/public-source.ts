import "server-only";
import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { cache } from "react";
import { getCmsConfig } from "@/cms/config";
import { serviceRegistry } from "@/content/service-registry";
import { siteSettingsBaseline, siteNavigationBaseline, siteFooterBaseline } from "./baseline";
import { usesCmsSiteSource } from "./environment";
import { siteTargetPath, validateSiteFooter, validateSiteNavigation, validateSiteSettings,
  type SiteFooter, type SiteNavigation, type SiteSettings } from "./model";

export type SiteChrome = {
  settings: SiteSettings; navigation: SiteNavigation; footer: SiteFooter;
  navLinks: { label: string; href: string }[];
  featuredServiceLinks: { label: string; href: string }[];
  pageRoutes: Record<string,string>;
  revisions: { settings: string | null; navigation: string | null; footer: string | null };
};
export function resolveSiteChrome(settings: SiteSettings, navigation: SiteNavigation,
  footer: SiteFooter, pageRoutes: Record<string,string> = {}, revisions: SiteChrome["revisions"] =
    { settings: null, navigation: null, footer: null }): SiteChrome {
  const navLinks = navigation.items.filter(item => item.visible).map(item => {
    const href = siteTargetPath(item.target,pageRoutes);
    if (!href) throw new Error("Published navigation target unavailable");
    return { label: item.label, href };
  });
  const featuredServiceLinks = footer.featuredServices.map(key => ({
    label: serviceRegistry[key].crmName, href: serviceRegistry[key].path,
  }));
  return { settings, navigation, footer, navLinks, featuredServiceLinks, pageRoutes, revisions };
}

const staticChrome = resolveSiteChrome(siteSettingsBaseline,siteNavigationBaseline,siteFooterBaseline);
function publicClient() {
  const { url, key } = getCmsConfig();
  return createClient(url,key,{ auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input,init) => fetch(input,{ ...init,cache: "no-store",signal: AbortSignal.timeout(8000) }) } });
}

// Request memoization keeps the public shell and LocalBusiness JSON-LD on one
// settings revision. The hosted site always returns the code-owned baseline.
export const getPublicSiteChrome = cache(async (): Promise<SiteChrome> => {
  if (!usesCmsSiteSource()) return staticChrome;
  await connection();
  const client = publicClient();
  const [settingsResult,navigationResult,footerResult] = await Promise.all([
    client.rpc("cms_read_public_site",{kind:"settings"}),
    client.rpc("cms_read_public_site",{kind:"navigation"}),
    client.rpc("cms_read_public_site",{kind:"footer"}),
  ]);
  if (settingsResult.error || navigationResult.error || footerResult.error ||
    !settingsResult.data || !navigationResult.data || !footerResult.data)
    throw new Error("Published CMS site chrome unavailable");
  const pageRoutes = navigationResult.data.pageRoutes;
  if (!pageRoutes || typeof pageRoutes !== "object" || Array.isArray(pageRoutes))
    throw new Error("Published CMS page references unavailable");
  return resolveSiteChrome(
    validateSiteSettings(settingsResult.data.payload),
    validateSiteNavigation(navigationResult.data.payload),
    validateSiteFooter(footerResult.data.payload),
    pageRoutes as Record<string,string>,
    { settings: settingsResult.data.revisionId, navigation: navigationResult.data.revisionId,
      footer: footerResult.data.revisionId },
  );
});
