import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { File } from "node:buffer";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createSourceLoader } from "./helpers/source-module.mjs";

function browser({ width = 30, height = 20, decodeError = false, encoded = new Blob(["encoded"], { type: "image/jpeg" }) } = {}) {
  const released = [], canvas = { width: 0, height: 0,
    getContext: () => ({ drawImage() {} }), toBlob: callback => callback(encoded) };
  const exports = {};
  const code = ts.transpileModule(readFileSync("src/cms/media/prepare-upload-image.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, File, Blob,
    require: () => createSourceLoader()("src/cms/media/model.ts"),
    URL: { createObjectURL: () => "blob:fixture", revokeObjectURL: url => released.push(url) },
    Image: class { naturalWidth = width; naturalHeight = height;
      async decode() { if (decodeError) throw new Error("decode failed"); } },
    document: { createElement: () => canvas },
  });
  return { prepare: exports.prepareUploadImage, released, canvas };
}

test("preparation releases image memory and retains JPEG filename, MIME and modification time", async () => {
  const { prepare, released, canvas } = browser();
  const input = new File(["input"], "IMG_4837.jpeg", { type: "image/jpeg", lastModified: 123 });
  const output = await prepare(input, 4096);
  assert.equal(await output.text(), "encoded");
  assert.equal(output.name, input.name);
  assert.equal(output.type, input.type);
  assert.equal(output.lastModified, 123);
  assert.deepEqual(released, ["blob:fixture"]);
  assert.equal(canvas.width, 0);
  assert.equal(canvas.height, 0);
});

test("PNG and WebP bypass preparation so server animation and container validation remain authoritative", async () => {
  for (const type of ["image/png", "image/webp"]) {
    const { prepare, released } = browser();
    const input = new File(["input"], "photo", { type });
    assert.equal(await prepare(input, 4096), input);
    assert.equal(released.length, 0);
  }
});

for (const options of [{ decodeError: true }, { width: 6001 }, { width: 5000, height: 4000 },
  { encoded: null }, { encoded: new Blob(["invalid"], { type: "image/png" }) },
  { encoded: new Blob([Buffer.alloc(4097)], { type: "image/jpeg" }) }]) {
  test(`failed preparation releases resources and never returns an upload: ${JSON.stringify(options)}`, async () => {
    const { prepare, released, canvas } = browser(options);
    await assert.rejects(() => prepare(new File(["input"], "photo.jpeg", { type: "image/jpeg" }), 4096));
    assert.deepEqual(released, ["blob:fixture"]);
    assert.equal(canvas.width, 0);
    assert.equal(canvas.height, 0);
  });
}
