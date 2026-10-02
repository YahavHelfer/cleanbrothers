import "server-only";
import { createHash } from "node:crypto";
import {
  DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createMediaObjectStore, type MediaObjectStore } from "./object-store";
import { createS3ExactObjectBackend } from "./s3-object-backend";
import { MAX_PREVIEW_IMAGE_BYTES, mediaId, MediaError } from "./model";
import { s3MediaEnvironmentEnabled } from "./environment";

let configuredStore: MediaObjectStore | null = null;

function required(value: string | undefined) {
  if (!value?.trim()) throw new MediaError("אחסון המדיה אינו מוגדר.", 503);
  return value.trim();
}

export function getS3MediaStore(): MediaObjectStore {
  if (!s3MediaEnvironmentEnabled()) throw new MediaError("אחסון המדיה אינו זמין.", 503);
  if (configuredStore) return configuredStore;
  const bucket = required(process.env.CMS_MEDIA_S3_BUCKET);
  const client = new S3Client({
    region: required(process.env.CMS_MEDIA_S3_REGION),
    credentials: {
      accessKeyId: required(process.env.CMS_MEDIA_S3_ACCESS_KEY_ID),
      secretAccessKey: required(process.env.CMS_MEDIA_S3_SECRET_ACCESS_KEY),
    },
    maxAttempts: 2,
  });
  configuredStore = createMediaObjectStore(createS3ExactObjectBackend({
    async putObject(input) {
      await client.send(new PutObjectCommand(input));
    },
    async headObject(input) {
      try {
        const result = await client.send(new HeadObjectCommand(input));
        return {
          ContentLength: result.ContentLength ?? 0,
          ContentType: result.ContentType ?? "",
          Metadata: result.Metadata ?? {},
        };
      } catch (error) {
        // Without ListBucket, a missing object may return 403. Never treat
        // that ambiguous response as proof that an object is absent.
        if (typeof error === "object" && error !== null &&
            "name" in error && error.name === "NotFound") return null;
        throw error;
      }
    },
    async getObject(input) {
      const result = await client.send(new GetObjectCommand(input));
      if (!result.Body || !result.ContentLength ||
          result.ContentLength > MAX_PREVIEW_IMAGE_BYTES ||
          result.ContentType !== "image/webp") throw new MediaError();
      const bytes = await result.Body.transformToByteArray();
      if (bytes.length !== result.ContentLength) throw new MediaError();
      return bytes;
    },
    async deleteObject(input) {
      await client.send(new DeleteObjectCommand(input));
    },
  }, bucket));
  return configuredStore;
}

export async function verifiedS3Bytes(
  version: { id: string; content_hash: string; byte_size: number },
) {
  const id = mediaId(version.id);
  if (!Number.isSafeInteger(version.byte_size) || version.byte_size < 1 ||
      version.byte_size > MAX_PREVIEW_IMAGE_BYTES) throw new MediaError();
  const bytes = await getS3MediaStore().getExact(id);
  if (!bytes || !bytes.length || bytes.length > MAX_PREVIEW_IMAGE_BYTES ||
      bytes.length !== version.byte_size ||
      createHash("sha256").update(bytes).digest("hex") !== version.content_hash)
    throw new MediaError();
  return bytes;
}

export function s3UploadCapability() {
  const value = required(process.env.CMS_MEDIA_UPLOAD_CAPABILITY);
  if (!/^[0-9a-f]{64}$/.test(value)) throw new MediaError("יכולת המדיה אינה מוגדרת.", 503);
  return value;
}
