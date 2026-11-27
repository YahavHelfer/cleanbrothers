import { isAcPriceAlignmentPreview } from "@/lib/local-ac-preview";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { PageBlocksView, type BlockMedia, type BlockPromotions } from "@/cms/pages/PageBlocksView";
import type { PageDraft } from "@/cms/pages/model";
import { businessConfig } from "@/config/business";
import { businessEntityId } from "@/lib/structured-data";
import { guideSummaries } from "@/content/guide-routes";

export function GuidePageView({ page, revisionId, media = {}, promotions = {} }: {
  page: PageDraft; revisionId: string; media?: BlockMedia; promotions?: BlockPromotions;
}) {
  const index = page.canonical === "/guides";
  const topic = guideSummaries.find(guide => `/${guide.slug}` === page.canonical)?.topic;
  const url = new URL(page.canonical, businessConfig.siteUrl).href;
  const crumbs = [
    { name: "בית", path: "/" }, { name: "מדריכים", path: "/guides" },
    ...(!index ? [{ name: page.h1, path: page.canonical }] : []),
  ];
  return <>
    <nav aria-label="פירורי לחם" className="section-container pt-6 text-sm leading-7 theme-muted">
      <ol className="flex flex-wrap gap-x-2">
        {crumbs.map((crumb, i) => <li key={crumb.path} className="flex gap-2">
          {i > 0 ? <span aria-hidden="true">/</span> : null}
          {i === crumbs.length - 1 ? <span aria-current="page">{crumb.name}</span>
            : <Link className="underline underline-offset-4" href={crumb.path}>{crumb.name}</Link>}
        </li>)}
      </ol>
    </nav>
    <JsonLd id="guide-breadcrumb-jsonld" data={{ "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, i) => ({ "@type": "ListItem", position: i + 1,
        name: crumb.name, item: new URL(crumb.path, businessConfig.siteUrl).href })) }} />
    {!index ? <JsonLd id="guide-article-jsonld" data={{ "@context": "https://schema.org", "@type": "Article",
      "@id": `${url}#article`, headline: page.h1, description: page.seoDescription,
      mainEntityOfPage: url, inLanguage: "he-IL", author: { "@type": "Organization", name: businessConfig.name },
      publisher: { "@id": businessEntityId } }} /> : null}
    <PageBlocksView page={page} revisionId={revisionId} media={media} promotions={promotions} preview={isAcPriceAlignmentPreview()} />
    <nav aria-label={index ? "רשימת המדריכים" : "מדריכים נוספים"} className="section-container pb-12">
      <div className="grid gap-5 md:grid-cols-2">
        {guideSummaries.filter(guide => `/${guide.slug}` !== page.canonical && (index || guide.topic === topic)).map(guide =>
          <div key={guide.slug} className="rounded-2xl border theme-card p-6">
            <h2 className="text-xl font-black leading-8"><Link href={`/${guide.slug}`} className="underline underline-offset-4">{guide.title}</Link></h2>
            <p className="mt-3 leading-7 theme-muted">{guide.description}</p>
            <Link href={`/${guide.slug}`} className="mt-4 inline-flex font-bold text-turquoise-dark underline underline-offset-4">לקריאת המדריך</Link>
          </div>)}
      </div>
      {!index ? <Link href="/guides" className="mt-6 inline-flex font-bold underline underline-offset-4">לכל המדריכים</Link> : null}
    </nav>
  </>;
}
