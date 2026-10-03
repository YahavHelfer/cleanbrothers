import { staticMediaPath } from "./static-inventory";
import { mediaCloudEnabled, mediaLocalEnabled, s3MediaEnvironment } from "./environment";
import { approvedCmsPreviewIdentity } from "@/cms/preview-environment";
import { configuredCmsProduction } from "@/cms/production-environment";
import type { ResolvedMedia } from "./model";
import {
  mediaId,
  privateMediaUrl,
} from "./model";

// Resolve only a database projection. There is no caller-controlled URL/path.
export function resolveMediaProjection(
  input: unknown,
  audience: "admin" | "public",
): ResolvedMedia[] {
  if (!Array.isArray(input)) throw new Error("Media projection unavailable");
  return input.map((row) => {
    const id = mediaId(row.media_version_id);
    if (
      !["hero", "benefits", "result", "before", "after", "gallery", "seo"].includes(row.usage_role) ||
      !Number.isInteger(row.position) ||
      row.position < 0 ||
      row.position > 7 ||
      typeof row.alt_text !== "string"
    )
      throw new Error("Invalid media projection");
    let src: string;
    if (row.provider === "static")
      src = staticMediaPath(id);
    else if (row.provider === "local" || row.provider === "supabase" || row.provider === "s3") {
      if (audience === "public" && row.provider === "supabase" && !mediaCloudEnabled())
        throw new Error("Private CMS media unavailable");
      const s3Scope = s3MediaEnvironment();
      if (row.provider === "s3" && (!s3Scope || row.storage_scope !== s3Scope))
        throw new Error("S3 CMS media unavailable");
      const supabaseScope = configuredCmsProduction() ? "production" :
        approvedCmsPreviewIdentity() ? "preview" : null;
      if (row.provider === "supabase" && (!supabaseScope || row.storage_scope !== supabaseScope))
        throw new Error("CMS media scope unavailable");
      if (audience === "public" && row.provider === "local" && !mediaLocalEnabled())
        throw new Error("Local CMS media unavailable");
      src = audience === "admin" ? privateMediaUrl(id) : `/cms-media/${id}`;
    }
    else throw new Error("Unsupported media provider");
    return { ...row, src };
  });
}
