import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1] || "birthsite-B-1";
const basePath = process.env.PAGES_BASE_PATH ??
  (repository.endsWith(".github.io") ? "" : `/${repository}`);
process.env.BIRTHSITE_TEST_HOME = `${basePath}/`;

export default defineConfig({
  testDir: "./tests",
  testMatch: ["birthday.spec.ts", "pages.spec.ts"],
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3103",
    ...devices["Desktop Chrome"],
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node scripts/serve-pages.mjs",
    url: `http://127.0.0.1:3103${basePath}/`,
    reuseExistingServer: false,
    env: { PAGES_BASE_PATH: basePath },
  },
});
