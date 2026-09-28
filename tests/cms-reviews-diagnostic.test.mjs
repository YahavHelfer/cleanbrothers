import assert from "node:assert/strict";
import test from "node:test";
import { createSourceLoader } from "./helpers/source-module.mjs";

const load = createSourceLoader();
const { diagnosticTransportAllowed } = load("src/cms/reviews/diagnostic-transport.ts");
const alias = "cleanbrothers-git-feature-cms-c-061c94-yahavs-projects-6b5e850f.vercel.app";
const request = (headers, method = "POST") => new Request("https://internal.vercel.app/admin/diagnostics/google-reviews", {
  method, headers: { origin: `https://${alias}`, "sec-fetch-site": "same-origin",
    "x-forwarded-host": alias, "x-forwarded-proto": "https", host: "internal.vercel.app", ...headers },
});

test("temporary diagnostic accepts only same-origin POST through the approved forwarded host", () => {
  assert.equal(diagnosticTransportAllowed(request({})), true);
  assert.equal(diagnosticTransportAllowed(request({ "x-forwarded-host": "internal.vercel.app" })), true);
  assert.equal(diagnosticTransportAllowed(request({ origin: "https://attacker.example" })), false);
  assert.equal(diagnosticTransportAllowed(request({ "sec-fetch-site": "cross-site" })), false);
  assert.equal(diagnosticTransportAllowed(request({ origin: "null" })), false);
  assert.equal(diagnosticTransportAllowed(request({ "x-forwarded-proto": "http" })), false);
  assert.equal(diagnosticTransportAllowed(request({}, "GET")), false);
});

const preview = {
  VERCEL: "1", VERCEL_ENV: "preview", VERCEL_PROJECT_ID: "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
  VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation",
  CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co",
};
test("temporary diagnostic inherits exact Preview identity and fails closed in Production or another branch", () => {
  const allowed = env => createSourceLoader({ env })("src/cms/pages/environment.ts").approvedPagePreview();
  assert.equal(allowed(preview), true);
  assert.equal(allowed({ ...preview, VERCEL_ENV: "production" }), false);
  assert.equal(allowed({ ...preview, VERCEL_GIT_COMMIT_REF: "main" }), false);
  assert.equal(allowed({ ...preview, VERCEL_PROJECT_ID: "wrong" }), false);
  assert.equal(allowed({ ...preview, CMS_SUPABASE_URL: "https://other.supabase.co" }), false);
});
