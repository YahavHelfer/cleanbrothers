import { spawn, spawnSync } from "node:child_process";
import { getLocalStack, localSql } from "./cms-local.mjs";

async function readyLocalStack() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const stack = getLocalStack(); // Verifies the unlinked local project and endpoint.
      const responses = await Promise.all(["/auth/v1/health", "/auth/v1/settings", "/rest/v1/"]
        .map((path) => fetch(stack.url + path, { signal: AbortSignal.timeout(2_000) })));
      if (responses.every((response) => response.ok) &&
          Number(localSql("select count(*) from supabase_migrations.schema_migrations")) >= 9) {
        return stack;
      }
    } catch {
      // The isolated stack can report ports before Auth, REST or migrations are ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Isolated local CMS services are not ready");
}

const { url, key, serviceKey } = await readyLocalStack();
const published = process.argv.includes("--published");
// An explicit environment prevents unrelated CRM/cloud credentials from being
// inherited by the isolated browser-test server. The local service key stays in
// server-only media registration; it is never prefixed NEXT_PUBLIC or sent to a page.
const env = {
    PATH: process.env.PATH,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    CMS_SUPABASE_URL: url,
    CMS_MEDIA_LOCAL_ENABLED: "1",
    CMS_MEDIA_LOCAL_SERVICE_KEY: serviceKey,
    TMPDIR: process.env.TMPDIR,
    CMS_SUPABASE_PUBLISHABLE_KEY: key,
    ...(published ? { CMS_CONTENT_TEST_BUILD: "1", CMS_PILOT_CONTENT_SOURCE: "published",
      CMS_NEW_PAGE_SOURCE: "published",
      CMS_NEW_PAGE_ALLOWLIST: "cms-test-page,cms-test-renamed,cms-test-final,cms-test-copy",
      CMS_CONTENT_SERVICE_ALLOWLIST: "sofa-cleaning,mattress-cleaning,carpet-cleaning,car-upholstery-cleaning,armchair-chair-cleaning,delicate-upholstery-cleaning,air-conditioner-cleaning,window-cleaning" } : {}),
};
if (published) {
  const build = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], { env, stdio: "inherit" });
  if (build.status !== 0) process.exit(1);
}
await readyLocalStack();
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", published ? "56301" : "56300"], {
  stdio: "inherit", env,
});
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
