import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import VueI18n from "@intlify/unplugin-vue-i18n/vite";
import Vue from "@vitejs/plugin-vue";
import VueJsx from "@vitejs/plugin-vue-jsx";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite-plus";

const workbench = process.env.PROTOTYPE_WORKBENCH;
if (!workbench) {
  throw new Error("Set PROTOTYPE_WORKBENCH to the prototype-workbench skill root");
}
const uiRoot = path.resolve(import.meta.dirname, "../..");
const repositoryRoot = path.resolve(import.meta.dirname, "../../..");

export default defineConfig(async () => {
  const { default: previewExport } = await import(
    pathToFileURL(
      path.resolve(workbench, "scripts/preview-export-plugin.mjs")
    ).href
  );

  return {
    root: uiRoot,
    plugins: [
      Vue(),
      VueJsx(),
      Icons({
        compiler: "vue3",
        customCollections: {
          core: {
            logo: () =>
              fs.readFileSync(path.resolve(uiRoot, "src/assets/logo.svg"), "utf8"),
          },
        },
      }),
      VueI18n({
        include: [path.resolve(uiRoot, "src/locales/*.json")],
      }),
      previewExport({ format: "es", bundler: "rolldown" }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(uiRoot, "src"),
        "@console": path.resolve(uiRoot, "console-src"),
        "@uc": path.resolve(uiRoot, "uc-src"),
      },
    },
    build: {
      outDir: path.resolve(repositoryRoot, ".prototype/ui/output/native"),
      emptyOutDir: true,
      assetsDir: "ui-assets",
      rolldownOptions: {
        input: {
          "post-list": path.resolve(import.meta.dirname, "post-list.html"),
        },
      },
    },
  };
});
