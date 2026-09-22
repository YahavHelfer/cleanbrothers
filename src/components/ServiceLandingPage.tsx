import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { GoogleCallTrackingNumber } from "@/components/GoogleCallTrackingNumber";
import { JsonLd } from "@/components/JsonLd";
import { YouTubeLiteEmbed } from "@/components/YouTubeLiteEmbed";
import { ServiceLandingView } from "@/components/ServiceLandingView";
import { businessConfig } from "@/config/business";
import type { ServiceLandingConfig } from "@/content/service-landing";
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
      images: [{ url: primaryImage, alt: config.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: config.metaTitle,
      description: config.metaDescription,
      images: [primaryImage],
    },
  };
}

export function ServiceLandingPage({ config, crmServiceName = config.serviceName }: {
  config: ServiceLandingConfig; crmServiceName?: string;
}) {
  const phoneHref = "tel:0559577731";
  const faqJsonLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: config.faqs.map((faq) => ({ "@type": "Question", name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
  };
  return ServiceLandingView({
    config,
    contact: <ContactForm initialService={crmServiceName} />,
    phoneNumber: <GoogleCallTrackingNumber>055-957-7731</GoogleCallTrackingNumber>,
    phoneHref,
    whatsappHref: getWhatsAppLink(`היי, אשמח לקבל הצעת מחיר עבור ${config.serviceName}.`),
    jsonLd: <JsonLd id={`${config.path.slice(1)}-faq-jsonld`} data={faqJsonLd} />,
    video: config.video ? <YouTubeLiteEmbed videoId={config.video.youtubeId} title={config.video.title}
      poster={config.video.poster} watchUrl={config.video.watchUrl} /> : null,
  });
}
