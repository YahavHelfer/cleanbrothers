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

// Request memoization keeps the public shell and JSON-LD on one settings
// revision. Documents outside the explicit rollout allowlist stay static.
export const getPublicSiteChrome = cache(async (): Promise<SiteChrome> => {
  if (!usesCmsSiteSource()) return staticChrome;
  await connection();
  const client = publicClient();
  const settingsEnabled = usesCmsSiteSource("settings");
  const navigationEnabled = usesCmsSiteSource("navigation");
  const footerEnabled = usesCmsSiteSource("footer");
  const [settingsResult,navigationResult,footerResult] = await Promise.all([
    settingsEnabled ? client.rpc("cms_read_public_site",{kind:"settings"}) : null,
    navigationEnabled ? client.rpc("cms_read_public_site",{kind:"navigation"}) : null,
    footerEnabled ? client.rpc("cms_read_public_site",{kind:"footer"}) : null,
  ]);
  if ((settingsEnabled && (settingsResult?.error || !settingsResult?.data)) ||
    (navigationEnabled && (navigationResult?.error || !navigationResult?.data)) ||
    (footerEnabled && (footerResult?.error || !footerResult?.data)))
    throw new Error("Published CMS site chrome unavailable");
  const pageRoutes = navigationEnabled ? navigationResult!.data.pageRoutes : {};
  if (!pageRoutes || typeof pageRoutes !== "object" || Array.isArray(pageRoutes))
    throw new Error("Published CMS page references unavailable");
  return resolveSiteChrome(
    settingsEnabled ? validateSiteSettings(settingsResult!.data.payload) : siteSettingsBaseline,
    navigationEnabled ? validateSiteNavigation(navigationResult!.data.payload) : siteNavigationBaseline,
    footerEnabled ? validateSiteFooter(footerResult!.data.payload) : siteFooterBaseline,
    pageRoutes as Record<string,string>,
    { settings: settingsEnabled ? settingsResult!.data.revisionId : null,
      navigation: navigationEnabled ? navigationResult!.data.revisionId : null,
      footer: footerEnabled ? footerResult!.data.revisionId : null },
  );
});
