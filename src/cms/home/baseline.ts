import { staticMediaId } from "@/cms/media/static-inventory";
import { beforeAfterContent } from "@/sections/BeforeAfter";
import { processContent } from "@/sections/CleaningProcess";
import { faqContent } from "@/sections/FAQ";
import { finalCtaContent } from "@/sections/FinalCTA";
import { heroContent } from "@/sections/Hero";
import { pricingGuideContent } from "@/sections/PricingGuide";
import { quickEstimateContent } from "@/sections/quick-estimate-content";
import { serviceAreasContent } from "@/sections/ServiceAreas";
import { servicesContent } from "@/sections/Services";
import { trustItems } from "@/sections/TrustStrip";
import { whyUsContent } from "@/sections/WhyChooseUs";
import { validateHomeDraft, type HomeBlock, type HomeBlockType } from "./model";

function section(type: HomeBlockType, position: number, payload: Record<string, unknown>,
  mediaVersionId: string | null = null, stableOrdinal = position + 1): HomeBlock {
  return { id: `d4000000-0000-4000-8000-${String(stableOrdinal).padStart(12, "0")}`, position,
    type, schemaVersion: 1, hidden: false, payload, mediaVersionId, promotionRevisionId: null };
}

// Exact current public copy/order; imported only by the isolated local operator.
// Static media are pinned to immutable inventory version IDs, not URL inputs.
export const homeBaseline = validateHomeDraft({
  schemaVersion: 12,
  publicTitle: "דף הבית",
  h1: heroContent.title,
  seoTitle: "CleanBrothers | ניקיון מקצועי לבית, לעסק ולרכב",
  seoDescription: "ניקוי ספות, מזרנים, שטיחים, ריפודי רכב, מזגנים וחלונות לבית ולעסק. שירות מקצועי עד הלקוח באזור המרכז מבית CleanBrothers.",
  canonical: "/",
  blocks: [
    section("homeHero", 0, heroContent, staticMediaId("/images/hero/hero-sofa-cleaning.jpg")),
    section("homeTrust", 1, { items: trustItems }),
    section("homeServices", 2, servicesContent),
    section("homeProcess", 3, processContent),
    section("homeBeforeAfter", 4, { ...beforeAfterContent, items: beforeAfterContent.items.map(item => ({
      title: item.title, category: item.category, description: item.description,
      beforeVersionId: staticMediaId(item.beforeImage), afterVersionId: staticMediaId(item.afterImage),
      beforeAlt: item.beforeAlt, afterAlt: item.afterAlt,
    })) }),
    section("homeWhyUs", 5, whyUsContent),
    { ...section("homeGoogleReviews", 6, { eyebrow: "מה אומרים עלינו", title: "ביקורות ב־Google Maps",
      description: "חוות דעת על השירות שלנו", showRatingSummary: true }, null, 12), hidden: true },
    section("homePricing", 7, pricingGuideContent, null, 7),
    section("homeEstimate", 8, quickEstimateContent, null, 8),
    section("homeAreas", 9, serviceAreasContent, null, 9),
    section("homeFaq", 10, faqContent, null, 10),
    section("homeFinalCta", 11, finalCtaContent, null, 11),
  ],
});
