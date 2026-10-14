import type { MetadataRoute } from "next";
import { businessConfig } from "@/config/business";
import { listPublicNewPageSlugs } from "@/cms/pages/new-public-source";
import { publicPagePaths } from "@/lib/public-routes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const published = await listPublicNewPageSlugs();
  // No synthetic lastmod: there is no reliable edit date for code-owned pages.
  return [...new Set([...publicPagePaths, ...published.map(slug => `/${slug}`)])]
    .map(path => ({ url: new URL(path, businessConfig.siteUrl).href }));
}
