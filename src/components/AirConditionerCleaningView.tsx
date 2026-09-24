import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { SectionHeading } from "@/components/SectionHeading";
import { ServiceImageCarousel } from "@/components/ServiceImageCarousel";
import { businessConfig } from "@/config/business";
import { acBaseline } from "@/cms/content/special-baseline";
import type { AirConditionerCleaningContent } from "@/cms/content/special-model";
import type { ResolvedMedia } from "@/cms/media/model";
import { specialMedia } from "@/cms/content/special-view";
import { PreviewContact } from "@/cms/content/PreviewContact";
import { AcPromotionContent } from "@/components/AcPromotionContent";
import { serviceRegistry } from "@/content/service-registry";

function buildStructuredData(content: AirConditionerCleaningContent) {
  const { airConditionerServiceAreas, faqs } = content;
  const pageUrl = `${businessConfig.siteUrl}/air-conditioner-cleaning`;

  return {
    service: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: content.copy.heroEyebrow,
      serviceType: "ניקוי מזגנים",
      url: pageUrl,
      description:
        content.serviceDescription,
      provider: {
        "@type": "LocalBusiness",
        name: businessConfig.name,
        telephone: businessConfig.phoneDisplay,
        url: businessConfig.siteUrl,
      },
      areaServed: airConditionerServiceAreas.map((area) => ({
        "@type": "City",
        name: area,
      })),
    },
    breadcrumb: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "בית",
          item: businessConfig.siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "שירותים",
          item: `${businessConfig.siteUrl}/services`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "ניקוי מזגנים",
          item: pageUrl,
        },
      ],
    },
    faq: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  };
}

