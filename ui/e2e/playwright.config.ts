import { defineConfig } from "@playwright/test";
import { baseURL, projectRoot, runtimeDir } from "./support/env";

/**
 * The suite never downloads browsers: it drives the system Chrome through the
 * `chrome` channel by default (see e2e-test-coding / e2e-test-run skills).
 */
const channel = process.env.HALO_E2E_CHANNEL || "chrome";

const hasRunningInstance = Boolean(process.env.HALO_E2E_BASE_URL);

export default defineConfig({
  testDir: ".",
  testMatch: ["api/**/*.spec.ts", "ui/**/*.spec.ts"],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "build/report", open: "never" }],
  ],
  outputDir: "build/test-results",
  use: {
    baseURL,
    channel,
    trace: "retain-on-failure",
    video: "off",
    screenshot: "only-on-failure",
    locale: "zh-CN",
    timezoneId: "UTC",
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
  webServer: hasRunningInstance
    ? undefined
    : {
        command: "node scripts/prepare-halo.mjs",
        url: `${baseURL.replace(/\/$/, "")}/actuator/health/readiness`,
        cwd: projectRoot,
        reuseExistingServer: true,
        timeout: Number(process.env.HALO_E2E_BOOT_TIMEOUT_MS || 240_000),
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          HALO_E2E_RUNTIME_DIR: runtimeDir,
          HALO_E2E_PORT: String(new URL(baseURL).port || "8090"),
        },
      },
  projects: [
    {
      name: "api",
      testMatch: ["api/**/*.spec.ts"],
      use: {
        extraHTTPHeaders: { Accept: "application/json" },
        ...(hasRunningInstance
          ? {}
          : {
              // Container-based environments run Chrome as root.
              launchOptions: { args: ["--no-sandbox"] },
            }),
      },
    },
    {
      name: "ui",
      testMatch: ["ui/**/*.spec.ts"],
      use: {
        ...(hasRunningInstance
          ? {}
          : {
              launchOptions: { args: ["--no-sandbox"] },
            }),
      },
    },
  ],
});
