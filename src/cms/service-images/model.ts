import { isManagedServiceKey, managedServiceKeys } from "@/content/service-registry";
import { PageValidationError, pageUuid } from "@/cms/pages/model";
import { homeImagePositions, type ServiceImageCollections } from "@/cms/home/service-card-images";
export function validateImageCollections(input: unknown): ServiceImageCollections {
  if (!input || typeof input !== "object" || Array.isArray(input) || ![managedServiceKeys.length, managedServiceKeys.length + 1].includes(Object.keys(input).length) ||
    Object.keys(input).some(key => !isManagedServiceKey(key) && key !== "mini-central-air-conditioner-cleaning")) throw new PageValidationError("אוסף תמונות השירות אינו תקין.");
  return Object.fromEntries(managedServiceKeys.map(key => {
    const images = (input as Record<string, unknown>)[key];
    if (!Array.isArray(images) || images.length > 8) throw new PageValidationError();
    const checked = images.map(image => {
      if (!image || typeof image !== "object" || Object.keys(image).sort().join() !== "alt,position,versionId" ||
        typeof image.alt !== "string" || !image.alt.trim() || [...image.alt].length > 300 ||
        /[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(image.alt) || !homeImagePositions.includes(image.position)) throw new PageValidationError();
      return { versionId: pageUuid(image.versionId), alt: image.alt, position: image.position };
    });
    if (new Set(checked.map(image => image.versionId)).size !== checked.length) throw new PageValidationError();
    return [key, checked];
  })) as ServiceImageCollections;
}
export type SharedServiceImage = { versionId: string; src: string; alt: string; position: string };
