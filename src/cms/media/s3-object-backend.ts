import "server-only";
import { createHash } from "node:crypto";
import { MAX_PREVIEW_IMAGE_BYTES, mediaId, MediaError } from "./model";
import { mediaObjectKey, type ExactObjectBackend } from "./object-store";

// The AWS SDK adapter implements these four exact-object calls without listing.
// This contract intentionally contains no ListObjects or bucket API.
export interface S3ExactObjectClient {
  putObject(input: {
    Bucket: string; Key: string; Body: Uint8Array; ContentType: "image/webp";
    IfNoneMatch: "*"; Metadata: { "version-id": string; "content-hash": string };
  }): Promise<void>;
  headObject(input: { Bucket: string; Key: string }): Promise<{
    ContentLength: number; ContentType: string;
    Metadata: Record<string, string>;
  } | null>;
  getObject(input: { Bucket: string; Key: string }): Promise<Uint8Array | null>;
  deleteObject(input: { Bucket: string; Key: string }): Promise<void>;
}

function exactVersion(key: string) {
  const match = /^cms-media\/([0-9a-f-]+)\.webp$/.exec(key);
  if (!match || mediaObjectKey(mediaId(match[1])) !== key) throw new MediaError();
  return match[1];
}

export function createS3ExactObjectBackend(client: S3ExactObjectClient, bucket: string): ExactObjectBackend {
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) throw new MediaError();
  return Object.freeze({
    async putIfAbsent(key: string, bytes: Uint8Array) {
      const versionId = exactVersion(key);
      if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > MAX_PREVIEW_IMAGE_BYTES)
        throw new MediaError();
      const hash = createHash("sha256").update(bytes).digest("hex");
      await client.putObject({
        Bucket: bucket, Key: key, Body: bytes.slice(), ContentType: "image/webp",
        IfNoneMatch: "*", Metadata: { "version-id": versionId, "content-hash": hash },
      });
      const head = await client.headObject({ Bucket: bucket, Key: key });
      if (!head || head.ContentLength !== bytes.length || head.ContentType !== "image/webp" ||
          head.Metadata?.["version-id"] !== versionId || head.Metadata?.["content-hash"] !== hash)
        throw new MediaError("אימות אובייקט המדיה נכשל.");
    },
    get(key: string) {
      exactVersion(key);
      return client.getObject({ Bucket: bucket, Key: key });
    },
    delete(key: string) {
      exactVersion(key);
      return client.deleteObject({ Bucket: bucket, Key: key });
    },
    async head(key: string) {
      const versionId = exactVersion(key);
      // An AWS 403 without ListBucket is ambiguous: only an explicit null from
      // an authorized client adapter means absent; errors must propagate.
      const result = await client.headObject({ Bucket: bucket, Key: key });
      if (result === null) return null;
      const contentHash = result.Metadata?.["content-hash"];
      if (!Number.isSafeInteger(result.ContentLength) || result.ContentLength < 1 ||
          result.ContentLength > MAX_PREVIEW_IMAGE_BYTES || result.ContentType !== "image/webp" ||
          result.Metadata?.["version-id"] !== versionId || !/^[0-9a-f]{64}$/.test(contentHash ?? ""))
        throw new MediaError("אימות אובייקט המדיה נכשל.");
      return { byteSize: result.ContentLength, mimeType: "image/webp" as const, versionId, contentHash };
    },
  });
}
