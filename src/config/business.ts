export const CANONICAL_SITE_URL = "https://www.cleanbrothers.co.il";
const BUSINESS_PHONE =
  cleanEnv(process.env.NEXT_PUBLIC_BUSINESS_PHONE) || "0559577731";
const WHATSAPP_PHONE =
  cleanEnv(process.env.NEXT_PUBLIC_WHATSAPP_PHONE) || "972559577731";
const BUSINESS_EMAIL =
  cleanEnv(process.env.NEXT_PUBLIC_BUSINESS_EMAIL) ||
  "info@cleanbrothers.co.il";

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
  // Confirmed by the business owner on 2026-10-14.
  operatingHoursDisplay: "ראשון–חמישי 08:00–18:00, שישי 07:30–15:00",
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"], opens: "08:00", closes: "18:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Friday"], opens: "07:30", closes: "15:00" },
  ],
  serviceAreas: [
    "פתח תקווה", "רמת גן", "הוד השרון", "תל אביב", "רעננה",
    "הרצליה", "רמת השרון", "גבעתיים", "והסביבה",
  ],
};
