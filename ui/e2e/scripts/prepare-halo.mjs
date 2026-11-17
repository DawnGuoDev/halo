#!/usr/bin/env node
/**
 * Boots a disposable Halo instance for the E2E suite.
 *
 *  - builds the runnable jar (`:application:bootJar`) when it is missing;
 *  - starts it on a scratch work dir, an H2 file database and a random session secret;
 *  - performs the first-run setup on a fresh database and persists the owner
 *    credentials to `build/.e2e-runtime/owner.json` for the specs.
 *
 * The specs create their own users, roles and posts through the real HTTP API,
 * so this script seeds nothing but the owner account. Nothing is downloaded:
 * the jar comes from the local Gradle build, and the browser is the system
 * Chrome selected by playwright.config.ts.
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");

const port = Number(process.env.HALO_E2E_PORT || 8090);
const baseURL = (process.env.HALO_E2E_BASE_URL || `http://127.0.0.1:${port}`).replace(/\/+$/, "");
const runtimeDir = process.env.HALO_E2E_RUNTIME_DIR || path.join(projectRoot, "build", ".e2e-runtime");
const bootTimeoutMs = Number(process.env.HALO_E2E_BOOT_TIMEOUT_MS || 240_000);

const owner = {
  username: "e2e-owner",
  password: `E2eOwner-${randomBytes(8).toString("hex")}!`,
  email: "e2e-owner@example.com",
};

const libDir = path.join(repoRoot, "application", "build", "libs");
const workDir = path.join(runtimeDir, "workdir");
const dbFile = path.join(runtimeDir, "halo-e2e-db");
const logFile = path.join(runtimeDir, "halo-e2e.log");
const ownerFile = path.join(runtimeDir, "owner.json");
const setupMarker = path.join(runtimeDir, ".setup-complete");
const ownerFileCandidates = [
  ownerFile,
  path.join(runtimeDir, "workdir", "owner.json"),
];

function log(message) {
  process.stdout.write(`[prepare-halo] ${message}\n`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findBootJar() {
  if (!fs.existsSync(libDir)) {
    return undefined;
  }
  return fs
    .readdirSync(libDir)
    .filter(
      (name) =>
        name.endsWith(".jar") &&
        !name.endsWith("-plain.jar") &&
        !name.endsWith("-sources.jar") &&
        !name.endsWith("-javadoc.jar")
    )
    .map((name) => path.join(libDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
}

function buildJar() {
  log("building :application:bootJar (first run only, this takes a few minutes)");
  const result = spawnSync(
    process.platform === "win32" ? "gradlew.bat" : "./gradlew",
    [":application:bootJar", "downloadPluginPresets", "-x", "spotlessCheck", "-x", "spotlessApply", "-x", ":ui:doBuild"],
    { cwd: repoRoot, stdio: "inherit", env: process.env }
  );
  if (result.status !== 0) {
    throw new Error(`:application:bootJar failed with exit code ${result.status}`);
  }
}

async function waitFor(check, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(1000);
  }
  throw new Error(
    `timed out after ${timeoutMs}ms waiting for ${label}${lastError ? `: ${lastError.message}` : ""}`,
  );
}

async function request(pathname, init = {}) {
  return fetch(`${baseURL}${pathname}`, {
    redirect: "manual",
    ...init,
    headers: { Accept: "application/json", ...(init.headers || {}) },
  });
}

function start(jar) {
  fs.mkdirSync(workDir, { recursive: true });
  log(`starting ${path.basename(jar)} on ${baseURL}`);
  const out = fs.openSync(logFile, "a");
  const child = spawn(
    "java",
    [
      "-Xmx1g",
      `-Dserver.port=${port}`,
      `-Dhalo.work-dir=${workDir}`,
      "-Dspring.r2dbc.url=r2dbc:h2:file:" + dbFile + ";DB_CLOSE_ON_EXIT=FALSE",
      "-Dspring.r2dbc.username=sa",
      "-Dspring.r2dbc.password=",
      `-Dhalo.external-url=${process.env.HALO_E2E_EXTERNAL_URL || baseURL}`,
      "-Dhalo.use-absolute-permalink=false",
      `-Dspring.security.remember-me.key=${randomBytes(16).toString("hex")}`,
      ...(process.env.HALO_E2E_JAVA_OPTS || "").split(" ").filter(Boolean),
      "-jar",
      jar,
    ],
    { stdio: ["ignore", out, out], env: process.env },
  );
  return child;
}

async function runSetup() {
  const existing = ownerFileCandidates.find((file) => fs.existsSync(file));
  if (fs.existsSync(setupMarker) && existing) {
    log("setup already done for this runtime dir, reusing the owner credentials");
    return;
  }
  const response = await request("/apis/api.console.halo.run/v1alpha1/system/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: owner.username,
      password: owner.password,
      email: owner.email,
      siteTitle: "Halo E2E",
      language: "zh-CN",
      externalUrl: baseURL,
    }),
  });
  if (response.status !== 204 && response.status !== 200) {
    const body = await response.text();
    const alreadySetUp = body.includes("isSetup") || response.status === 409;
    if (!alreadySetUp) {
      throw new Error(`system setup failed with ${response.status}: ${body}`);
    }
  }
  fs.writeFileSync(setupMarker, new Date().toISOString());
  fs.writeFileSync(ownerFile, JSON.stringify(owner, null, 2));
  fs.writeFileSync(path.join(workDir, "owner.json"), JSON.stringify(owner, null, 2));
  log(`setup finished, owner is ${owner.username}`);
}

async function main() {
  fs.mkdirSync(runtimeDir, { recursive: true });
  const jar = findBootJar() ?? (buildJar(), findBootJar());
  if (!jar) {
    throw new Error(`no boot jar found in ${libDir} after the build`);
  }
  const child = start(jar);
  const shutdown = () => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  child.on("exit", (code) => {
    log(`Halo exited with code ${code}, see ${logFile}`);
    process.exit(code ?? 1);
  });

  await waitFor(async () => (await request("/actuator/health/readiness")).ok, bootTimeoutMs, `readiness (log: ${logFile})`);
  log("Halo is ready");
  await runSetup();
  log("Halo instance is ready for E2E");
}

main().catch((error) => {
  log(`failed: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exit(1);
});
