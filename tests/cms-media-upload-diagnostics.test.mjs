import assert from "node:assert/strict";
import test from "node:test";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";

test("upload failures identify the broken boundary and log only allowlisted diagnostics", async () => {
  const logs = [];
  const load = createSourceLoader({ mocks: { "node:console": { error: (...args) => logs.push(args) } } });
  const { mediaUploadStep, reportMediaUploadFailure } = load("src/cms/media/upload-diagnostics.ts");
  const { MediaError } = load("src/cms/media/model.ts");
  const provider = new MediaError(undefined, 400, "42501");
  provider.details = "private filename and credentials";
  let failure;
  try { await mediaUploadStep("prepare", async () => { throw provider; }); }
  catch (error) { failure = error; }
  assert.ok(failure instanceof MediaError);
  assert.match(failure.message, /להכין/);
  assert.equal(failure.status, 400);
  reportMediaUploadFailure(failure, "test-reference");
  assert.deepEqual(plain(logs), [["cms_media_upload_failed", {
    reference: "test-reference", stage: "prepare", code: "42501",
  }]]);
  assert.doesNotMatch(JSON.stringify(logs), /private|credentials/);
});

test("specific validation and uncertain-write messages and status survive diagnostics", async () => {
  const load = createSourceLoader();
  const { mediaUploadStep } = load("src/cms/media/upload-diagnostics.ts");
  const { MediaError } = load("src/cms/media/model.ts");
  for (const [stage, message, status] of [["image", "הקובץ גדול מדי.", 413],
    ["storage", "מצב ההעלאה אינו ודאי.", 400], ["register", "מצב העריכה השתנה.", 409]]) {
    await assert.rejects(() => mediaUploadStep(stage, async () => { throw new MediaError(message, status); }),
      error => error.message === message && error.status === status && error.stage === stage);
  }
});

test("diagnostics redact arbitrary provider fields and preserve successful upload results", async () => {
  const logs = [];
  const load = createSourceLoader({ mocks: { "node:console": { error: (...args) => logs.push(args) } } });
  const { mediaUploadStep, reportMediaUploadFailure } = load("src/cms/media/upload-diagnostics.ts");
  assert.equal(await mediaUploadStep("register", async () => "asset-id"), "asset-id");
  try { await mediaUploadStep("storage", async () => { throw { code: "https://secret.example/token", message: "secret" }; }); }
  catch (error) {
    assert.equal(error.status, 500);
    assert.doesNotMatch(error.message, /secret/);
    reportMediaUploadFailure(error, "reference");
  }
  assert.equal(logs[0][1].code, "unavailable");
  assert.doesNotMatch(JSON.stringify(logs), /secret/);
});
