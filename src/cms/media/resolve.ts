import type { ResolvedMedia } from "./model";
import {
  mediaId,
  STATIC_MEDIA_PATH,
  STATIC_MEDIA_VERSION,
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
      !["hero", "benefits", "result"].includes(row.usage_role) ||
      !Number.isInteger(row.position) ||
      row.position < 0 ||
      row.position > 7 ||
      typeof row.alt_text !== "string"
    )
      throw new Error("Invalid media projection");
    let src: string;
    if (row.provider === "static" && id === STATIC_MEDIA_VERSION)
      src = STATIC_MEDIA_PATH;
    else if (row.provider === "local")
      src = audience === "admin" ? privateMediaUrl(id) : `/cms-media/${id}`;
    else throw new Error("Unsupported media provider");
    return { ...row, src };
  });
}
