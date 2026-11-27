import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/ContactForm";
import { JsonLd } from "@/components/JsonLd";
import { businessConfig } from "@/config/business";
import { getLocalAcCity, localAcBasePath, localAcCityLinks } from "@/content/local-ac-pilot";
import { serviceRegistry } from "@/content/service-registry";
import { buildMetadata } from "@/lib/seo";
import { isSiteReview } from "@/lib/site-review";
import { buildPageServiceJsonLd } from "@/lib/structured-data";

type LocalPageProps = { params: Promise<{ city: string }> };

const servicePhoto = {
  url: "/images/services/Air-conditioner-cleaning4.JPG",
  alt: "צילום מעבודת ניקוי מזגן עילי",
};

async function getPilotPage({ params }: LocalPageProps) {
  if (!isSiteReview()) notFound();
  const { city: slug } = await params;
  const city = getLocalAcCity(slug);
  if (!city) notFound();

  return { city, path: `${localAcBasePath}/${slug}`, heading: `ניקוי מזגן עילי ב${city.name}` };
}

export async function generateMetadata(props: LocalPageProps): Promise<Metadata> {
  const { city, path, heading } = await getPilotPage(props);

  return {
    ...buildMetadata({
      title: `${heading} ב־199 ₪ | CleanBrothers`,
      description: city.description,
      path,
      image: servicePhoto,
    }),
    keywords: null,
    robots: { index: false, follow: false },
  };
}

export default async function LocalAcPage(props: LocalPageProps) {
  const { city, path, heading } = await getPilotPage(props);
  const serviceName = serviceRegistry["air-conditioner-cleaning"].crmName;
  const serviceSchema = buildPageServiceJsonLd({ serviceName: heading, intro: city.description, path });

  return (
    <article className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
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
        <Link href="/" className="underline">בית</Link>
        <span aria-hidden="true"> / </span>
        <Link href={localAcBasePath} className="underline">ניקוי מזגנים</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{city.name}</span>
      </nav>

      <section className="grid items-center gap-6 sm:grid-cols-2 sm:gap-10">
        <div>
          <h1 className="text-4xl leading-tight font-black sm:text-5xl">{heading}</h1>
          <p className="mt-3 text-xl font-bold">199 ₪ ליחידה עילית, כולל מע״מ</p>
          <p className="mt-4 leading-7">ניקוי בבית הלקוח של הפילטרים, הסוללה והחלקים הנגישים ביחידה הפנימית, לפי מבנה המזגן והגישה אליו.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="btn-primary opacity-60" disabled>תיאום ב־WhatsApp</button>
            <button type="button" className="btn-secondary opacity-60" disabled>התקשרו אלינו</button>
            <a href="#contact" className="btn-secondary">השאירו פרטים</a>
          </div>
          <p className="mt-3 text-sm">בתצוגת הבדיקה אפשר למלא את הטופס. הפנייה לא נשלחת.</p>
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
        <p><Link href="/mini-central-air-conditioner-cleaning" className="underline">לפרטים על ניקוי מזגן מיני מרכזי</Link></p>
      </section>

      <div id="contact" className="mt-10 max-w-3xl scroll-mt-24">
        <ContactForm initialService={serviceName} />
      </div>

      <nav aria-label="אזורי שירות לניקוי מזגנים" className="mt-9 flex flex-wrap gap-4">
        {localAcCityLinks.filter(link => link.path !== path).map(link => (
          <Link key={link.path} href={link.path} className="underline">ניקוי מזגנים ב{link.name}</Link>
        ))}
      </nav>
    </article>
  );
}
