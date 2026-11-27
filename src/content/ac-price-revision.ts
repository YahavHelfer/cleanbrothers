import { acDuctPricingNotice, miniCentralStartingPrice, wallAcStartingPrice } from "./local-ac-prices";

export const homeAcPriceSummary = `ניקוי מזגן עילי ${wallAcStartingPrice}, ומיני מרכזי ${miniCentralStartingPrice}. כולל מע״מ ובכפוף לבדיקה.`;
export const wallAcMultipleQuote = "לכמה מזגנים, שולחים תמונה של כל יחידה. ההצעה נקבעת לאחר בדיקת סוג העבודה והגישה לכל יחידה.";

const legacyWall = /(?<!\d)(?:199|249)\s*(?:₪|ש[״"׳']?ח)(?!\d)/;
const legacyMini = /(?<!\d)(?:450|550)\s*(?:₪|ש[״"׳']?ח)(?!\d)/;
const legacyBundle = /(?<!\d)(?:398|700)\s*(?:₪|ש[״"׳']?ח)(?!\d)/;
const legacyDuct = /(?:תעל[ו]?[תה].{0,80}(?:100|150|250)|(?:100|150|250)\s*(?:₪|ש[״"׳']?ח).{0,45}תעל[ו]?[תה])/;

export function alignAcPriceCopy(value: string, scope: "home" | "wall" | "mini" | "guide"): string {
  if (scope === "home") {
    return value
      .replace(/מזגן עד 2 כ[״"]ס[: ]+199\s*₪,? מעל 2 כ[״"]ס[: ]+249\s*₪/g, `מזגן עילי ${wallAcStartingPrice}`)
      .replace(/מזגן (?:עד 2 כ[״"]ס|עילי(?: בכל הספק)?)(?: ב־|: | )199\s*₪/g, `מזגן עילי ${wallAcStartingPrice}`)
      .replace(/מיני מרכזי(?: ב־|: | )(?:450|550)\s*₪(?:,? ותעלות בתוספת 250\s*₪ לכל התעלות יחד)?/g, `מיני מרכזי ${miniCentralStartingPrice}`)
      .replace(/(?:אפשר להזמין )?ניקוי תעלות בתוספת (?:100|150|250)\s*₪[^.]*\.?/g, acDuctPricingNotice);
  }
  if (legacyBundle.test(value)) return scope === "wall" ? wallAcMultipleQuote : acDuctPricingNotice;
  if (legacyDuct.test(value)) return acDuctPricingNotice;
  if (legacyWall.test(value) && legacyMini.test(value)) return homeAcPriceSummary;
  if (legacyWall.test(value)) return `ניקוי מזגן עילי ${wallAcStartingPrice}, כולל מע״מ ובכפוף לבדיקה.`;
  if (legacyMini.test(value)) return `ניקוי מזגן מיני מרכזי ${miniCentralStartingPrice}, כולל מע״מ ובכפוף לבדיקת גישה.`;
  return value;
}

export function applyAcPriceRevision<T>(value: T, scope: "home" | "wall" | "mini" | "guide" = "home"): T {
  function visit(item: unknown): unknown {
    if (typeof item === "string") return alignAcPriceCopy(item, scope);
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === "object") return Object.fromEntries(
      Object.entries(item).map(([key, entry]) => [key, visit(entry)]),
    );
    return item;
  }
  return visit(value) as T;
}

export function isUnalignedAcOffer(value: unknown): boolean {
  const copy = JSON.stringify(value);
  return /מזג[נן]|מיני מרכזי|air-conditioner-cleaning/.test(copy) &&
    (legacyWall.test(copy) || legacyMini.test(copy) || legacyBundle.test(copy) ||
      legacyDuct.test(copy) || /"(?:currentPrice|regularPrice|startingPrice)":(?:199|249|398|450|550|700)(?=[,}])/.test(copy) ||
      /מחיר קבוע|בכל הספק|הנחת כמות|ללא עלות|תוספת חניה/.test(copy));
}
