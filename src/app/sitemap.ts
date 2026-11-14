import type { MetadataRoute } from "next";
import { businessConfig } from "@/config/business";
import { listPublicNewPageSlugs } from "@/cms/pages/new-public-source";
import { publicPagePaths } from "@/lib/public-routes";
import { isGuideSlug } from "@/content/guide-routes";
import { newPagePublicAllowed } from "@/cms/pages/new-environment";
import { guideUsesCms } from "@/content/guide-environment";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const published = await listPublicNewPageSlugs();
  // No synthetic lastmod: there is no reliable edit date for code-owned pages.
  // Once a guide is CMS-managed, only its published lifecycle may expose it.
  const codePages = publicPagePaths.filter(path =>
    !isGuideSlug(path.slice(1)) || (!newPagePublicAllowed(path.slice(1)) && !guideUsesCms(path.slice(1))));
  return [...new Set([...codePages, ...published.map(slug => `/${slug}`)])]
    .map(path => ({ url: new URL(path, businessConfig.siteUrl).href }));
}
