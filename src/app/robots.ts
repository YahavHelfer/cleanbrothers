import type { MetadataRoute } from "next";
import { businessConfig } from "@/config/business";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${businessConfig.siteUrl}/sitemap.xml`,
  };
}
