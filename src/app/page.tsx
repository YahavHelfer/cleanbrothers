import { JsonLd } from "@/components/JsonLd";
import { faqJsonLd } from "@/lib/structured-data";
import { BeforeAfter } from "@/sections/BeforeAfter";
import { AirConditionerFeature } from "@/sections/AirConditionerFeature";
import { CleaningExamples } from "@/sections/CleaningExamples";
import { CleaningProcess } from "@/sections/CleaningProcess";
import { CustomerTrust } from "@/sections/CustomerTrust";
import { FAQ } from "@/sections/FAQ";
import { FinalCTA } from "@/sections/FinalCTA";
import { Hero } from "@/sections/Hero";
import { PricingGuide } from "@/sections/PricingGuide";
import { QuickPriceEstimate } from "@/sections/QuickPriceEstimate";
import { ServiceAreas } from "@/sections/ServiceAreas";
import { Services } from "@/sections/Services";
import { Testimonials } from "@/sections/Testimonials";
import { TrustStrip } from "@/sections/TrustStrip";
import { WhyChooseUs } from "@/sections/WhyChooseUs";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "CleanBrothers | ניקוי מזגנים מקצועי, ספות וריפודים בבית הלקוח",
  description:
    "CleanBrothers מספקים ניקוי מזגנים מקצועי בבית הלקוח, לצד ניקוי ספות, ריפודים, מזרנים, שטיחים וריפודי רכב. שירות עד הבית עם ציוד מקצועי באזור המרכז.",
});

export default function Home() {
  return (
    <>
      <JsonLd id="cleanbrothers-faq-jsonld" data={faqJsonLd} />
      <Hero />
      <TrustStrip />
      <AirConditionerFeature />
      <Services />
      <CleaningExamples />
      <BeforeAfter />
      <CustomerTrust />
      <WhyChooseUs />
      <CleaningProcess />
      <Testimonials />
      <PricingGuide />
      <QuickPriceEstimate />
      <ServiceAreas />
      <FAQ />
      <FinalCTA />
    </>
  );
}
