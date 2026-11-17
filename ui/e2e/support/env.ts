import path from "node:path";
import { fileURLToPath } from "node:url";

/** ui/e2e */
export const projectRoot =
  process.env.HALO_E2E_PROJECT_ROOT ||
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Repository root (the Halo monorepo checkout). */
export const repoRoot = path.resolve(projectRoot, "..", "..");

export const baseURL =
  process.env.HALO_E2E_BASE_URL?.replace(/\/+$/, "") ||
  `http://127.0.0.1:${process.env.HALO_E2E_PORT || "8090"}`;

/** Scratch directory of the booted instance (H2 database + work dir). */
export const runtimeDir =
  process.env.HALO_E2E_RUNTIME_DIR ||
  path.join(projectRoot, "build", ".e2e-runtime");

export const consoleLocale = process.env.HALO_E2E_CONSOLE_LOCALE || "zh-CN";

export const bootTimeoutMs = Number(
  process.env.HALO_E2E_BOOT_TIMEOUT_MS || 240_000
);

/** Locale file used by the copy assertions (only zh-CN is asserted in this suite). */
export const localeFile = path.join(repoRoot, "ui", "src", "locales", "zh-CN.json");

export const openApiConsoleFile =
  process.env.HALO_E2E_OPENAPI_CONSOLE ||
  path.join(repoRoot, "api-docs", "openapi", "v3_0", "apis_console.api_v1alpha1.json");

export const openApiUcFile =
  process.env.HALO_E2E_OPENAPI_UC ||
  path.join(repoRoot, "api-docs", "openapi", "v3_0", "apis_uc.api_v1alpha1.json");
