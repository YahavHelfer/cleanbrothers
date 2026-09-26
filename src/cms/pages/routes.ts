// Route ownership is also enforced by the forward SQL migration. Keep the
// application check stricter than the public dynamic segment parser.
export const reservedPageSlugs = [
  "admin", "api", "_next", "cms-media", "services", "gallery", "about", "contact",
  "privacy-policy", "accessibility-statement", "data-deletion", "robots", "sitemap",
  "icon", "apple-icon", "favicon", "manifest", "opengraph-image", "twitter-image",
  "sofa-cleaning", "mattress-cleaning", "carpet-cleaning", "delicate-upholstery-cleaning",
  "car-upholstery-cleaning", "armchair-chair-cleaning", "air-conditioner-cleaning", "window-cleaning",
] as const;

export class PageSlugError extends Error {
  constructor(message = "כתובת העמוד אינה תקינה או שמורה למערכת.") { super(message); }
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function validateNewPageSlug(value: unknown): string {
  if (typeof value !== "string" || value.length < 3 || value.length > 64 ||
    !slugPattern.test(value) || reservedPageSlugs.includes(value as (typeof reservedPageSlugs)[number]))
    throw new PageSlugError();
  return value;
}

export function newPagePath(slug: unknown): `/${string}` {
  return `/${validateNewPageSlug(slug)}`;
}
