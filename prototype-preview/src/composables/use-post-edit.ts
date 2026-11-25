import { ref } from "vue";

// 原型占位：业务中「编辑文章」跳转路由 { name: "PostEditor", query: { name } }，
// 文章编辑器（富文本）未纳入独立工程，这里以本地回执记录跳转目标，供编辑占位页展示。
const lastEditTarget = ref<string>("");

export function setLastEditTarget(name: string) {
  lastEditTarget.value = name;
}

export function useLastEditTarget() {
  return lastEditTarget;
}
