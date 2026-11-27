import { AcPriceTable } from "@/components/AcPriceTable";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/ContactForm";
import { JsonLd } from "@/components/JsonLd";
import { businessConfig } from "@/config/business";
import { getLocalAcCity, isPublishedLocalAcCity, localAcBasePath, localAcCityLinks, publishedLocalAcLinks } from "@/content/local-ac-pilot";
import { formatLocalAcPrice, localAcPrices } from "@/content/local-ac-prices";
import { serviceRegistry } from "@/content/service-registry";
import { buildMetadata } from "@/lib/seo";
import { isLocalAcPreview } from "@/lib/local-ac-preview";
import { buildPageServiceJsonLd } from "@/lib/structured-data";
import { isSiteReview } from "@/lib/site-review";
import { GoogleCallTrackingNumber } from "@/components/GoogleCallTrackingNumber";
import { buildDirectWhatsAppLink } from "@/lib/whatsapp";
import { getWhatsAppMessage } from "@/lib/whatsapp-messages";
import { PreviewContactActions } from "./PreviewContactActions";

type LocalPageProps = { params: Promise<{ city: string }> };

const servicePhoto = {
  url: "/images/services/Air-conditioner-cleaning4.JPG",
  alt: "צילום מעבודת ניקוי מזגן עילי",
};

async function getPilotPage({ params }: LocalPageProps) {
  const preview = isLocalAcPreview();
  const { city: slug } = await params;
  if (!preview && (isSiteReview() || !isPublishedLocalAcCity(slug))) notFound();
  const city = getLocalAcCity(slug);
  if (!city) notFound();

  return { city, preview, path: `${localAcBasePath}/${slug}`, heading: `ניקוי מזגן עילי ב${city.name}` };
}

