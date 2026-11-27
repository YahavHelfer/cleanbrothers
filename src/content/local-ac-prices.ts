export const localAcPrices = {
  visit: { service: "ביקור ובדיקת מזגן", amount: 250 },
  basic: { service: "ניקוי בסיסי למזגן עילי", amount: 250 },
  deep: { service: "ניקוי עמוק למזגן עילי", amount: 250 },
  odor: { service: "ניקוי מזגן עם ריח לא נעים", amount: 350 },
  mold: { service: "ניקוי מזגן עם סימני עובש", amount: 400 },
  blower: { service: "ניקוי מאיץ וסוללה פנימית", amount: 450 },
  drainage: { service: "פתיחת סתימה וניקוי תעלת ניקוז", amount: 350 },
  miniCentral: { service: "ניקוי מזגן מיני מרכזי", amount: 600 },
  drip: { service: "ניקוי משולב עם בדיקת טפטוף", amount: 350 },
} as const;

export const localAcPriceTerms = "כל המחירים כוללים מע״מ, הם מחירי פתיחה וכפופים לבדיקה ולסוג העבודה בפועל.";

export function formatLocalAcPrice(amount: number) {
  return `החל מ־${amount} ₪`;
}
