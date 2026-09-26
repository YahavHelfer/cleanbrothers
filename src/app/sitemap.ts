import type { MetadataRoute } from "next";
import { businessConfig } from "@/config/business";
import { listPublicNewPageSlugs } from "@/cms/pages/new-public-source";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [
    "",
    "/services",
    "/air-conditioner-cleaning",
    "/window-cleaning",
    "/sofa-cleaning",
    "/mattress-cleaning",
    "/carpet-cleaning",
    "/car-upholstery-cleaning",
    "/armchair-chair-cleaning",
    "/delicate-upholstery-cleaning",
    "/gallery",
    "/about",
    "/contact",
    "/privacy-policy",
    "/accessibility-statement",
  ];

  const published = await listPublicNewPageSlugs();
  return [...routes,...published.map(slug => `/${slug}`)].map((route) => ({
    url: `${businessConfig.siteUrl}${route}`,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}
