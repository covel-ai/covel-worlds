import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/setup.ts",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { browserName: "chromium", locale: "en-US", trace: "retain-on-failure" },
  reporter: "list",
});
