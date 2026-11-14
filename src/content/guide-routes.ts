export const guidePaths = [
  "/guides", "/before-booking-ac-cleaning", "/ac-mini-central-and-ducts",
  "/after-renovation-cleaning-checklist", "/before-moving-in-cleaning",
] as const;

export const guideSummaries = [
  { slug: "before-booking-ac-cleaning", topic: "ac", title: "מה חשוב לדעת לפני שמזמינים ניקוי מזגן לבית?",
    description: "סוג המזגן, מה כלול בניקוי, המחיר ואילו פרטים כדאי להכין לתיאום." },
  { slug: "ac-mini-central-and-ducts", topic: "ac", title: "מה ההבדל בין ניקוי מזגן עילי, מיני מרכזי וניקוי תעלות?",
    description: "מה כולל כל שירות, מה מתומחר בנפרד ואיך מחשבים תוספת לניקוי תעלות." },
  { slug: "after-renovation-cleaning-checklist", topic: "property", title: "ניקיון אחרי שיפוץ: מה לבדוק לפני שמזמינים?",
    description: "מה מתאמים בהצעת המחיר, אילו פרטים שולחים ואיך מכינים את הנכס לניקיון." },
  { slug: "before-moving-in-cleaning", topic: "property", title: "ניקיון לפני אכלוס: איך מתכוננים לכניסה לדירה?",
    description: "תזמון הניקיון, דירה חדשה או יד שנייה, ומה לברר לפני הכנסת הרהיטים." },
] as const;

export function isGuideSlug(slug: string): boolean {
  return guidePaths.some(path => path === `/${slug}`);
}
