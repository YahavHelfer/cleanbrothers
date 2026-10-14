import { businessConfig } from "@/config/business";
import { siteSettingsBaseline } from "@/cms/site/baseline";
import type { SiteSettings } from "@/cms/site/model";
import { faqs, services } from "@/data/site";

export const businessEntityId = `${businessConfig.siteUrl}/#business`;

export function buildLocalBusinessJsonLd(settings: SiteSettings = siteSettingsBaseline) { return {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": businessEntityId,
  name: settings.businessName,
  url: businessConfig.siteUrl,
  telephone: settings.phoneDisplay,
  email: settings.email,
  openingHoursSpecification: businessConfig.openingHoursSpecification,
  logo: `${businessConfig.siteUrl}/images/logo/cleanbrothers-logo.png`,
  description: settings.structuredDescription,
  areaServed: settings.serviceAreas.filter(area => area !== "והסביבה").map((area) => ({
    "@type": "Place",
    name: area,
  })),
}; }
export const localBusinessJsonLd = buildLocalBusinessJsonLd();

export function buildServiceJsonLd(settings: SiteSettings = siteSettingsBaseline) { return {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "שירותי ניקיון מקצועיים לבית, לעסק ולרכב",
  provider: {
    "@id": businessEntityId,
  },
  areaServed: settings.serviceAreas.join(", "),
  serviceType: services.map((service) => service.title),
  description:
    "שירות ניקוי מקצועי לספות, מזרנים, שטיחים, כורסאות, ריפודי רכב, מזגנים וחלונות לבית ולעסק.",
}; }
export const serviceJsonLd = buildServiceJsonLd();

export function buildPageServiceJsonLd(service: { serviceName: string; intro: string; path: string }) {
  return {
    "@context": "https://schema.org", "@type": "Service",
    "@id": `${businessConfig.siteUrl}${service.path}#service`,
    name: service.serviceName, serviceType: service.serviceName,
    description: service.intro, url: `${businessConfig.siteUrl}${service.path}`,
    provider: { "@id": businessEntityId },
  };
}

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
