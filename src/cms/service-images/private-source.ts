import "server-only";
import { getHomeEditor } from "@/cms/home/repository";
import { getMediaChoices } from "@/cms/media/repository";
import { baselineImageCollections } from "@/cms/home/service-card-images";
import { staticMediaPath } from "@/cms/media/static-inventory";
import { requireServiceKey, type ManagedServiceKey } from "@/content/service-registry";
import type { SharedServiceImage } from "./model";

// Authenticated service previews show the shared unpublished home snapshot.
export async function getDraftServiceImages(key: ManagedServiceKey): Promise<SharedServiceImage[]> {
  requireServiceKey(key);
  const { snapshot } = await getHomeEditor();
  if (!snapshot) return baselineImageCollections()[key].map(image => ({ ...image, src: staticMediaPath(image.versionId) }));
  const choices = await getMediaChoices();
  return snapshot.serviceImages[key].map(image => {
    const src = choices.find(choice => choice.versionId === image.versionId)?.src;
    if (!src) throw new Error("Shared draft media unavailable");
    return { ...image, src };
  });
}
