import { isManagedServiceKey } from "@/content/service-registry";
import { PageValidationError, pageUuid, validateCta, type SafeCta } from "@/cms/pages/model";

export const placementKeys = ["global:site", "home:home", "page:about", "page:services",
  "service:delicate-upholstery-cleaning", "service:sofa-cleaning", "service:mattress-cleaning",
  "service:carpet-cleaning", "service:car-upholstery-cleaning", "service:armchair-chair-cleaning",
  "service:air-conditioner-cleaning", "service:window-cleaning", "service:post-renovation-cleaning"] as const;
export type PlacementKey = (typeof placementKeys)[number];
export type Frequency = "every-visit" | "session" | "24-hours";

export type CampaignDraft = {
  schemaVersion: 13;
  publicTitle: string;
  h1: string;
  seoTitle: string;
  seoDescription: string;
  description: string;
  enabled: boolean;
  displayMode: "popup" | "inline";
  badgeText: string;
  showPrice: boolean;
  currentPrice: string | null;
  oldPrice: string | null;
  currency: "ILS";
  benefitText: string | null;
  cta: SafeCta;
  terms: string;
  delaySeconds: number;
  frequency: Frequency;
  placements: PlacementKey[];
};
export type PublicCampaign = Pick<CampaignDraft, "enabled" | "displayMode" | "badgeText" | "h1" |
  "showPrice" | "currentPrice" | "oldPrice" | "currency" | "benefitText" | "description" |
  "cta" | "terms" | "delaySeconds" | "frequency">;
const publicFields = ["enabled", "displayMode", "badgeText", "h1", "showPrice", "currentPrice", "oldPrice",
  "currency", "benefitText", "description", "cta", "terms", "delaySeconds", "frequency"];

const fields = ["schemaVersion", "publicTitle", "h1", "seoTitle", "seoDescription", "description",
  "enabled", "displayMode", "badgeText", "showPrice", "currentPrice", "oldPrice", "currency",
  "benefitText", "cta", "terms", "delaySeconds", "frequency", "placements"];
function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
    Object.keys(input).length !== fields.length || Object.keys(input).some(key => !fields.includes(key)))
    throw new PageValidationError("שדות המבצע אינם תקינים.");
  return input as Record<string, unknown>;
}
function plain(input: unknown, max: number, optional = false): string | null {
  if (optional && input === null) return null;
  if (typeof input !== "string" || input.trim().length < 1 || [...input].length > max ||
    /[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(input))
    throw new PageValidationError("יש להזין טקסט רגיל ללא HTML או קוד.");
  return input;
}
export function isPlacementKey(input: unknown): input is PlacementKey {
  if (typeof input !== "string") return false;
  if ((placementKeys as readonly string[]).includes(input)) return true;
  // Keep the runtime check tied to the code-owned service registry too.
  const [kind, key, extra] = input.split(":");
  return !extra && kind === "service" && isManagedServiceKey(key) &&
    (placementKeys as readonly string[]).includes(input);
}
export function validatePlacements(input: unknown): PlacementKey[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > placementKeys.length ||
    input.some(value => !isPlacementKey(value)) || new Set(input).size !== input.length)
    throw new PageValidationError("יש לבחור מיקום מאושר אחד לפחות, ללא כפילויות.");
  return input as PlacementKey[];
}
export function validateCampaignDraft(input: unknown): CampaignDraft {
  const p = record(input);
  if (p.schemaVersion !== 13 || typeof p.enabled !== "boolean" ||
    typeof p.showPrice !== "boolean" || !["popup", "inline"].includes(String(p.displayMode)) ||
    p.currency !== "ILS" || !["every-visit", "session", "24-hours"].includes(String(p.frequency)) ||
    !Number.isInteger(p.delaySeconds) || (p.delaySeconds as number) < 0 || (p.delaySeconds as number) > 15)
    throw new PageValidationError("הגדרות המבצע אינן תקינות.");
  const currentPrice = plain(p.currentPrice, 40, true);
  const oldPrice = plain(p.oldPrice, 40, true);
  if (p.showPrice ? !currentPrice : currentPrice !== null || oldPrice !== null)
    throw new PageValidationError("מחיר המבצע אינו תקין.");
  return {
    schemaVersion: 13, publicTitle: plain(p.publicTitle, 120)!, h1: plain(p.h1, 180)!,
    seoTitle: plain(p.seoTitle, 120)!, seoDescription: plain(p.seoDescription, 320)!,
    description: plain(p.description, 2000)!, enabled: p.enabled,
    displayMode: p.displayMode as CampaignDraft["displayMode"], badgeText: plain(p.badgeText, 80)!,
    showPrice: p.showPrice, currentPrice, oldPrice, currency: "ILS",
    benefitText: plain(p.benefitText, 240, true), cta: validateCta(p.cta),
    terms: plain(p.terms, 700)!, delaySeconds: p.delaySeconds as number,
    frequency: p.frequency as Frequency, placements: validatePlacements(p.placements),
  };
}
export function validatePublicCampaign(input: unknown): PublicCampaign {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
    Object.keys(input).length !== publicFields.length || Object.keys(input).some(key => !publicFields.includes(key)))
    throw new PageValidationError("מבצע ציבורי אינו תקין.");
  const checked = validateCampaignDraft({ ...input, schemaVersion: 13, publicTitle: "מבצע ציבורי",
    seoTitle: "מבצע ציבורי", seoDescription: "מבצע ציבורי", placements: ["home:home"] });
  return Object.fromEntries(publicFields.map(key => [key, checked[key as keyof CampaignDraft]])) as PublicCampaign;
}
export function defaultCampaign(placement: PlacementKey = "home:home"): CampaignDraft {
  return { schemaVersion: 13, publicTitle: "מבצע חדש", h1: "מבצע מיוחד", seoTitle: "מבצע מיוחד",
    seoDescription: "פרטי המבצע", description: "פרטי המבצע", enabled: true, displayMode: "popup",
    badgeText: "מבצע מוגבל", showPrice: false, currentPrice: null, oldPrice: null,
    currency: "ILS", benefitText: null, cta: { label: "לפרטים", target: { kind: "internal", path: "/contact" } },
    terms: "בכפוף לתנאי המבצע", delaySeconds: 2, frequency: "session", placements: [placement] };
}
export type CampaignSnapshot = { documentId: string; key: string; generation: number; draftRevisionId: string;
  publishedRevisionId: string; active: boolean; draft: CampaignDraft; history: { id: string; number: number }[] };
export function validateCampaignSnapshot(input: unknown): CampaignSnapshot {
  if (!input || typeof input !== "object") throw new PageValidationError();
  const p = input as Record<string, unknown>;
  if (typeof p.key !== "string" || !/^campaign-[0-9a-f]{32}$/.test(p.key) ||
    !Number.isSafeInteger(p.generation) || (p.generation as number) < 1 || typeof p.active !== "boolean" ||
    !Array.isArray(p.history)) throw new PageValidationError();
  return { documentId: pageUuid(p.documentId), key: p.key, generation: p.generation as number,
    draftRevisionId: pageUuid(p.draftRevisionId), publishedRevisionId: pageUuid(p.publishedRevisionId),
    active: p.active, draft: validateCampaignDraft(p.draft), history: p.history.map(row => {
      const h = row as Record<string, unknown>;
      if (!Number.isInteger(h.number)) throw new PageValidationError();
      return { id: pageUuid(h.id), number: h.number as number };
    }) };
}
