import "server-only";
import { cache } from "react";
import { getPublicHome } from "@/cms/home/public-source";
import { requireServiceKey, type ManagedServiceKey } from "@/content/service-registry";
import type { SharedServiceImage } from "./model";
// All consumers share the same published home pointer and the same collection rows.
// This also works when the homepage Services block is hidden or absent.
export const getPublicServiceImages = cache(async (key: ManagedServiceKey): Promise<SharedServiceImage[]> => {
  requireServiceKey(key);
  const home = await getPublicHome();
  return (home.serviceImages[key] ?? []).map(image => {
    const src = home.media[image.versionId]?.src;
    if (!src) throw new Error("Shared service media unavailable");
    return { ...image, src };
  });
});
