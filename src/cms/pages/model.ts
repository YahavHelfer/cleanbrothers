import { businessConfig } from "@/config/business";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { newPagePath } from "./routes";

export const ABOUT_PAGE_ID = "c0000000-0000-4000-8000-000000000100";
export const ABOUT_PAGE_KEY = "about";
export const ABOUT_PATH = "/about";
export const ABOUT_PROMOTION_ID = "c0000000-0000-4000-8000-000000000200";
export const ABOUT_PROMOTION_KEY = "about-intro";
export const PAGE_SCHEMA_VERSION = 6;
export const PROMOTION_SCHEMA_VERSION = 7;
export const BLOCK_SCHEMA_VERSION = 1;

export class PageValidationError extends Error {
  constructor(message = "תוכן העמוד אינו תקין. בדקו את השדות ונסו שוב.") { super(message); }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function pageUuid(value: unknown): string {
  if (typeof value !== "string" || !uuidPattern.test(value)) throw new PageValidationError("מזהה הגרסה אינו תקין.");
  return value;
}
export function pageGeneration(value: unknown): number {
  const number = typeof value === "string" && /^[1-9]\d{0,14}$/.test(value) ? Number(value) : value;
  if (typeof number !== "number" || !Number.isSafeInteger(number) || number < 1) throw new PageValidationError("מצב העריכה אינו תקין. טענו מחדש את העמוד.");
  return number;
}
function exact(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key)))
    throw new PageValidationError("התוכן מכיל שדות חסרים או שדות שאינם נתמכים.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, min = 1): string {
  if (typeof value !== "string" || value.trim().length < min || [...value].length > max ||
    /[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value))
    throw new PageValidationError("יש להזין טקסט רגיל באורך המותר, ללא קוד או HTML.");
  return value;
}
function list(value: unknown, max: number, min = 1): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new PageValidationError();
  return value;
}

export const internalRoutes = ["/", "/about", "/services", "/contact", "/gallery",
  "/sofa-cleaning", "/mattress-cleaning", "/carpet-cleaning", "/delicate-upholstery-cleaning",
  "/car-upholstery-cleaning", "/armchair-chair-cleaning", "/air-conditioner-cleaning", "/window-cleaning"] as const;
export type SafeTarget = { kind: "internal"; path: (typeof internalRoutes)[number] }
  | { kind: "phone" }
  | { kind: "whatsapp"; message: string };
export type SafeCta = { label: string; target: SafeTarget };
export function validateTarget(value: unknown): SafeTarget {
  const input = exact(value, ["kind", ...(typeof value === "object" && value !== null && "kind" in value && value.kind === "internal" ? ["path"] :
    typeof value === "object" && value !== null && "kind" in value && value.kind === "whatsapp" ? ["message"] : [])]);
  if (input.kind === "internal" && internalRoutes.includes(input.path as (typeof internalRoutes)[number]))
    return { kind: "internal", path: input.path as (typeof internalRoutes)[number] };
  if (input.kind === "phone") return { kind: "phone" };
  if (input.kind === "whatsapp") return { kind: "whatsapp", message: text(input.message, 300) };
  throw new PageValidationError("יעד הקישור אינו מאושר.");
}
export function validateCta(value: unknown): SafeCta {
  const input = exact(value, ["label", "target"]);
  return { label: text(input.label, 120), target: validateTarget(input.target) };
}
export function resolveSafeTarget(target: SafeTarget, preview = false): string | undefined {
  if (preview) return undefined;
  if (target.kind === "internal") return target.path;
  if (target.kind === "phone") return `tel:${businessConfig.phoneDisplay.replace(/[^0-9+]/g, "")}`;
  return getWhatsAppLink(target.message);
}

export type Inline = { text: string; bold: boolean; emphasis: boolean; link: SafeTarget | null };
export type RichNode = { kind: "paragraph" | "heading" | "unordered" | "ordered";
  level: 2 | 3 | null; items: Inline[][] };
