import type { MetadataRoute } from "next";
import { businessConfig } from "@/config/business";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/services", "/gallery", "/about", "/contact"];

  return routes.map((route) => ({
    url: `${businessConfig.siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}
