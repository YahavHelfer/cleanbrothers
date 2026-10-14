import type { Metadata } from "next";
import { AirConditionerCleaningLandingPage } from "@/components/AirConditionerCleaningLandingPage";
import { getPublicSpecialService } from "@/cms/content/public-source";
import { specialMedia } from "@/cms/content/special-view";
import { buildMetadata } from "@/lib/seo";
import { PublicScheduledPromotion } from "@/cms/schedules/PublicScheduledPromotion";
import { getPublicActivePromotion } from "@/cms/schedules/public-source";

export async function generateMetadata(): Promise<Metadata> {
 const { content, media } = await getPublicSpecialService("air-conditioner-cleaning");
 if (content.schemaVersion !== 4) throw new Error("Invalid AC content");
 const title = content.seoTitle, description = content.seoDescription;
 const seoImage = specialMedia(content, "seo", media)[0];
 return {
  ...buildMetadata({ title, description, path: "/air-conditioner-cleaning",
    image: seoImage ? { url: seoImage.src, alt: seoImage.alt } : undefined }),
  keywords: content.keywords,
 };

}
export default async function AirConditionerCleaningPage() {
  const { content, media, images } = await getPublicSpecialService("air-conditioner-cleaning");
  if (content.schemaVersion !== 4) throw new Error("Invalid AC content");
  const active = await getPublicActivePromotion("service", "air-conditioner-cleaning");
  const page = <AirConditionerCleaningLandingPage content={content} media={media} serviceImages={images} />;
  return active ? <><PublicScheduledPromotion active={active} />{page}</> : page;
}