export function validateInline(value: unknown): Inline {
  const input = exact(value, ["text", "bold", "emphasis", "link"]);
  if (typeof input.bold !== "boolean" || typeof input.emphasis !== "boolean") throw new PageValidationError();
  return { text: text(input.text, 1000), bold: input.bold, emphasis: input.emphasis,
    link: input.link === null ? null : validateTarget(input.link) };
}
function validateRichNode(value: unknown): RichNode {
  const input = exact(value, ["kind", "level", "items"]);
  if (!["paragraph", "heading", "unordered", "ordered"].includes(String(input.kind))) throw new PageValidationError();
  if (input.kind === "heading" ? ![2, 3].includes(input.level as number) : input.level !== null) throw new PageValidationError();
  const items = list(input.items, input.kind === "unordered" || input.kind === "ordered" ? 12 : 1)
    .map(item => list(item, 20).map(validateInline));
  if (!["unordered", "ordered"].includes(String(input.kind)) && items.length !== 1) throw new PageValidationError();
  return { kind: input.kind as RichNode["kind"], level: input.level as RichNode["level"], items };
}

export const blockDefinitions = {
  hero: { label: "פתיח ראשי", description: "כותרת, תיאור ופעולה ראשית", mediaRole: "hero", accessibility: "כותרת ראשית אחת ותיאור חלופי למדיה" },
  richText: { label: "טקסט", description: "פסקאות, כותרות ורשימות", mediaRole: null, accessibility: "כותרות בדרגות 2–3 וקישורים עם טקסט ברור" },
  imageText: { label: "תמונה וטקסט", description: "תמונה לצד תוכן", mediaRole: "imageText", accessibility: "תיאור חלופי הקשרי לתמונה" },
  faq: { label: "שאלות נפוצות", description: "שאלות ותשובות מסודרות", mediaRole: null, accessibility: "שאלות ככותרות ותשובות צמודות" },
  cta: { label: "קריאה לפעולה", description: "קישור פנימי, חיוג או WhatsApp", mediaRole: null, accessibility: "טקסט פעולה מפורש" },
  promotionBanner: { label: "מבצע", description: "גרסת מבצע קבועה מתוך מסמך מבצעים", mediaRole: null, accessibility: "כותרת המבצע ופעולה ברורה" },
  spacer: { label: "מפריד", description: "מרווח או קו בעיצוב מאושר", mediaRole: null, accessibility: "מפריד דקורטיבי מוסתר מקורא מסך" },
  aboutOverview: { label: "ערכי העסק", description: "תבנית אודות קיימת", mediaRole: null, accessibility: "כותרת מקטע וכותרת לכל ערך" },
} as const;
// Homepage blocks use the same immutable page_revision_blocks rows and revision
// engine, but are deliberately unavailable in the /about/new-page editor.
export const homeBlockDefinitions = {
  homeHero: { label: "פתיח דף הבית", description: "כותרת, תיאור ומדיה", singleton: true },
  homeTrust: { label: "פס אמון", description: "תוויות אמון", singleton: true },
  homeServices: { label: "שירותים", description: "בחירה וסדר שירותים", singleton: true },
  homeProcess: { label: "תהליך העבודה", description: "שלבי התהליך", singleton: true },
  homeBeforeAfter: { label: "לפני ואחרי", description: "זוגות מדיה מאושרים", singleton: true },
  homeWhyUs: { label: "למה לבחור בנו", description: "יתרונות השירות", singleton: true },
  homePricing: { label: "מדריך מחירים", description: "הסבר בלבד; נוסחאות בקוד", singleton: true },
  homeEstimate: { label: "מחשבון מחיר", description: "כותרות בלבד; חישוב בקוד", singleton: true },
  homeAreas: { label: "אזורי שירות", description: "מלל; ערים בקוד", singleton: true },
  homeFaq: { label: "שאלות נפוצות", description: "שאלות ותשובות", singleton: true },
  homeFinalCta: { label: "קריאה לפעולה", description: "מלל; יעדי קשר בקוד", singleton: true },
} as const;
export type BlockType = keyof typeof blockDefinitions;
export type PageBlock = { id: string; position: number; type: BlockType; schemaVersion: 1; hidden: boolean;
  payload: Record<string, unknown>; mediaVersionId: string | null; promotionRevisionId: string | null };
export type PageDraft = { schemaVersion: 6 | 8; publicTitle: string; h1: string; seoTitle: string; seoDescription: string;
  canonical: string; blocks: PageBlock[] };
