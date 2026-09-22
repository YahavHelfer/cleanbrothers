import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";
const env = {
  CMS_SUPABASE_URL: "http://127.0.0.1:56321",
  CMS_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test",
  CMS_MEDIA_LOCAL_ENABLED: "1",
};
const load = createSourceLoader({ env });
const { validateImage, safeOriginalFilename } = load(
  "src/cms/media/validate-image.ts",
);
const model = load("src/cms/media/model.ts");
const fixture = async (format) =>
  sharp({
    create: { width: 12, height: 8, channels: 3, background: "#159a92" },
  })
    [format]()
    .toBuffer();
for (const format of ["jpeg", "png", "webp"])
  test(`image pipeline decodes ${format}, strips metadata and emits bounded WebP`, async () => {
    const result = await validateImage(
      await fixture(format),
      `photo.${format}`,
      `image/${format}`,
    );
    const meta = await sharp(result.bytes).metadata();
    assert.equal(result.width, 12);
    assert.equal(result.height, 8);
    assert.equal(meta.format, "webp");
    assert.equal(result.mimeType, "image/webp");
    assert.equal(
      result.contentHash,
      createHash("sha256").update(result.bytes).digest("hex"),
    );
    assert.equal(meta.exif, undefined);
    assert.equal(meta.xmp, undefined);
    assert.equal(meta.icc, undefined);
  });
test("orientation is applied while private EXIF is removed", async () => {
  const input = await sharp(await fixture("jpeg"))
    .withMetadata({ orientation: 6 })
    .withExif({
      IFD0: { Artist: "Private fixture", Copyright: "Private location" },
    })
    .jpeg()
    .toBuffer();
  assert.ok((await sharp(input).metadata()).exif);
  const result = await validateImage(input, "private.jpg", "image/jpeg");
  const meta = await sharp(result.bytes).metadata();
  assert.equal(meta.exif, undefined);
  assert.equal(meta.orientation, undefined);
  assert.equal(meta.xmp, undefined);
  assert.equal(meta.icc, undefined);
  assert.equal(result.width, 8);
  assert.equal(result.height, 12);
  assert.equal(result.bytes.includes(Buffer.from("Private")), false);
});
for (const [name, build, file, mime] of [
  ["fake extension", () => fixture("png"), "photo.jpg", "image/png"],
  ["wrong MIME", () => fixture("jpeg"), "photo.jpg", "image/png"],
  [
    "SVG",
    () =>
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      ),
    "photo.png",
    "image/png",
  ],
  [
    "HTML",
    () => Buffer.from("<!doctype html><html>evil</html>"),
    "photo.jpg",
    "image/jpeg",
  ],
  [
    "executable",
    () => Buffer.from("MZ executable payload"),
    "photo.jpg",
    "image/jpeg",
  ],
  [
    "JPEG polyglot",
    async () =>
      Buffer.concat([
        await fixture("jpeg"),
        Buffer.from("<html>payload</html>"),
      ]),
    "photo.jpg",
    "image/jpeg",
  ],
  [
    "PNG trailing payload",
    async () => Buffer.concat([await fixture("png"), Buffer.from("payload")]),
    "photo.png",
    "image/png",
  ],
  [
    "WebP trailing payload",
    async () => Buffer.concat([await fixture("webp"), Buffer.from("payload")]),
    "photo.webp",
    "image/webp",
  ],
  [
    "concatenated JPEG",
    async () => Buffer.concat([await fixture("jpeg"), await fixture("jpeg")]),
    "photo.jpg",
    "image/jpeg",
  ],
  [
    "truncated JPEG",
    async () => (await fixture("jpeg")).subarray(0, 35),
    "photo.jpg",
    "image/jpeg",
  ],
  [
    "corrupt PNG CRC",
    async () => {
      const b = await fixture("png");
      b[b.length - 1] ^= 1;
      return b;
    },
    "photo.png",
    "image/png",
  ],
  [
    "oversized bytes",
    () => Buffer.alloc(model.MAX_IMAGE_BYTES + 1),
    "photo.jpg",
    "image/jpeg",
  ],
  ["empty bytes", () => Buffer.alloc(0), "photo.jpg", "image/jpeg"],
  [
    "unsupported AVIF",
    () =>
      sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } })
        .avif()
        .toBuffer(),
    "photo.avif",
    "image/avif",
  ],
  [
    "excessive width",
    () =>
      sharp({
        create: { width: 6001, height: 1, channels: 3, background: "red" },
      })
        .png()
        .toBuffer(),
    "photo.png",
    "image/png",
  ],
  [
    "decoded pixel bomb",
    () =>
      sharp({
        create: { width: 4100, height: 4100, channels: 3, background: "red" },
      })
        .png()
        .toBuffer(),
    "photo.png",
    "image/png",
  ],
])
  test(`image validation rejects ${name}`, async () =>
    assert.rejects(() =>
      Promise.resolve(build()).then((b) => validateImage(b, file, mime)),
    ));
