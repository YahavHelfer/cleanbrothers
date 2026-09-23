import "server-only";
import { createHash } from "node:crypto";
import { createTrustedMediaClient } from "./trusted-client";
import { PREVIEW_MEDIA_BUCKET, requireCloudMediaEnvironment } from "./environment";
import { MAX_PREVIEW_IMAGE_BYTES, mediaId, MediaError } from "./model";

function storage() {
  requireCloudMediaEnvironment();
  return createTrustedMediaClient().storage.from(PREVIEW_MEDIA_BUCKET);
}
export async function writeCloudImage(id: string, bytes: Uint8Array) {
  const path = `${mediaId(id)}.webp`;
  if (!bytes.length || bytes.length > MAX_PREVIEW_IMAGE_BYTES) throw new MediaError();
  const { error } = await storage().upload(path, bytes, {
    contentType: "image/webp", upsert: false, cacheControl: "0",
  });
  if (error) throw new MediaError();
}
export async function readCloudImage(id: string, hash: string) {
  const { data, error } = await storage().download(`${mediaId(id)}.webp`);
  if (error || !data || !data.size || data.size > MAX_PREVIEW_IMAGE_BYTES)
    throw new MediaError();
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== hash)
    throw new MediaError();
  return bytes;
}
// Compensate only this newly created UUID after a definite registration rollback.
// Ambiguous failures and registered/historical objects are never removed here.
export async function discardUnregisteredCloudImage(id: string) {
  const { error } = await storage().remove([`${mediaId(id)}.webp`]);
  if (error) throw new MediaError();
}
