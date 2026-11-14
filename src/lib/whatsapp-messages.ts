// Code-owned customer copy. WhatsApp messages contain no CRM reference.
export const whatsappMessages = {
  "business-ac-cleaning": "היי, אשמח לקבל הצעת מחיר לניקוי מזגנים לעסק, למשרד או למוסד.",
  general: "היי, אשמח לקבל פרטים על השירותים שלכם 😊",
  "air-conditioner-cleaning": "היי, אשמח לקבל הצעת מחיר לניקוי מזגן אצלכם 😊",
  "mini-central-air-conditioner-cleaning": "היי, אשמח לקבל פרטים על ניקוי מזגן מיני מרכזי אצלכם",
  "sofa-cleaning": "היי, אשמח להצעת מחיר לניקוי ספה. היישוב שלי: ___. אשלח תמונה של הספה.",
  "mattress-cleaning": "היי, אשמח לקבל הצעת מחיר לניקוי מזרון",
  "post-renovation-cleaning": "היי, אשמח לקבל הצעת מחיר לניקיון אחרי שיפוץ",
  "pre-occupancy-cleaning": "היי, אשמח לקבל הצעת מחיר לניקיון לפני אכלוס",
  "carpet-cleaning": "היי, אשמח לקבל הצעת מחיר לניקוי שטיח",
  "car-upholstery-cleaning": "היי, אשמח לקבל הצעת מחיר לניקוי ריפודי רכב אצלכם",
  "armchair-chair-cleaning": "היי, אשמח לקבל הצעת מחיר לניקוי כורסאות וכיסאות",
  "delicate-upholstery-cleaning": "היי, אשמח לקבל הצעת מחיר לניקוי ריפודים עדינים",
  "window-cleaning": "היי, אשמח לקבל הצעת מחיר לניקוי חלונות אצלכם",
} as const;
export type WhatsAppService = keyof typeof whatsappMessages;
export function isWhatsAppService(value: unknown): value is WhatsAppService {
  return typeof value === "string" && Object.hasOwn(whatsappMessages, value);
}
export function getWhatsAppMessage(service: WhatsAppService = "general") {
  return whatsappMessages[service];
}

export const businessGoogleWhatsAppMessage = "היי, אשמח לקבל הצעת מחיר לניקוי מזגנים לעסק. הגעתי ממודעת Google.";

// Only consented attribution supplied by the caller can select the paid opening.
export function getWhatsAppNavigationMessage(service: WhatsAppService, attribution: {
  utm_source?: string; utm_medium?: string; utm_campaign?: string;
} = {}) {
  return service === "business-ac-cleaning" && attribution.utm_source === "google" &&
    attribution.utm_medium === "cpc" && attribution.utm_campaign === "business_ac_cleaning"
    ? businessGoogleWhatsAppMessage : getWhatsAppMessage(service);
}

// Legacy CTAs and CMS messages are classified locally; their text never enters analytics.
export function resolveWhatsAppService(pathname: string, message = ""): WhatsAppService {
  if (pathname.replace(/\/$/, "") === "/business-ac-cleaning" ||
    /ניקוי מזגנים לעסק/.test(message)) return "business-ac-cleaning";
  const candidates: [RegExp, WhatsAppService][] = [
    [/מיני\s*מרכזי/, "mini-central-air-conditioner-cleaning"],
    [/לפני\s*(?:אכלוס|איכלוס)/, "pre-occupancy-cleaning"],
    [/אחרי\s*שיפוץ/, "post-renovation-cleaning"],
    [/מזג[נן]/, "air-conditioner-cleaning"],
    [/ספ[הות]/, "sofa-cleaning"],
    [/מזר[וןנים]+/, "mattress-cleaning"],
    [/שטיח/, "carpet-cleaning"],
    [/רכב/, "car-upholstery-cleaning"],
    [/כורס|כיסא/, "armchair-chair-cleaning"],
    [/ריפודים עדינים/, "delicate-upholstery-cleaning"],
    [/חלונות/, "window-cleaning"],
  ];
  const matches = [...new Set(candidates.filter(([pattern]) => pattern.test(message)).map(([, service]) => service))];
  // Mini-central also matches AC; prefer its more specific identity.
  const specific = matches.filter(service => service !== "air-conditioner-cleaning" || !matches.includes("mini-central-air-conditioner-cleaning"));
  if (specific.length === 1) return specific[0];
  const pageService = pathname.replace(/^\/|\/$/g, "");
  return isWhatsAppService(pageService) ? pageService : "general";
}
