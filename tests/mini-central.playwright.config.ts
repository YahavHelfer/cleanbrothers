import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "cms-mini-central.spec.ts",
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], trace: "off", screenshot: "off", video: "off" },
  webServer: {
    cwd: process.cwd(),
    command: "node scripts/cms-test-server.mjs --published --webpack",
    url: "http://127.0.0.1:56301/admin/login",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
