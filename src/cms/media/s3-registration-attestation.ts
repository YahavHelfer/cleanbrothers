import "server-only";
import { Buffer } from "node:buffer";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mediaMetadata, MAX_PREVIEW_IMAGE_BYTES, MAX_IMAGE_EDGE, MAX_IMAGE_PIXELS, mediaId, MediaError } from "./model";
import { mediaObjectKey } from "./object-store";
import { safeOriginalFilename } from "./validate-image";

// Local security prototype. Postgres, not this verifier, must authorize the RPC.
export type S3RegistrationPayload = {
  keyId: "v1";
  versionId: string;
  actorUserId: string;
  targetAssetId: string | null;
  expectedGeneration: number | null;
  storageProvider: "s3";
  objectKey: string;
  byteSize: number;
  width: number;
  height: number;
  mimeType: "image/webp";
  contentHash: string;
  originalFilename: string;
  altText: string;
  caption: string;
  folder: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};
export type SignedS3Registration = { payload: S3RegistrationPayload; signature: string };
export type S3RegistrationInput = Omit<S3RegistrationPayload,
  "keyId" | "storageProvider" | "objectKey" | "mimeType" | "issuedAt" | "expiresAt" | "nonce">;

const fields = [
  "keyId", "versionId", "actorUserId", "targetAssetId", "expectedGeneration",
  "storageProvider", "objectKey", "byteSize", "width", "height", "mimeType",
  "contentHash", "originalFilename", "altText", "caption", "folder",
  "issuedAt", "expiresAt", "nonce",
] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function validPayload(value: unknown): asserts value is S3RegistrationPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new MediaError();
  const p = value as Record<string, unknown>;
  if (Object.keys(p).length !== fields.length || fields.some((field) => !Object.hasOwn(p, field)))
    throw new MediaError();
  mediaId(p.versionId);
  if (typeof p.actorUserId !== "string" || !uuid.test(p.actorUserId) ||
      p.targetAssetId !== null && (typeof p.targetAssetId !== "string" || !uuid.test(p.targetAssetId)) ||
      p.targetAssetId === null !== (p.expectedGeneration === null) ||
      p.expectedGeneration !== null && (!Number.isSafeInteger(p.expectedGeneration) || Number(p.expectedGeneration) < 1) ||
      p.keyId !== "v1" || p.storageProvider !== "s3" ||
      p.objectKey !== mediaObjectKey(p.versionId as string) || p.mimeType !== "image/webp" ||
      !Number.isSafeInteger(p.byteSize) || Number(p.byteSize) < 1 || Number(p.byteSize) > MAX_PREVIEW_IMAGE_BYTES ||
      !Number.isSafeInteger(p.width) || Number(p.width) < 1 || Number(p.width) > MAX_IMAGE_EDGE ||
      !Number.isSafeInteger(p.height) || Number(p.height) < 1 || Number(p.height) > MAX_IMAGE_EDGE ||
      Number(p.width) * Number(p.height) > MAX_IMAGE_PIXELS ||
      typeof p.contentHash !== "string" || !/^[0-9a-f]{64}$/.test(p.contentHash) ||
      safeOriginalFilename(p.originalFilename) !== p.originalFilename)
    throw new MediaError();
  mediaMetadata({ altText: p.altText, caption: p.caption, folder: p.folder });
  if (!Number.isSafeInteger(p.issuedAt) || !Number.isSafeInteger(p.expiresAt) ||
      Number(p.expiresAt) <= Number(p.issuedAt) || Number(p.expiresAt) - Number(p.issuedAt) > 60 ||
      typeof p.nonce !== "string" || !/^[0-9a-f]{32}$/.test(p.nonce))
    throw new MediaError();
}

// Fixed field order, domain separator, UTF-8 base64, and a distinct NULL marker.
// Postgres prototype uses the identical grammar; JSON property order is irrelevant.
export function canonicalS3Registration(value: unknown) {
  validPayload(value);
  const p = value as unknown as Record<(typeof fields)[number], string | number | null>;
  return `cms-s3-media-register-v1\n${fields.map((field) =>
    `${field}=${p[field] === null ? "~" : Buffer.from(String(p[field]), "utf8").toString("base64")}`
  ).join("\n")}\n`;
}

function requireDedicatedKey(key: Uint8Array) {
  if (!(key instanceof Uint8Array) || key.length < 32) throw new MediaError();
  return key;
}

export interface MediaRegistrationSigner {
  sign(input: S3RegistrationInput): SignedS3Registration;
}
export interface MediaRegistrationVerifier {
  verify(attestation: SignedS3Registration, now: number): boolean;
}

export function createHmacMediaRegistrationSigner(
  key: Uint8Array,
  nowSeconds: () => number = () => Math.floor(Date.now() / 1000),
): MediaRegistrationSigner {
  const secret = requireDedicatedKey(key).slice();
  return {
    sign(input) {
      const issuedAt = nowSeconds();
      const payload: S3RegistrationPayload = {
        ...input,
        keyId: "v1",
        storageProvider: "s3",
        objectKey: mediaObjectKey(input.versionId),
        mimeType: "image/webp",
        issuedAt,
        expiresAt: issuedAt + 60,
        nonce: randomBytes(16).toString("hex"),
      };
      const signature = createHmac("sha256", secret).update(canonicalS3Registration(payload), "utf8").digest("hex");
      return { payload, signature };
    },
  };
}

export function createHmacMediaRegistrationVerifier(key: Uint8Array): MediaRegistrationVerifier {
  const secret = requireDedicatedKey(key).slice();
  return {
    verify(attestation, now) {
      try {
        if (!Number.isSafeInteger(now) || typeof attestation?.signature !== "string" ||
            !/^[0-9a-f]{64}$/.test(attestation.signature)) return false;
        const canonical = canonicalS3Registration(attestation.payload);
        if (attestation.payload.issuedAt > now + 5 || attestation.payload.expiresAt <= now) return false;
        const expected = createHmac("sha256", secret).update(canonical, "utf8").digest();
        return timingSafeEqual(expected, Buffer.from(attestation.signature, "hex"));
      } catch {
        return false;
      }
    },
  };
}
