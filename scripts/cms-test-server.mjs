import { spawn } from "node:child_process";
import { getLocalStack } from "./cms-local.mjs";

const { url, key } = getLocalStack();
// An explicit environment prevents unrelated CRM/cloud credentials from being
// inherited by the isolated browser-test server. Only the publishable key enters.
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "56300"], {
  stdio: "inherit",
  env: {
    PATH: process.env.PATH,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    CMS_SUPABASE_URL: url,
    CMS_SUPABASE_PUBLISHABLE_KEY: key,
  },
});
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
