import { spawn, spawnSync } from "node:child_process";
import { getLocalStack } from "./cms-local.mjs";

const { url, key, serviceKey } = getLocalStack();
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
      CMS_CONTENT_SERVICE_ALLOWLIST: "delicate-upholstery-cleaning" } : {}),
};
if (published) {
  const build = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], { env, stdio: "inherit" });
  if (build.status !== 0) process.exit(1);
}
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", published ? "56301" : "56300"], {
  stdio: "inherit", env,
});
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
