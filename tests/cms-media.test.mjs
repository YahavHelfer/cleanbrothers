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
    "src/app/(admin)/admin/(protected)/services/[serviceKey]/page.tsx",
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

const cloudEnv = {
  CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co",
  CMS_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_test_only",
  CMS_MEDIA_PREVIEW_ENABLED: "1",
  VERCEL: "1", VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation",
  CMS_PILOT_CONTENT_SOURCE: "published",
  CMS_CONTENT_SERVICE_ALLOWLIST: "delicate-upholstery-cleaning",
};
const previewOrigin = "https://cleanbrothers-git-feature-cms-c-061c94-yahavs-projects-6b5e850f.vercel.app";
test("cloud media requires every Preview, project, branch and allowlist condition", () => {
  const enabled = createSourceLoader({env:cloudEnv})("src/cms/media/environment.ts");
  assert.equal(enabled.mediaEnabled(),true);
  assert.doesNotThrow(()=>enabled.requireMediaEnvironment());
  assert.throws(()=>enabled.requireLocalMediaEnvironment());
  for(const key of Object.keys(cloudEnv).filter(k=>k!=="CMS_SUPABASE_PUBLISHABLE_KEY")) {
    const loaded = createSourceLoader({env:{...cloudEnv,[key]:"wrong"}})("src/cms/media/environment.ts");
    assert.equal(loaded.mediaEnabled(),false,key);
    assert.throws(()=>loaded.requireCloudMediaEnvironment());
  }
  for(const extra of [{VERCEL_ENV:"production"},{VERCEL_GIT_COMMIT_REF:"main"},{CMS_MEDIA_LOCAL_ENABLED:"1",CMS_SUPABASE_URL:env.CMS_SUPABASE_URL}]) {
    assert.equal(createSourceLoader({env:{...cloudEnv,...extra}})("src/cms/media/environment.ts").mediaEnabled(),false);
  }
});
test("cloud upload accepts only exact stable Preview Origin and Host", () => {
  const {mediaUploadOriginAllowed:allowed}=createSourceLoader({env:cloudEnv})("src/cms/media/environment.ts");
  const make=(origin,host)=>new Request(previewOrigin+"/admin/media/upload",{method:"POST",headers:{origin,host,"x-forwarded-host":new URL(previewOrigin).host}});
  assert.equal(allowed(make(previewOrigin,new URL(previewOrigin).host)),true);
  for(const origin of ["http://"+new URL(previewOrigin).host,previewOrigin+".attacker.invalid","https://www.cleanbrothers.co.il","http://127.0.0.1:56300","null",""])
    assert.equal(allowed(make(origin,new URL(previewOrigin).host)),false);
  assert.equal(allowed(make(previewOrigin,"attacker.invalid")),false);
});
test("Preview cannot use local filesystem storage even with the local flag", async()=>{
  const storage=createSourceLoader({env:{...cloudEnv,CMS_MEDIA_LOCAL_ENABLED:"1"}})("src/cms/media/local-storage.ts");
  await assert.rejects(()=>storage.writeLocalImage("a3000000-0000-4000-8000-000000000001",Buffer.from("x")),/Local CMS/);
});
test("trusted media credentials are selected server-side only after the environment gate",async()=>{
  const calls=[];
  const mocks={"@supabase/supabase-js":{createClient:(url,key,options)=>{calls.push({url,key,options});return {};}}};
  createSourceLoader({env:{...cloudEnv,CMS_MEDIA_SERVER_KEY:"synthetic-server-key",CMS_MEDIA_LOCAL_SERVICE_KEY:"wrong-local-key"},mocks})("src/cms/media/trusted-client.ts").createTrustedMediaClient();
  assert.equal(calls.length,1);assert.equal(calls[0].key,"synthetic-server-key");
  assert.equal(calls[0].options.auth.persistSession,false);
  let request;
  const loaded=createSourceLoader({env:{...cloudEnv,CMS_MEDIA_SERVER_KEY:"synthetic-server-key"},mocks,fetchImpl:async(input,init)=>{request={input,init};return new Response();}})("src/cms/media/trusted-client.ts");
  loaded.createTrustedMediaClient();await calls[1].options.global.fetch("https://example.invalid");
  assert.equal(request.init.cache,"no-store");assert.equal(request.init.redirect,"error");
  for(const e of [{...cloudEnv}, {...cloudEnv,VERCEL_ENV:"production",CMS_MEDIA_SERVER_KEY:"synthetic"}])
    assert.throws(()=>createSourceLoader({env:e,mocks})("src/cms/media/trusted-client.ts").createTrustedMediaClient());
  assert.equal(calls.length,2);
});
test("cloud storage uses only the private fixed bucket and generated immutable WebP path",async()=>{
  const calls=[];const id="a3000000-0000-4000-8000-000000000001",bytes=Buffer.from("validated fixture");
  const api={upload:async(...args)=>{calls.push(args);return {error:null};},download:async(path)=>{calls.push(path);return {data:new Blob([bytes]),error:null};},remove:async(paths)=>{calls.push(paths);return {error:null};}};
  const loaded=createSourceLoader({env:cloudEnv,mocks:{"./trusted-client":{createTrustedMediaClient:()=>({storage:{from:bucket=>{assert.equal(bucket,"cms-media-preview");return api;}}})}}})("src/cms/media/cloud-storage.ts");
  await loaded.writeCloudImage(id,bytes);
  assert.equal(calls[0][0],id+".webp");assert.equal(calls[0][2].upsert,false);assert.equal(calls[0][2].contentType,"image/webp");assert.equal(calls[0][2].cacheControl,"0");
  assert.deepEqual(Buffer.from(await loaded.readCloudImage(id,createHash("sha256").update(bytes).digest("hex"))),bytes);
  await assert.rejects(()=>loaded.readCloudImage(id,"a".repeat(64)));
  const n=calls.length;
  for(const bad of ["../photo",id+"/../photo",id+"?token=x","Ｐｈｏｔｏ"])
    await assert.rejects(()=>loaded.writeCloudImage(bad,bytes));
  await assert.rejects(()=>loaded.writeCloudImage(id,Buffer.alloc(model.MAX_IMAGE_BYTES+1)));
  assert.equal(calls.length,n);
  await loaded.discardUnregisteredCloudImage(id);assert.deepEqual(plain(calls.at(-1)),[id+".webp"]);
});
test("cloud delivery rejects missing, oversized and corrupted objects without exposing upstream errors",async()=>{
  for(const result of [{error:{message:"upstream private details"}}, {data:{size:model.MAX_IMAGE_BYTES+1}}, {data:new Blob([])}, {data:new Blob(["bad bytes"])}]) {
    const loaded=createSourceLoader({env:cloudEnv,mocks:{"./trusted-client":{createTrustedMediaClient:()=>({storage:{from:()=>({download:async()=>result})}})}}})("src/cms/media/cloud-storage.ts");
    await assert.rejects(()=>loaded.readCloudImage(model.STATIC_MEDIA_VERSION,"a".repeat(64)),e=>e.name==="Error"&&!e.message.includes("upstream"));
  }
});
test("cloud upload authorizes, validates, writes and registers with actor attribution; compensates only definite failures",async()=>{
  for(const code of [null,"PT409","42501","FETCH_ERROR"]){
    const calls=[];let removed=0;
    const repo=createSourceLoader({env:cloudEnv,mocks:{
      "@/cms/authorization":{requireCmsAdmin:async()=>{calls.push("auth");return {userId:model.STATIC_MEDIA_ASSET};}},
      "./validate-image":{validateImage:async()=>{calls.push("validate");return {bytes:Buffer.from("fixture"),contentHash:"a".repeat(64)};}},
      "./trusted-client":{createTrustedMediaClient:()=>({rpc:async(name,args)=>{calls.push("register");assert.equal(name,"cms_register_preview_media_version");assert.equal(args.actor,model.STATIC_MEDIA_ASSET);assert.match(args.version_id,/^[0-9a-f-]{36}$/);return {data:model.STATIC_MEDIA_ASSET,error:code?{code}:null};}})},
      "./cloud-storage":{writeCloudImage:async()=>{calls.push("write");},discardUnregisteredCloudImage:async()=>{removed++;}},
      "./local-storage":{writeLocalImage:async()=>{throw Error("must never use Vercel disk");}},
    }})("src/cms/media/repository.ts");
    const run=()=>repo.uploadMedia(new Uint8Array(),"image.jpg","image/jpeg",{altText:"Alt",caption:"",folder:""});
    if(code)await assert.rejects(run);else assert.equal(await run(),model.STATIC_MEDIA_ASSET);
    assert.deepEqual(calls,["auth","validate","write","register"]);
    assert.equal(removed,["PT409","42501"].includes(code)?1:0);
  }
});
test("cloud media versions resolve to same-origin routes without signed URLs or raw Storage paths",()=>{
  const resolve=load("src/cms/media/resolve.ts").resolveMediaProjection;
  const row={media_version_id:"a3000000-0000-4000-8000-000000000001",usage_role:"hero",position:0,alt_text:"Alt",provider:"supabase"};
  assert.equal(resolve([row],"admin")[0].src,"/admin/media/file/"+row.media_version_id);
  assert.equal(resolve([row],"public")[0].src,"/cms-media/"+row.media_version_id);
});
test("Preview public image route never downloads draft objects and disables caching",async()=>{
  const id="a3000000-0000-4000-8000-000000000001";
  for(const published of [false,true]){
    let reads=0;
    const route=createSourceLoader({env:cloudEnv,mocks:{
      "@supabase/supabase-js":{createClient:()=>({rpc:async(name,args)=>{assert.equal(name,"cms_read_public_media_version");assert.equal(args.target_version,id);return {data:published?{id,storage_provider:"supabase",serviceKeys:["delicate-upholstery-cleaning"]}:null,error:null};}})},
      "@/cms/media/repository":{mediaBytes:async()=>{reads++;return {bytes:Buffer.from("fixture")};}},
    }})("src/app/cms-media/[id]/route.ts");
    const response=await route.GET(new Request(previewOrigin+"/cms-media/"+id),{params:Promise.resolve({id})});
    assert.equal(response.status,published?200:404);assert.equal(reads,published?1:0);
    assert.match(response.headers.get("cache-control"),/private.*no-store/);assert.match(response.headers.get("x-robots-tag"),/noindex/);
  }
});

