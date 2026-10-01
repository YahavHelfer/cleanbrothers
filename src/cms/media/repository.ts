import "server-only";
import { isManagedServiceKey, type ManagedServiceKey } from "@/content/service-registry";
import { staticMediaPath } from "./static-inventory";
import { randomUUID } from "node:crypto";
import { requireCmsAdmin } from "@/cms/authorization";
import { createCmsServerClient } from "@/cms/server";
import { authenticatedMediaEnvironmentEnabled, mediaByteLimit, mediaCloudEnabled, mediaLocalEnabled, requireMediaReadEnvironment, mediaUploadEnabled, trustedMediaEnvironmentEnabled } from "./environment";
import { createTrustedMediaClient } from "./trusted-client";
import { writeCloudImage, readCloudImage, discardUnregisteredCloudImage } from "./cloud-storage";
import { writeAuthenticatedImage, readAuthenticatedImage, readPublishedImage, discardUnregisteredAuthenticatedImage } from "./authenticated-storage";
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
  type MediaAsset,
  type MediaVersion,
  type MediaRef,
  type MediaChoice,
} from "./model";

export type LibraryItem = MediaAsset & {
  version: MediaVersion;
  versionCount: number;
  usageCount: number;
  publishedUsageCount: number;
  previewSrc: string | null;
};
export type MediaDetail = {
  asset: MediaAsset;
  versions: MediaVersion[];
  usages: (MediaRef & { serviceKey: ManagedServiceKey | "about" | "home" | "about-intro" | `new:${string}` | `campaign-${string}`; revisionNumber: number; published: boolean })[];
  audit: {
    id: string;
    actor_id: string | null;
    kind: string;
    occurred_at: string;
  }[];
};
export function mediaVersionReadable(version: Pick<MediaVersion, "storage_provider"> & { storage_bucket?: string | null }) {
  return version.storage_provider === "static" ||
    version.storage_provider === "local" && mediaLocalEnabled() ||
    version.storage_provider === "supabase" && (
      version.storage_bucket === "cms-media-production" && authenticatedMediaEnvironmentEnabled() ||
      version.storage_bucket === "cms-media-preview" && trustedMediaEnvironmentEnabled());
}
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
  requireMediaReadEnvironment();
  const client = await createCmsServerClient();
  const { data, error } = await client.rpc("cms_media_library");
  check(error);
  return (data as Omit<LibraryItem, "previewSrc">[]).map((item) => ({
    ...item,
    previewSrc: item.version.storage_provider === "static"
      ? staticMediaPath(item.version.id)
      : mediaVersionReadable(item.version) ? privateMediaUrl(item.version.id) : null,
  }));
}
export async function getMediaDetail(id: string): Promise<MediaDetail | null> {
  await requireCmsAdmin();
  requireMediaReadEnvironment();
  const client = await createCmsServerClient();
  const { data, error } = await client.rpc("cms_media_detail", {
    target_asset: mediaId(id),
  });
  check(error);
  if (data && (!Array.isArray(data.usages) || data.usages.some((usage: { serviceKey?: unknown }) =>
    !isManagedServiceKey(usage.serviceKey) && usage.serviceKey !== "about" && usage.serviceKey !== "home" &&
    usage.serviceKey !== "about-intro" &&
    !(typeof usage.serviceKey === "string" && (
      /^new:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(usage.serviceKey) ||
      /^campaign-[0-9a-f]{32}$/.test(usage.serviceKey)
    ))))) throw new MediaError();
  return data;
}
export async function getMediaChoices(): Promise<MediaChoice[]> {
  await requireCmsAdmin();
  requireMediaReadEnvironment();
  const items = await listMedia();
  const client = await createCmsServerClient();
  const { data: versions, error } = await client
    .from("media_versions")
    .select("*")
    .order("version_number", { ascending: false });
  check(error);
  return (versions as MediaVersion[]).filter(mediaVersionReadable).map((v) => {
    const a = items.find((a) => a.id === v.asset_id)!;
    return {
      assetId: a.id,
      versionId: v.id,
      number: v.version_number,
      label: v.original_filename,
      altText: a.alt_text,
      src:
        v.storage_provider === "static"
          ? staticMediaPath(v.id)
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
  requireMediaReadEnvironment();
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
  if (!mediaUploadEnabled()) throw new MediaError("העלאת מדיה אינה זמינה בסביבה זו.", 503);
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
  const authenticated = authenticatedMediaEnvironmentEnabled();
  const client = authenticated ? await createCmsServerClient() : createTrustedMediaClient();
  await (authenticated ? writeAuthenticatedImage : cloud ? writeCloudImage : writeLocalImage)(id, validated.bytes);
  const { bytes: processed, ...details } = validated;
  void processed;
  const { data, error } = await client.rpc(authenticated
    ? "cms_register_authenticated_media_version" : cloud
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
    await (authenticated ? discardUnregisteredAuthenticatedImage : cloud ? discardUnregisteredCloudImage : discardUnregisteredImage)(id);
  check(error);
  return mediaId(data);
}
export async function readPrivateMedia(id: string) {
  await requireCmsAdmin();
  requireMediaReadEnvironment();
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
  version: Pick<MediaVersion, "id" | "storage_provider" | "content_hash"> & { storage_bucket?: string | null },
  audience: "admin" | "public" = "admin",
) {
  requireMediaReadEnvironment();
  if (
    version.storage_provider === "static"
  )
    return { staticPath: staticMediaPath(version.id) };
  const id = mediaId(version.id);
  if (version.storage_provider === "supabase" && version.storage_bucket === "cms-media-production" && authenticatedMediaEnvironmentEnabled())
    return { bytes: await (audience === "admin" ? readAuthenticatedImage : readPublishedImage)(id, version.content_hash) };
  if (version.storage_provider === "supabase" && version.storage_bucket === "cms-media-preview" && mediaCloudEnabled() && trustedMediaEnvironmentEnabled())
    return { bytes: await readCloudImage(id, version.content_hash) };
  if (version.storage_provider === "local" && mediaLocalEnabled())
    return { bytes: await readLocalImage(id, version.content_hash) };
  throw new MediaError();
}
