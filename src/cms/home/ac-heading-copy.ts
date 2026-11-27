import type { HomeDraft } from "./model";

const legacyHeadline = /^ניקוי מזגן עילי(?: עד הבית| מקצועי)?$/;

function alignTitle(value: unknown) {
  return typeof value === "string" && legacyHeadline.test(value.trim()) ? "ניקוי מזגנים" : value;
}

export function alignHomeAcHeadings(page: HomeDraft): HomeDraft {
  return {
    ...page,
    h1: legacyHeadline.test(page.h1.trim()) ? "ניקוי מזגנים" : page.h1,
    seoTitle: page.seoTitle.replace(/^ניקוי מזגן עילי(?: עד הבית| מקצועי)?(?=\s*(?:\||$))/, "ניקוי מזגנים"),
    seoDescription: page.seoDescription.replace(/^ניקוי מזגן עילי(?: עד הבית)?\.\s*/, "ניקוי מזגנים. "),
    blocks: page.blocks.map(block => {
      const { payload } = block;
      if (block.type === "homeServices") {
        const cards = payload.cards as Record<string, Record<string, unknown>>;
        const card = cards["air-conditioner-cleaning"];
        if (card) return { ...block, payload: { ...payload, cards: {
          ...cards, "air-conditioner-cleaning": { ...card, title: alignTitle(card.title) },
        } } };
      }
      if (block.type === "homePricing") {
        const cards = payload.cards as { title: string; icon: string; description: string }[];
        return { ...block, payload: { ...payload, cards: cards.map(card => card.icon === "air"
          ? { ...card, title: card.title === "ניקוי מזגן" ? "ניקוי מזגנים" : alignTitle(card.title) }
          : card) } };
      }
      if (typeof payload.title === "string") {
        const title = alignTitle(payload.title);
        if (title !== payload.title) return { ...block, payload: { ...payload, title } };
      }
      return block;
    }),
  };
}
