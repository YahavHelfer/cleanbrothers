import type { Metadata } from "next";
import { businessConfig } from "@/config/business";

export const seoKeywords = [
  "ניקוי ספות",
  "ניקוי ריפודים",
  "ניקוי מזרנים",
  "ניקוי שטיחים",
  "ניקוי רכב",
  "ניקוי ריפודי רכב",
  "ניקוי מזגנים",
  "ניקוי מזגן",
  "ניקוי חלונות",
  "ניקוי חלונות לבית ולעסק",
  "ניקוי מזגנים בבית הלקוח",
  "ניקוי ספות בבית הלקוח",
  "ניקוי ריפודים במרכז",
  ...businessConfig.serviceAreas.filter(area => area !== "והסביבה").map((area) => `ניקוי ריפודים ב${area}`),
];

type BuildMetadataArgs = {
  title: string;
  description: string;
  path?: string;
  image?: { url: string; alt: string };
};

export function buildMetadata({
  title,
  description,
  path = "/",
  image,
}: BuildMetadataArgs): Metadata {
  const url = new URL(path, businessConfig.siteUrl).toString();

  return {
    title,
    description,
    keywords: seoKeywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: businessConfig.name,
      locale: "he_IL",
      type: "website",
      images: image ? [image] : [
        {
          url: "/images/logo/cleanbrothers-logo.png",
          width: 600,
          height: 600,
          alt: "CleanBrothers",
        },
      ],
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: [image?.url || "/images/logo/cleanbrothers-logo.png"],
    },
  };
}
