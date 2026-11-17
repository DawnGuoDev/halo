# Halo Console E2E

Browser and API end-to-end tests for the console **article favorites** feature
(`/console/posts` star + 收藏 filter). The suite drives a real Halo instance and
a real browser: nothing about authentication, persistence or paging is mocked.

## Layout

```text
ui/e2e/
  api/       HTTP-level E2E: contract, RBAC, idempotency, isolation, lifecycle
  ui/        Browser E2E: star interaction, filter, empty states, paging, a11y
  pages/     Page object (accessible selectors: role/aria/label/URL)
  support/   env, Halo API client, seed helpers, console session, i18n copy
  scripts/   prepare-halo.mjs — boots a disposable Halo for the run
```

This directory is a standalone pnpm/npm project; it is **not** part of the
`ui/` workspace build and adds no dependency to the application bundle.

## Prerequisites

- Node.js 20+ and the system **Google Chrome** (`channel: chrome`). No browser
  is downloaded by this suite; set `HALO_E2E_CHANNEL=chromium` to use a managed
  build if one is installed for CI.
- JDK 21 for `./gradlew :application:bootJar` (only needed when no instance is
  already running).

## Run

```bash
cd ui/e2e
npm install                    # installs @playwright/test only (no browsers)
npm test                       # boots Halo (Gradle jar), then runs API + UI specs
npm run test:api               # API project only
npm run test:ui                # browser project only
npm run report                 # opens build/report (HTML)
```

Environment (see `.env.e2e.example`):

| Variable | Default | Meaning |
| --- | --- | --- |
| `HALO_E2E_BASE_URL` | *(booted on :8090)* | Point at an already running instance instead of starting one |
| `HALO_E2E_CHANNEL` | `chrome` | Playwright browser channel |
| `HALO_E2E_RUNTIME_DIR` | `build/.e2e-runtime` | Work dir + H2 database + owner credentials |
| `HALO_E2E_BOOT_TIMEOUT_MS` | `240000` | Boot timeout |
| `HALO_E2E_CONSOLE_LOCALE` | `zh-CN` | Console locale used by the copy assertions |

The owner account is created by the harness and written to
`build/.e2e-runtime/owner.json`; spec users and posts are created through the
HTTP API with a per-test scope prefix (`e2e-fav-…`). Delete
`build/.e2e-runtime` to start from a fresh database.

## Coverage

See [`COVERAGE.md`](./COVERAGE.md) for the requirement ↔ test matrix, the
explicitly out-of-scope checks and the known data-driven caveats.
