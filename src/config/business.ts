export const CANONICAL_SITE_URL = "https://www.cleanbrothers.co.il";
const BUSINESS_PHONE =
  cleanEnv(process.env.NEXT_PUBLIC_BUSINESS_PHONE) || "0559577731";
const WHATSAPP_PHONE =
  cleanEnv(process.env.NEXT_PUBLIC_WHATSAPP_PHONE) || "972559577731";
const BUSINESS_EMAIL =
  cleanEnv(process.env.NEXT_PUBLIC_BUSINESS_EMAIL) ||
  "CleanBrothers.ISR@gmail.com";

function cleanEnv(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed || /X{2,}|0{5,}/i.test(trimmed)) {
    return "";
  }

  return trimmed;
}

export const businessConfig = {
  name: "CleanBrothers",
  siteUrl: CANONICAL_SITE_URL,
  phoneDisplay: BUSINESS_PHONE,
  whatsappPhone: WHATSAPP_PHONE,
  email: BUSINESS_EMAIL,
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
