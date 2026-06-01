import { businessConfig } from "@/config/business";
import { faqs, services } from "@/data/site";

export const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: businessConfig.name,
  url: businessConfig.siteUrl,
  telephone: businessConfig.phoneDisplay,
  email: businessConfig.email,
  description:
    "CleanBrothers מספקים ניקוי ספות, ריפודים, מזרנים, שטיחים וריפודי רכב בבית הלקוח באזור המרכז.",
  areaServed: businessConfig.serviceAreas.map((area) => ({
    "@type": "City",
    name: area,
  })),
  sameAs: [businessConfig.siteUrl],
};

export const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "ניקוי ספות וריפודים בבית הלקוח",
  provider: {
    "@type": "LocalBusiness",
    name: businessConfig.name,
    telephone: businessConfig.phoneDisplay,
    email: businessConfig.email,
  },
  areaServed: businessConfig.serviceAreas.join(", "),
  serviceType: services.map((service) => service.title),
  description:
    "שירות ניקוי ריפודים מקצועי לספות, מזרנים, שטיחים, כורסאות וריפודי רכב בבית הלקוח.",
};

export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};
