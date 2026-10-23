import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "cms-image-normalization.spec.ts",
  workers: 1,
  reporter: "list",
  use: { trace: "off", screenshot: "off", video: "off" },
});
