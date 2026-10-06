import { staticServiceConfigs } from "@/content/static-source";
import { isSpecialServiceKey, managedServiceKeys, serviceRegistry, type ManagedServiceKey } from "@/content/service-registry";
import { services } from "@/data/site";
import { staticMediaId } from "@/cms/media/static-inventory";

export type HomeServiceImage = { versionId: string; alt: string; position: string };
export type HomeServiceCard = {
  title: string; benefit: string; description: string; images: HomeServiceImage[];
};
export const homeImagePositions = ["object-center", "object-[center_48%]", "object-[58%_center]",
  "object-[52%_center]", "object-[center_42%]", "object-[center_38%]", "object-[center_55%]"] as const;

// Used only to seed new cards and upgrade historical revisions lacking images.
// An explicitly saved empty list must stay empty.
export function baselineServiceImages(key: string): HomeServiceImage[] {
  const service = services.find(row => row.landingPath === `/${key}`);
  if (!service) {
    const keyId = key as ManagedServiceKey;
    const config = !isSpecialServiceKey(keyId) ? staticServiceConfigs[keyId] : undefined;
    if (!config) return [];
    return (config.images ?? (config.image ? [config.image] : [])).map((src, index, images) => ({
      versionId: staticMediaId(src), alt: images.length > 1 ? `${config.serviceName}, תמונה ${index + 1} מתוך ${images.length}` : config.imageAlt,
      position: config.imagePositions?.[src] || config.imagePosition || "object-center",
    }));
  }
  const crops = "imagePositions" in service ? service.imagePositions : undefined;
  return service.images.map((src, index) => ({ versionId: staticMediaId(src),
    alt: key === "mini-central-air-conditioner-cleaning" ? staticServiceConfigs[key].imageAlt : service.images.length > 1 ? `${service.title}, תמונה ${index + 1} מתוך ${service.images.length}` : service.title,
    position: crops?.[src as keyof typeof crops] || service.imagePosition,
  }));
}

export type ServiceImageCollections = Record<ManagedServiceKey, HomeServiceImage[]>;
export function baselineImageCollections(): ServiceImageCollections {
  return Object.fromEntries(managedServiceKeys.map(key => [key, baselineServiceImages(key)])) as ServiceImageCollections;
}
export function baselineServiceCard(key: ManagedServiceKey): HomeServiceCard {
  const service = services.find(row => row.landingPath === serviceRegistry[key].path);
  const config = !isSpecialServiceKey(key) ? staticServiceConfigs[key] : undefined;
  return { title: service?.title || serviceRegistry[key].crmName,
    benefit: service?.benefit || config?.benefits[0] || serviceRegistry[key].crmName,
    description: service?.description || config?.intro || serviceRegistry[key].crmName,
    images: baselineServiceImages(key) };
}
