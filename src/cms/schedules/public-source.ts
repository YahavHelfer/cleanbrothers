import "server-only";
import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { cache } from "react";
import { getCmsConfig } from "@/cms/config";
import { staticMediaPath } from "@/cms/media/static-inventory";
import { pageUuid, validatePromotionDraft, type PromotionDraft } from "@/cms/pages/model";
import { isPublicPlacement, usesScheduledPublicPlacement } from "./public-environment";

export type PublicActivePromotion = { key: string; revisionId: string; promotion: PromotionDraft;
  media: { src: string; altText: string } | null };

function exact(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key)))
    throw new Error("Invalid public promotion projection");
  return value as Record<string, unknown>;
}

export function validatePublicActivePromotion(input: unknown, kind: string, target: string): PublicActivePromotion {
  const row = exact(input, ["kind", "target", "promotionKey", "promotionRevisionId", "promotion", "media"]);
  if (!isPublicPlacement(row.kind, row.target) || row.kind !== kind || row.target !== target ||
    typeof row.promotionKey !== "string" || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(row.promotionKey) ||
    row.promotionKey.length < 3 || row.promotionKey.length > 80)
    throw new Error("Invalid public promotion identity");
  const promotion = validatePromotionDraft(row.promotion);
  if (!promotion.enabled) throw new Error("Inactive public promotion");
  const revisionId = pageUuid(row.promotionRevisionId);
  let media: PublicActivePromotion["media"] = null;
  if (promotion.mediaVersionId) {
    const projected = exact(row.media, ["mediaVersionId", "provider", "altText"]);
    if (pageUuid(projected.mediaVersionId) !== promotion.mediaVersionId ||
      projected.altText !== promotion.mediaAlt) throw new Error("Public promotion media mismatch");
    const src = projected.provider === "static" ? staticMediaPath(promotion.mediaVersionId) :
      projected.provider === "local" || projected.provider === "supabase" ?
        `/cms-media/${promotion.mediaVersionId}` : null;
    if (!src) throw new Error("Invalid public promotion media provider");
    media = { src, altText: projected.altText as string };
  } else if (row.media !== null) throw new Error("Unexpected public promotion media");
  return { key: row.promotionKey, revisionId, promotion, media };
}

// One request reads each placement at most once. Every actual RPC fetch is
// uncached; the database decides eligibility using its own current time.
export const getPublicActivePromotion = cache(async (kind: "global" | "home" | "service", target: string):
  Promise<PublicActivePromotion | null> => {
  if (!usesScheduledPublicPlacement(kind, target)) return null;
  await connection();
  try {
    const { url, key } = getCmsConfig();
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) }) },
    });
    const { data, error } = await client.rpc("cms_read_active_promotion_placement", { kind, target });
    if (error) throw error;
    return data === null ? null : validatePublicActivePromotion(data, kind, target);
  } catch {
    // This optional presentation cannot take the public page down or expose
    // private CMS errors. Operational metrics may count this fixed marker.
    console.error("Scheduled public promotion unavailable");
    return null;
  }
});
