import { JsonLd } from "@/components/JsonLd";
import { faqJsonLd, serviceJsonLd } from "@/lib/structured-data";
import { BeforeAfter } from "@/sections/BeforeAfter";
import { CleaningProcess } from "@/sections/CleaningProcess";
import { FAQ } from "@/sections/FAQ";
import { FinalCTA } from "@/sections/FinalCTA";
import { Hero } from "@/sections/Hero";
import { PricingGuide } from "@/sections/PricingGuide";
import { QuickPriceEstimate } from "@/sections/QuickPriceEstimate";
import { ServiceAreas } from "@/sections/ServiceAreas";
import { Services } from "@/sections/Services";
import { TrustStrip } from "@/sections/TrustStrip";
import { WhyChooseUs } from "@/sections/WhyChooseUs";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "CleanBrothers | ניקיון מקצועי לבית, לעסק ולרכב",
  description:
    "ניקוי ספות, מזרנים, שטיחים, ריפודי רכב, מזגנים וחלונות לבית ולעסק. שירות מקצועי עד הלקוח באזור המרכז מבית CleanBrothers.",
});

export default function Home() {
  return (
    <>
      <JsonLd id="cleanbrothers-faq-jsonld" data={faqJsonLd} />
      <JsonLd id="cleanbrothers-service-jsonld" data={serviceJsonLd} />
      <Hero />
      <TrustStrip />
      <Services />
      <CleaningProcess />
      <BeforeAfter />
      <WhyChooseUs />
      <PricingGuide />
      <QuickPriceEstimate />
      <ServiceAreas />
      <FAQ />
      <FinalCTA />
    </>
  );
}
