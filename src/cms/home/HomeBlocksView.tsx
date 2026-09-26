import { staticMediaInventory } from "@/cms/media/static-inventory";
import { BlockView, type BlockMedia, type BlockPromotions } from "@/cms/pages/PageBlocksView";
import type { PageBlock } from "@/cms/pages/model";
import { BeforeAfter, beforeAfterContent } from "@/sections/BeforeAfter";
import { CleaningProcess, processContent } from "@/sections/CleaningProcess";
import { FAQ, faqContent } from "@/sections/FAQ";
import { FinalCTA, finalCtaContent } from "@/sections/FinalCTA";
import { Hero, heroContent } from "@/sections/Hero";
import { PricingGuide, pricingGuideContent } from "@/sections/PricingGuide";
import { QuickPriceEstimate } from "@/sections/QuickPriceEstimate";
import { quickEstimateContent } from "@/sections/quick-estimate-content";
import { ServiceAreas, serviceAreasContent } from "@/sections/ServiceAreas";
import { Services, servicesContent } from "@/sections/Services";
import { TrustStrip } from "@/sections/TrustStrip";
import { WhyChooseUs, whyUsContent } from "@/sections/WhyChooseUs";
import { validateHomeDraft, type HomeBlock, type HomeDraft } from "./model";

export const staticHomeMedia: BlockMedia = Object.fromEntries(staticMediaInventory.map(item =>
  [item.versionId, { src: item.path, altText: item.alt }]));

export function homeFaqJsonLd(page: HomeDraft) {
  const faq = validateHomeDraft(page).blocks.find(block => block.type === "homeFaq" && !block.hidden);
  if (!faq) return null;
  const items = faq.payload.items as { question: string; answer: string }[];
  return { "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: items.map(item => ({ "@type": "Question", name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer } })) };
}

function HomeBlockView({ block, media, promotions, preview, revisionId }: {
  block: HomeBlock; media: BlockMedia; promotions: BlockPromotions; preview: boolean; revisionId: string;
}) {
  const p = block.payload;
  switch (block.type) {
    case "homeHero": {
      const backgroundSrc = block.mediaVersionId && media[block.mediaVersionId]?.src;
      if (!backgroundSrc) throw new Error("Homepage hero media unavailable");
      return <Hero content={p as typeof heroContent} backgroundSrc={backgroundSrc} preview={preview} />;
    }
    case "homeTrust": return <TrustStrip items={p.items as string[]} />;
    case "homeServices": return <Services content={p as typeof servicesContent} />;
    case "homeProcess": return <CleaningProcess content={p as typeof processContent} preview={preview} />;
    case "homeBeforeAfter": {
      const items = (p.items as { beforeVersionId: string; afterVersionId: string }[]).map(item => {
        const beforeImage = media[item.beforeVersionId]?.src, afterImage = media[item.afterVersionId]?.src;
        if (!beforeImage || !afterImage) throw new Error("Homepage gallery media unavailable");
        return { ...item, beforeImage, afterImage };
      });
      return <BeforeAfter content={{ ...p, items } as unknown as typeof beforeAfterContent} preview={preview} />;
    }
    case "homeWhyUs": return <WhyChooseUs content={p as typeof whyUsContent} />;
    case "homePricing": return <PricingGuide content={p as typeof pricingGuideContent} preview={preview} />;
    case "homeEstimate": return <QuickPriceEstimate content={p as typeof quickEstimateContent} preview={preview} />;
    case "homeAreas": return <ServiceAreas content={p as typeof serviceAreasContent} />;
    case "homeFaq": return <FAQ content={p as typeof faqContent} />;
    case "homeFinalCta": return <FinalCTA content={p as typeof finalCtaContent} preview={preview} />;
    default: return <BlockView block={block as PageBlock} media={media} promotions={promotions}
      preview={preview} revisionId={revisionId} />;
  }
}

export function HomeBlocksView({ page, revisionId, media = staticHomeMedia, promotions = {}, preview = false }: {
  page: HomeDraft; revisionId: string; media?: BlockMedia; promotions?: BlockPromotions; preview?: boolean;
}) {
  const draft = validateHomeDraft(page);
  return <>{draft.blocks.filter(block => !block.hidden).map(block => <HomeBlockView key={block.id}
    block={block} media={media} promotions={promotions} preview={preview} revisionId={revisionId} />)}</>;
}
