import { isManagedServiceKey } from "@/content/service-registry";
import { homeBlockDefinitions, PageValidationError, pageUuid, validateBlock } from "@/cms/pages/model";

export const HOME_PAGE_ID = "d4000000-0000-4000-8000-000000000000";
export const HOME_PAGE_KEY = "home";
export const HOME_SCHEMA_VERSION = 12;
export type HomeBlockType = keyof typeof homeBlockDefinitions;
export type HomeBlock = {
  id: string; position: number; type: HomeBlockType | "richText" | "imageText" | "promotionBanner" | "spacer";
  schemaVersion: 1; hidden: boolean; payload: Record<string, unknown>;
  mediaVersionId: string | null; promotionRevisionId: string | null;
};
export type HomeDraft = { schemaVersion: 12; publicTitle: "דף הבית"; h1: string;
  seoTitle: string; seoDescription: string; canonical: "/"; blocks: HomeBlock[] };

function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key)))
    throw new PageValidationError("התוכן מכיל שדה חסר או שדה שאינו מאושר.");
  return value as Record<string, unknown>;
}
function plain(value: unknown, max = 2000): string {
  if (typeof value !== "string" || !value.trim() || [...value].length > max ||
    /[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value))
    throw new PageValidationError("יש להזין טקסט רגיל בלבד, ללא קוד או HTML.");
  return value;
}
function rows(value: unknown, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max)
    throw new PageValidationError("מספר הפריטים אינו תקין.");
  return value;
}
function strings(value: unknown, min: number, max: number, length = 300): string[] {
  const result = rows(value, min, max).map(item => plain(item, length));
  if (new Set(result).size !== result.length) throw new PageValidationError("אין לשכפל פריטים.");
  return result;
}
function copy(value: unknown, fields: readonly string[]): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PageValidationError();
  const input = value as Record<string, unknown>;
  return Object.fromEntries(fields.map(key => [key, plain(input[key], ["description", "answer"].includes(key) ? 2000 : 320)]));
}
function content(type: HomeBlockType, value: unknown): Record<string, unknown> {
  switch (type) {
    case "homeHero": {
      const p = object(value, ["eyebrow", "title", "description", "primaryLabel", "secondaryLabel", "trustChips", "backgroundAlt"]);
      return { ...copy(p, ["eyebrow", "title", "description", "primaryLabel", "secondaryLabel", "backgroundAlt"]),
        trustChips: strings(p.trustChips, 1, 6) };
    }
    case "homeTrust": return { items: strings(object(value, ["items"]).items, 1, 8) };
    case "homeServices": {
      const p = object(value, ["eyebrow", "title", "mobileDescription", "description", "serviceKeys", "cards", "note"]);
      const serviceKeys = rows(p.serviceKeys, 1, 8).map(key => {
        if (!isManagedServiceKey(key)) throw new PageValidationError("זהות השירות אינה מאושרת.");
        return key;
      });
      if (new Set(serviceKeys).size !== serviceKeys.length) throw new PageValidationError("אין לשכפל שירותים.");
      const cards = p.cards;
      if (!cards || typeof cards !== "object" || Array.isArray(cards) ||
        Object.keys(cards).length > 8 || Object.keys(cards).some(key => !isManagedServiceKey(key)))
        throw new PageValidationError("כרטיס שירות אינו מאושר.");
      const checked = Object.fromEntries(Object.entries(cards).map(([key, card]) =>
        [key, copy(object(card, ["title", "benefit", "description"]), ["title", "benefit", "description"])]));
      if (serviceKeys.some(key => !checked[key])) throw new PageValidationError("חסר כרטיס שירות.");
      return { ...copy(p, ["eyebrow", "title", "mobileDescription", "description", "note"]), serviceKeys, cards: checked };
    }
    case "homeProcess": {
      const p = object(value, ["eyebrow", "title", "mobileDescription", "description", "steps"]);
      const steps = rows(p.steps, 1, 6).map(item => {
        const row = object(item, ["title", "description", "mobileDescription", "icon"]);
        if (!["image", "quote", "calendar", "cleaning"].includes(String(row.icon))) throw new PageValidationError();
        return { ...copy(row, ["title", "description", "mobileDescription"]), icon: row.icon };
      });
      return { ...copy(p, ["eyebrow", "title", "mobileDescription", "description"]), steps };
    }
    case "homeBeforeAfter": {
      const p = object(value, ["eyebrow", "title", "mobileDescription", "description", "items", "ctaLabel"]);
      const items = rows(p.items, 1, 8).map(item => {
        const row = object(item, ["title", "category", "description", "beforeVersionId", "afterVersionId", "beforeAlt", "afterAlt"]);
        if (!["sofas", "mattresses", "carpets", "cars"].includes(String(row.category)) ||
          row.beforeVersionId === row.afterVersionId) throw new PageValidationError("צמד מדיה אינו תקין.");
        const checked = copy(row, ["title", "description", "beforeAlt", "afterAlt"]);
        return { ...checked, title: checked.title, category: row.category,
          beforeVersionId: pageUuid(row.beforeVersionId), afterVersionId: pageUuid(row.afterVersionId) };
      });
      if (new Set(items.map(item => item.title)).size !== items.length) throw new PageValidationError();
      return { ...copy(p, ["eyebrow", "title", "mobileDescription", "description", "ctaLabel"]), items };
    }
    case "homeWhyUs": {
      const p = object(value, ["eyebrow", "title", "description", "items"]);
      return { ...copy(p, ["eyebrow", "title", "description"]), items: strings(p.items, 1, 8) };
    }
    case "homePricing": {
      const p = object(value, ["eyebrow", "title", "mobileDescription", "description", "factorsHeading", "factors", "cards", "ctaLabel", "ctaNote"]);
      const cards = rows(p.cards, 1, 8).map(item => {
        const card = object(item, ["title", "description", "icon"]);
        if (!["single", "multi", "car", "air"].includes(String(card.icon))) throw new PageValidationError();
        return { ...copy(card, ["title", "description"]), icon: card.icon };
      });
      return { ...copy(p, ["eyebrow", "title", "mobileDescription", "description", "factorsHeading", "ctaLabel", "ctaNote"]),
        factors: strings(p.factors, 1, 10), cards };
    }
    case "homeEstimate": return copy(object(value, ["eyebrow", "title", "mobileDescription", "description"]),
      ["eyebrow", "title", "mobileDescription", "description"]);
    case "homeAreas": return copy(object(value, ["eyebrow", "title", "mobileDescription", "description"]),
      ["eyebrow", "title", "mobileDescription", "description"]);
    case "homeFaq": {
      const p = object(value, ["eyebrow", "title", "mobileDescription", "description", "items"]);
      const items = rows(p.items, 1, 20).map(item => copy(item, ["question", "answer"]));
      if (new Set(items.map(item => item.question)).size !== items.length) throw new PageValidationError();
      return { ...copy(p, ["eyebrow", "title", "mobileDescription", "description"]), items };
    }
    case "homeFinalCta": {
      const p = object(value, ["eyebrow", "title", "description", "whatsappLabel", "phoneLabel", "trustNotes"]);
      return { ...copy(p, ["eyebrow", "title", "description", "whatsappLabel", "phoneLabel"]),
        trustNotes: strings(p.trustNotes, 1, 6) };
    }
  }
}
export function validateHomeBlock(value: unknown): HomeBlock {
  const input = object(value, ["id", "position", "type", "schemaVersion", "hidden", "payload", "mediaVersionId", "promotionRevisionId"]);
  const type = input.type;
  if (typeof type !== "string" || !Number.isInteger(input.position) || (input.position as number) < 0 ||
    (input.position as number) > 49 || input.schemaVersion !== 1 || typeof input.hidden !== "boolean") throw new PageValidationError();
  if (!Object.hasOwn(homeBlockDefinitions, type)) {
    if (!["richText", "imageText", "promotionBanner", "spacer"].includes(type)) throw new PageValidationError("סוג הבלוק אינו מאושר לבית.");
    return validateBlock(input) as HomeBlock;
  }
  const mediaVersionId = input.mediaVersionId === null ? null : pageUuid(input.mediaVersionId);
  const promotionRevisionId = input.promotionRevisionId === null ? null : pageUuid(input.promotionRevisionId);
  if (promotionRevisionId || (type === "homeHero" ? !mediaVersionId : mediaVersionId !== null)) throw new PageValidationError();
  return { id: pageUuid(input.id), position: input.position as number, type: type as HomeBlockType,
    schemaVersion: 1, hidden: input.hidden as boolean, payload: content(type as HomeBlockType, input.payload),
    mediaVersionId, promotionRevisionId };
}
export function validateHomeDraft(value: unknown): HomeDraft {
  const input = object(value, ["schemaVersion", "publicTitle", "h1", "seoTitle", "seoDescription", "canonical", "blocks"]);
  if (input.schemaVersion !== HOME_SCHEMA_VERSION || input.publicTitle !== "דף הבית" || input.canonical !== "/")
    throw new PageValidationError("זהות דף הבית או הכתובת אינן ניתנות לשינוי.");
  const blocks = rows(input.blocks, 1, 50).map(validateHomeBlock);
  if (new Set(blocks.map(block => block.id)).size !== blocks.length || blocks.some((block, index) => block.position !== index))
    throw new PageValidationError("סדר הבלוקים אינו תקין.");
  for (const type of Object.keys(homeBlockDefinitions) as HomeBlockType[])
    if (blocks.filter(block => block.type === type).length > 1) throw new PageValidationError("מקטע ייחודי אינו ניתן לשכפול.");
  if (blocks[0].type !== "homeHero" || blocks[0].hidden || blocks[0].payload.title !== input.h1)
    throw new PageValidationError("פתיח גלוי עם כותרת ראשית חייב להופיע ראשון.");
  return { schemaVersion: 12, publicTitle: "דף הבית", h1: plain(input.h1, 180),
    seoTitle: plain(input.seoTitle, 120), seoDescription: plain(input.seoDescription, 320), canonical: "/", blocks };
}
