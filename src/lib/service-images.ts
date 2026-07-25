export type ServiceImageSource = {
  image?: string;
  images?: readonly string[];
};

export function getServiceImages({
  image,
  images,
}: ServiceImageSource): string[] {
  return Array.from(
    new Set([...(images ?? []), ...(image ? [image] : [])].filter(Boolean)),
  );
}

export function getPrimaryServiceImage(source: ServiceImageSource): string {
  return getServiceImages(source)[0] ?? "";
}