export async function generateMetadata(props: LocalPageProps): Promise<Metadata> {
  const { city, preview, path, heading } = await getPilotPage(props);

  return {
    ...buildMetadata({
      title: `${heading} | מחירון ושירות עד הבית | CleanBrothers`,
      description: `${city.description} ניקוי עילי ${formatLocalAcPrice(localAcPrices.basic.amount)}, כולל מע״מ ובכפוף לבדיקה.`,
      path,
      image: servicePhoto,
    }),
    keywords: null,
    ...(preview ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function LocalAcPage(props: LocalPageProps) {
  const { city, preview, path, heading } = await getPilotPage(props);
  const serviceName = serviceRegistry["air-conditioner-cleaning"].crmName;
  const serviceSchema = buildPageServiceJsonLd({ serviceName: heading, intro: city.description, path });

  return (
    <article className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      {city.name === "תל אביב" && <p className="mb-5 rounded-xl border p-3 text-sm font-bold">דף לבדיקה בלבד. פרסום תלוי באישור כיסוי ותנאי הגעה בעיר.</p>}
      <JsonLd id="local-ac-service" data={{
        ...serviceSchema,
        areaServed: { "@type": "City", name: city.name },
      }} />
      <JsonLd id="local-ac-breadcrumbs" data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "בית", item: businessConfig.siteUrl },
          { "@type": "ListItem", position: 2, name: "ניקוי מזגנים", item: businessConfig.siteUrl + localAcBasePath },
          { "@type": "ListItem", position: 3, name: city.name, item: businessConfig.siteUrl + path },
        ],
      }} />

      <nav aria-label="מיקום באתר" className="mb-7 text-sm">
        {preview ? <span>דפי עיר לבדיקה</span> : <Link href="/">בית</Link>}
        <span aria-hidden="true"> / </span>
        {preview ? <span>ניקוי מזגנים</span> : <Link href={localAcBasePath}>ניקוי מזגנים</Link>}
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{city.name}</span>
      </nav>

      <section className="grid items-center gap-6 sm:grid-cols-2 sm:gap-10">
        <div>
          <h1 className="text-4xl leading-tight font-black sm:text-5xl">{heading}</h1>
          <p className="mt-3 text-xl font-bold">ניקוי מזגן עילי {formatLocalAcPrice(localAcPrices.basic.amount)}</p>
          <p className="mt-1 text-sm">כולל מע״מ, בכפוף לבדיקה ולסוג העבודה בפועל.</p>
          <p className="mt-4 leading-7">ניקוי בבית הלקוח של הפילטרים, הסוללה והחלקים הנגישים ביחידה הפנימית, לפי מבנה המזגן והגישה אליו.</p>
          {preview ? <PreviewContactActions /> : <div className="mt-5 flex flex-wrap gap-2">
            <a className="btn-primary" data-whatsapp-service="air-conditioner-cleaning" data-whatsapp-location="hero"
              href={buildDirectWhatsAppLink(getWhatsAppMessage("air-conditioner-cleaning"))}>תיאום ב־WhatsApp</a>
            <a className="btn-secondary" href={`tel:${businessConfig.phoneDisplay.replace(/[^0-9+]/g, "")}`}>
              <span className="sr-only">התקשרו אלינו </span><GoogleCallTrackingNumber />
            </a>
            <a href="#contact" className="btn-secondary">השאירו פרטים</a>
          </div>}
        </div>
        <figure>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            <Image src={servicePhoto.url} alt={servicePhoto.alt} fill
              sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1152px) 50vw, 540px"
              loading="eager" fetchPriority="high" className="object-cover object-[center_35%]" />
          </div>
          <figcaption className="mt-2 text-sm">צילום להמחשת השירות</figcaption>
        </figure>
      </section>

      <section className="mt-10 max-w-3xl space-y-3">
        <h2 className="text-2xl font-black">{city.localTitle}</h2>
        <p className="leading-7">{city.localCopy}</p>
        <details className="rounded-xl border p-4">
          <summary className="cursor-pointer font-bold">{city.question}</summary>
          <p className="mt-2 leading-7">{city.answer}</p>
        </details>

      </section>

      <section aria-labelledby="local-ac-prices" className="mt-8 max-w-3xl space-y-4">
        <h2 id="local-ac-prices" className="text-2xl font-black">מחירון ניקוי מזגנים</h2>
        <AcPriceTable />
        <h3 className="text-xl font-bold">מה ההבדל בין סוגי הניקוי?</h3>
        <ul className="list-disc space-y-2 ps-5 leading-7">
          <li><strong>ניקוי בסיסי</strong> מתאים ללכלוך שגרתי ומתמקד בפילטרים ובחלקים נגישים ביחידה.</li>
          <li><strong>ניקוי עמוק</strong> מתאים להצטברות משמעותית בתוך היחידה. ההיקף נקבע לפי מצבה והגישה לרכיבים פנימיים.</li>
          <li><strong>טיפול בבעיה ספציפית</strong> מותאם לממצאים, למשל ריח, סימני עובש, סתימה או טפטוף. בדיקה מקדימה קובעת את העבודה הנדרשת ואת המחיר.</li>
        </ul>
        <p className="leading-7">לתיאום כמה מזגנים בביקור אחד, צלמו כל יחידה וציינו אם הגישה אליה מוגבלת. ההצעה נקבעת לפי סוג העבודה והבדיקה.</p>
      </section>

      <div id="contact" className="mt-10 max-w-3xl scroll-mt-24">
        {preview && <p className="mb-3 text-sm font-semibold" id="contact-review-notice">טופס בדיקה בלבד. הזינו נתוני דמה. הפרטים לא יועברו לצוות.</p>}
        <ContactForm initialService={serviceName} />
      </div>

      <nav aria-label="אזורי שירות לניקוי מזגנים" className="mt-9 flex flex-wrap gap-4">
        {(preview ? localAcCityLinks : publishedLocalAcLinks).filter(link => link.path !== path).map(link => (
          <Link key={link.path} href={link.path} className="underline">ניקוי מזגנים ב{link.name}</Link>
        ))}
      </nav>
    </article>
  );
}
