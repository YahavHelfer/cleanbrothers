import Image from "next/image";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { SectionHeading } from "@/components/SectionHeading";
import { buildMetadata } from "@/lib/seo";
import { resolveSafeTarget, validatePageDraft, validatePromotionDraft,
  type Inline, type PageBlock, type PageDraft, type PromotionDraft, type RichNode, type SafeCta } from "./model";

export type BlockMedia = Record<string, { src: string; altText: string }>;
export type BlockPromotions = Record<string, PromotionDraft>;

export function pageRevisionMetadata(page: PageDraft) {
  const draft = validatePageDraft(page);
  return buildMetadata({ title: draft.seoTitle, description: draft.seoDescription, path: draft.canonical });
}
function SafeAction({ cta, preview, className = "btn-primary inline-flex" }: { cta: SafeCta; preview: boolean; className?: string }) {
  const href = resolveSafeTarget(cta.target, preview);
  return href ? <a className={className} href={href}>{cta.label}</a>
    : <span className={className} aria-disabled="true">{cta.label}</span>;
}
function renderInline(inline: Inline, index: number, preview: boolean): ReactNode {
  let content: ReactNode = inline.text;
  if (inline.bold) content = <strong>{content}</strong>;
  if (inline.emphasis) content = <em>{content}</em>;
  if (inline.link) {
    const href = resolveSafeTarget(inline.link, preview);
    content = href ? <a href={href} className="underline">{content}</a>
      : <span aria-disabled="true" className="underline">{content}</span>;
  }
  return <span key={index}>{content}</span>;
}
function RichNodeView({ node, preview }: { node: RichNode; preview: boolean }) {
  if (node.kind === "heading") {
    const content = node.items[0].map((inline, index) => renderInline(inline, index, preview));
    return node.level === 2 ? <h2 className="text-2xl font-black">{content}</h2>
      : <h3 className="text-xl font-black">{content}</h3>;
  }
  if (node.kind === "paragraph") return <p>{node.items[0].map((inline, index) => renderInline(inline, index, preview))}</p>;
  const items = node.items.map((item, index) => <li key={index}>{item.map((inline, i) => renderInline(inline, i, preview))}</li>);
  return node.kind === "unordered" ? <ul className="list-disc ps-6">{items}</ul> : <ol className="list-decimal ps-6">{items}</ol>;
}
function MediaImage({ block, media, alt }: { block: PageBlock; media: BlockMedia; alt: string }) {
  const selected = block.mediaVersionId ? media[block.mediaVersionId] : null;
  if (!selected) throw new Error("CMS page media unavailable");
  return <Image src={selected.src} alt={alt} width={1200} height={800} unoptimized
    className="h-auto w-full rounded-2xl object-cover" />;
}
function AboutOverview({ payload }: { payload: Record<string, unknown> }) {
  const paragraphs = payload.paragraphs as string[];
  const values = payload.values as { title: string; description: string; icon: "shield" | "message" | "calendar" | "sparkles" }[];
  return <section className="section-block reveal">
    <div className="section-container grid gap-6 sm:gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-start">
      <article className="card-lift rounded-[1.5rem] border theme-card p-5 sm:rounded-[2rem] sm:p-10">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-turquoise/18 text-turquoise-dark sm:mb-6 sm:h-14 sm:w-14"><Icon name="team" /></div>
        <h2 className="text-2xl font-black sm:text-3xl">{payload.heading as string}</h2>
        <div className="mt-4 space-y-4 text-base leading-8 theme-muted sm:mt-6 sm:space-y-5 sm:text-lg sm:leading-9">
          {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </div>
      </article>
      <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {values.map((value, index) => <div key={value.title}
          className={`card-lift reveal rounded-[1.5rem] border theme-card p-4 hover:border-turquoise/40 sm:rounded-3xl sm:p-5 stagger-${index + 1}`}>
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-turquoise/15 text-turquoise"><Icon name={value.icon} /></span>
          <h3 className="text-xl font-black">{value.title}</h3>
          <p className="mt-2 leading-7 theme-muted">{value.description}</p>
        </div>)}
      </aside>
    </div>
  </section>;
}
function BlockView({ block, media, promotions, preview, revisionId }: {
  block: PageBlock; media: BlockMedia; promotions: BlockPromotions; preview: boolean; revisionId: string;
}) {
  const p = block.payload;
  switch (block.type) {
    case "hero": {
      const cta = p.cta as SafeCta | null;
      return <>
        <PageHero eyebrow={p.eyebrow as string} title={p.title as string} description={p.description as string}
          ctaLabel={cta?.label} ctaHref={cta ? resolveSafeTarget(cta.target, preview) : undefined} />
        {block.mediaVersionId && <div className="section-container py-8"><MediaImage block={block} media={media} alt={p.mediaAlt as string} /></div>}
      </>;
    }
    case "richText": return <section className="section-block theme-section-clean"><div className="section-container max-w-4xl space-y-5 leading-8">
      {(p.nodes as RichNode[]).map((node, index) => <RichNodeView key={index} node={node} preview={preview} />)}
    </div></section>;
    case "imageText": return <section className="section-block theme-section-clean"><div className={`section-container grid gap-8 lg:grid-cols-2 ${p.side === "end" ? "lg:[direction:ltr]" : ""}`}>
      <div><SectionHeading eyebrow="" title={p.heading as string} align="start" tone="light" /><p className="mt-4 leading-8">{p.body as string}</p>
        {p.cta !== null && <div className="mt-6"><SafeAction cta={p.cta as SafeCta} preview={preview} /></div>}</div>
      <MediaImage block={block} media={media} alt={p.alt as string} />
    </div></section>;
    case "faq": {
      const items = p.items as { question: string; answer: string }[];
      const faqData = { "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: items.map(item => ({ "@type": "Question", name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer } })) };
      return <section className="section-block theme-section-soft"><div className="section-container max-w-4xl">
        <h2 className="text-2xl font-black">שאלות נפוצות</h2>
        <div className="mt-6 grid gap-4">{items.map(item => <article key={item.question} className="rounded-2xl border theme-card p-5">
          <h3 className="font-black">{item.question}</h3><p className="mt-2 leading-8">{item.answer}</p></article>)}</div>
        {!preview && <JsonLd id={`cms-faq-${revisionId}-${block.id}`} data={faqData} />}
      </div></section>;
    }
    case "cta": return <section className="section-block theme-section-contrast"><div className="section-container text-center">
      <h2 className="text-2xl font-black">{p.heading as string}</h2><p className="mx-auto mt-3 max-w-3xl">{p.description as string}</p>
      <div className="mt-6"><SafeAction cta={p.cta as SafeCta} preview={preview} /></div>
    </div></section>;
    case "promotionBanner": {
      const promotion = block.promotionRevisionId ? promotions[block.promotionRevisionId] : null;
      if (!promotion) throw new Error("CMS promotion revision unavailable");
      const exact = validatePromotionDraft(promotion);
      if (!exact.enabled) return null;
      return <section className={p.template === "accent" ? "section-block theme-section-contrast" : "section-block theme-section-soft"}
        data-promotion-identity="about-intro">
        <div className="section-container grid gap-4 rounded-2xl border theme-card p-6">
          <h2 className="text-2xl font-black">{exact.h1}</h2><p>{exact.description}</p>
          <SafeAction cta={exact.cta} preview={preview} />
          {exact.mediaVersionId && <MediaImage block={{ ...block, mediaVersionId: exact.mediaVersionId }} media={media} alt={exact.mediaAlt!} />}
        </div>
      </section>;
    }
    case "spacer": return <div aria-hidden="true" className={`${p.variant === "divider" ? "border-t theme-card" : ""} ${p.size === "compact" ? "my-4" : p.size === "wide" ? "my-16" : "my-8"}`} />;
    case "aboutOverview": return <AboutOverview payload={p} />;
  }
}
export function PageBlocksView({ page, revisionId, media = {}, promotions = {}, preview = true }: {
  page: PageDraft; revisionId: string; media?: BlockMedia; promotions?: BlockPromotions; preview?: boolean;
}) {
  const draft = validatePageDraft(page);
  return <div data-page-revision={revisionId}>
    {draft.blocks.filter(block => !block.hidden).map(block => <BlockView key={block.id} block={block}
      media={media} promotions={promotions} preview={preview} revisionId={revisionId} />)}
  </div>;
}
