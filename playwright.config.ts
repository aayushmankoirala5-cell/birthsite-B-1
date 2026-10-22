import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3102";
// Generated for this test run, never saved to disk. Workers inherit the same values.
process.env.BIRTHSITE_TEST_ADMIN_PASSWORD ??= randomBytes(24).toString("hex");
process.env.BIRTHSITE_TEST_SESSION_SECRET ??= randomBytes(32).toString("hex");
process.env.BIRTHSITE_TEST_BASE_URL = baseURL;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3102",
    url: `${baseURL}/api/admin/session`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ADMIN_PASSWORD: process.env.BIRTHSITE_TEST_ADMIN_PASSWORD,
      ADMIN_SESSION_SECRET: process.env.BIRTHSITE_TEST_SESSION_SECRET,
      // Never use an inherited production database for destructive API checks.
      DATABASE_URL: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
