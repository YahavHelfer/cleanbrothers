import "server-only";
import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { cache } from "react";
import { getCmsConfig } from "@/cms/config";
import { mediaId } from "@/cms/media/model";
import { staticMediaPath } from "@/cms/media/static-inventory";
import { aboutBaseline } from "./baseline";
import { approvedPagePreview, requirePagesEnvironment, usesCmsPageSource } from "./environment";
import { pageUuid, validatePageDraft, validatePromotionDraft } from "./model";
import type { BlockMedia, BlockPromotions } from "./PageBlocksView";

type PublicMediaRow = { media_version_id: unknown; usage_role: unknown;
  position: unknown; alt_text: unknown; provider: unknown };

function publicMedia(input: unknown): BlockMedia {
  if (!Array.isArray(input)) throw new Error("CMS page media unavailable");
  return Object.fromEntries(input.map((row: PublicMediaRow) => {
    const id = mediaId(row.media_version_id);
    if (!["page-hero", "page-image", "promotion"].includes(String(row.usage_role)) ||
      !Number.isInteger(row.position) || (row.position as number) < 0 || (row.position as number) > 49 ||
      typeof row.alt_text !== "string" || !row.alt_text.trim()) throw new Error("Invalid CMS page media");
    const src = row.provider === "static" ? staticMediaPath(id)
      : row.provider === "local" || row.provider === "supabase" ? `/cms-media/${id}`
        : null;
    if (!src) throw new Error("Invalid CMS page media provider");
    return [id, { src, altText: row.alt_text }];
  }));
}

// React request memoization shares one published snapshot between the HTML and
// metadata. No session cookie or privileged key participates in this reader.
export const getPublicAbout = cache(async () => {
  // The approved Preview must never retain a static /about response on its
  // stable alias, even before the separate public allowlist is enabled.
  if (approvedPagePreview()) await connection();
  if (!usesCmsPageSource("about")) return { source: "static" as const, revisionId: null,
    page: aboutBaseline, media: {} as BlockMedia, promotions: {} as BlockPromotions };
  requirePagesEnvironment();
  if (!approvedPagePreview()) await connection();
  const { url, key } = getCmsConfig();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) }) },
  });
  const { data, error } = await client.rpc("cms_read_public_page", { target_key: "about" });
  if (error || !data) throw new Error("Published CMS page unavailable");
  const page = validatePageDraft(data.payload);
  const promotions: BlockPromotions = {};
  if (!data.promotions || typeof data.promotions !== "object" || Array.isArray(data.promotions))
    throw new Error("CMS page promotions unavailable");
  const referenced = new Set(page.blocks.flatMap(block => block.promotionRevisionId ? [block.promotionRevisionId] : []));
  if (Object.keys(data.promotions).length !== referenced.size) throw new Error("CMS page promotion mismatch");
  for (const id of referenced) promotions[id] = validatePromotionDraft(data.promotions[pageUuid(id)]);
  const media = publicMedia(data.media);
  for (const block of page.blocks) {
    if (block.mediaVersionId && !media[block.mediaVersionId]) throw new Error("CMS page media missing");
  }
  for (const promotion of Object.values(promotions)) {
    if (promotion.mediaVersionId && !media[promotion.mediaVersionId]) throw new Error("CMS promotion media missing");
  }
  return { source: "cms" as const, revisionId: pageUuid(data.revisionId), page, media, promotions };
});
