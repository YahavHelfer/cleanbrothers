import type { Metadata } from "next";
import { getPublicSpecialService } from "@/cms/content/public-source";
import { WindowCleaningLandingPage } from "@/components/WindowCleaningLandingPage";
import { buildMetadata } from "@/lib/seo";
import { specialMedia } from "@/cms/content/special-view";
import { PublicScheduledPromotion } from "@/cms/schedules/PublicScheduledPromotion";
import { getPublicActivePromotion } from "@/cms/schedules/public-source";
export async function generateMetadata(): Promise<Metadata> {
 const { content, media, images } = await getPublicSpecialService("window-cleaning");
 const image = images?.[0] || specialMedia(content, "hero", media)[0];
 return buildMetadata({ title: content.seoTitle, description: content.seoDescription,
   path: "/window-cleaning", image: image ? { url: image.src, alt: image.alt } : undefined });
}
export default async function WindowCleaningPage() {
 const {content, media, images} = await getPublicSpecialService("window-cleaning");
 if(content.schemaVersion !== 5) throw new Error("Invalid Window content");
 const active = await getPublicActivePromotion("service", "window-cleaning");
 const page = <WindowCleaningLandingPage content={content} media={media} serviceImages={images} />;
 return active ? <><PublicScheduledPromotion active={active} />{page}</> : page;
}
