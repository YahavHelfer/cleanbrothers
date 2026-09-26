import { businessConfig } from "@/config/business";
import { isManagedServiceKey, serviceRegistry, type ManagedServiceKey } from "@/content/service-registry";
import { pageUuid } from "@/cms/pages/model";

export type SiteDocumentKind = "settings" | "navigation" | "footer";
export const siteKinds = ["settings", "navigation", "footer"] as const;
export const siteDocumentIds: Record<SiteDocumentKind, string> = {
  settings: "c0000000-0000-4000-8000-000000000301",
  navigation: "c0000000-0000-4000-8000-000000000302",
  footer: "c0000000-0000-4000-8000-000000000303",
};

export class SiteValidationError extends Error {
  constructor(message = "פרטי האתר אינם תקינים. בדקו את השדות ונסו שוב.") { super(message); }
}
const staticTargets = ["/", "/services", "/gallery", "/about", "/contact"] as const;
export const legalTargets = ["/privacy-policy", "/data-deletion", "/accessibility-statement"] as const;
export type SiteTarget = { kind: "static"; path: typeof staticTargets[number] }
  | { kind: "service"; key: ManagedServiceKey }
  | { kind: "page"; id: string };
export type SiteNavItem = { id: string; order: number; label: string; visible: boolean; target: SiteTarget };
export type SiteSettings = { schemaVersion: 9; businessName: string; phoneDisplay: string; email: string;
  serviceAreas: string[]; structuredDescription: string };
export type SiteNavigation = { schemaVersion: 10; items: SiteNavItem[] };
export type SiteLegalItem = { path: typeof legalTargets[number]; order: number; label: string; visible: boolean };
export type SiteFooter = { schemaVersion: 11; description: string; featuredServices: ManagedServiceKey[];
  legal: SiteLegalItem[]; copyright: string; tagline: string; whatsappCtaLabel: string };
export type SitePayload = SiteSettings | SiteNavigation | SiteFooter;

function object(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).length !== fields.length || Object.keys(value).some(key => !fields.includes(key)))
    throw new SiteValidationError("שדות חסרים או שדות שאינם נתמכים.");
  return value as Record<string, unknown>;
}
function plain(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || [...value].length > max ||
    /[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value))
    throw new SiteValidationError("מותר להזין טקסט רגיל בלבד, ללא קוד או HTML.");
  return value;
}
function unique<T>(values: T[]): T[] {
  if (new Set(values).size !== values.length) throw new SiteValidationError("ערכים כפולים אינם מותרים.");
  return values;
}
function array(value: unknown, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new SiteValidationError();
  return value;
}
function order(value: unknown, index: number) {
  if (!Number.isInteger(value) || value !== index) throw new SiteValidationError("סדר הפריטים אינו תקין.");
  return index;
}
function boolean(value: unknown) {
  if (typeof value !== "boolean") throw new SiteValidationError();
  return value;
}
export function validateSiteTarget(value: unknown): SiteTarget {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SiteValidationError();
  const kind = (value as { kind?: unknown }).kind;
  if (kind === "static") {
    const row = object(value, ["kind", "path"]);
    if (!staticTargets.includes(row.path as typeof staticTargets[number])) throw new SiteValidationError("נתיב אינו מאושר.");
    return { kind, path: row.path as typeof staticTargets[number] };
  }
  if (kind === "service") {
    const row = object(value, ["kind", "key"]);
    if (!isManagedServiceKey(row.key)) throw new SiteValidationError("שירות אינו קיים.");
    return { kind, key: row.key };
  }
  if (kind === "page") {
    const row = object(value, ["kind", "id"]);
    try { return { kind, id: pageUuid(row.id) }; } catch { throw new SiteValidationError("זהות העמוד אינה תקינה."); }
  }
  throw new SiteValidationError("סוג יעד אינו מאושר.");
}
export function validateSiteSettings(value: unknown): SiteSettings {
  const row = object(value, ["schemaVersion", "businessName", "phoneDisplay", "email", "serviceAreas", "structuredDescription"]);
  if (row.schemaVersion !== 9) throw new SiteValidationError();
  const phoneDisplay = plain(row.phoneDisplay, 30);
  // Display formatting may change; the dial/Google tracking identity may not.
  if (phoneDisplay.replace(/\D/g, "") !== businessConfig.phoneDisplay.replace(/\D/g, ""))
    throw new SiteValidationError("מספר הטלפון חייב להתאים ליעד החיוג והמדידה המאושר.");
  const email = plain(row.email, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || /[/?#]/u.test(email)) throw new SiteValidationError("כתובת אימייל אינה תקינה.");
  return { schemaVersion: 9, businessName: plain(row.businessName, 120), phoneDisplay, email,
    serviceAreas: unique(array(row.serviceAreas, 1, 20).map(item => plain(item, 80))),
    structuredDescription: plain(row.structuredDescription, 500) };
}
export function validateSiteNavigation(value: unknown): SiteNavigation {
  const row = object(value, ["schemaVersion", "items"]);
  if (row.schemaVersion !== 10) throw new SiteValidationError();
  const items = array(row.items, 1, 20).map((item, index) => {
    const entry = object(item, ["id", "order", "label", "visible", "target"]);
    try { return { id: pageUuid(entry.id), order: order(entry.order, index), label: plain(entry.label, 80),
      visible: boolean(entry.visible), target: validateSiteTarget(entry.target) }; }
    catch (error) { if (error instanceof SiteValidationError) throw error; throw new SiteValidationError(); }
  });
  unique(items.map(item => item.id));
  return { schemaVersion: 10, items };
}
export function validateSiteFooter(value: unknown): SiteFooter {
  const row = object(value, ["schemaVersion", "description", "featuredServices", "legal", "copyright", "tagline", "whatsappCtaLabel"]);
  if (row.schemaVersion !== 11) throw new SiteValidationError();
  const featuredServices = unique(array(row.featuredServices, 1, 8).map(key => {
    if (!isManagedServiceKey(key)) throw new SiteValidationError("שירות Footer אינו קיים.");
    return key;
  }));
  const legal = array(row.legal, 3, 3).map((item, index) => {
    const entry = object(item, ["path", "order", "label", "visible"]);
    if (!legalTargets.includes(entry.path as typeof legalTargets[number])) throw new SiteValidationError("קישור משפטי אינו מאושר.");
    return { path: entry.path as typeof legalTargets[number], order: order(entry.order, index),
      label: plain(entry.label, 80), visible: boolean(entry.visible) };
  });
  if (new Set(legal.map(item => item.path)).size !== 3) throw new SiteValidationError("יש לשמור על שלושת הקישורים המשפטיים.");
  return { schemaVersion: 11, description: plain(row.description, 500), featuredServices, legal,
    copyright: plain(row.copyright, 120), tagline: plain(row.tagline, 120),
    whatsappCtaLabel: plain(row.whatsappCtaLabel, 120) };
}
export function validateSitePayload(kind: SiteDocumentKind, value: unknown): SitePayload {
  if (kind === "settings") return validateSiteSettings(value);
  if (kind === "navigation") return validateSiteNavigation(value);
  return validateSiteFooter(value);
}
export function siteTargetPath(target: SiteTarget, pages: Readonly<Record<string, string>> = {}): string | null {
  if (target.kind === "static") return target.path;
  if (target.kind === "service") return serviceRegistry[target.key].path;
  return pages[target.id] ? `/${pages[target.id]}` : null;
}
