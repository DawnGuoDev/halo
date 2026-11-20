import path from "node:path";
import type { Plugin } from "vite-plus";

const ASSET_BASE = "/ui-assets/";

type BundleFile = {
  type: "chunk" | "asset";
  fileName: string;
  code?: string;
  source?: string | Uint8Array;
  isEntry?: boolean;
};

/**
 * POC 原型单文件构建（仅 ANNOUNCEMENT_SINGLEFILE=true 生效）。
 *
 * 从同一份 Halo 业务源码与真实组件库出发，产出 announcement-prototype.html：
 * - HTML / CSS / 业务 JS chunk / 宿主运行库全部内联，不依赖开发服务与后端；
 * - CSS 中的字体、图片以 data URL 内联；
 * - 业务入口改写为同步内存模块，兼容 about:srcdoc 与 origin=null。
 */
export function announcementSingleFile(): Plugin {
  return {
    name: "announcement-singlefile",
    apply: "build",
    enforce: "post",
    async writeBundle(_options, bundle) {
      if (process.env.ANNOUNCEMENT_SINGLEFILE !== "true") return;
      const fs = await import("node:fs");
      const fsp = await import("node:fs/promises");
      const outDir = path.resolve(process.cwd(), "build/dist/ui");
      const htmlPath = path.join(outDir, "announcement.html");
      if (!fs.existsSync(htmlPath)) return;
      let html = fs.readFileSync(htmlPath, "utf8");

      const readAsset = (url: string) => {
        const clean = url.startsWith(ASSET_BASE) ? url.slice(1) : url;
        const file = path.join(outDir, path.posix.normalize(clean));
        return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
      };

      // 1) 收集外链：宿主 IIFE 运行库与业务入口 chunk。
      const libraries: string[] = [];
      let entrySrc: string | undefined;
      const scriptRegex = /<script[^>]*src="([^"]+)"[^>]*><\/script>/g;
      let m: RegExpExecArray | null;
      while ((m = scriptRegex.exec(html))) {
        const src = m[1];
        if (!src.startsWith(ASSET_BASE)) continue;
        if (/announcement-[^/]+\.js$/.test(src)) {
          entrySrc = src;
          continue;
        }
        const code = readAsset(src);
        if (code !== undefined) libraries.push(code);
      }
      if (!entrySrc) return;
      const entry = readAsset(entrySrc);
      if (!entry) return;

      // 2) 业务入口的 import 依赖：用同名 chunk 的内联代码替换为模块工厂。
      const files = Object.values(bundle) as BundleFile[];
      const chunks = new Map<string, string>();
      for (const file of files) {
        if (file.type !== "chunk" || typeof file.code !== "string") continue;
        chunks.set(path.posix.normalize(file.fileName), file.code);
        chunks.set(path.posix.basename(file.fileName), file.code);
      }
      const resolveDep = (spec: string) => {
        const base = spec.replace(/^\.\//, "");
        return chunks.has(base) ? base : undefined;
      };

      const transforms = new Map<string, string>();
      const visit = (name: string) => {
        if (transforms.has(name)) return;
        const code = chunks.get(name);
        if (code === undefined) return;
        transforms.set(name, "");
        const mods: string[] = [];
        const body = code
          .replace(
            /import\s*\{([\s\S]*?)\}\s*from\s*(["'])([^"']+)\2\s*;?/g,
            (_w: string, names: string, _q: string, spec: string) => {
              const dep = resolveDep(spec);
              if (!dep) return "";
              visit(dep);
              mods.push(dep);
              const pairs = names
                .split(",")
                .map((part) => {
                  const alias = /^([\w$]+)\s+as\s+([\w$]+)$/.exec(part.trim());
                  return alias ? `${alias[1]}: ${alias[2]}` : part.trim();
                })
                .filter(Boolean)
                .join(", ");
              return `const {${pairs}} = __ann_require(${JSON.stringify(dep)});`;
            }
          )
          .replace(
            /import\s*\*\s*as\s+([\w$]+)\s*from\s*(["'])([^"']+)\2\s*;?/g,
            (_w: string, local: string, _q: string, spec: string) => {
              const dep = resolveDep(spec);
              if (!dep) return "";
              visit(dep);
              mods.push(dep);
              return `const ${local} = __ann_require(${JSON.stringify(dep)});`;
            }
          )
          .replace(
            /import\s*(["'])([^"']+)\1\s*;?/g,
            (_w: string, _q: string, spec: string) => {
              const dep = resolveDep(spec);
              if (!dep) return "";
              visit(dep);
              mods.push(dep);
              return `__ann_require(${JSON.stringify(dep)});`;
            }
          )
          .replace(/import\.meta/g, "({ url: window.location.href })");
        const exportNames: string[] = [];
        const finalBody = body
          .replace(
            /export\s*\{([\s\S]*?)\}\s*;?/g,
            (_w: string, names: string) => {
              for (const part of names.split(",")) {
                const trimmed = part.trim();
                if (!trimmed) continue;
                const alias = /^([\w$]+)\s+as\s+([\w$]+)$/.exec(trimmed);
                exportNames.push(
                  alias
                    ? `${JSON.stringify(alias[2])}: ${alias[1]}`
                    : `${JSON.stringify(trimmed)}: ${trimmed}`
                );
              }
              return "";
            }
          )
          .replace(/export\s+default\s+/g, () => {
            exportNames.push('"default": __ann_default__');
            return "const __ann_default__ = ";
          })
          .replace(
            /export\s+(const|let|var|function|class)\s+([\w$]+)/g,
            (_w: string, kind: string, local: string) => {
              exportNames.push(`${JSON.stringify(local)}: ${local}`);
              return `${kind} ${local}`;
            }
          );
        transforms.set(
          name,
          `__ann_define(${JSON.stringify(name)}, function () {\n${finalBody}\n;return {${exportNames.join(",")}};\n});\n` +
            mods.join("")
        );
      };
      const entryBase = entrySrc.replace(ASSET_BASE, "");
      const entryKey = chunks.has(entryBase)
        ? entryBase
        : path.posix.basename(entryBase);
      visit(entryKey);

      // 样式与资源。
      let css = "";
      for (const link of html.matchAll(
        /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g
      )) {
        css += readAsset(link[1]) ?? "";
      }

      html = html.replace(/<link[^>]*rel="modulepreload"[^>]*>/g, "");
      html = html.replace(/<link[^>]*rel="stylesheet"[^>]*>/g, "");
      html = html.replace(
        /<script[^>]*type="importmap"[^>]*>[\s\S]*?<\/script>/g,
        ""
      );
      html = html
        .split(/(?=<script)/)
        .map((part) => {
          if (!/^<script[^>]*src="/.test(part)) return part;
          const end = part.indexOf("</script>");
          return end >= 0 ? part.slice(end + 9) : "";
        })
        .join("");
      html = html.replace(/\s+crossorigin(="[^"]*")?/g, "");
      html = html.replace('href="/ui-assets/favicon.ico"', 'href="data:,"');
      const headEnd = html.indexOf("</head>");
      html = `${html.slice(0, headEnd)}<style>${css}</style>${html.slice(headEnd)}`;

      // 运行时：经典脚本（非 module），宿主 IIFE + 模块工厂合并为单一脚本。
      // 启动器：经典脚本（允许约 10MB 以内代码），构建时把库与模块合并为单一脚本。
      const merged = `${libraries.join("\n;\n")}\n;\nvar __ann_define = window.__ann_define;var __ann_require = window.__ann_require;\n${[
        ...transforms.values(),
      ].join(
        "\n"
      )}\nwindow.__module = __ann_require(${JSON.stringify(entryKey)});\nwindow.__announcement_ready = true;`;
      const runtime = `(function(){var registry={};window.__ann_define=function(n,f){registry[n]=f;};window.__ann_require=function(n){if(!registry[n])throw new Error("单文件原型缺少模块："+n);if(registry[n].m)return registry[n].m;registry[n].m=registry[n].f();return registry[n].m;};try{${merged.replace(
        /<\/script/gi,
        "<\\/script"
      )}}catch(error){window.__announcement_boot_error=String((error&&error.stack)||error);}})();`;
      const bodyEnd = html.lastIndexOf("</body>");
      html = `${html.slice(0, bodyEnd)}<script>${runtime}</script>${html.slice(bodyEnd)}`;

      await fsp.writeFile(
        path.join(outDir, "announcement-prototype.html"),
        html
      );
      fs.rmSync(path.join(outDir, "announcement.html"), { force: true });
      fs.rmSync(path.join(outDir, "announcement.html.gz"), { force: true });
      fs.rmSync(path.join(outDir, "ui-assets"), {
        recursive: true,
        force: true,
      });
    },
  };
}