for (const name of [
  "../photo.jpg",
  "a/b.jpg",
  "a\\b.jpg",
  ".hidden.jpg",
  "photo.php.jpg",
  "photo.svg.png",
  "photo\u202egpj.jpg",
  "photo\0.jpg",
  "a／b.jpg",
  "photo..jpg",
  "https://host/p.png",
])
  test(`unsafe filename rejected: ${JSON.stringify(name)}`, () =>
    assert.throws(() => safeOriginalFilename(name)));
test("safe Unicode filenames remain metadata and never select paths", () => {
  assert.equal(safeOriginalFilename("תמונה יפה.JPG"), "תמונה יפה.JPG");
  assert.equal(safeOriginalFilename("ｐｈｏｔｏ.png"), "photo.png");
});
test("hashes describe normalized bytes, deterministic without collapsing logical assets", async () => {
  const b = await fixture("png");
  const a = await validateImage(b, "one.png", "image/png"),
    c = await validateImage(b, "two.png", "image/png");
  assert.equal(a.contentHash, c.contentHash);
  const different = await sharp({
    create: { width: 12, height: 8, channels: 3, background: "blue" },
  })
    .png()
    .toBuffer();
  assert.notEqual(
    (await validateImage(different, "other.png", "image/png")).contentHash,
    a.contentHash,
  );
});
test("legacy pilot import records the existing exact physical bytes without copying", async () => {
  const b = readFileSync(
    "public/images/services/delicate-upholstery-cleaning.jpeg",
  );
  const meta = await sharp(b).metadata();
  assert.equal(b.length, 132211);
  assert.equal(meta.width, 1600);
  assert.equal(meta.height, 1200);
  assert.equal(
    createHash("sha256").update(b).digest("hex"),
    "b1420c216c60afec56597ccba27c5cabd2ee44f54a2904ac1b7824225e696107",
  );
});
for (const [name, e] of Object.entries({
  off: { ...env, CMS_MEDIA_LOCAL_ENABLED: "" },
  cloud: {
    ...env,
    CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co",
  },
  preview: { ...env, VERCEL: "1", VERCEL_ENV: "preview" },
  production: { ...env, VERCEL_ENV: "production" },
  otherLocal: { ...env, CMS_SUPABASE_URL: "http://127.0.0.1:54321" },
}))
  test(`media environment denies ${name}`, () =>
    assert.throws(() =>
      createSourceLoader({ env: e })(
        "src/cms/media/environment.ts",
      ).requireMediaEnvironment(),
    ));
for (const operation of [
  "list",
  "detail",
  "choices",
  "update",
  "upload",
  "file",
])
  test(`media ${operation} independently authorizes before database or file access`, async () => {
    let calls = 0;
    const repo = createSourceLoader({
      env,
      mocks: {
        "@/cms/authorization": {
          requireCmsAdmin: async () => {
            throw Error("denied");
          },
        },
        "@/cms/server": {
          createCmsServerClient: async () => {
            calls++;
            throw Error("unexpected");
          },
        },
        "./local-storage": {
          readLocalImage: async () => {
            calls++;
          },
          writeLocalImage: async () => {
            calls++;
          },
        },
      },
    })("src/cms/media/repository.ts");
    const run = {
      list: () => repo.listMedia(),
      detail: () => repo.getMediaDetail(model.STATIC_MEDIA_ASSET),
      choices: () => repo.getMediaChoices(),
      update: () =>
        repo.updateMedia(model.STATIC_MEDIA_ASSET, 1, "archive", {}),
      upload: () => repo.uploadMedia(new Uint8Array(), "", null, {}),
      file: () => repo.readPrivateMedia(model.STATIC_MEDIA_VERSION),
    }[operation];
    await assert.rejects(run, /denied/);
    assert.equal(calls, 0);
  });
