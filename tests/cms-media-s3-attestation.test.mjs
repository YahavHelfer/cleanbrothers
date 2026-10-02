import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createSourceLoader } from "./helpers/source-module.mjs";

const load = createSourceLoader();
const {
  canonicalS3Registration,
  createHmacMediaRegistrationSigner,
  createHmacMediaRegistrationVerifier,
} = load("src/cms/media/s3-registration-attestation.ts");
const { createMediaObjectStore } = load("src/cms/media/object-store.ts");
const { createS3ExactObjectBackend } = load("src/cms/media/s3-object-backend.ts");
const versionId = "a4000000-0000-4000-8000-000000000001";
const actorUserId = "a4000000-0000-4000-8000-000000000002";
const targetAssetId = "a4000000-0000-4000-8000-000000000003";
const key = new Uint8Array(32).fill(17); // Synthetic local test key only.
const signer = createHmacMediaRegistrationSigner(key, () => issuedAt);
const verifier = createHmacMediaRegistrationVerifier(key);
const issuedAt = 1_800_000_000;
const bytes = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0]);
const input = {
  versionId, actorUserId, targetAssetId, expectedGeneration: 7,
  byteSize: bytes.length, width: 12, height: 8,
  contentHash: createHash("sha256").update(bytes).digest("hex"),
  originalFilename: "תמונה.png", altText: "תמונה", caption: "", folder: "בדיקה",
};

test("canonical payload is order independent, UTF-8 safe and valid for a short window", () => {
  const attestation = signer.sign(input);
  assert.equal(verifier.verify(attestation, issuedAt), true);
  assert.equal(verifier.verify(attestation, issuedAt + 59), true);
  assert.equal(verifier.verify(attestation, issuedAt + 60), false);
  const reversed = Object.fromEntries(Object.entries(attestation.payload).reverse());
  assert.equal(canonicalS3Registration(reversed), canonicalS3Registration(attestation.payload));
  assert.equal(attestation.payload.objectKey, `cms-media/${versionId}.webp`);
  assert.equal(attestation.payload.storageProvider, "s3");
  assert.equal(attestation.payload.mimeType, "image/webp");
  const fixed = { ...attestation.payload, contentHash: "a".repeat(64),
    originalFilename: "photo.png", altText: "Alt", caption: "", folder: "",
    nonce: "b".repeat(32) };
  assert.equal(createHash("sha256").update(canonicalS3Registration(fixed)).digest("hex"),
    "d452b8413b606e178ac6684cd4fe0663b869dfa6ea56c7578f8a81b7e5671c8e");
  const newAsset = { ...fixed, targetAssetId: null, expectedGeneration: null,
    originalFilename: "תמונה.png", altText: "תמונה", folder: "בדיקה" };
  assert.equal(createHash("sha256").update(canonicalS3Registration(newAsset)).digest("hex"),
    "7f27089bb46de11a0efc57144b385430dc0c27c20eea44253453de61174332c3");
});

for (const [field, value] of [
  ["contentHash", "0".repeat(64)], ["byteSize", 9],
  ["actorUserId", "a4000000-0000-4000-8000-000000000004"],
  ["versionId", "a4000000-0000-4000-8000-000000000005"],
  ["expectedGeneration", 8], ["targetAssetId", "a4000000-0000-4000-8000-000000000006"],
  ["altText", "changed"], ["originalFilename", "other.png"],
  ["storageProvider", "supabase"], ["objectKey", "arbitrary/path.webp"],
]) test(`signed ${field} cannot be changed`, () => {
  const attestation = signer.sign(input);
  assert.equal(verifier.verify({ ...attestation, payload: { ...attestation.payload, [field]: value } }, issuedAt), false);
});

