import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:56300",
    // Authentication artifacts would contain session credentials.
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: [{
    command: "node scripts/cms-test-server.mjs",
    url: "http://127.0.0.1:56300/admin/login",
    reuseExistingServer: false,
    timeout: 30_000,
  }, {
    command: "node scripts/cms-test-server.mjs --published",
    url: "http://127.0.0.1:56301/admin/login",
    reuseExistingServer: false,
    timeout: 120_000,
  }],
});