export function AirConditionerCleaningView({ content = acBaseline, media, preview = false, contact, phone, popup, whatsappHref, multipleUnitsHref, phoneHref }: { content?: AirConditionerCleaningContent; media?: ResolvedMedia[]; preview?: boolean; contact?: ReactNode; phone?: ReactNode; popup?: ReactNode; whatsappHref?: string; multipleUnitsHref?: string; phoneHref?: string }) {
  const { trustItems, intentSignals, cleaningAreas, processSteps, airConditionerServiceAreas, faqs, promotion } = content;
  const hero = specialMedia(content, "hero", media);
  const gallery = specialMedia(content, "gallery", media);
  const displayedPrice = promotion.enabled ? promotion.startingPrice : promotion.regularPrice;
  const structuredData = buildStructuredData(content);

  return (
    <div className="pb-20 sm:pb-0">
      <JsonLd id="ac-cleaning-service-jsonld" data={structuredData.service} />
      <JsonLd id="ac-cleaning-breadcrumb-jsonld" data={structuredData.breadcrumb} />
      <JsonLd id="ac-cleaning-faq-jsonld" data={structuredData.faq} />
      {promotion.enabled && (preview ? <aside aria-label="תצוגת המבצע"><AcPromotionContent promotion={promotion} preview /></aside> : popup)}

      <section className="theme-section-strong overflow-hidden py-7 sm:py-14 lg:py-16">
        <div className="section-container grid items-center gap-6 lg:grid-cols-[1.03fr_0.97fr] lg:gap-12">
          <div className="reveal">
            <p className="text-sm font-black text-turquoise">{content.copy.heroEyebrow}</p>
            {promotion.enabled && <p className="mt-2 inline-flex rounded-full border border-turquoise/35 bg-turquoise/10 px-3 py-1.5 text-xs font-black text-turquoise sm:text-sm">
              {promotion.heroLabel} — החל מ־{promotion.startingPrice} ₪
            </p>}
            <h1 className="mt-2 max-w-3xl text-[2.35rem] font-black leading-[1.08] text-white sm:mt-3 sm:text-5xl lg:text-6xl">{content.h1}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">{content.copy.heroDescription}</p>

            <div className="mt-5 grid gap-2 sm:mt-7 sm:flex sm:flex-wrap sm:gap-3">
              <a
                href={preview ? undefined : whatsappHref} aria-disabled={preview || undefined}
                target="_blank"
                rel="noreferrer"
                className="btn-primary inline-flex min-h-12 px-5 text-sm sm:text-base"
              >
                <Icon name="whatsapp" className="ml-2 h-5 w-5" />{content.copy.heroCta}</a>
              <a
                href={preview ? undefined : phoneHref} aria-disabled={preview || undefined}
                className="btn-secondary inline-flex min-h-12 px-5 text-sm text-white sm:text-base"
              >
                <Icon name="phone" className="ml-2 h-5 w-5" />{content.copy.callCta}</a>
            </div>

            <div className="mt-5 flex flex-wrap gap-1.5 sm:mt-6 sm:gap-2">
              {trustItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-bold text-white/80"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="reveal stagger-2 relative aspect-[16/11] overflow-hidden rounded-[1.5rem] border border-white/15 bg-navy shadow-2xl sm:rounded-[2rem] lg:aspect-[4/3]">
            <ServiceImageCarousel
              images={hero.map(image => image.src)}
              imageAlts={Object.fromEntries(hero.map((image, index) => [image.src, `${image.alt}, תמונה ${index + 1} מתוך ${hero.length}`]))}
              alt={hero[0].alt}
              className="absolute inset-0 h-full w-full"
              imageClassName="object-cover"
              imagePosition="object-[center_38%]"
              sizes="(min-width: 1024px) 46vw, 100vw"
              priority
            />
            <p className="absolute bottom-3 right-3 z-20 rounded-full bg-navy/80 px-3 py-1.5 text-xs font-black text-white backdrop-blur">{content.copy.imageCaption}</p>
          </div>
        </div>
      </section>

      <section className="section-block theme-section-soft">
        <div className="section-container">
          <SectionHeading
            eyebrow={content.copy.signsEyebrow}
            title={content.copy.signsTitle}
            description={content.copy.signsDescription}
            tone="light"
          />
          <div className="mt-6 grid gap-3 sm:mt-9 sm:grid-cols-2 lg:grid-cols-5">
            {intentSignals.map((signal, index) => (
              <article
                key={signal}
                className="card-lift rounded-2xl border theme-card p-4 sm:rounded-3xl sm:p-5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-turquoise/15 text-sm font-black text-turquoise-dark">
                  {index + 1}
                </span>
                <h2 className="mt-3 text-base font-black leading-6">{signal}</h2>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block theme-section-clean">
        <div className="section-container">
          <SectionHeading
            eyebrow={content.copy.cleaningEyebrow}
            title={content.copy.cleaningTitle}
            description={content.copy.cleaningDescription}
            tone="light"
          />
          <div className="mt-6 grid gap-3 sm:mt-9 sm:grid-cols-2 lg:grid-cols-3">
            {cleaningAreas.map((area, index) => (
              <article
                key={area.title}
                className="card-lift rounded-[1.25rem] border theme-card p-4 sm:rounded-[2rem] sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-turquoise/15 font-black text-turquoise-dark">
                    {index + 1}
                  </span>
                  <h2 className="text-lg font-black sm:text-xl">{area.title}</h2>
                </div>
                <p className="mt-3 text-sm leading-7 theme-muted">
                  {area.description}
                </p>
              </article>
            ))}
          </div>
          <p className="theme-glass mx-auto mt-5 max-w-4xl rounded-2xl border px-4 py-3 text-center text-sm font-bold theme-muted">{content.copy.cleaningNote}</p>
        </div>
      </section>

      <section className="theme-section-soft py-8 sm:py-12">
        <div className="section-container">
          <div className="grid gap-4 rounded-[1.5rem] border border-turquoise/25 bg-turquoise/[0.07] p-5 sm:rounded-[2rem] sm:p-8 lg:grid-cols-[auto_1fr] lg:items-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-turquoise/18 text-turquoise-dark">
              <Icon name="shield" />
            </span>
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">{content.copy.technicalTitle}</h2>
              <p className="mt-2 max-w-5xl leading-7 theme-muted sm:text-lg sm:leading-8">{content.copy.technicalDescription}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-block theme-section-contrast">
        <div className="section-container">
          <SectionHeading
            eyebrow={content.copy.processEyebrow}
            title={content.copy.processTitle}
            description={content.copy.processDescription}
          />
          <ol className="mt-6 grid gap-3 sm:mt-9 sm:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((step, index) => (
              <li
                key={step}
                className="card-lift rounded-3xl border theme-inverse-card p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-turquoise font-black text-navy">
                  {index + 1}
                </span>
                <h2 className="mt-4 text-lg font-black leading-7 text-white">
                  {step}
                </h2>
              </li>
            ))}
          </ol>
          <div className="mt-6 text-center">
            <a href={preview ? undefined : whatsappHref} aria-disabled={preview || undefined} className="btn-primary inline-flex">{content.copy.processCta}</a>
          </div>
        </div>
      </section>

      <section className="section-block theme-section-clean">
        <div className="section-container grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-12">
          <div>
            <p className="text-sm font-black text-turquoise-dark">{content.copy.galleryEyebrow}</p>
            <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{content.copy.galleryTitle}</h2>
            <p className="mt-4 leading-7 theme-muted sm:text-lg sm:leading-8">{content.copy.galleryDescription}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {gallery.map(({src, alt}) => (
              <div
                key={src}
                className="relative aspect-[4/3] overflow-hidden rounded-2xl border theme-card bg-navy sm:rounded-3xl"
              >
                <Image
                  src={src}
                  unoptimized={src.startsWith("/admin/media/file/") || src.startsWith("/cms-media/")}
                  alt={alt}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 28vw, 50vw"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block theme-section-soft">
        <div className="section-container grid gap-5 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border theme-card p-5 sm:rounded-[2rem] sm:p-8">
            <p className="text-sm font-black text-turquoise-dark">{content.copy.pricingEyebrow}</p>
            <h2 className="mt-2 text-3xl font-black leading-tight">{content.copy.pricingTitle}</h2>
            <div className="mt-4 rounded-2xl border border-turquoise/25 bg-turquoise/[0.08] p-4">
              <p className="text-xl font-black sm:text-2xl">
                {promotion.pricePrefix}<span className="text-turquoise-dark">{displayedPrice} ₪</span>{" "}
                {promotion.enabled && <span className="text-sm theme-muted">
                  במקום <span className="line-through">{promotion.regularPrice} ₪</span>
                </span>}
              </p>
              {promotion.enabled && promotion.bundleEnabled && <p className="mt-2 font-black">
                מנקים 5 מזגנים? המזגן ה־6 עלינו.
              </p>}
            </div>
            <p className="mt-4 leading-7 theme-muted sm:text-lg sm:leading-8">{content.copy.pricingDescription}</p>
            <a href={preview ? undefined : whatsappHref} aria-disabled={preview || undefined} className="btn-primary mt-5 inline-flex">{content.copy.pricingCta}</a>
            <p className="mt-4 text-xs leading-5 theme-muted">
              {promotion.priceTerms}{promotion.enabled && promotion.bundleEnabled ? ` ${promotion.bundleTerms}` : ""}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-turquoise/25 bg-[radial-gradient(circle_at_85%_0%,_rgba(39,211,195,0.16),_transparent_45%)] p-5 sm:rounded-[2rem] sm:p-8">
            <p className="text-sm font-black text-turquoise-dark">{content.copy.multipleEyebrow}</p>
            <h2 className="mt-2 text-3xl font-black leading-tight">{content.copy.multipleTitle}</h2>
            <p className="mt-4 leading-7 theme-muted sm:text-lg sm:leading-8">{content.copy.multipleDescription}</p>
            <a href={preview ? undefined : multipleUnitsHref} aria-disabled={preview || undefined} className="btn-secondary mt-5 inline-flex">{content.copy.multipleCta}</a>
          </div>
        </div>
      </section>

      <section className="section-block theme-section-clean">
        <div className="section-container grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <SectionHeading
            align="start"
            eyebrow={content.copy.areasEyebrow}
            title={content.copy.areasTitle}
            description={content.copy.areasDescription}
            tone="light"
          />
          <div className="flex flex-wrap gap-2" aria-label="אזורי שירות לניקוי מזגנים">
            {airConditionerServiceAreas.map((area) => (
              <span
                key={area}
                className="rounded-full border border-turquoise/20 bg-turquoise/[0.08] px-3 py-2 text-sm font-black"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block theme-section-soft">
        <div className="section-container max-w-4xl">
          <SectionHeading
            eyebrow={content.copy.faqEyebrow}
            title={content.copy.faqTitle}
            tone="light"
          />
          <div className="mt-6 grid gap-3 sm:mt-9">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border theme-card p-4 open:border-turquoise/40 sm:p-5"
              >
                <summary className="cursor-pointer list-none font-black focus:ring-2 focus:ring-turquoise">
                  <span className="flex items-center justify-between gap-4">
                    {faq.question}
                    <span
                      aria-hidden="true"
                      className="text-2xl text-turquoise-dark transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 border-t border-[var(--card-border)] pt-3 leading-7 theme-muted">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        id="contact-form"
        className="scroll-mt-24 section-block theme-section-clean pb-28 sm:pb-20"
      >
        <div className="section-container grid items-start gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:gap-10">
          <div className="lg:sticky lg:top-28">
            <p className="text-sm font-black text-turquoise-dark">{content.copy.contactEyebrow}</p>
            <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{content.copy.contactTitle}</h2>
            <p className="mt-4 leading-7 theme-muted sm:text-lg sm:leading-8">{content.copy.contactDescription}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:flex-col">
              <a href={preview ? undefined : whatsappHref} aria-disabled={preview || undefined} className="btn-primary inline-flex">{content.copy.contactCta}</a>
              <a href={preview ? undefined : phoneHref} aria-disabled={preview || undefined} className="btn-secondary inline-flex">{content.copy.callPrefix}{phone ?? businessConfig.phoneDisplay}
              </a>
            </div>
          </div>
          {contact ?? <PreviewContact serviceName={serviceRegistry["air-conditioner-cleaning"].crmName} />}
        </div>
      </section>

      <div
        aria-label="פעולות מהירות לניקוי מזגן"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-navy/96 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(8,19,31,0.22)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
          <a
            href={preview ? undefined : whatsappHref} aria-disabled={preview || undefined}
            className="flex min-h-12 items-center justify-center rounded-xl bg-[#22c55e] px-2 text-center text-xs font-black text-white focus:ring-2 focus:ring-white"
          >{content.copy.contactCta}</a>
          <a
            href={preview ? undefined : phoneHref} aria-disabled={preview || undefined}
            className="flex min-h-12 items-center justify-center rounded-xl border border-white/25 px-2 text-center text-xs font-black text-white focus:ring-2 focus:ring-turquoise"
          >{content.copy.callCta}</a>
        </div>
      </div>

      <div className="theme-section-clean pb-6 text-center text-sm theme-muted sm:pb-8">
        <Link href="/services" className="font-black text-turquoise-dark hover:underline">{content.copy.servicesCta}</Link>
      </div>
    </div>
  );
}
