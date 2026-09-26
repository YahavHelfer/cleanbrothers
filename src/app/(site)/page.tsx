import { JsonLd } from "@/components/JsonLd";
import { buildServiceJsonLd } from "@/lib/structured-data";
import { getPublicSiteChrome } from "@/cms/site/public-source";
import { HomeBlocksView, homeFaqJsonLd } from "@/cms/home/HomeBlocksView";
import { getPublicHome } from "@/cms/home/public-source";
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
  const [{ settings }, source] = await Promise.all([getPublicSiteChrome(), getPublicHome()]);
  const faq = homeFaqJsonLd(source.page);
  return (
    <>
      {faq && <JsonLd id="cleanbrothers-faq-jsonld" data={faq} />}
      <JsonLd id="cleanbrothers-service-jsonld" data={buildServiceJsonLd(settings)} />
      <HomeBlocksView page={source.page} revisionId={source.revisionId || "static-home-baseline"}
        media={source.media} promotions={source.promotions} />
    </>
  );
}
