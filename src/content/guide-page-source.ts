import "server-only";
import { cache } from "react";
import { getPublicNewPage } from "@/cms/pages/new-public-source";
import { newPagePublicAllowed } from "@/cms/pages/new-environment";
import { getCodeGuidePage } from "./guide-pages";
import { alignAcGuide } from "./align-ac-guide";
import { guideUsesCms } from "./guide-environment";

// Metadata and HTML use one snapshot. An enabled CMS page must never fall back
// to launch content after it is unpublished, archived or unavailable.
export const getGuidePageSource = cache(async (slug: string) => {
  const published = await getPublicNewPage(slug);
  if (published) return published.kind === "page" ? { ...published, page: alignAcGuide(slug, published.page) } : published;
  if (newPagePublicAllowed(slug) || guideUsesCms(slug)) return null;
  const page = getCodeGuidePage(slug);
  return page ? { kind: "page" as const, page: alignAcGuide(slug, page), revisionId: `guide-launch-${slug}`,
    media: {}, promotions: {} } : null;
});
