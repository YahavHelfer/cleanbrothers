export const STATIC_MEDIA_ASSET = "d0000000-0000-4000-8000-000000000001";
export const STATIC_MEDIA_VERSION = "d1000000-0000-4000-8000-000000000001";
export const STATIC_MEDIA_PATH =
  "/images/services/delicate-upholstery-cleaning.jpeg";
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// Leave multipart/header margin below Vercel's 4.5 MB function payload limit.
export const MAX_PREVIEW_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 6000;
export const MAX_IMAGE_PIXELS = 16_000_000;
export class MediaError extends Error {
  constructor(
    message = "פעולת המדיה לא הושלמה. בדקו את הקובץ וההרשאה ונסו שוב.",
    public status = 400,
  ) {
    super(message);
  }
}
export function mediaId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      value,
    )
  )
    throw new MediaError("מזהה המדיה אינו תקין.");
  return value;
}
export function mediaGeneration(value: unknown): number {
  const n =
    typeof value === "string" && /^[1-9]\d{0,14}$/.test(value)
      ? Number(value)
      : value;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 1)
    throw new MediaError("מצב העריכה אינו תקין. טענו מחדש את העמוד.");
  return n;
}
export type MediaMetadata = {
  altText: string;
  caption: string;
  folder: string;
};
export function mediaMetadata(value: unknown): MediaMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new MediaError();
  const d = value as Record<string, unknown>;
  if (
    Object.keys(d).length !== 3 ||
    !["altText", "caption", "folder"].every((k) => k in d)
  )
    throw new MediaError();
  for (const [key, max] of [
    ["altText", 300],
    ["caption", 1000],
    ["folder", 80],
  ] as const) {
    if (
      typeof d[key] !== "string" ||
      [...d[key]].length > max ||
      /[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(d[key])
    )
      throw new MediaError("יש למלא טקסט רגיל באורך המותר.");
  }
  if (!(d.altText as string).trim())
    throw new MediaError("יש למלא תיאור חלופי לתמונה.");
  return {
    altText: d.altText as string,
    caption: d.caption as string,
    folder: d.folder as string,
  };
}
export type MediaVersion = {
  id: string;
  asset_id: string;
  version_number: number;
  storage_provider: "static" | "local" | "supabase";
  storage_path: string;
  mime_type: string;
  byte_size: number;
  width: number;
  height: number;
  content_hash: string;
  original_filename: string;
  created_by: string | null;
  created_at: string;
};
export type MediaAsset = {
  id: string;
  status: "available" | "archived";
  generation: number;
  current_version_id: string;
  alt_text: string;
  caption: string;
  folder: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
export type MediaRef = {
  revision_id: string;
  media_version_id: string;
  usage_role: "hero" | "benefits" | "result" | "before" | "after" | "gallery" | "seo";
  position: number;
  alt_text: string;
  caption: string;
};
export type ResolvedMedia = MediaRef & {
  src: string;
  width: number;
  height: number;
};
export type MediaChoice = {
  assetId: string;
  versionId: string;
  number: number;
  label: string;
  altText: string;
  src: string;
  archived: boolean;
};
export const privateMediaUrl = (id: string) =>
  `/admin/media/file/${mediaId(id)}`;
