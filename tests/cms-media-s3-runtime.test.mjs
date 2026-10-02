import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createSourceLoader } from "./helpers/source-module.mjs";

const id = "c4000000-0000-4000-8000-000000000041";
const bytes = new TextEncoder().encode("synthetic normalized WebP bytes");
const hash = createHash("sha256").update(bytes).digest("hex");
const key = `cms-media/${id}.webp`;

function runtime({ corruptHead = false } = {}) {
  const calls = [], objects = new Map();
  class S3Client {
    constructor(config) {
      assert.equal(config.region, "eu-central-1");
      assert.equal(config.credentials.accessKeyId, "synthetic-access");
      assert.equal(config.credentials.secretAccessKey, "synthetic-secret");
    }
    async send(command) {
      const input = command.input;
      calls.push([command.constructor.name, input.Key]);
      assert.equal(input.Bucket, "synthetic-cms-bucket");
      if (command instanceof PutObjectCommand) {
        assert.equal(input.Key, key);
        assert.equal(input.ContentType, "image/webp");
        assert.equal(input.IfNoneMatch, "*");
        assert.equal(input.Metadata["version-id"], id);
        assert.equal(input.Metadata["content-hash"], hash);
        if (objects.has(input.Key)) throw new Error("PreconditionFailed");
        objects.set(input.Key, input.Body.slice());
        return {};
      }
      if (command instanceof HeadObjectCommand) {
        const object = objects.get(input.Key);
        if (!object) throw Object.assign(new Error("missing"), { name: "NotFound" });
        return { ContentLength: corruptHead ? object.length + 1 : object.length,
          ContentType: "image/webp",
          Metadata: { "version-id": id, "content-hash": hash } };
      }
      if (command instanceof GetObjectCommand) {
        const object = objects.get(input.Key);
        return { ContentLength: object.length, ContentType: "image/webp",
          Body: { transformToByteArray: async () => object.slice() } };
      }
      if (command instanceof DeleteObjectCommand) {
        objects.delete(input.Key);
        return {};
      }
      throw new Error("unexpected S3 command");
    }
  }
  class PutObjectCommand { constructor(input) { this.input = input; } }
  class HeadObjectCommand { constructor(input) { this.input = input; } }
  class GetObjectCommand { constructor(input) { this.input = input; } }
  class DeleteObjectCommand { constructor(input) { this.input = input; } }
  const loaded = createSourceLoader({
    env: {
      CMS_MEDIA_S3_BUCKET: "synthetic-cms-bucket",
      CMS_MEDIA_S3_REGION: "eu-central-1",
      CMS_MEDIA_S3_ACCESS_KEY_ID: "synthetic-access",
      CMS_MEDIA_S3_SECRET_ACCESS_KEY: "synthetic-secret",
      CMS_MEDIA_UPLOAD_CAPABILITY: "1".repeat(64),
    },
    mocks: {
      "@aws-sdk/client-s3": { S3Client, PutObjectCommand, HeadObjectCommand,
        GetObjectCommand, DeleteObjectCommand },
      "./environment": { s3MediaEnvironmentEnabled: () => true },
    },
  })("src/cms/media/s3-store.ts");
  return { loaded, calls, objects };
}

test("SDK v3 adapter uses exact conditional Put/Head/Get/Delete without list", async () => {
  const { loaded, calls } = runtime();
  const store = loaded.getS3MediaStore();
  assert.deepEqual(Object.keys(store).sort(), ["deleteExact","getExact","headExact","putExact"]);
  await store.putExact(id, bytes);
  assert.deepEqual(Array.from(await loaded.verifiedS3Bytes({
    id, byte_size: bytes.length, content_hash: hash,
  })), Array.from(bytes));
  await assert.rejects(store.putExact(id, bytes));
  await assert.rejects(loaded.verifiedS3Bytes({ id, content_hash: hash }));
  await assert.rejects(loaded.verifiedS3Bytes({ id, byte_size: bytes.length + 1, content_hash: hash }));
  await store.deleteExact(id);
  assert.ok(calls.every(([, objectKey]) => objectKey === key));
  assert.ok(calls.every(([name]) => !name.includes("List")));
});

test("S3 Head mismatch fails before journal attestation", async () => {
  const { loaded } = runtime({ corruptHead: true });
  await assert.rejects(loaded.getS3MediaStore().putExact(id, bytes));
});
