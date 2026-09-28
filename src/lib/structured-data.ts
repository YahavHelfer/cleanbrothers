import { businessConfig } from "@/config/business";
import { siteSettingsBaseline } from "@/cms/site/baseline";
import type { SiteSettings } from "@/cms/site/model";
import { faqs, services } from "@/data/site";

export function buildLocalBusinessJsonLd(settings: SiteSettings = siteSettingsBaseline) { return {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: settings.businessName,
  url: businessConfig.siteUrl,
  telephone: settings.phoneDisplay,
  email: settings.email,
  logo: `${businessConfig.siteUrl}/images/logo/cleanbrothers-logo.png`,
  description: settings.structuredDescription,
  areaServed: settings.serviceAreas.map((area) => ({
    "@type": "City",
    name: area,
  })),
}; }
export const localBusinessJsonLd = buildLocalBusinessJsonLd();

export function buildServiceJsonLd(settings: SiteSettings = siteSettingsBaseline) { return {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "שירותי ניקיון מקצועיים לבית, לעסק ולרכב",
  provider: {
    "@type": "LocalBusiness",
    name: settings.businessName,
    telephone: settings.phoneDisplay,
    email: settings.email,
  },
  areaServed: settings.serviceAreas.join(", "),
  serviceType: services.map((service) => service.title),
  description:
    "שירות ניקוי מקצועי לספות, מזרנים, שטיחים, כורסאות, ריפודי רכב, מזגנים וחלונות לבית ולעסק.",
}; }
export const serviceJsonLd = buildServiceJsonLd();

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
