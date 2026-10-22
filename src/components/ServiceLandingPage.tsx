import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { GoogleCallTrackingNumber } from "@/components/GoogleCallTrackingNumber";
import { JsonLd } from "@/components/JsonLd";
import { YouTubeLiteEmbed } from "@/components/YouTubeLiteEmbed";
import { ServiceLandingView } from "@/components/ServiceLandingView";
import { businessConfig } from "@/config/business";
import type { ServiceLandingConfig } from "@/content/service-landing";
import { buildPageServiceJsonLd } from "@/lib/structured-data";
import { buildMetadata } from "@/lib/seo";
import { getPrimaryServiceImage } from "@/lib/service-images";
import { getWhatsAppLink } from "@/lib/whatsapp";

export function buildServiceLandingMetadata(
  config: ServiceLandingConfig,
): Metadata {
  const primaryImage = getPrimaryServiceImage(config);
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
      images: primaryImage ? [{ url: primaryImage, alt: config.imageAlt }] : base.openGraph?.images,
    },
    twitter: {
      card: "summary_large_image",
      title: config.metaTitle,
      description: config.metaDescription,
      images: primaryImage ? [primaryImage] : ["/images/logo/cleanbrothers-logo.png"],
    },
  };
}

export function ServiceLandingPage({ config, crmServiceName = config.serviceName }: {
  config: ServiceLandingConfig; crmServiceName?: string;
}) {
  const miniCentral = config.path === "/mini-central-air-conditioner-cleaning";
  const phoneHref = "tel:0559577731";
  return ServiceLandingView({
    config,
    contact: <ContactForm initialService={crmServiceName} />,
    phoneNumber: <GoogleCallTrackingNumber>055-957-7731</GoogleCallTrackingNumber>,
    phoneHref,
    whatsappHref: getWhatsAppLink(miniCentral ? "היי, אשמח לתאם ניקוי מזגן מיני מרכזי. היישוב שלי: ___. מצרף/ת תמונות של המזגן ופתח הגישה." : `היי, אשמח לקבל הצעת מחיר עבור ${config.serviceName}.`),
    jsonLd: <>
      <JsonLd id={`${config.path.slice(1)}-service-jsonld`} data={buildPageServiceJsonLd(config)} />
      <JsonLd id={`${config.path.slice(1)}-breadcrumb-jsonld`} data={{
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "בית", item: businessConfig.siteUrl },
          { "@type": "ListItem", position: 2, name: "שירותים", item: `${businessConfig.siteUrl}/services` },
          { "@type": "ListItem", position: 3, name: config.serviceName, item: `${businessConfig.siteUrl}${config.path}` },
        ],
      }} />
    </>,
    video: config.video ? <YouTubeLiteEmbed videoId={config.video.youtubeId} title={config.video.title}
      poster={config.video.poster} watchUrl={config.video.watchUrl} /> : null,
  });
}