test("media metadata parser blocks HTML, missing alt, extra fields and unsafe generation", () => {
  const meta = { altText: "תיאור", caption: "", folder: "פיילוט" };
  assert.deepEqual(plain(model.mediaMetadata(meta)), meta);
  for (const v of [
    { ...meta, altText: "" },
    { ...meta, caption: "<script>" },
    { ...meta, folder: "a".repeat(81) },
    { ...meta, key: "secret" },
  ])
    assert.throws(() => model.mediaMetadata(v));
  for (const v of [0, "-1", "1e2", Infinity, 1.5])
    assert.throws(() => model.mediaGeneration(v));
});
test("media metadata action independently authorizes", async () => {
  let calls = 0;
  const action = createSourceLoader({
    mocks: {
      "@/cms/authorization": {
        requireCmsAdmin: async () => {
          throw Error("denied");
        },
      },
      "./repository": {
        updateMedia: async () => {
          calls++;
        },
      },
    },
  })("src/cms/media/actions.ts");
  assert.equal(
    (await action.mediaAction({ ok: true, message: "" }, new FormData())).ok,
    false,
  );
  assert.equal(calls, 0);
});
test("v2 content uses immutable version IDs and rejects paths or missing reference resolution", () => {
  const content = load("src/cms/content/pilot-model.ts"),
    base = load("src/cms/content/baseline.ts").pilotBaseline();
  const p = { ...base, schemaVersion: 2, images: [model.STATIC_MEDIA_VERSION] };
  assert.equal(content.validatePilotDraft(p).schemaVersion, 2);
  assert.throws(() => content.toPilotLanding(p));
  for (const value of [
    "/images/services/sofa-cleaning.png",
    "https://example.invalid/x",
    model.STATIC_MEDIA_VERSION + "?latest",
  ])
    assert.throws(() => content.validatePilotDraft({ ...p, images: [value] }));
});
test("media projection preserves role-specific immutable alt and uses only trusted delivery paths", () => {
  const resolve = load("src/cms/media/resolve.ts").resolveMediaProjection;
  const ref = {
    revision_id: "a0000000-0000-4000-8000-000000000001",
    media_version_id: model.STATIC_MEDIA_VERSION,
    usage_role: "hero",
    position: 0,
    alt_text: "תיאור בהקשר",
    caption: "",
    provider: "static",
    width: 1600,
    height: 1200,
  };
  assert.equal(resolve([ref], "admin")[0].src, model.STATIC_MEDIA_PATH);
  const local = {
    ...ref,
    media_version_id: "a1000000-0000-4000-8000-000000000001",
    provider: "local",
  };
  assert.equal(
    resolve([local], "admin")[0].src,
    `/admin/media/file/${local.media_version_id}`,
  );
  assert.equal(
    resolve([local], "public")[0].src,
    `/cms-media/${local.media_version_id}`,
  );
  assert.throws(() =>
    resolve([{ ...local, provider: "https://evil" }], "public"),
  );
});
test("admin content wording is environment-neutral", () => {
  for (const f of [
    "src/cms/content/ServiceEditor.tsx",
    "src/cms/content/actions.ts",
    "src/app/(admin)/admin/(protected)/page.tsx",
    "src/app/(admin)/admin/(protected)/services/page.tsx",
    "src/app/(admin)/admin/(protected)/services/delicate-upholstery-cleaning/page.tsx",
  ])
    assert.doesNotMatch(
      readFileSync(f, "utf8"),
      /בסביבה המקומית|לסביבה המקומית/,
    );
});

