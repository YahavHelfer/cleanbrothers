import { requireServiceKey, managedServiceKeys, serviceRegistry, type ManagedServiceKey } from "@/content/service-registry";
import type { ServiceLandingConfig, ServiceLandingContent } from "@/content/service-landing";
import type { ResolvedMedia } from "@/cms/media/model";
import { mediaId } from "@/cms/media/model";
import { ContentValidationError, validatePilotDraft, toPilotLanding, PILOT_KEY, type PilotDraft } from "./pilot-model";

export const imagePositions = ["object-center", "object-[center_48%]", "object-[58%_center]", "object-[52%_center]", "object-[center_42%]"] as const;
export type ServiceDraft = Omit<PilotDraft, "schemaVersion"> & {
  schemaVersion: 1 | 2 | 3;
  imagePosition?: string;
  imagePositions?: Record<string, string>;
  beforeAfter?: NonNullable<ServiceLandingConfig["beforeAfter"]>;
};
function plainText(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || [...value].length > max || /[<>\u0000-\u001f\u007f]/.test(value)) throw new ContentValidationError();
  return value;
}
export function validateServiceDraft(serviceKey: ManagedServiceKey, value: unknown): ServiceDraft {
  requireServiceKey(serviceKey);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ContentValidationError();
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== 3) {
    if (serviceKey !== PILOT_KEY) throw new ContentValidationError();
    return validatePilotDraft(value);
  }
  const { beforeAfter, imagePosition, imagePositions: crops, relatedLinks, ...base } = data;
  // Reuse the strict plain-text/list/FAQ/UUID contract, preserving schema 1/2.
  const validated = validatePilotDraft({ ...base, schemaVersion: 2, relatedLinks: [] });
  if (!Array.isArray(relatedLinks) || relatedLinks.length > managedServiceKeys.length) throw new ContentValidationError();
  const links = relatedLinks.map(item => {
    if (!item || typeof item !== "object" || Object.keys(item).sort().join() !== "href,label" ||
        !managedServiceKeys.some(key => `/${key}` === item.href)) throw new ContentValidationError();
    return { label: plainText(item.label, 120), href: item.href as string };
  });
  if (new Set(links.map(link => link.href)).size !== links.length) throw new ContentValidationError();
  const result: ServiceDraft = { ...validated, schemaVersion: 3, relatedLinks: links };
  if (imagePosition !== undefined) {
    if (!imagePositions.some(p => p === imagePosition)) throw new ContentValidationError();
    result.imagePosition = imagePosition as string;
  }
  if (crops !== undefined) {
    if (!crops || typeof crops !== "object" || Array.isArray(crops) || Object.keys(crops).length > 8) throw new ContentValidationError();
    result.imagePositions = {};
    for (const [id, position] of Object.entries(crops)) {
      if (!validated.images.includes(mediaId(id)) || !imagePositions.some(p => p === position)) throw new ContentValidationError();
      result.imagePositions[id] = position as string;
    }
  }
  if (beforeAfter !== undefined) {
    if (!beforeAfter || typeof beforeAfter !== "object" || Array.isArray(beforeAfter) ||
        Object.keys(beforeAfter).sort().join() !== "afterAlt,afterImage,beforeAlt,beforeImage,description,title") throw new ContentValidationError();
    const pair = beforeAfter as Record<string, unknown>;
    result.beforeAfter = { title: plainText(pair.title,180), description: plainText(pair.description,2000),
      beforeImage: mediaId(pair.beforeImage), afterImage: mediaId(pair.afterImage),
      beforeAlt: plainText(pair.beforeAlt,300), afterAlt: plainText(pair.afterAlt,300) };
    if (result.beforeAfter.beforeImage === result.beforeAfter.afterImage) throw new ContentValidationError();
  }
  return result;
}
export function toServiceLanding(key: ManagedServiceKey, input: unknown, media?: ResolvedMedia[]): ServiceLandingContent {
  const d = validateServiceDraft(key, input);
  if (d.schemaVersion !== 3) return toPilotLanding(d, media);
  const { beforeAfter, imagePosition, imagePositions: crops, ...base } = d;
  const page = toPilotLanding({ ...base, schemaVersion: 2, relatedLinks: [] }, media);
  const hero = media!.filter(r => r.usage_role === "hero").sort((a,b) => a.position-b.position);
  if (hero.length > 1) {
    for (const role of ["hero", "benefits"] as const) {
      const map = role === "hero" ? page.content.mediaPresentation!.heroAlts : page.content.mediaPresentation!.benefitAlts;
      for (const ref of media!.filter(r => r.usage_role === role)) map[ref.src] = `${ref.alt_text}, תמונה ${ref.position + 1} מתוך ${hero.length}`;
    }
  }
  const content = { ...page.content, path: serviceRegistry[key].path, relatedLinks: d.relatedLinks };
  if (imagePosition !== undefined) content.imagePosition = imagePosition;
  if (crops !== undefined) content.imagePositions = Object.fromEntries(hero.filter(r => crops[r.media_version_id]).map(r => [r.src, crops[r.media_version_id]]));
  if (beforeAfter) {
    const before = media!.find(r => r.usage_role === "before" && r.media_version_id === beforeAfter.beforeImage);
    const after = media!.find(r => r.usage_role === "after" && r.media_version_id === beforeAfter.afterImage);
    if (!before || !after) throw new ContentValidationError("הפניות המדיה אינן זמינות.");
    content.beforeAfter = { ...beforeAfter, beforeImage: before.src, afterImage: after.src, beforeAlt: before.alt_text, afterAlt: after.alt_text };
  }
  return { serviceId: key, displayTitle: d.publicTitle, content };
}
