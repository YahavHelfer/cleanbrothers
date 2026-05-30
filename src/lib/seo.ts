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
  "ניקוי מזגנים בבית הלקוח",
  "ניקוי ספות בבית הלקוח",
  "ניקוי ריפודים במרכז",
  ...businessConfig.serviceAreas.map((area) => `ניקוי ריפודים ב${area}`),
];

type BuildMetadataArgs = {
  title: string;
  description: string;
  path?: string;
};

export function buildMetadata({
  title,
  description,
  path = "/",
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
      images: [
        {
          url: "/images/logo/cleanbrothers-logo.png",
          width: 1200,
          height: 630,
          alt: "CleanBrothers",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/logo/cleanbrothers-logo.png"],
    },
  };
}
