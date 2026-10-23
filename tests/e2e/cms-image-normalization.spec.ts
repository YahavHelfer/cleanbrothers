import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import ts from "typescript";
import { createSourceLoader } from "../helpers/source-module.mjs";

const { validateImage } = createSourceLoader()("src/cms/media/validate-image.ts");
const compile = (path: string) => ts.transpileModule(readFileSync(resolve(path), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const script = `const model = (() => { const exports = {}; ${compile("src/cms/media/model.ts")} return exports; })();
(() => { const exports = {}; const require = () => model;
${compile("src/cms/media/prepare-upload-image.ts")}
window.prepareUploadImage = exports.prepareUploadImage; })();`;

async function prepare(page: Page, bytes: Buffer, type = "image/jpeg", maxBytes = 4 * 1024 * 1024) {
  return page.evaluate(async ({ bytes, type, maxBytes }) => {
    const input = new File([new Uint8Array(bytes)], type === "image/png" ? "photo.png" : "photo.jpeg", { type });
    const prepareImage = (window as unknown as {
      prepareUploadImage: (file: File, maxBytes: number) => Promise<File>;
    }).prepareUploadImage;
    try {
      const output = await prepareImage(input, maxBytes);
      return { bytes: Array.from(new Uint8Array(await output.arrayBuffer())),
        type: output.type, name: output.name, unchanged: output === input };
    } catch (error) { return { error: String(error) }; }
  }, { bytes: [...bytes], type, maxBytes });
}

test.beforeEach(async ({ page }) => {
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addScriptTag({ content: script });
});

test("browser prepares oriented JPEG pixels that pass the unchanged server validator", async ({ page }) => {
  const input = await sharp({ create: { width: 30, height: 20, channels: 3, background: "#159a92" } })
    .withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const output = await prepare(page, input);
  expect(output.error).toBeUndefined();
  const normalized = Buffer.from(output.bytes!);
  const result = await validateImage(normalized, output.name, output.type);
  expect([result.width, result.height]).toEqual([20, 30]);
  expect((await sharp(normalized).metadata()).exif).toBeUndefined();
});

test("browser removes auxiliary trailing JPEG data before strict server validation", async ({ page }) => {
  const primary = await sharp({ create: { width: 32, height: 24, channels: 3, background: "#224466" } }).jpeg().toBuffer();
  const input = Buffer.concat([primary, primary]);
  await expect(validateImage(input, "photo.jpeg", "image/jpeg")).rejects.toThrow();
  const output = await prepare(page, input);
  expect(output.error).toBeUndefined();
  const result = await validateImage(Buffer.from(output.bytes!), output.name, output.type);
  expect([result.width, result.height]).toEqual([32, 24]);
});

test("non-JPEG files retain server animation checks; invalid and oversized results fail", async ({ page }) => {
  const png = await sharp({ create: { width: 32, height: 24, channels: 4, background: "#22446680" } }).png().toBuffer();
  const output = await prepare(page, png, "image/png");
  expect(output.unchanged).toBe(true);
  expect(Buffer.from(output.bytes!)).toEqual(png);
  expect((await prepare(page, Buffer.from("invalid JPEG"))).error).toBeDefined();
  const jpeg = await sharp(png).jpeg().toBuffer();
  expect((await prepare(page, jpeg, "image/jpeg", 1)).error).toContain("גדולה מדי");
});
