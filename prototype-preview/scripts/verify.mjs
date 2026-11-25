// 验收入口：复用独立原型辅助 Skill 的 preview.py / browser.mjs，配置见 preview.json。
// 用法（在工作区根执行，路径按实际绝对路径调整）：
//   python3 <SKILL>/scripts/preview.py validate <abs>/preview.json
//   python3 <SKILL>/scripts/preview.py build <abs>/preview.json
//   node <SKILL>/scripts/browser.mjs <abs>/preview.json --playwright-module <...>/playwright-core/index.mjs --executable <chromium>
//   python3 <SKILL>/scripts/preview.py package <abs>/preview.json --out <abs>/fresh-package
import { readFileSync } from "node:fs";

const config = JSON.parse(
  readFileSync(new URL("../preview.json", import.meta.url), "utf8")
);
console.log(`preview.json: ${config.browser.scenarios.length} scenarios`);
