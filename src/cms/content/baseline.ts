import { delicateUpholsteryLanding as pilot } from "@/data/serviceLandingPages";
import { validatePilotDraft } from "./pilot-model";

// Used only by the explicitly local import and equivalence tests. No copy edits.
export function pilotBaseline() {
  const { serviceName, metaTitle, metaDescription, path, ...body } = pilot;
  if (path !== "/delicate-upholstery-cleaning") throw new Error("Unexpected pilot baseline");
  return validatePilotDraft({ schemaVersion: 1, publicTitle: serviceName,
    seoTitle: metaTitle, seoDescription: metaDescription, ...body });
}

import { staticServiceConfigs } from "@/content/static-source";
import { requireSharedServiceKey, type SharedServiceKey } from "@/content/service-registry";
import { staticMediaId } from "@/cms/media/static-inventory";
import { validateServiceDraft } from "./service-model";
export function serviceBaseline(serviceKey: SharedServiceKey) {
  const key = requireSharedServiceKey(serviceKey);
  if (key === "delicate-upholstery-cleaning") return pilotBaseline();
  const { serviceName, metaTitle, metaDescription, path, images, imagePositions, beforeAfter, ...body } = staticServiceConfigs[key];
  if (path !== `/${key}` || !images) throw new Error("Unexpected service baseline");
  return validateServiceDraft(key, { schemaVersion: 3, publicTitle: serviceName, seoTitle: metaTitle,
    seoDescription: metaDescription, ...body, images: images.map(staticMediaId),
    ...(imagePositions ? { imagePositions: Object.fromEntries(Object.entries(imagePositions).map(([p,crop]) => [staticMediaId(p),crop])) } : {}),
    ...(beforeAfter ? { beforeAfter: { ...beforeAfter, beforeImage: staticMediaId(beforeAfter.beforeImage), afterImage: staticMediaId(beforeAfter.afterImage) } } : {}),
  });
}