test("Preview payload limit reserves Vercel multipart margin and rejects oversized normalized output before Storage",async()=>{
  assert.equal(createSourceLoader({env:cloudEnv})("src/cms/media/environment.ts").mediaByteLimit(),4*1024*1024);
  assert.equal(load("src/cms/media/environment.ts").mediaByteLimit(),8*1024*1024);
  const parser=createSourceLoader({env:cloudEnv})("src/cms/media/http.ts").boundedUploadForm;
  await assert.rejects(()=>parser(new Request(previewOrigin,{method:"POST",body:"x",headers:{"content-type":"multipart/form-data; boundary=x","content-length":String(4*1024*1024+64*1024+1)}})),e=>e.status===413);
  let validated=0,writes=0;
  const repo=createSourceLoader({env:cloudEnv,mocks:{
    "@/cms/authorization":{requireCmsAdmin:async()=>({userId:model.STATIC_MEDIA_ASSET})},
    "./validate-image":{validateImage:async()=>{validated++;return {bytes:Buffer.alloc(4*1024*1024+1)};}},
    "./trusted-client":{createTrustedMediaClient:()=>{writes++;throw Error("unexpected");}},
  }})("src/cms/media/repository.ts");
  const meta={altText:"Alt",caption:"",folder:""};
  await assert.rejects(()=>repo.uploadMedia(Buffer.alloc(4*1024*1024+1),"x.png","image/png",meta),e=>e.status===413);assert.equal(validated,0);
  await assert.rejects(()=>repo.uploadMedia(Buffer.from("small"),"x.png","image/png",meta),e=>e.status===413);assert.equal(validated,1);assert.equal(writes,0);
});

