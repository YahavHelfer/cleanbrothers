import type { ServiceLandingContent } from "@/content/service-landing";
import type { SharedServiceImage } from "./model";
export function withSharedServiceImages(page: ServiceLandingContent, images: SharedServiceImage[]): ServiceLandingContent {
  const previous = page.content;
  return { ...page, content: { ...previous, image: undefined, images: images.map(image => image.src),
    imageAlt: images[0]?.alt || previous.imageAlt,
    imagePositions: Object.fromEntries(images.map(image => [image.src, image.position])),
    mediaPresentation: { heroAlts: Object.fromEntries(images.map(image => [image.src, image.alt])),
      benefitAlts: Object.fromEntries(images.map(image => [image.src, image.alt])),
      resultAlt: images[0]?.alt || page.displayTitle } } };
}
