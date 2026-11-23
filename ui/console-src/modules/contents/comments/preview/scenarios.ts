import type { PreviewScenario } from "./types";

export const PREVIEW_SCENARIOS: {
  label: string;
  value: PreviewScenario;
}[] = [
  { label: "正常列表", value: "normal" },
  { label: "待审核为空", value: "pending-empty" },
  { label: "批量部分失败", value: "partial-failure" },
];
