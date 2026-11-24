import path from "node:path";
import { defineConfig } from "vite-plus";

const uiRoot = path.resolve(import.meta.dirname, "..");

export default defineConfig({
  root: uiRoot,
  resolve: {
    alias: {
      "@": path.resolve(uiRoot, "src"),
      "@console": path.resolve(uiRoot, "console-src"),
    },
  },
  test: {
    clearMocks: false,
    environment: "jsdom",
    include: ["prototype/mock/**/*.spec.ts"],
  },
});
