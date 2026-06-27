import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BeforeAfterCard } from "@/components/BeforeAfterCard";
import { ContactForm } from "@/components/ContactForm";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { SectionHeading } from "@/components/SectionHeading";
import { businessConfig } from "@/config/business";
import { buildMetadata } from "@/lib/seo";
import { getWhatsAppLink } from "@/lib/whatsapp";

type Faq = { question: string; answer: string };
type RelatedLink = { label: string; href: string };
type BeforeAfter = {
  title: string;
  description: string;
  beforeImage: string;
  afterImage: string;
  beforeAlt: string;
  afterAlt: string;
};

export type ServiceLandingConfig = {
  path: string;
  serviceName: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  image: string;
  imageAlt: string;
  signsTitle: string;
  signsDescription: string;
  signs: string[];
  processTitle: string;
  processDescription: string;
  process: string[];
  benefitsDescription: string;
  benefits: string[];
  faqs: Faq[];
  relatedLinks: RelatedLink[];
  resultDescription: string;
  beforeAfter?: BeforeAfter;
};

export function buildServiceLandingMetadata(
  config: ServiceLandingConfig,
): Metadata {
  const base = buildMetadata({
    title: config.metaTitle,
    description: config.metaDescription,
    path: config.path,
  });

  return {
    ...base,
    openGraph: {
      title: config.metaTitle,
      description: config.metaDescription,
      url: `${businessConfig.siteUrl}${config.path}`,
      siteName: businessConfig.name,
      locale: "he_IL",
      type: "website",
      images: [{ url: config.image, alt: config.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: config.metaTitle,
      description: config.metaDescription,
      images: [config.image],
    },
  };
}

const trustItems = [
  "שירות מקצועי ואמין",
  "עסק של מילואימניקים",
  "הגעה עד לבית הלקוח",
  "מענה מהיר",
  "מראשון לציון ועד נתניה",
];

export function ServiceLandingPage({
  config,
}: {
  config: ServiceLandingConfig;
}) {
  const phoneHref = "tel:0559577731";
  const whatsappHref = getWhatsAppLink(
    `היי, אשמח לקבל הצעת מחיר עבור ${config.serviceName}.`,
  );
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: config.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <div className="pb-20 sm:pb-0">
      <JsonLd id={`${config.path.slice(1)}-faq-jsonld`} data={faqJsonLd} />
      <section className="theme-section-strong overflow-hidden py-9 sm:py-16 lg:py-20">
        <div className="section-container grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="reveal">
            <p className="text-sm font-black text-turquoise">{config.eyebrow}</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.08] text-white sm:text-5xl lg:text-6xl">
              {config.h1}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/80 sm:text-xl sm:leading-9">
              {config.intro}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href="#contact-form" className="btn-primary inline-flex">לקבלת הצעת מחיר</a>
              <a href={whatsappHref} aria-label={`שליחת WhatsApp לקבלת הצעת מחיר עבור ${config.serviceName}`} className="btn-secondary inline-flex text-white">
                <Icon name="whatsapp" className="ml-2 h-5 w-5" />
                שלחו לנו WhatsApp
              </a>
              <a href={phoneHref} aria-label="חיוג ל-CleanBrothers במספר 055-957-7731" className="inline-flex min-h-12 items-center justify-center rounded-full px-4 font-black text-white underline decoration-turquoise decoration-2 underline-offset-4 focus:ring-2 focus:ring-turquoise">
                <Icon name="phone" className="ml-2 h-5 w-5" />
                055-957-7731
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-5 text-sm font-bold text-white/75">
              <Link href="/services" className="hover:text-turquoise focus:ring-2 focus:ring-turquoise">כל השירותים</Link>
              <Link href="/gallery" className="hover:text-turquoise focus:ring-2 focus:ring-turquoise">גלריית עבודות</Link>
              <Link href="/contact" className="hover:text-turquoise focus:ring-2 focus:ring-turquoise">יצירת קשר</Link>
              {config.relatedLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-turquoise focus:ring-2 focus:ring-turquoise">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="reveal stagger-2 relative mx-auto aspect-[4/5] w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/15 bg-navy shadow-2xl">
            <Image src={config.image} alt={config.imageAlt} fill priority className="object-cover object-center" sizes="(min-width: 1024px) 42vw, 100vw" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/50 via-transparent to-transparent" />
            <p className="absolute bottom-4 right-4 rounded-full bg-navy/80 px-4 py-2 text-xs font-black text-white backdrop-blur">
              תמונה אמיתית מעבודה בשטח
            </p>
          </div>
        </div>
      </section>
      <section aria-label="יתרונות השירות" className="theme-section-clean py-5 sm:py-8">
        <div className="section-container grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {trustItems.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl border theme-card p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-turquoise/15 text-turquoise-dark">
                <Icon name="check" className="h-5 w-5" />
              </span>
              <span className="text-sm font-black">{item}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="section-block theme-section-soft">
        <div className="section-container">
          <SectionHeading eyebrow="סימנים שכדאי לבדוק" title={config.signsTitle} description={config.signsDescription} tone="light" />
          <div className="mt-7 grid gap-3 sm:mt-10 sm:grid-cols-2 lg:grid-cols-5">
            {config.signs.map((item, index) => (
              <article key={item} className="card-lift reveal rounded-3xl border theme-card p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-turquoise/15 text-lg font-black text-turquoise-dark">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-black leading-7">{item}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section-block theme-section-contrast">
        <div className="section-container">
          <SectionHeading eyebrow="תהליך מסודר" title={config.processTitle} description={config.processDescription} />
          <ol className="mt-7 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
            {config.process.map((step, index) => (
              <li key={step} className="card-lift rounded-3xl border theme-inverse-card p-5 sm:p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-turquoise font-black text-navy">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-black leading-7 text-white">{step}</h3>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="section-block theme-section-clean">
        <div className="section-container grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <div>
            <SectionHeading
              eyebrow="CleanBrothers"
              title="למה לבחור ב-CleanBrothers?"
              description={config.benefitsDescription}
              align="start"
              tone="light"
            />
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {config.benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 rounded-2xl border theme-card p-4 font-black">
                  <Icon name="check" className="h-5 w-5 shrink-0 text-turquoise-dark" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border theme-card bg-navy">
            <Image src={config.image} alt={`תיעוד אמיתי של ${config.serviceName} על ידי CleanBrothers`} fill className="object-cover object-center" sizes="(min-width: 1024px) 45vw, 100vw" />
          </div>
        </div>
      </section>
      <section className="section-block theme-section-soft">
        <div className="section-container">
          <SectionHeading
            eyebrow="תוצאות אמיתיות"
            title={config.beforeAfter ? "לפני ואחרי מאותה עבודת ניקוי" : "תיעוד אמיתי מהעבודה בשטח"}
            description={config.resultDescription}
            tone="light"
          />
          {config.beforeAfter ? (
            <div className="mx-auto mt-7 max-w-4xl sm:mt-10">
              <BeforeAfterCard {...config.beforeAfter} variant="gallery" />
            </div>
          ) : (
            <div className="mx-auto mt-7 grid max-w-5xl items-center gap-7 sm:mt-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border theme-card bg-navy">
                <Image src={config.image} alt={`צילום מהשטח במהלך ${config.serviceName}`} fill className="object-cover object-center" sizes="(min-width: 1024px) 40vw, 100vw" />
              </div>
              <div>
                <h3 className="text-3xl font-black leading-tight sm:text-4xl">
                  מציגים רק תמונות ותוצאות שתועדו באמת
                </h3>
                <p className="mt-4 text-base leading-8 theme-muted sm:text-lg">
                  לא נמצא בפרויקט זוג תמונות לפני ואחרי מאותו טיפול לשירות הזה,
                  ולכן מוצגת תמונת עבודה אמיתית בלי לחבר בין עבודות שונות.
                </p>
                <Link href="/gallery" className="btn-secondary mt-6 inline-flex">
                  <Icon name="gallery" className="ml-2 h-5 w-5" />
                  לצפייה בגלריית לפני ואחרי
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
      <section className="section-block theme-section-clean">
        <div className="section-container max-w-4xl">
          <SectionHeading eyebrow="שאלות נפוצות" title={`מה חשוב לדעת על ${config.serviceName}?`} tone="light" />
          <div className="mt-7 grid gap-3 sm:mt-10">
            {config.faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border theme-card p-5 open:border-turquoise/40">
                <summary className="cursor-pointer list-none font-black focus:ring-2 focus:ring-turquoise">
                  <span className="flex items-center justify-between gap-4">
                    {faq.question}
                    <span aria-hidden="true" className="text-2xl text-turquoise-dark transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 border-t border-[var(--card-border)] pt-3 leading-7 theme-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section id="contact-form" className="scroll-mt-24 section-block theme-section-soft pb-28 sm:pb-20">
        <div className="section-container grid items-start gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:gap-10">
          <div className="lg:sticky lg:top-28">
            <p className="text-sm font-black text-turquoise-dark">הצעת מחיר עבור {config.serviceName}</p>
            <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">השאירו פרטים ונחזור אליכם</h2>
            <p className="mt-4 text-base leading-8 theme-muted">
              השירות כבר מסומן בטופס. הפרטים נשלחים דרך טופס האתר הקיים ישירות לצוות CleanBrothers.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:flex-col">
              <a href={whatsappHref} className="btn-primary inline-flex">שלחו תמונה ב-WhatsApp</a>
              <a href={phoneHref} className="btn-secondary inline-flex">התקשרו: 055-957-7731</a>
            </div>
          </div>
          <ContactForm initialService={config.serviceName} />
        </div>
      </section>
      <div
        aria-label={`פעולות מהירות עבור ${config.serviceName}`}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-navy/96 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(8,19,31,0.22)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <a href={whatsappHref} className="flex min-h-11 items-center justify-center rounded-xl bg-[#22c55e] px-2 text-center text-xs font-black text-white focus:ring-2 focus:ring-white">
            WhatsApp
          </a>
          <a href={phoneHref} className="flex min-h-11 items-center justify-center rounded-xl border border-white/25 px-2 text-center text-xs font-black text-white focus:ring-2 focus:ring-turquoise">
            התקשרו עכשיו
          </a>
          <a href="#contact-form" className="flex min-h-11 items-center justify-center rounded-xl bg-turquoise px-2 text-center text-xs font-black text-navy focus:ring-2 focus:ring-white">
            קבלת הצעת מחיר
          </a>
        </div>
      </div>
    </div>
  );
}
