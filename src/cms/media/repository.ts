import "server-only";
import { randomUUID } from "node:crypto";
import { requireCmsAdmin } from "@/cms/authorization";
import { createCmsServerClient } from "@/cms/server";
import { mediaByteLimit, mediaCloudEnabled, mediaLocalEnabled, requireMediaEnvironment } from "./environment";
import { createTrustedMediaClient } from "./trusted-client";
import { writeCloudImage, readCloudImage, discardUnregisteredCloudImage } from "./cloud-storage";
import { validateImage } from "./validate-image";
import {
  writeLocalImage,
  discardUnregisteredImage,
  readLocalImage,
} from "./local-storage";
import {
  MediaError,
  mediaId,
  mediaGeneration,
  mediaMetadata,
  privateMediaUrl,
  STATIC_MEDIA_PATH,
  STATIC_MEDIA_VERSION,
  type MediaAsset,
  type MediaVersion,
  type MediaRef,
  type MediaChoice,
} from "./model";

export type LibraryItem = MediaAsset & {
  version: MediaVersion;
  usageCount: number;
  publishedUsageCount: number;
};
export type MediaDetail = {
  asset: MediaAsset;
  versions: MediaVersion[];
  usages: (MediaRef & { revisionNumber: number; published: boolean })[];
  audit: {
    id: string;
    actor_id: string | null;
    kind: string;
    occurred_at: string;
  }[];
};
function check(error: { code?: string } | null) {
  if (error?.code === "PT409")
    throw new MediaError(
      "מנהל אחר שינה את המדיה. הקלט שלך נשמר בטופס. טענו מחדש לפני ניסיון נוסף.",
      409,
    );
  if (error) throw new MediaError();
}
export async function listMedia(): Promise<LibraryItem[]> {
  await requireCmsAdmin();
  requireMediaEnvironment();
  const client = await createCmsServerClient();
  const { data, error } = await client.rpc("cms_media_library");
  check(error);
  return data;
}
export async function getMediaDetail(id: string): Promise<MediaDetail | null> {
  await requireCmsAdmin();
  requireMediaEnvironment();
  const client = await createCmsServerClient();
  const { data, error } = await client.rpc("cms_media_detail", {
    target_asset: mediaId(id),
  });
  check(error);
  return data;
}
export async function getMediaChoices(): Promise<MediaChoice[]> {
  await requireCmsAdmin();
  requireMediaEnvironment();
  const items = await listMedia();
  const client = await createCmsServerClient();
  const { data: versions, error } = await client
    .from("media_versions")
    .select("*")
    .order("version_number", { ascending: false });
  check(error);
  return (versions as MediaVersion[]).map((v) => {
    const a = items.find((a) => a.id === v.asset_id)!;
    return {
      assetId: a.id,
      versionId: v.id,
      number: v.version_number,
      label: v.original_filename,
      altText: a.alt_text,
      src:
        v.storage_provider === "static"
          ? STATIC_MEDIA_PATH
          : privateMediaUrl(v.id),
      archived: a.status === "archived",
    };
  });
}
export async function updateMedia(
  id: string,
  generation: unknown,
  operation: unknown,
  metadata: unknown,
) {
  await requireCmsAdmin();
  requireMediaEnvironment();
  if (!["metadata", "archive", "restore"].includes(String(operation)))
    throw new MediaError();
  const client = await createCmsServerClient();
  const { error } = await client.rpc("cms_update_media_asset", {
    target_asset: mediaId(id),
    expected_generation: mediaGeneration(generation),
    operation,
    metadata: operation === "metadata" ? mediaMetadata(metadata) : null,
  });
  check(error);
}
export async function uploadMedia(
  bytes: Uint8Array,
  filename: unknown,
  mime: unknown,
  metadata: unknown,
  asset?: string,
  generation?: unknown,
) {
  const admin = await requireCmsAdmin();
  requireMediaEnvironment();
  const meta = mediaMetadata(metadata);
  const target = asset ? mediaId(asset) : null;
  const expected = asset ? mediaGeneration(generation) : null;
  if (bytes.length > mediaByteLimit())
    throw new MediaError("הקובץ גדול מדי לסביבת ההעלאה.", 413);
  const validated = await validateImage(bytes, filename, mime);
  if (validated.bytes.length > mediaByteLimit())
    throw new MediaError("התמונה המעובדת גדולה מדי. בחרו תמונה קטנה יותר.", 413);
  const id = randomUUID();
  const cloud = mediaCloudEnabled();
  const trusted = createTrustedMediaClient();
  await (cloud ? writeCloudImage : writeLocalImage)(id, validated.bytes);
  const { bytes: processed, ...details } = validated;
  void processed;
  const { data, error } = await trusted.rpc(cloud
    ? "cms_register_preview_media_version" : "cms_register_media_version", {
    target_asset: target,
    expected_generation: expected,
    version_id: id,
    details,
    metadata: meta,
    actor: admin.userId,
  });
  // Network/unknown failures may have committed: leave a private orphan candidate
  // for operator reconciliation, never delete a possibly registered historical file.
  if (
    error &&
    ["PT409", "42501", "22023", "23514", "23503", "55000"].includes(error.code)
  )
    await (cloud ? discardUnregisteredCloudImage : discardUnregisteredImage)(id);
  check(error);
  return mediaId(data);
}
export async function readPrivateMedia(id: string) {
  await requireCmsAdmin();
  requireMediaEnvironment();
  const client = await createCmsServerClient();
  const { data, error } = await client
    .from("media_versions")
    .select("*")
    .eq("id", mediaId(id))
    .maybeSingle();
  check(error);
  if (!data) return null;
  return mediaBytes(data as MediaVersion);
}
export async function mediaBytes(
  version: Pick<MediaVersion, "id" | "storage_provider" | "content_hash">,
) {
  requireMediaEnvironment();
  if (
    version.storage_provider === "static" &&
    version.id === STATIC_MEDIA_VERSION
  )
    return { staticPath: STATIC_MEDIA_PATH };
  const id = mediaId(version.id);
  if (version.storage_provider === "supabase" && mediaCloudEnabled())
    return { bytes: await readCloudImage(id, version.content_hash) };
  if (version.storage_provider === "local" && mediaLocalEnabled())
    return { bytes: await readLocalImage(id, version.content_hash) };
  throw new MediaError();
}
