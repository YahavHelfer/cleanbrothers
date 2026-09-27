import { PromotionBannerView } from "@/cms/pages/PromotionBannerView";
import type { PublicActivePromotion } from "./public-source";

export function PublicScheduledPromotion({ active }: { active: PublicActivePromotion }) {
  return <PromotionBannerView promotion={active.promotion} template={active.promotion.template}
    identity={active.key} media={active.media} preview={false} />;
}
