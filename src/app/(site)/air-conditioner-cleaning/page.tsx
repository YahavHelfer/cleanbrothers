import type { Metadata } from "next";
import { AirConditionerCleaningLandingPage } from "@/components/AirConditionerCleaningLandingPage";
import { businessConfig } from "@/config/business";
import { serviceImages } from "@/data/serviceImages";
import { buildMetadata } from "@/lib/seo";

const title = "ניקוי מזגנים מקצועי עד הבית | CleanBrothers";
const description =
  "ניקוי מזגנים מקצועי עד הבית באזור המרכז. שלחו תמונה בוואטסאפ, קבלו הערכת מחיר ותיאום מהיר עם CleanBrothers.";

export const metadata: Metadata = {
  ...buildMetadata({
    title,
    description,
    path: "/air-conditioner-cleaning",
  }),
  keywords: [
    "ניקוי מזגנים",
    "ניקוי מזגן",
    "ניקוי מזגן עילי",
    "ניקוי מזגנים בבית",
    "ניקוי מזגן מריח רע",
    "ניקוי מזגנים במרכז",
    "ניקוי מזגנים מקצועי",
  ],
  openGraph: {
    title,
    description,
    url: `${businessConfig.siteUrl}/air-conditioner-cleaning`,
    siteName: businessConfig.name,
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: serviceImages.airConditioner[0],
        alt: "ניקוי מזגן מקצועי של CleanBrothers בבית הלקוח",
      },
    ],
  },
};

export default function AirConditionerCleaningPage() {
  return <AirConditionerCleaningLandingPage />;
}
