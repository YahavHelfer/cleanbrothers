import { JsonLd } from "@/components/JsonLd";
import { faqJsonLd } from "@/lib/structured-data";
import { BeforeAfter } from "@/sections/BeforeAfter";
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
  title: "CleanBrothers | ניקוי ספות, ריפודים, שטיחים ומזגנים בבית הלקוח",
  description:
    "CleanBrothers מספקים ניקוי ספות, ריפודים, מזרנים, שטיחים, ריפודי רכב וניקוי מזגנים בבית הלקוח בראש העין, פתח תקווה, הוד השרון, כפר סבא, רמת גן, גבעתיים, תל אביב ומרכז הארץ.",
});

export default function Home() {
  return (
    <>
      <JsonLd id="cleanbrothers-faq-jsonld" data={faqJsonLd} />
      <Hero />
      <TrustStrip />
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
