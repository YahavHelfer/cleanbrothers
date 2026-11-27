import { isSiteReview } from "./site-review";

export const acPriceReviewPages = [
  { label: "בית", href: "/" },
  { label: "ניקוי מזגנים", href: "/air-conditioner-cleaning" },
  { label: "מיני מרכזי", href: "/mini-central-air-conditioner-cleaning" },
  { label: "לפני הזמנת ניקוי", href: "/before-booking-ac-cleaning" },
  { label: "עילי, מיני מרכזי ותעלות", href: "/ac-mini-central-and-ducts" },
] as const;

export function isAcPriceAlignmentPreview() {
  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  return isSiteReview() && (branch === "review/ac-price-alignment" || branch === "review/ac-price-release-rc" ||
    branch === "review/ac-price-headings-rc");
}

export function isLocalAcPreview() {
  return isAcPriceAlignmentPreview() || (isSiteReview() &&
    (process.env.VERCEL_GIT_COMMIT_REF === "review/local-ac-seo" || process.env.LOCAL_AC_PREVIEW_MODE === "1"));
}
