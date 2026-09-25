import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
// macOS sleep suspends Playwright and expires in-flight TOTP codes. Caffeinate
// establishes the idle-sleep assertion before starting Playwright; -u resets
// an already-expired idle timer. The assertion ends when Playwright exits.
const darwin = process.platform === "darwin";
const test = spawn(
  darwin ? "caffeinate" : process.execPath,
  [...(darwin ? ["-i", "-u", process.execPath] : []), cli, "test", ...process.argv.slice(2)], {
    stdio: "inherit",
  },
);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => test.kill(signal));
}

const result = await new Promise((resolve, reject) => {
  test.once("exit", (code, signal) => resolve({ code, signal }));
  test.once("error", reject);
});
process.exitCode = result.code ?? (result.signal ? 1 : 0);
