import "server-only";
import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { cache } from "react";
import { getCmsConfig } from "@/cms/config";
import { pageUuid, validatePageDraft, validatePromotionDraft } from "./model";
import { allowedNewPageSlugs, newPagePublicAllowed, requireNewPagesEnvironment } from "./new-environment";
import { publicMedia } from "./public-source";
import { validateNewPageSlug } from "./routes";
import type { BlockPromotions } from "./PageBlocksView";

function publicClient() {
  const { url, key } = getCmsConfig();
  return createClient(url,key,{ auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input,init) => fetch(input,{ ...init,cache: "no-store",signal: AbortSignal.timeout(8000) }) } });
}

// One request snapshot is shared by HTML and metadata. The only inputs are a
// validated single slug and an exact local allowlist entry; never a revision.
export const getPublicNewPage = cache(async (input: string) => {
  if (!newPagePublicAllowed(input)) return null;
  requireNewPagesEnvironment();
  await connection();
  const slug = validateNewPageSlug(input);
  const client = publicClient();
  const { data: route, error: routeError } = await client.rpc("cms_resolve_new_page_route",{ target_slug: slug });
  if (routeError || !route) return null;
  if (route.kind === "redirect") {
    const destination = validateNewPageSlug(route.destination);
    if (!allowedNewPageSlugs().includes(destination)) return null;
    return { kind: "redirect" as const, destination };
  }
  if (route.kind !== "page") return null;
  const { data, error } = await client.rpc("cms_read_public_new_page",{ target_slug: slug });
  if (error || !data) throw new Error("Published CMS page unavailable");
  const page = validatePageDraft(data.payload);
  if (page.schemaVersion !== 8 || page.canonical !== `/${slug}`) throw new Error("CMS page route mismatch");
  const references = new Set(page.blocks.flatMap(block => block.promotionRevisionId ? [block.promotionRevisionId] : []));
  if (!data.promotions || typeof data.promotions !== "object" || Array.isArray(data.promotions) ||
    Object.keys(data.promotions).length !== references.size) throw new Error("CMS page promotion mismatch");
  const promotions: BlockPromotions = {};
  for (const id of references) promotions[id] = validatePromotionDraft(data.promotions[pageUuid(id)]);
  const media = publicMedia(data.media);
  for (const block of page.blocks) if (block.mediaVersionId && !media[block.mediaVersionId])
    throw new Error("CMS page media missing");
  for (const promotion of Object.values(promotions)) if (promotion.mediaVersionId && !media[promotion.mediaVersionId])
    throw new Error("CMS promotion media missing");
  return { kind: "page" as const, revisionId: pageUuid(data.revisionId), page, media, promotions };
});

export async function listPublicNewPageSlugs() {
  const allowlist = allowedNewPageSlugs();
  if (allowlist.length === 0) return [];
  requireNewPagesEnvironment();
  await connection();
  const { data, error } = await publicClient().rpc("cms_list_public_new_page_slugs");
  if (error || !Array.isArray(data)) throw new Error("CMS page sitemap unavailable");
  return data.filter((slug: unknown) => typeof slug === "string" && allowlist.includes(slug));
}
