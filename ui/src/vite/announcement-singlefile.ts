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
          // 业务入口 chunk 交给模块工厂处理，不按普通脚本直接执行。
          entrySrc = src;
          continue;
        }
        if (src.endsWith("/defaultEntry.js") || /font|preload/i.test(src)) {
          continue;
        }
        const code = readAsset(src);
        if (code === undefined) continue;
        if (/^\s*import\s/.test(code)) {
          continue;
        }
        libraries.push(code);
      }
      if (!entrySrc) return;

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
        // 先替换 import.meta 再做 import 改写，避免替换产物被 import 正则误匹配。
        const original = { code };
        const body = code
          .replace(/import\.meta/g, "__ann_import_meta__")
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
          .replace(
            /import\s+([\w$]+)\s*(?:,\s*\{([\s\S]*?)\})?\s*from\s*(["'])([^"']+)\3\s*;?/g,
            (
              _w: string,
              local: string,
              names: string | undefined,
              _q: string,
              spec: string
            ) => {
              const dep = resolveDep(spec);
              if (!dep) return _w;
              visit(dep);
              mods.push(dep);
              const req = `__ann_require(${JSON.stringify(dep)})`;
              const named = (names ?? "")
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean)
                .join(", ");
              if (!named) return `const ${local} = ${req};`;
              const needsDefault = /\bdefault\b/.test(named);
              const cleaned = named.replace(
                /,\s*default\b|\bdefault\s*,\s*/g,
                ""
              );
              if (!needsDefault) {
                // 仅取 named 导出，不做 props 读取，避免访问未初始化模块工厂对象。
                return `const {${cleaned}} = ${req};`;
              }
              return `const ${local} = ${req};const {${cleaned}} = ${local};`;
            }
          )
          .split("__ann_import_meta__")
          .join("({url: window.location.href, env: {}})");
        const exportNames: string[] = [];
        let finalBody = body
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
        const mark = `/*#ann-mod:${name}#*/`;
        finalBody = mark + finalBody.split(mark).join("");
        // 每个模块导出清单单独成行，避免上一条语句吞掉下一条（ASI）。
        transforms.set(
          name,
          `\n;__annslot(${JSON.stringify(name)},function () {\n${finalBody}\n;return {${exportNames.join(",")}};\n});\n` +
            (mods.length ? `/*__dep:${JSON.stringify(mods)}:*/` : "") +
            (body ===
            original.code.replace(/import\.meta/g, "__ann_import_meta__")
              ? ""
              : `\n/*ann-has-import*/`)
        );
      };
      // 原始 HTML 的外链顺序不一定以业务入口结尾，优先按 chunk 图识别入口。
      const entryBase =
        Object.keys(bundle).find(
          (key) =>
            key.includes("ui-assets/announcement-") &&
            key.endsWith(".js") &&
            !chunks.get(key)?.includes("__vite__mapDeps")
        ) ?? entrySrc.replace(ASSET_BASE, "");
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
      // 经典脚本内嵌 JSON（如 ECharts 源码）会包含 U+2028/U+2029，首屏白屏的常见原因。
      html = html.replace(/\s+crossorigin(="[^"]*")?/g, "");
      html = html.replace('href="/ui-assets/favicon.ico"', 'href="data:,"');
      const headEnd = html.indexOf("</head>");
      html = `${html.slice(0, headEnd)}<style>${css}</style>${html.slice(headEnd)}`;

      // 运行时：经典脚本（非 module），宿主 IIFE + 模块工厂合并为单一脚本。
      // 启动器：经典脚本（允许约 10MB 以内代码），构建时把库与模块合并为单一脚本。
      // 含 ESM 语法的宿主运行时与业务 chunk 统一走模块工厂；
      // 先注册全部模块定义，再统一 require，避免循环依赖取到未初始化导出。
      // 业务 chunk 产出顺序不稳定；入口模块最后定义，其余模块先定义再按需 require。
      const entryBaseNameGuess = Object.keys(bundle).find(
        (key) =>
          key.includes("ui-assets/announcement-") &&
          key.endsWith(".js") &&
          !chunks.get(key)?.includes("__vite__mapDeps")
      );
      const entryGuessName = entryBaseNameGuess
        ? path.posix.basename(entryBaseNameGuess)
        : ((entrySrc ?? "").split("/").pop() ?? "");
      const orderedNames = [...transforms.keys()].sort(
        (a, b) => Number(a === entryGuessName) - Number(b === entryGuessName)
      );
      const defineOrder = orderedNames;
      const moduleDefinitions = orderedNames
        .map((name) => transforms.get(name) ?? "")
        .join("\n");
      const definedNames = [...transforms.values()].flatMap(
        (value) => value.match(/\/\*#ann-mod:[^*]+#\*\//g) ?? []
      );
      if (defineOrder.length !== definedNames.length) {
        throw new Error(
          `announcement 单文件构建模块定义数量不一致：${defineOrder.length} != ${definedNames.length}`
        );
      }
      // 宿主库各自包装为 IIFE，避免不同库的顶层声明互相覆盖。
      const _hostScript = libraries
        .map((code) => code.replace(/\r?\n/g, "\n"))
        .map((code) => `;(function(){${code}\n})();`)
        .join("\n//# sourceURL=announcement-host.js\n");

      // HTML 解析器会优先识别脚本闭合标签；这里用拼接的 token 规避，
      // 生成产物中不会出现能提前闭合脚本的字面量。
      const SCRIPT_CLOSE = "<" + "/script";

      const bootScript = [
        "(function(){",
        "var R = {};",
        "window.__annRegistry = R;",
        "window.__ann_define = function (name, factory) { R[name] = { factory: factory }; };",
        "window.__ann_require = function (name) {",
        "  var m = R[name];",
        '  if (!m) throw new Error("单文件原型缺少模块：" + name);',
        "  if (m.value) return m.value;",
        "  m.value = m.factory();",
        "  return m.value;",
        "};",
        "})();",
      ].join("\n");
      const toInlineScript = (code: string) =>
        code.split("\u2028").join("\\u2028").split("\u2029").join("\\u2029");
      const libraryScripts = libraries
        .map((code) => code.replace(/<\/script/gi, "<\\/script"))
        .map((code) => `<script>${toInlineScript(code)}</script>`)
        .join("\n");
      const moduleText = `${moduleDefinitions
        .replace(/(?:\/\*__dep:[\s\S]*?:\*\/\n?)/g, "")
        .split("__annslot(")
        .join("__ann_define(")
        .replace(/(\n)?(?=__ann_define\(")/g, "\n;")}\n;\n${defineOrder
        .map((name) => `__ann_require(${JSON.stringify(name)});`)
        .join(
          "\n"
        )}\n;\nwindow.__module = __ann_require(${JSON.stringify(entryKey)});\n;\nwindow.__announcement_ready = true;`;
      // 以显式平台入口收尾：所有模块先统一定义，最后一次 require 触发挂载。
      const moduleScript = toInlineScript(
        `${moduleText}
window.__ann_registry = window.__annRegistry;`
          .split(SCRIPT_CLOSE)
          .join("\\x3C/" + "script")
      );
      const bodyEnd = html.lastIndexOf("</body>");
      html = `${html.slice(0, bodyEnd)}<script>${bootScript}</script>\n${libraryScripts}\n<script>${moduleScript}</script>${html.slice(bodyEnd)}`;

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
