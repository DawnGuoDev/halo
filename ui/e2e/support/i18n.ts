import fs from "node:fs";
import { localeFile } from "./env";

type Messages = Record<string, string>;

let cache: Messages | undefined;

/** Flat zh-CN message map ("key": "value"), as consumed by vue-i18n. */
export function messages(): Messages {
  if (!cache) {
    cache = JSON.parse(fs.readFileSync(localeFile, "utf8")) as Messages;
  }
  return cache;
}

/** Asserts/returns the copy for a message key so specs never hard-code Chinese text. */
export function t(key: string): string {
  const value = messages()[key];
  if (value === undefined) {
    throw new Error(`missing i18n key ${key} in ${localeFile}`);
  }
  return value;
}
