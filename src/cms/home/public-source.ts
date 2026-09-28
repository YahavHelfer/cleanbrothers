import "server-only";
import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { cache } from "react";
import { getCmsConfig } from "@/cms/config";
import { staticMediaPath } from "@/cms/media/static-inventory";
import { validatePromotionDraft, pageUuid } from "@/cms/pages/model";
import type { BlockMedia, BlockPromotions } from "@/cms/pages/PageBlocksView";
import { homeBaseline } from "./baseline";
import { staticHomeMedia } from "./HomeBlocksView";
import { approvedHomePreview, requireHomeEnvironment, usesCmsHomeSource } from "./environment";
import { validateHomeDraft } from "./model";

type MediaRow = { media_version_id: unknown; usage_role: unknown; position: unknown;
  alt_text: unknown; provider: unknown };
function resolveMedia(input: unknown): BlockMedia {
  if (!Array.isArray(input)) throw new Error("Published homepage media unavailable");
  return Object.fromEntries(input.map((row: MediaRow) => {
    const id = pageUuid(row.media_version_id);
    if (!["home-hero","home-before","home-after","page-image","promotion"].includes(String(row.usage_role)) ||
      !Number.isInteger(row.position) || (row.position as number) < 0 || (row.position as number) > 49 ||
      typeof row.alt_text !== "string" || !row.alt_text.trim()) throw new Error("Invalid homepage media");
    const src = row.provider === "static" ? staticMediaPath(id) :
      row.provider === "local" || row.provider === "supabase" ? `/cms-media/${id}` : null;
    if (!src) throw new Error("Invalid homepage media provider");
    return [id, { src, altText: row.alt_text }];
  }));
}

// A zero-argument published-only RPC and React request memoization keep HTML,
// metadata and FAQ JSON-LD on the same immutable revision.
export const getPublicHome = cache(async () => {
  if (approvedHomePreview()) await connection();
  if (!usesCmsHomeSource()) return { source: "static" as const, revisionId: null,
    page: homeBaseline, media: staticHomeMedia, promotions: {} as BlockPromotions };
  requireHomeEnvironment();
  if (!approvedHomePreview()) await connection();
  const { url, key } = getCmsConfig();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) }) },
  });
  const { data, error } = await client.rpc("cms_read_public_home");
  if (error || !data) throw new Error("Published homepage unavailable");
  const page = validateHomeDraft(data.payload);
  const revisionId = pageUuid(data.revisionId);
  if (!data.promotions || typeof data.promotions !== "object" || Array.isArray(data.promotions))
    throw new Error("Published homepage promotions unavailable");
  const referenced = new Set(page.blocks.flatMap(block => block.promotionRevisionId ? [block.promotionRevisionId] : []));
  if (Object.keys(data.promotions).length !== referenced.size) throw new Error("Homepage promotion mismatch");
  const promotions: BlockPromotions = {};
  for (const id of referenced) promotions[id] = validatePromotionDraft(data.promotions[id]);
  const media = resolveMedia(data.media);
  for (const block of page.blocks) {
    if (block.mediaVersionId && !media[block.mediaVersionId]) throw new Error("Homepage block media missing");
    if (block.type === "homeBeforeAfter") for (const item of block.payload.items as { beforeVersionId: string; afterVersionId: string }[])
      if (!media[item.beforeVersionId] || !media[item.afterVersionId]) throw new Error("Homepage gallery media missing");
  }
  return { source: "cms" as const, revisionId, page, media, promotions };
});