test("local storage uses exclusive private UUID files, integrity checks and rejects symlinks/traversal", async () => {
  const fs = await import("node:fs/promises"),
    { tmpdir } = await import("node:os"),
    { join } = await import("node:path");
  const dir = await fs.mkdtemp(join(tmpdir(), "cms-media-unit-"));
  try {
    const storage = createSourceLoader({
      env,
      mocks: { "node:os": { tmpdir: () => dir } },
    })("src/cms/media/local-storage.ts");
    const id = "a3000000-0000-4000-8000-000000000001",
      bytes = Buffer.from("validated fixture bytes"),
      hash = createHash("sha256").update(bytes).digest("hex");
    await storage.writeLocalImage(id, bytes);
    const root = join(dir, "cleanbrothers-cms-media-local"),
      file = join(root, `${id}.webp`);
    assert.equal((await fs.stat(root)).mode & 0o777, 0o700);
    assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
    assert.deepEqual(await storage.readLocalImage(id, hash), bytes);
    await assert.rejects(() => storage.writeLocalImage(id, bytes), /EEXIST/);
    await assert.rejects(
      () => storage.readLocalImage(id, "0".repeat(64)),
      /integrity/,
    );
    await assert.rejects(() => storage.writeLocalImage("../escape", bytes));
    await assert.rejects(() =>
      storage.writeLocalImage(
        "a3000000-0000-4000-8000-000000000002",
        Buffer.alloc(0),
      ),
    );
    const link = "a3000000-0000-4000-8000-000000000003";
    await fs.symlink(file, join(root, `${link}.webp`));
    await assert.rejects(() => storage.readLocalImage(link, hash));
    await fs.chmod(root, 0o755);
    await assert.rejects(() => storage.readLocalImage(id, hash), /Unsafe/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
test("bounded multipart parser rejects oversized declared and streamed bodies", async () => {
  const { boundedUploadForm } = load("src/cms/media/http.ts");
  const limit = model.MAX_IMAGE_BYTES + 64 * 1024;
  for (const length of [String(limit + 1), "abc", "-1"])
    await assert.rejects(() =>
      boundedUploadForm(
        new Request("http://localhost", {
          method: "POST",
          body: "x",
          headers: {
            "content-type": "multipart/form-data; boundary=x",
            "content-length": length,
          },
        }),
      ),
    );
  await assert.rejects(() =>
    boundedUploadForm(
      new Request("http://localhost", {
        method: "POST",
        body: Buffer.alloc(limit + 1),
        headers: { "content-type": "multipart/form-data; boundary=x" },
      }),
    ),
  );
  const data = new FormData();
  data.set("altText", "תמונה");
  const form = await boundedUploadForm(
    new Request("http://localhost", { method: "POST", body: data }),
  );
  assert.equal(form.get("altText"), "תמונה");
});
test("upload route authorizes before multipart consumption and enforces same-origin", async () => {
  let reads = 0,
    writes = 0;
  const mocks = {
    "@/cms/authorization": { requireCmsAdmin: async () => {} },
    "@/cms/media/http": {
      privateMediaHeaders: {},
      boundedUploadForm: async () => {
        reads++;
        throw Error();
      },
    },
    "@/cms/media/repository": {
      uploadMedia: async () => {
        writes++;
      },
    },
  };
  const route = "src/app/(admin)/admin/media/upload/route.ts";
  for (const origin of [
    "https://attacker.invalid",
    "http://localhost:56300",
    null,
  ]) {
    const headers = origin ? { origin } : {};
    const response = await createSourceLoader({ env, mocks })(route).POST(
      new Request("http://127.0.0.1:56300/admin/media/upload", {
        method: "POST",
        headers,
      }),
    );
    assert.equal(response.status, 403);
  }
  mocks["@/cms/authorization"] = {
    requireCmsAdmin: async () => {
      throw Error("denied");
    },
  };
  const response = await createSourceLoader({ env, mocks })(route).POST(
    new Request("http://127.0.0.1:56300/admin/media/upload", {
      method: "POST",
      headers: { origin: "http://127.0.0.1:56300" },
    }),
  );
  assert.equal(response.status, 403);
  assert.equal(reads, 0);
  assert.equal(writes, 0);
});
test("registration compensation deletes only a confirmed rejected new object; ambiguous failures preserve it", async () => {
  for (const code of ["PT409", "42501", "FETCH_ERROR"]) {
    let writes = 0,
      removals = 0;
    const repo = createSourceLoader({
      env: { ...env, CMS_MEDIA_LOCAL_SERVICE_KEY: "synthetic-local-key" },
      mocks: {
        "@/cms/authorization": {
          requireCmsAdmin: async () => ({
            userId: "a3000000-0000-4000-8000-000000000001",
          }),
        },
        "./validate-image": {
          validateImage: async () => ({
            bytes: Buffer.from("fixture"),
            contentHash: "a".repeat(64),
          }),
        },
        "./local-storage": {
          writeLocalImage: async () => {
            writes++;
          },
          discardUnregisteredImage: async () => {
            removals++;
          },
        },
        "@supabase/supabase-js": {
          createClient: () => ({ rpc: async () => ({ error: { code } }) }),
        },
      },
    })("src/cms/media/repository.ts");
    await assert.rejects(() =>
      repo.uploadMedia(new Uint8Array(), "a.jpg", "image/jpeg", {
        altText: "Alt",
        caption: "",
        folder: "",
      }),
    );
    assert.equal(writes, 1);
    assert.equal(removals, code === "FETCH_ERROR" ? 0 : 1);
  }
});

test("animated WebP is rejected before decoding", async () => {
  const single = await fixture("webp");
  const extended = Buffer.alloc(18);
  extended.write("VP8X");
  extended.writeUInt32LE(10, 4);
  extended[8] = 2;
  const b = Buffer.concat([
    single.subarray(0, 12),
    extended,
    single.subarray(12),
  ]);
  b.writeUInt32LE(b.length - 8, 4);
  await assert.rejects(() => validateImage(b, "animated.webp", "image/webp"));
});

test('private image responses carry no-store and noindex even without Proxy, including redirects and denials',async()=>{
 const path='src/app/(admin)/admin/media/file/[id]/route.ts';
 for(const [file,status] of [[{staticPath:model.STATIC_MEDIA_PATH},307],[{bytes:Buffer.from('image')},200],[null,404]]){
  const route=createSourceLoader({mocks:{'@/cms/media/repository':{readPrivateMedia:async()=>file}}})(path);
  const response=await route.GET(new Request('http://127.0.0.1:56300/admin/media/file/x'),{params:Promise.resolve({id:model.STATIC_MEDIA_VERSION})});
  assert.equal(response.status,status);assert.match(response.headers.get('cache-control'),/private.*no-store/);assert.match(response.headers.get('x-robots-tag'),/noindex/);
 }
});
