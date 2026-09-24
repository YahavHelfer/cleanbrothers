import type { Metadata } from "next";
import { AirConditionerCleaningLandingPage } from "@/components/AirConditionerCleaningLandingPage";
import { businessConfig } from "@/config/business";
import { getPublicSpecialService } from "@/cms/content/public-source";
import { specialMedia } from "@/cms/content/special-view";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
 const { content, media } = await getPublicSpecialService("air-conditioner-cleaning");
 if (content.schemaVersion !== 4) throw new Error("Invalid AC content");
 const title = content.seoTitle, description = content.seoDescription;
 const seoImage = specialMedia(content, "seo", media)[0];
 return {
  ...buildMetadata({
    title,
    description,
    path: "/air-conditioner-cleaning",
  }),
  keywords: content.keywords,
  openGraph: {
    title,
    description,
    url: `${businessConfig.siteUrl}/air-conditioner-cleaning`,
    siteName: businessConfig.name,
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: seoImage.src,
        alt: seoImage.alt,
      },
    ],
  },
};

}
export default async function AirConditionerCleaningPage() {
  const { content, media } = await getPublicSpecialService("air-conditioner-cleaning");
  if (content.schemaVersion !== 4) throw new Error("Invalid AC content");
  return <AirConditionerCleaningLandingPage content={content} media={media} />;
}
