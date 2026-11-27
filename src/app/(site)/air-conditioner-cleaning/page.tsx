import { AcPriceTable } from "@/components/AcPriceTable";
import Link from "next/link";
import { localAcCityLinks, publishedLocalAcLinks } from "@/content/local-ac-pilot";
import { isAcPriceAlignmentPreview } from "@/lib/local-ac-preview";
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
  const active = isAcPriceAlignmentPreview() ? null : await getPublicActivePromotion("service", "air-conditioner-cleaning");
  const cityLinks = isAcPriceAlignmentPreview() ? localAcCityLinks : publishedLocalAcLinks;
  const page = <>
   <AirConditionerCleaningLandingPage content={content} media={media} serviceImages={images} />
   <section className="section-container max-w-3xl space-y-4 py-8" aria-labelledby="ac-service-pricing">
     <h2 id="ac-service-pricing" className="text-2xl font-black">מחירון ניקוי מזגנים</h2>
     <AcPriceTable />
   </section>
   {cityLinks.length > 0 && <nav aria-label="ניקוי מזגנים לפי עיר" className="section-container flex flex-wrap gap-4 py-6">
     {cityLinks.map(({ name, path }) => <Link key={path} className="underline" href={path}>ניקוי מזגנים ב{name}</Link>)}
   </nav>}
 </>;
  return active ? <><PublicScheduledPromotion active={active} />{page}</> : page;
}
