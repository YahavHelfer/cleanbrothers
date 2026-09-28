import type { ReactNode } from "react";
import Image from "next/image";
import { windowBaseline } from "@/cms/content/special-baseline";
import type { WindowCleaningContent } from "@/cms/content/special-model";
import type { ResolvedMedia } from "@/cms/media/model";
import { specialMedia } from "@/cms/content/special-view";
import { PreviewContact } from "@/cms/content/PreviewContact";
import { serviceRegistry } from "@/content/service-registry";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { WindowCleaningVisual } from "@/components/WindowCleaningVisual";
import { businessConfig } from "@/config/business";

const path = "/window-cleaning";
const pageUrl = `${businessConfig.siteUrl}${path}`;
const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "דף הבית", item: businessConfig.siteUrl },
    { "@type": "ListItem", position: 2, name: "שירותים", item: `${businessConfig.siteUrl}/services` },
    { "@type": "ListItem", position: 3, name: "ניקוי חלונות", item: pageUrl },
  ],
};

export function WindowCleaningView({ content = windowBaseline, media, preview = false, contact, phone, whatsappHref, phoneHref }: {content?: WindowCleaningContent; media?: ResolvedMedia[]; preview?: boolean; contact?: ReactNode; phone?: ReactNode; popup?: ReactNode; whatsappHref?: string; multipleUnitsHref?: string; phoneHref?: string}) {
 const { includedItems, propertyTypes, process, faqs } = content;
 const hero = specialMedia(content, "hero", media);
const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: content.h1,
  description: content.seoDescription,
  url: pageUrl,
  serviceType: "ניקוי חלונות",
  provider: {
    "@type": "LocalBusiness",
    name: businessConfig.name,
    url: businessConfig.siteUrl,
    telephone: businessConfig.phoneDisplay,
  },
};


  return (
    <div className="pb-20 sm:pb-0">
      <JsonLd id="window-cleaning-breadcrumb-jsonld" data={breadcrumbJsonLd} />
      <JsonLd id="window-cleaning-service-jsonld" data={serviceJsonLd} />

      <section className="theme-section-strong overflow-hidden py-8 sm:py-14 lg:py-18">
        <div className="section-container">
          <nav aria-label="פירורי לחם" className="mb-7 text-sm font-bold text-white/70">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link href="/" className="hover:text-turquoise focus:ring-2 focus:ring-turquoise">דף הבית</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/services" className="hover:text-turquoise focus:ring-2 focus:ring-turquoise">שירותים</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-turquoise">ניקוי חלונות</li>
            </ol>
          </nav>

          <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div className="reveal">
              <p className="text-sm font-black text-turquoise">{content.copy.heroEyebrow}</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.08] text-white sm:text-5xl lg:text-6xl">{content.h1}</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/80 sm:text-xl sm:leading-9">{content.copy.heroDescription}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a href={preview ? undefined : whatsappHref} aria-disabled={preview || undefined} className="btn-primary inline-flex" aria-label="שליחת תמונות ב-WhatsApp לקבלת הערכת מחיר לניקוי חלונות">
                  <Icon name="whatsapp" className="ml-2 h-5 w-5" />{content.copy.heroCta}</a>
                <a href={preview ? undefined : phoneHref} aria-disabled={preview || undefined} className="btn-secondary inline-flex text-white" aria-label="חיוג ל-CleanBrothers">
                  <Icon name="phone" className="ml-2 h-5 w-5" />
                  {phone ?? "055-957-7731"}
                </a>
              </div>
            </div>
            <div className="reveal stagger-2 mx-auto w-full max-w-xl">
              {hero.length ? <Image unoptimized={hero[0].src.startsWith("/admin/media/file/") || hero[0].src.startsWith("/cms-media/")} src={hero[0].src} alt={hero[0].alt} width={900} height={900} className="h-full w-full object-cover" /> : <WindowCleaningVisual />}
            </div>
          </div>
        </div>
      </section>

      <section className="section-block theme-section-clean">
        <div className="section-container grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <p className="text-sm font-black text-turquoise-dark">{content.copy.includedEyebrow}</p>
            <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{content.copy.includedTitle}</h2>
            <p className="mt-4 text-base leading-8 theme-muted">{content.copy.includedDescription}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {includedItems.map((item) => (
              <li key={item} className="flex items-center gap-3 rounded-2xl border theme-card p-4 font-black">
                <Icon name="check" className="h-5 w-5 shrink-0 text-turquoise-dark" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-block theme-section-soft">
        <div className="section-container">
          <p className="text-sm font-black text-turquoise-dark">{content.copy.propertyEyebrow}</p>
          <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{content.copy.propertyTitle}</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3 sm:mt-10">
            {propertyTypes.map((item) => (
              <article key={item.title} className="card-lift rounded-3xl border theme-card p-5 sm:p-6">
                <Icon name="sparkles" className="h-7 w-7 text-turquoise-dark" />
                <h3 className="mt-4 text-xl font-black">{item.title}</h3>
                <p className="mt-3 leading-7 theme-muted">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block theme-section-contrast">
        <div className="section-container">
          <p className="text-sm font-black text-turquoise">{content.copy.processEyebrow}</p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl">{content.copy.processTitle}</h2>
          <ol className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:mt-10">
            {process.map((step, index) => (
              <li key={step} className="card-lift rounded-3xl border theme-inverse-card p-5 sm:p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-turquoise font-black text-navy">{index + 1}</span>
                <h3 className="mt-5 text-lg font-black leading-7 text-white">{step}</h3>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section-block theme-section-clean">
        <div className="section-container grid gap-6 lg:grid-cols-2 lg:gap-10">
          <div className="rounded-[2rem] border theme-card p-6 sm:p-8">
            <p className="text-sm font-black text-turquoise-dark">{content.copy.audienceEyebrow}</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">{content.copy.audienceTitle}</h2>
            <p className="mt-4 leading-8 theme-muted">{content.copy.audienceDescription}</p>
          </div>
          <div className="rounded-[2rem] border border-turquoise/30 bg-turquoise/10 p-6 sm:p-8">
            <p className="text-sm font-black text-turquoise-dark">{content.copy.safetyEyebrow}</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">{content.copy.safetyTitle}</h2>
            <p className="mt-4 leading-8 theme-muted">{content.copy.safetyDescription}</p>
          </div>
        </div>
      </section>

      <section className="section-block theme-section-soft">
        <div className="section-container max-w-4xl">
          <p className="text-sm font-black text-turquoise-dark">{content.copy.faqEyebrow}</p>
          <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{content.copy.faqTitle}</h2>
          <div className="mt-7 grid gap-3 sm:mt-10">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border theme-card p-5 open:border-turquoise/40">
                <summary className="cursor-pointer list-none font-black focus:ring-2 focus:ring-turquoise">
                  <span className="flex items-center justify-between gap-4">{faq.question}<span aria-hidden="true" className="text-2xl text-turquoise-dark transition group-open:rotate-45">+</span></span>
                </summary>
                <p className="mt-3 border-t border-[var(--card-border)] pt-3 leading-7 theme-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="contact-form" className="scroll-mt-24 section-block theme-section-clean pb-28 sm:pb-20">
        <div className="section-container grid items-start gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:gap-10">
          <div className="lg:sticky lg:top-28">
            <p className="text-sm font-black text-turquoise-dark">{content.copy.contactEyebrow}</p>
            <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{content.copy.contactTitle}</h2>
            <p className="mt-4 text-base leading-8 theme-muted">{content.copy.contactDescription}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:flex-col">
              <a href={preview ? undefined : whatsappHref} aria-disabled={preview || undefined} className="btn-primary inline-flex">{content.copy.heroCta}</a>
              <a href={preview ? undefined : phoneHref} aria-disabled={preview || undefined} className="btn-secondary inline-flex">{content.copy.callPrefix}{phone ?? "055-957-7731"}</a>
            </div>
          </div>
          {contact ?? <PreviewContact serviceName={serviceRegistry["window-cleaning"].crmName} />}
        </div>
      </section>

      <div aria-label="פעולות מהירות עבור ניקוי חלונות" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-navy/96 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(8,19,31,0.22)] backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <a href={preview ? undefined : whatsappHref} aria-disabled={preview || undefined} className="flex min-h-11 items-center justify-center rounded-xl bg-[#22c55e] px-2 text-center text-xs font-black text-white focus:ring-2 focus:ring-white">WhatsApp</a>
          <a href={preview ? undefined : phoneHref} aria-disabled={preview || undefined} className="flex min-h-11 items-center justify-center rounded-xl border border-white/25 px-2 text-center text-xs font-black text-white focus:ring-2 focus:ring-turquoise">{content.copy.callCta}</a>
          <a href="#contact-form" className="flex min-h-11 items-center justify-center rounded-xl bg-turquoise px-2 text-center text-xs font-black text-navy focus:ring-2 focus:ring-white">{content.copy.quoteCta}</a>
        </div>
      </div>
    </div>
  );
}
