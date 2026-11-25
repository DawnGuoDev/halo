import { reactive } from "vue";
import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

// 精简 i18n 适配：仅实现本页用到的 t(key, params) 与 reactive locale，
// 文案取自业务仓库 ui/src/locales/{zh-CN,en}.json，另补充本次新增的 active 标签与筛选空态文案。
// 回填时直接复用业务仓库 vue-i18n 实例，删除本文件。
const messages: Record<string, Record<string, string>> = { "zh-CN": zhCN, en };

export const i18nState = reactive({ locale: "zh-CN" });

export function setLocale(locale: string) {
  i18nState.locale = messages[locale] ? locale : "zh-CN";
}

export function t(key: string, params?: Record<string, string | number>) {
  const template = messages[i18nState.locale]?.[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{${name}}`
  );
}