test("unsigned/browser-crafted payload, unknown fields and wrong signing key fail closed", () => {
  const attestation = signer.sign(input);
  assert.equal(verifier.verify({ ...attestation, signature: "0".repeat(64) }, issuedAt), false);
  assert.equal(verifier.verify({ ...attestation, payload: { ...attestation.payload, extra: "browser" } }, issuedAt), false);
  assert.equal(createHmacMediaRegistrationVerifier(new Uint8Array(32).fill(18)).verify(attestation, issuedAt), false);
  assert.throws(() => createHmacMediaRegistrationSigner(new Uint8Array(8)));
});

test("one-time ledger denies replay and failed registration leaves nonce available", () => {
  const used = new Set();
  const register = (attestation, generation) => {
    if (!verifier.verify(attestation, issuedAt) ||
        attestation.payload.actorUserId !== actorUserId ||
        attestation.payload.expectedGeneration !== generation ||
        used.has(attestation.payload.nonce)) return false;
    used.add(attestation.payload.nonce); // SQL prototype does this in the insert transaction.
    return true;
  };
  const attestation = signer.sign(input);
  assert.equal(register(attestation, 8), false);
  assert.equal(used.size, 0);
  assert.equal(register(attestation, 7), true);
  assert.equal(register(attestation, 7), false);
});

test("S3 boundary uses conditional put, exact Head/Get/Delete and no list call", async () => {
  const objects = new Map();
  const calls = [];
  const bucket = "cms-media-dedicated-test";
  const client = {
    async putObject(args) {
      calls.push(["put", args.Key]);
      assert.equal(args.Bucket, bucket);
      assert.equal(args.IfNoneMatch, "*");
      assert.equal(args.ContentType, "image/webp");
      assert.equal(args.Metadata["version-id"], versionId);
      assert.equal(args.Metadata["content-hash"], input.contentHash);
      if (objects.has(args.Key)) throw new Error("precondition failed");
      objects.set(args.Key, { bytes: args.Body.slice(), type: args.ContentType, metadata: args.Metadata });
    },
    async headObject({ Bucket, Key }) {
      calls.push(["head", Key]);
      assert.equal(Bucket, bucket);
      const object = objects.get(Key);
      return object ? {
        ContentLength: object.bytes.length, ContentType: object.type, Metadata: object.metadata,
      } : null;
    },
    async getObject({ Bucket, Key }) {
      calls.push(["get", Key]);
      assert.equal(Bucket, bucket);
      return objects.get(Key)?.bytes ?? null;
    },
    async deleteObject({ Bucket, Key }) {
      calls.push(["delete", Key]);
      assert.equal(Bucket, bucket);
      objects.delete(Key);
    },
  };
  const store = createMediaObjectStore(createS3ExactObjectBackend(client, bucket));
  assert.equal("list" in store, false);
  await store.putExact(versionId, bytes);
  assert.deepEqual(calls.map(([operation]) => operation), ["put", "head"]);
  assert.deepEqual(Array.from(await store.getExact(versionId)), Array.from(bytes));
  await assert.rejects(store.putExact(versionId, bytes));
  assert.ok(await store.headExact(versionId));
  await store.deleteExact(versionId);
  assert.equal(await store.headExact(versionId), null);
  assert.ok(calls.every(([, objectKey]) => objectKey === `cms-media/${versionId}.webp`));
});

test("S3 Head mismatch fails before any registration attestation", async () => {
  const client = {
    async putObject() {},
    async headObject() { return { ContentLength: 1, ContentType: "image/webp", Metadata: {} }; },
    async getObject() { return null; },
    async deleteObject() {},
  };
  const store = createMediaObjectStore(createS3ExactObjectBackend(client, "cms-media-dedicated-test"));
  await assert.rejects(store.putExact(versionId, bytes));
});

test("S3 Head 403 remains ambiguous without ListBucket", async () => {
  const client = {
    async putObject() {},
    async headObject() { throw Object.assign(new Error("Access denied"), { status: 403 }); },
    async getObject() { return null; },
    async deleteObject() {},
  };
  const store = createMediaObjectStore(createS3ExactObjectBackend(client, "cms-media-dedicated-test"));
  await assert.rejects(store.headExact(versionId), { status: 403 });
});
