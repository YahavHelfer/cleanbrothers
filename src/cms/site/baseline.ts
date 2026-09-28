import { businessConfig } from "@/config/business";
import { validateSiteFooter, validateSiteNavigation, validateSiteSettings } from "./model";

export const siteSettingsBaseline = validateSiteSettings({
  schemaVersion: 9,
  businessName: businessConfig.name,
  phoneDisplay: businessConfig.phoneDisplay,
  email: businessConfig.email,
  serviceAreas: businessConfig.serviceAreas,
  structuredDescription: "CleanBrothers מספקים ניקוי ספות, ריפודים, מזרנים, שטיחים, ריפודי רכב, מזגנים וחלונות לבית ולעסק באזור המרכז.",
});

export const siteNavigationBaseline = validateSiteNavigation({
  schemaVersion: 10,
  items: [
    { id: "a3000000-0000-4000-8000-000000000001", order: 0, label: "בית", visible: true, target: { kind: "static", path: "/" } },
    { id: "a3000000-0000-4000-8000-000000000002", order: 1, label: "שירותים", visible: true, target: { kind: "static", path: "/services" } },
    { id: "a3000000-0000-4000-8000-000000000003", order: 2, label: "גלריה", visible: true, target: { kind: "static", path: "/gallery" } },
    { id: "a3000000-0000-4000-8000-000000000004", order: 3, label: "אודות", visible: true, target: { kind: "static", path: "/about" } },
    { id: "a3000000-0000-4000-8000-000000000005", order: 4, label: "צור קשר", visible: true, target: { kind: "static", path: "/contact" } },
  ],
});

export const siteFooterBaseline = validateSiteFooter({
  schemaVersion: 11,
  description: "ניקוי ספות, מזרנים, שטיחים, ריפודי רכב, מזגנים וחלונות לבית ולעסק עם שירות מקצועי, נעים וברור.",
  featuredServices: ["sofa-cleaning", "air-conditioner-cleaning", "window-cleaning"],
  legal: [
    { path: "/privacy-policy", order: 0, label: "מדיניות פרטיות", visible: true },
    { path: "/data-deletion", order: 1, label: "מחיקת מידע", visible: true },
    { path: "/accessibility-statement", order: 2, label: "הצהרת נגישות", visible: true },
  ],
  copyright: "© CleanBrothers כל הזכויות שמורות",
  tagline: "ניקוי ריפודים מקצועי בבית הלקוח",
  whatsappCtaLabel: "שלחו תמונה וקבלו מחיר",
});
