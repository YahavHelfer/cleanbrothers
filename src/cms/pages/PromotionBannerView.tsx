import Image from "next/image";
import { resolveSafeTarget, validatePromotionDraft, type PromotionDraft } from "./model";

export function PromotionBannerView({ promotion, template, identity, media, preview }: {
  promotion: PromotionDraft; template: "accent" | "quiet"; identity: string;
  media: { src: string; altText: string } | null; preview: boolean;
}) {
  const exact = validatePromotionDraft(promotion);
  if (!exact.enabled) return null;
  if (exact.mediaVersionId && !media) throw new Error("CMS promotion media unavailable");
  const href = resolveSafeTarget(exact.cta.target, preview);
  return <section className={template === "accent" ? "section-block theme-section-contrast" : "section-block theme-section-soft"}
    data-promotion-identity={identity}>
    <div className="section-container grid gap-4 rounded-2xl border theme-card p-6">
      <h2 className="text-2xl font-black">{exact.h1}</h2><p>{exact.description}</p>
      {href ? <a className="btn-primary inline-flex" href={href}>{exact.cta.label}</a> :
        <span className="btn-primary inline-flex" aria-disabled="true">{exact.cta.label}</span>}
      {exact.mediaVersionId && media && <Image src={media.src} alt={exact.mediaAlt!}
        width={1200} height={800} unoptimized className="h-auto w-full rounded-2xl object-cover" />}
    </div>
  </section>;
}