export type PromotionDraft = { schemaVersion: 7; publicTitle: string; h1: string; seoTitle: string;
  seoDescription: string; description: string; template: "accent" | "quiet"; enabled: boolean;
  cta: SafeCta; mediaVersionId: string | null; mediaAlt: string | null };

function optionalCta(value: unknown): SafeCta | null { return value === null ? null : validateCta(value); }
export function validateBlock(input: unknown): PageBlock {
  const block = exact(input, ["id", "position", "type", "schemaVersion", "hidden", "payload", "mediaVersionId", "promotionRevisionId"]);
  const type = block.type as BlockType;
  if (!(type in blockDefinitions) || block.schemaVersion !== 1 || typeof block.hidden !== "boolean" ||
    !Number.isInteger(block.position) || (block.position as number) < 0 || (block.position as number) > 49) throw new PageValidationError();
  const id = pageUuid(block.id);
  const mediaVersionId = block.mediaVersionId === null ? null : pageUuid(block.mediaVersionId);
  const promotionRevisionId = block.promotionRevisionId === null ? null : pageUuid(block.promotionRevisionId);
  let payload: Record<string, unknown>;
  switch (type) {
    case "hero": {
      const p = exact(block.payload, ["eyebrow", "title", "description", "cta", "mediaAlt"]);
      if (promotionRevisionId) throw new PageValidationError();
      payload = { eyebrow: text(p.eyebrow, 120), title: text(p.title, 180), description: text(p.description, 2000),
        cta: optionalCta(p.cta), mediaAlt: mediaVersionId ? text(p.mediaAlt, 300) : p.mediaAlt === null ? null : (() => { throw new PageValidationError(); })() };
      break;
    }
    case "richText": {
      const p = exact(block.payload, ["nodes"]);
      if (mediaVersionId || promotionRevisionId) throw new PageValidationError();
      payload = { nodes: list(p.nodes, 30).map(validateRichNode) };
      break;
    }
    case "imageText": {
      const p = exact(block.payload, ["heading", "body", "side", "alt", "cta"]);
      if (!mediaVersionId || promotionRevisionId || !["start", "end"].includes(String(p.side))) throw new PageValidationError();
      payload = { heading: text(p.heading, 180), body: text(p.body, 2000), side: p.side,
        alt: text(p.alt, 300), cta: optionalCta(p.cta) };
      break;
    }
    case "faq": {
      const p = exact(block.payload, ["items"]);
      if (mediaVersionId || promotionRevisionId) throw new PageValidationError();
      const items = list(p.items, 20).map(item => { const row = exact(item, ["question", "answer"]);
        return { question: text(row.question, 300), answer: text(row.answer, 2000) }; });
      if (new Set(items.map(item => item.question)).size !== items.length) throw new PageValidationError();
      payload = { items };
      break;
    }
    case "cta": {
      const p = exact(block.payload, ["heading", "description", "cta"]);
      if (mediaVersionId || promotionRevisionId) throw new PageValidationError();
      payload = { heading: text(p.heading, 180), description: text(p.description, 2000), cta: validateCta(p.cta) };
      break;
    }
    case "promotionBanner": {
      const p = exact(block.payload, ["template"]);
      if (mediaVersionId || !promotionRevisionId || !["accent", "quiet"].includes(String(p.template))) throw new PageValidationError();
      payload = { template: p.template };
      break;
    }
    case "spacer": {
      const p = exact(block.payload, ["size", "variant"]);
      if (mediaVersionId || promotionRevisionId || !["compact", "normal", "wide"].includes(String(p.size)) || !["divider", "space"].includes(String(p.variant))) throw new PageValidationError();
      payload = { size: p.size, variant: p.variant };
      break;
    }
    case "aboutOverview": {
      const p = exact(block.payload, ["heading", "paragraphs", "values"]);
      if (mediaVersionId || promotionRevisionId) throw new PageValidationError();
      const paragraphs = list(p.paragraphs, 6).map(item => text(item, 2000));
      const values = list(p.values, 6).map(value => { const row = exact(value, ["title", "description", "icon"]);
        if (!["shield", "message", "calendar", "sparkles"].includes(String(row.icon))) throw new PageValidationError();
        return { title: text(row.title, 120), description: text(row.description, 500), icon: row.icon }; });
      payload = { heading: text(p.heading, 180), paragraphs, values };
      break;
    }
  }
  return { id, position: block.position as number, type, schemaVersion: 1, hidden: block.hidden,
    payload, mediaVersionId, promotionRevisionId };
}

