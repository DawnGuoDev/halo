import path from "node:path";
import Vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite-plus";

const uiRoot = path.resolve(import.meta.dirname, "..");

export default defineConfig({
  root: uiRoot,
  plugins: [Vue()],
  resolve: {
    alias: {
      "@": path.resolve(uiRoot, "src"),
      "@console": path.resolve(uiRoot, "console-src"),
    },
  },
  test: {
    clearMocks: false,
    environment: "jsdom",
    include: ["prototype/mock/**/*.spec.ts", "prototype/filter-chips.spec.ts"],
  },
});
