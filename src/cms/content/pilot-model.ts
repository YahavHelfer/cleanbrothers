import type { ResolvedMedia } from "@/cms/media/model";
import type { ServiceLandingContent } from "@/content/service-landing";

export const PILOT_KEY = "delicate-upholstery-cleaning" as const;
export const PILOT_PATH = "/delicate-upholstery-cleaning";
export const PILOT_DOCUMENT_ID = "c0000000-0000-4000-8000-000000000001";
export const PILOT_IMAGES = ["/images/services/delicate-upholstery-cleaning.jpeg"] as const;
export const PILOT_RELATED_PATHS = ["/mattress-cleaning", "/car-upholstery-cleaning"] as const;

export const pilotTextFields = {
  publicTitle: { label: "שם השירות לתצוגה", max: 120 },
  h1: { label: "כותרת ראשית", max: 180 },
  eyebrow: { label: "כותרת קטנה מעל הפתיחה", max: 120 },
  intro: { label: "תיאור הפתיחה", max: 2000 },
  imageAlt: { label: "תיאור חלופי לתמונות", max: 300 },
  signsTitle: { label: "כותרת סימנים שכדאי לבדוק", max: 180 },
  signsDescription: { label: "תיאור סימנים שכדאי לבדוק", max: 2000 },
  processTitle: { label: "כותרת תהליך העבודה", max: 180 },
  processDescription: { label: "תיאור תהליך העבודה", max: 2000 },
  benefitsDescription: { label: "תיאור יתרונות השירות", max: 2000 },
  resultDescription: { label: "תיאור התוצאות", max: 2000 },
  seoTitle: { label: "כותרת SEO", max: 120 },
  seoDescription: { label: "תיאור SEO", max: 320 },
} as const;

export type PilotTextField = keyof typeof pilotTextFields;
export type PilotDraft = Record<PilotTextField, string> & {
  schemaVersion: 1 | 2;
  images: string[];
  signs: string[];
  process: string[];
  benefits: string[];
  faqs: { question: string; answer: string }[];
  relatedLinks: { label: string; href: string }[];
};

export class ContentValidationError extends Error {
  constructor(message = "התוכן אינו תקין. בדקו את השדות ונסו שוב.") { super(message); }
}

function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || Object.keys(value).some((key) => !keys.includes(key))) {
    throw new ContentValidationError("התוכן מכיל שדות חסרים או שדות שאינם נתמכים.");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || [...value].length > max ||
      /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw new ContentValidationError("יש למלא טקסט רגיל באורך המותר, ללא HTML.");
  }
  return value; // Preserve imported wording/whitespace exactly.
}

function array(value: unknown, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new ContentValidationError("מספר הפריטים ברשימה אינו תקין.");
  return value;
}

export function validatePilotDraft(value: unknown): PilotDraft {
  const data = object(value, [...Object.keys(pilotTextFields), "schemaVersion", "images", "signs", "process", "benefits", "faqs", "relatedLinks"]);
  if (data.schemaVersion !== 1 && data.schemaVersion !== 2) throw new ContentValidationError("גרסת התוכן אינה נתמכת.");
  const fields = {} as Record<PilotTextField, string>;
  for (const key of Object.keys(pilotTextFields) as PilotTextField[]) fields[key] = text(data[key], pilotTextFields[key].max);
  const images = array(data.images, 1, data.schemaVersion === 1 ? PILOT_IMAGES.length : 8).map((image) => {
    if (typeof image !== "string" || (data.schemaVersion === 1 ? !PILOT_IMAGES.some((approved) => approved === image) : !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(image))) throw new ContentValidationError("יש לבחור תמונה מאושרת של השירות.");
    return image;
  });
  if (new Set(images).size !== images.length) throw new ContentValidationError("אין לבחור תמונה פעמיים.");
  const list = (value: unknown) => {
    const items = array(value, 1, 12).map((item) => text(item, 300));
    if (new Set(items).size !== items.length) throw new ContentValidationError("אין לחזור על אותו פריט ברשימה.");
    return items;
  };
  const faqs = array(data.faqs, 1, 20).map((faq) => {
    const item = object(faq, ["question", "answer"]);
    return { question: text(item.question, 300), answer: text(item.answer, 2000) };
  });
  if (new Set(faqs.map((faq) => faq.question)).size !== faqs.length) throw new ContentValidationError("אין לחזור על אותה שאלה.");
  const relatedLinks = array(data.relatedLinks, 0, PILOT_RELATED_PATHS.length).map((link) => {
    const item = object(link, ["label", "href"]);
    if (typeof item.href !== "string" || !PILOT_RELATED_PATHS.some((path) => path === item.href)) throw new ContentValidationError("הקישור אינו נתמך בשירות זה.");
    return { label: text(item.label, 120), href: item.href };
  });
  if (new Set(relatedLinks.map((link) => link.href)).size !== relatedLinks.length) throw new ContentValidationError("אין לחזור על אותו קישור.");
  return { schemaVersion: data.schemaVersion, ...fields, images, signs: list(data.signs), process: list(data.process), benefits: list(data.benefits), faqs, relatedLinks };
}

export function toPilotLanding(input: unknown, media?: ResolvedMedia[]): ServiceLandingContent {
  const d = validatePilotDraft(input);
  const hero = media?.filter(r => r.usage_role === "hero").sort((a,b)=>a.position-b.position);
  if (d.schemaVersion === 2 && (!hero || hero.length !== d.images.length || hero.some((r,i)=>r.media_version_id!==d.images[i]))) throw new ContentValidationError("הפניות המדיה אינן זמינות.");
  const images = d.schemaVersion === 1 ? d.images : hero!.map(r=>r.src);
  const presentation = d.schemaVersion === 2 ? { mediaPresentation: {
    heroAlts: Object.fromEntries(hero!.map(r=>[r.src,r.alt_text])),
    benefitAlts: Object.fromEntries(media!.filter(r=>r.usage_role==="benefits").map(r=>[r.src,r.alt_text])),
    resultAlt: media!.find(r=>r.usage_role==="result")!.alt_text,
  } } : {};
  return { serviceId: PILOT_KEY, displayTitle: d.publicTitle, content: {
    path: PILOT_PATH, metaTitle: d.seoTitle, metaDescription: d.seoDescription,
    eyebrow: d.eyebrow, h1: d.h1, intro: d.intro, images, imageAlt: d.imageAlt, ...presentation,
    signsTitle: d.signsTitle, signsDescription: d.signsDescription, signs: d.signs,
    processTitle: d.processTitle, processDescription: d.processDescription, process: d.process,
    benefitsDescription: d.benefitsDescription, benefits: d.benefits,
    resultDescription: d.resultDescription, faqs: d.faqs, relatedLinks: d.relatedLinks,
  } };
}

export function parseRevisionId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new ContentValidationError("מזהה הגרסה אינו תקין.");
  return value;
}

export function parseGeneration(value: unknown): number {
  if (typeof value !== "string" || !/^[1-9]\d{0,14}$/.test(value) || !Number.isSafeInteger(Number(value))) throw new ContentValidationError("מצב העריכה אינו תקין. טענו את העמוד מחדש.");
  return Number(value);
}
