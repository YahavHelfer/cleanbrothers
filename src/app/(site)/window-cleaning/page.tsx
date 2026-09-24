import type { Metadata } from "next";
import { getPublicSpecialService } from "@/cms/content/public-source";
import { WindowCleaningLandingPage } from "@/components/WindowCleaningLandingPage";
import { buildMetadata } from "@/lib/seo";
export async function generateMetadata(): Promise<Metadata> {
 const { content } = await getPublicSpecialService("window-cleaning");
 return buildMetadata({ title: content.seoTitle, description: content.seoDescription, path: "/window-cleaning" });
}
export default async function WindowCleaningPage() {
 const {content, media} = await getPublicSpecialService("window-cleaning");
 if(content.schemaVersion !== 5) throw new Error("Invalid Window content");
 return <WindowCleaningLandingPage content={content} media={media} />;
}
