import "server-only";
import { createHash } from "node:crypto";
import { MAX_PREVIEW_IMAGE_BYTES, mediaId, MediaError } from "./model";

// Server-only boundary: callers may address exact immutable UUIDs, never keys.
export interface MediaObjectStore {
  putExact(versionId: string, bytes: Uint8Array): Promise<void>;
  headExact(versionId: string): Promise<ExactObjectHead | null>;
  getExact(versionId: string): Promise<Uint8Array | null>;
  deleteExact(versionId: string): Promise<void>;
}

export type ExactObjectHead = {
  byteSize: number;
  mimeType: "image/webp";
  versionId: string;
  contentHash: string;
};

// The S3 adapter implements putIfAbsent with PutObject If-None-Match: *.
export interface ExactObjectBackend {
  putIfAbsent(key: string, bytes: Uint8Array): Promise<void>;
  head(key: string): Promise<ExactObjectHead | null>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

export const mediaObjectKey = (versionId: string) => `cms-media/${mediaId(versionId)}.webp`;

export function createMediaObjectStore(backend: ExactObjectBackend): MediaObjectStore {
  return Object.freeze({
    async putExact(versionId: string, bytes: Uint8Array) {
      const key = mediaObjectKey(versionId);
      if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > MAX_PREVIEW_IMAGE_BYTES)
        throw new MediaError();
      await backend.putIfAbsent(key, bytes.slice());
    },
    async getExact(versionId: string) {
      const result = await backend.get(mediaObjectKey(versionId));
      if (result && (!result.length || result.length > MAX_PREVIEW_IMAGE_BYTES))
        throw new MediaError();
      return result?.slice() ?? null;
    },
    headExact(versionId: string) {
      return backend.head(mediaObjectKey(versionId));
    },
    deleteExact(versionId: string) {
      return backend.delete(mediaObjectKey(versionId));
    },
  });
}

export type AuthorizedMediaVersion = {
  id: string;
  byte_size: number;
  content_hash: string;
};

// The caller must use the existing AAL2 Admin lookup or current-publication
// RPC. A raw version row without that authorization is not sufficient.
export async function readAuthorizedExact(
  store: MediaObjectStore,
  versionId: string,
  authorizedVersion: (id: string) => Promise<AuthorizedMediaVersion | null>,
) {
  const id = mediaId(versionId);
  const version = await authorizedVersion(id);
  if (!version) return null;
  if (version.id !== id || !Number.isSafeInteger(version.byte_size) ||
      version.byte_size < 1 || version.byte_size > MAX_PREVIEW_IMAGE_BYTES ||
      !/^[0-9a-f]{64}$/.test(version.content_hash))
    throw new MediaError();
  const bytes = await store.getExact(id);
  if (!bytes || bytes.length !== version.byte_size ||
      createHash("sha256").update(bytes).digest("hex") !== version.content_hash)
    throw new MediaError();
  return bytes;
}
