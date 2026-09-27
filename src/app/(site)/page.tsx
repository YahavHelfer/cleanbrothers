import { JsonLd } from "@/components/JsonLd";
import { buildServiceJsonLd } from "@/lib/structured-data";
import { getPublicSiteChrome } from "@/cms/site/public-source";
import { HomeBlocksView, homeFaqJsonLd } from "@/cms/home/HomeBlocksView";
import { getPublicHome } from "@/cms/home/public-source";
import { PublicScheduledPromotion } from "@/cms/schedules/PublicScheduledPromotion";
import { getPublicActivePromotion } from "@/cms/schedules/public-source";
import { buildMetadata } from "@/lib/seo";

const staticMetadata = buildMetadata({
  title: "CleanBrothers | ניקיון מקצועי לבית, לעסק ולרכב",
  description:
    "ניקוי ספות, מזרנים, שטיחים, ריפודי רכב, מזגנים וחלונות לבית ולעסק. שירות מקצועי עד הלקוח באזור המרכז מבית CleanBrothers.",
});

export async function generateMetadata() {
  const source = await getPublicHome();
  return source.source === "cms" ? buildMetadata({ title: source.page.seoTitle,
    description: source.page.seoDescription, path: "/" }) : staticMetadata;
}

export default async function Home() {
  const [{ settings }, source, homePromotion] = await Promise.all([getPublicSiteChrome(), getPublicHome(),
    getPublicActivePromotion("home", "home")]);
  const faq = homeFaqJsonLd(source.page);
  return (
    <>
      {faq && <JsonLd id="cleanbrothers-faq-jsonld" data={faq} />}
      <JsonLd id="cleanbrothers-service-jsonld" data={buildServiceJsonLd(settings)} />
      {homePromotion && <PublicScheduledPromotion active={homePromotion} />}
      <HomeBlocksView page={source.page} revisionId={source.revisionId || "static-home-baseline"}
        media={source.media} promotions={source.promotions} />
    </>
  );
}