test("Preview media stays enabled through each explicit one-service rollout step", () => {
 const keys=createSourceLoader()("src/content/service-registry.ts").sharedServiceKeys;
 const ordered=["delicate-upholstery-cleaning",...keys.filter(key=>key!=="delicate-upholstery-cleaning")];
 for(let count=1;count<=ordered.length;count++) {
  const allowlist=ordered.slice(0,count);
  const load=createSourceLoader({env:{...cloudEnv,CMS_CONTENT_SERVICE_ALLOWLIST:allowlist.join(",")}});
  const media=load("src/cms/media/environment.ts"),content=load("src/cms/content/environment.ts");
  assert.equal(media.mediaCloudEnabled(),true);
  assert.doesNotThrow(()=>media.requireCloudMediaEnvironment());
  for(const key of ordered)assert.equal(content.usesCmsSource(key),allowlist.includes(key));
  for(const key of ["window-cleaning","air-conditioner-cleaning"])assert.equal(content.usesCmsSource(key),false);
 }
});

test("multi-service Preview media retains every environment and strict allowlist guard", () => {
 const base={...cloudEnv,CMS_CONTENT_SERVICE_ALLOWLIST:"delicate-upholstery-cleaning,sofa-cleaning"};
 const invalid=[...Object.keys(base).filter(key=>key!=="CMS_SUPABASE_PUBLISHABLE_KEY").map(key=>({[key]:"wrong"})),
  {VERCEL_ENV:"production"},{VERCEL_GIT_COMMIT_REF:"main"},{CMS_MEDIA_LOCAL_ENABLED:"1",CMS_SUPABASE_URL:env.CMS_SUPABASE_URL},
  ...["*","sofa-cleaning,*","sofa-cleaning,sofa-cleaning","sofa-cleaning,unknown-service","sofa-cleaning,",""].map(CMS_CONTENT_SERVICE_ALLOWLIST=>({CMS_CONTENT_SERVICE_ALLOWLIST}))];
 for(const invalidEnv of invalid) {
  const media=createSourceLoader({env:{...base,...invalidEnv}})("src/cms/media/environment.ts");
  assert.equal(media.mediaCloudEnabled(),false);
  assert.throws(()=>media.requireCloudMediaEnvironment());
 }
});
