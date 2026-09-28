import { PageValidationError } from "@/cms/pages/model";
import { homeBaseline } from "./baseline";
import { HOME_GOOGLE_REVIEWS_BLOCK_ID, validateHomeDraft, type HomeDraft } from "./model";
export { HOME_GOOGLE_REVIEWS_BLOCK_ID } from "./model";

// A historical Home revision may have only the original eleven blocks. Build
// the next draft from that exact revision; never substitute the code baseline.
export function addHiddenGoogleReviewsBlock(value: HomeDraft): HomeDraft | null {
  const current = validateHomeDraft(value);
  const byId = current.blocks.find(block => block.id === HOME_GOOGLE_REVIEWS_BLOCK_ID);
  const byType = current.blocks.find(block => block.type === "homeGoogleReviews");
  if (byId || byType) {
    if (byId?.type === "homeGoogleReviews" && byType?.id === HOME_GOOGLE_REVIEWS_BLOCK_ID) return null;
    throw new PageValidationError("מקטע הביקורות הקיים אינו תואם לזהות המאושרת. הטיוטה לא שונתה.");
  }
  const after = current.blocks.findIndex(block => block.type === "homeWhyUs");
  const pricing = current.blocks.findIndex(block => block.type === "homePricing");
  if (after < 0 || pricing <= after || current.blocks.length >= 50)
    throw new PageValidationError("סדר מקטעי דף הבית אינו מתאים להוספת ביקורות.");
  const template = homeBaseline.blocks.find(block => block.type === "homeGoogleReviews");
  if (!template || template.id !== HOME_GOOGLE_REVIEWS_BLOCK_ID || !template.hidden)
    throw new PageValidationError("תבנית הביקורות המאושרת אינה זמינה.");
  const blocks = [...current.blocks.slice(0, after + 1), template, ...current.blocks.slice(after + 1)]
    .map((block, position) => ({ ...block, position }));
  return validateHomeDraft({ ...current, blocks });
}
