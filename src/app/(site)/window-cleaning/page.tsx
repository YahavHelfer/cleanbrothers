import type { Metadata } from "next";
import { getPublicSpecialService } from "@/cms/content/public-source";
import { WindowCleaningLandingPage } from "@/components/WindowCleaningLandingPage";
import { buildMetadata } from "@/lib/seo";
import { PublicScheduledPromotion } from "@/cms/schedules/PublicScheduledPromotion";
import { getPublicActivePromotion } from "@/cms/schedules/public-source";
export async function generateMetadata(): Promise<Metadata> {
 const { content } = await getPublicSpecialService("window-cleaning");
 return buildMetadata({ title: content.seoTitle, description: content.seoDescription, path: "/window-cleaning" });
}
export default async function WindowCleaningPage() {
 const {content, media, images} = await getPublicSpecialService("window-cleaning");
 if(content.schemaVersion !== 5) throw new Error("Invalid Window content");
 const active = await getPublicActivePromotion("service", "window-cleaning");
 const page = <WindowCleaningLandingPage content={content} media={media} serviceImages={images} />;
 return active ? <><PublicScheduledPromotion active={active} />{page}</> : page;
}