export function validatePageDraft(input: unknown): PageDraft {
  const page = exact(input, ["schemaVersion", "publicTitle", "h1", "seoTitle", "seoDescription", "canonical", "blocks"]);
  if (page.schemaVersion === PAGE_SCHEMA_VERSION ? page.canonical !== ABOUT_PATH :
    page.schemaVersion === 8 ? page.canonical !== newPagePath(String(page.canonical).slice(1)) : true)
    throw new PageValidationError();
  const blocks = list(page.blocks, 50).map(validateBlock);
  if (new Set(blocks.map(block => block.id)).size !== blocks.length ||
    blocks.some((block, index) => block.position !== index) ||
    blocks.filter(block => block.type === "hero" && !block.hidden).length !== 1 ||
    blocks.find(block => block.type === "hero" && !block.hidden)?.payload.title !== page.h1)
    throw new PageValidationError("סדר הבלוקים או הכותרת הראשית אינם תקינים.");
  return { schemaVersion: page.schemaVersion as 6 | 8, publicTitle: text(page.publicTitle, 120), h1: text(page.h1, 180),
    seoTitle: text(page.seoTitle, 120), seoDescription: text(page.seoDescription, 320),
    canonical: page.canonical as string, blocks };
}
export function validatePromotionDraft(input: unknown): PromotionDraft {
  const p = exact(input, ["schemaVersion", "publicTitle", "h1", "seoTitle", "seoDescription", "description", "template", "enabled", "cta", "mediaVersionId", "mediaAlt"]);
  if (p.schemaVersion !== PROMOTION_SCHEMA_VERSION || !["accent", "quiet"].includes(String(p.template)) || typeof p.enabled !== "boolean") throw new PageValidationError();
  const mediaVersionId = p.mediaVersionId === null ? null : pageUuid(p.mediaVersionId);
  return { schemaVersion: 7, publicTitle: text(p.publicTitle, 120), h1: text(p.h1, 180),
    seoTitle: text(p.seoTitle, 120), seoDescription: text(p.seoDescription, 320),
    description: text(p.description, 2000), template: p.template as "accent" | "quiet",
    enabled: p.enabled, cta: validateCta(p.cta), mediaVersionId,
    mediaAlt: mediaVersionId ? text(p.mediaAlt, 300) : p.mediaAlt === null ? null : (() => { throw new PageValidationError(); })() };
}

export function defaultBlock(type: BlockType, position: number, promotionRevisionId: string | null = null): PageBlock {
  const common = { id: crypto.randomUUID(), position, type, schemaVersion: 1 as const, hidden: false,
    mediaVersionId: null, promotionRevisionId: null };
  switch (type) {
    case "hero": return { ...common, type, payload: { eyebrow: "כותרת קטנה", title: "כותרת העמוד", description: "תיאור הפתיחה", cta: null, mediaAlt: null } };
    case "richText": return { ...common, type, payload: { nodes: [{ kind: "paragraph", level: null, items: [[{ text: "טקסט חדש", bold: false, emphasis: false, link: null }]] }] } };
    case "imageText": return { ...common, type, mediaVersionId: "", payload: { heading: "כותרת", body: "תיאור", side: "start", alt: "תיאור התמונה", cta: null } };
    case "faq": return { ...common, type, payload: { items: [{ question: "שאלה", answer: "תשובה" }] } };
    case "cta": return { ...common, type, payload: { heading: "כותרת", description: "תיאור", cta: { label: "צרו קשר", target: { kind: "internal", path: "/contact" } } } };
    case "promotionBanner": return { ...common, type, promotionRevisionId: promotionRevisionId || "", payload: { template: "accent" } };
    case "spacer": return { ...common, type, payload: { size: "normal", variant: "divider" } };
    case "aboutOverview": return { ...common, type, payload: { heading: "עלינו", paragraphs: ["טקסט חדש"], values: [{ title: "ערך", description: "תיאור", icon: "shield" }] } };
  }
}
