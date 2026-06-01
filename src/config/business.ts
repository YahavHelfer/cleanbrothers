const fallbackSiteUrl = "http://localhost:3000";
const fallbackBusinessPhone = "0559577731";
const fallbackWhatsAppPhone = "972559577731";
const fallbackBusinessEmail = "CleanBrothers.ISR@gmail.com";

function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export const businessConfig = {
  name: "CleanBrothers",
  siteUrl: withoutTrailingSlash(
    process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl,
  ),
  phoneDisplay:
    process.env.NEXT_PUBLIC_BUSINESS_PHONE || fallbackBusinessPhone,
  whatsappPhone: process.env.NEXT_PUBLIC_WHATSAPP_PHONE || fallbackWhatsAppPhone,
  email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || fallbackBusinessEmail,
  whatsappDefaultMessage:
    "היי, אשמח לקבל הצעת מחיר לניקוי ספות / ריפודים / שטיחים / רכב.",
  serviceAreas: [
    "ראש העין",
    "פתח תקווה",
    "הוד השרון",
    "כפר סבא",
    "רמת גן",
    "גבעת שמואל",
    "גבעתיים",
    "תל אביב",
    "מרכז הארץ",
  ],
};
