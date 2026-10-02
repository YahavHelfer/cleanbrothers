import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createSourceLoader } from "./helpers/source-module.mjs";

const { createMediaObjectStore, mediaObjectKey, readAuthorizedExact } =
  createSourceLoader()("src/cms/media/object-store.ts");
const first = "c4000000-0000-4000-8000-000000000001";
const second = "c4000000-0000-4000-8000-000000000002";
const bytes = new TextEncoder().encode("synthetic WebP object bytes");
const version = {
  id: first,
  byte_size: bytes.length,
  content_hash: createHash("sha256").update(bytes).digest("hex"),
};

function mockStore() {
  const objects = new Map();
  const calls = [];
  const backend = {
    async putIfAbsent(key, value) {
      calls.push(["put", key]);
      if (objects.has(key)) throw new Error("Object already exists");
      objects.set(key, value.slice());
    },
    async get(key) {
      calls.push(["get", key]);
      return objects.get(key)?.slice() ?? null;
    },
    async delete(key) {
      calls.push(["delete", key]);
      objects.delete(key);
    },
    async head(key) {
      calls.push(["head", key]);
      const value = objects.get(key);
      return value ? { byteSize: value.length, mimeType: "image/webp",
        versionId: key.slice("cms-media/".length, -".webp".length),
        contentHash: createHash("sha256").update(value).digest("hex") } : null;
    },
  };
  return { store: createMediaObjectStore(backend), objects, calls };
}

test("exact UUID-only operations never expose listing or caller paths", async () => {
  const { store, calls } = mockStore();
  assert.deepEqual(Object.keys(store).sort(), ["deleteExact", "getExact", "headExact", "putExact"]);
  assert.equal("list" in store, false);
  assert.equal(mediaObjectKey(first), `cms-media/${first}.webp`);
  await assert.rejects(store.getExact("../private/other.webp"));
  await assert.rejects(store.putExact(`${first}/other`, bytes));
  assert.deepEqual(calls, []);
  await store.putExact(first, bytes);
  assert.deepEqual(await store.headExact(first), { byteSize: bytes.length,
    mimeType: "image/webp", versionId: first, contentHash: version.content_hash });
  assert.deepEqual(Array.from(await store.getExact(first)), Array.from(bytes));
  assert.ok(calls.every(([, key]) => key === `cms-media/${first}.webp`));
});

test("new version uses a new object and an existing key cannot be overwritten", async () => {
  const { store } = mockStore();
  await store.putExact(first, bytes);
  await assert.rejects(store.putExact(first, new Uint8Array([1])));
  await store.putExact(second, new Uint8Array([2]));
  assert.deepEqual(Array.from(await store.getExact(first)), Array.from(bytes));
  assert.deepEqual(Array.from(await store.getExact(second)), [2]);
});

test("authorized historical read supports either AAL2 admin but not an unauthorized public version", async () => {
  const { store, calls } = mockStore();
  await store.putExact(first, bytes);
  const adminA = async () => version;
  const adminB = async () => version;
  const publicCurrentReference = async () => null;
  assert.deepEqual(Array.from(await readAuthorizedExact(store, first, adminA)), Array.from(bytes));
  assert.deepEqual(Array.from(await readAuthorizedExact(store, first, adminB)), Array.from(bytes));
  const before = calls.length;
  assert.equal(await readAuthorizedExact(store, first, publicCurrentReference), null);
  assert.equal(calls.length, before, "no object read occurs without current-publication authorization");
});

test("size/hash mismatch fails closed without returning bytes", async () => {
  const { store, objects } = mockStore();
  await store.putExact(first, bytes);
  objects.set(`cms-media/${first}.webp`, new Uint8Array([9, 9]));
  await assert.rejects(readAuthorizedExact(store, first, async () => version));
  objects.set(`cms-media/${first}.webp`, new Uint8Array(bytes.length));
  await assert.rejects(readAuthorizedExact(store, first, async () => version));
});

test("definite registration failure can delete only the newly generated exact object", async () => {
  const { store } = mockStore();
  await store.putExact(first, bytes);
  await store.putExact(second, new Uint8Array([2]));
  await store.deleteExact(second);
  assert.ok(await store.headExact(first));
  assert.equal(await store.headExact(second), null);
});
