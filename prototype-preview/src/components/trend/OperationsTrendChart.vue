<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

// 轻量 SVG 折线图：控制台未内置图表库，原型以本地 SVG 绘制两条折线。
// 回填建议：替换为统计图表库或沿用 SVG，保持系列、刻度、逐点悬浮与时间跨度自适应语义。

export interface TrendPoint {
  date: string;
  posts: number;
  comments: number;
}

const props = withDefaults(
  defineProps<{
    points: TrendPoint[];
    showPosts: boolean;
    showComments: boolean;
    postsLabel?: string;
    commentsLabel?: string;
  }>(),
  { postsLabel: "新增文章", commentsLabel: "评论" }
);

const container = ref<HTMLDivElement>();
const width = ref(760);
const height = 260;
const padding = { top: 16, right: 16, bottom: 30, left: 40 };
const hoverIndex = ref<number | null>(null);

let observer: ResizeObserver | undefined;
onMounted(() => {
  if (!container.value) return;
  width.value = Math.max(320, container.value.clientWidth);
  observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry) width.value = Math.max(320, entry.contentRect.width);
  });
  observer.observe(container.value);
});
onBeforeUnmount(() => observer?.disconnect());

const maxValue = computed(() => {
  const values = props.points.flatMap((p) => [
    props.showPosts ? p.posts : 0,
    props.showComments ? p.comments : 0,
  ]);
  const max = Math.max(1, ...values);
  const step = Math.max(1, Math.ceil(max / 4));
  return step * 4;
});

const ticks = computed(() => {
  const max = maxValue.value;
  return [0, max / 4, max / 2, (max * 3) / 4, max].map((v) => Math.round(v));
});

const plotWidth = computed(() => width.value - padding.left - padding.right);
const plotHeight = computed(() => height - padding.top - padding.bottom);

function x(index: number) {
  const count = props.points.length;
  if (count <= 1) return padding.left + plotWidth.value / 2;
  return padding.left + (plotWidth.value * index) / (count - 1);
}

function y(value: number) {
  return padding.top + plotHeight.value * (1 - value / maxValue.value);
}

function pathFor(key: "posts" | "comments") {
  return props.points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${x(index)},${y(point[key])}`
    )
    .join(" ");
}

// 横轴刻度：区间较短时显示每一天，30 天按约 6 个刻度抽稀
const xLabels = computed(() => {
  const points = props.points;
  const count = points.length;
  const step = count <= 10 ? 1 : Math.ceil(count / 6);
  return points
    .map((point, index) => ({ point, index }))
    .filter(({ index }) => index % step === 0 || index === count - 1)
    .map(({ point, index }) => ({ index, label: shortDate(point.date) }));
});

function shortDate(date: string) {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function fullDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${y}/${Number(m)}/${Number(d)}`;
}

const tooltip = computed(() => {
  if (hoverIndex.value === null) return null;
  const point = props.points[hoverIndex.value];
  if (!point) return null;
  const left = Math.min(Math.max(x(hoverIndex.value), 70), width.value - 90);
  return { point, left };
});

function handleMove(event: MouseEvent) {
  const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
  const px = ((event.clientX - rect.left) / rect.width) * width.value;
  const count = props.points.length;
  if (count === 0) return;
  const ratio = (px - padding.left) / plotWidth.value;
  const index = Math.round(ratio * (count - 1));
  hoverIndex.value = Math.min(count - 1, Math.max(0, index));
}
</script>

<template>
  <div ref="container" class="relative w-full" data-testid="trend-chart">
    <svg
      :viewBox="`0 0 ${width} ${height}`"
      :width="width"
      :height="height"
      role="img"
      :aria-label="`${props.postsLabel} / ${props.commentsLabel}`"
      @mousemove="handleMove"
      @mouseleave="hoverIndex = null"
    >
      <g>
        <template v-for="(tick, i) in ticks" :key="`tick-${i}`">
          <line
            :x1="padding.left"
            :x2="width - padding.right"
            :y1="y(tick)"
            :y2="y(tick)"
            stroke="#f0f1f3"
            stroke-width="1"
          />
          <text
            :x="padding.left - 8"
            :y="y(tick) + 3"
            text-anchor="end"
            class="fill-gray-400"
            font-size="10"
          >
            {{ tick }}
          </text>
        </template>
        <line
          :x1="padding.left"
          :x2="width - padding.right"
          :y1="y(0)"
          :y2="y(0)"
          stroke="#e5e7eb"
          stroke-width="1"
        />
      </g>

      <g>
        <text
          v-for="item in xLabels"
          :key="`x-${item.index}`"
          :x="x(item.index)"
          :y="height - 10"
          text-anchor="middle"
          class="fill-gray-400"
          font-size="10"
        >
          {{ item.label }}
        </text>
      </g>

      <path
        v-if="showPosts"
        :d="pathFor('posts')"
        fill="none"
        stroke="#4CCBA0"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
        data-testid="trend-line-posts"
      />
      <path
        v-if="showComments"
        :d="pathFor('comments')"
        fill="none"
        stroke="#0E1731"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
        data-testid="trend-line-comments"
      />

      <template v-if="showPosts">
        <circle
          v-for="(point, index) in points"
          :key="`p-${point.date}`"
          :cx="x(index)"
          :cy="y(point.posts)"
          r="2.5"
          fill="#4CCBA0"
        />
      </template>
      <template v-if="showComments">
        <circle
          v-for="(point, index) in points"
          :key="`c-${point.date}`"
          :cx="x(index)"
          :cy="y(point.comments)"
          r="2.5"
          fill="#0E1731"
        />
      </template>

      <line
        v-if="hoverIndex !== null"
        :x1="x(hoverIndex)"
        :x2="x(hoverIndex)"
        :y1="padding.top"
        :y2="y(0)"
        stroke="#d1d5db"
        stroke-dasharray="4 3"
      />
      <rect
        :x="0"
        :y="0"
        :width="padding.left"
        :height="height"
        fill="transparent"
      />
    </svg>

    <div
      v-if="tooltip"
      class="pointer-events-none absolute top-1 z-10 min-w-[8.5rem] -translate-x-1/2 rounded border border-gray-100 bg-white px-3 py-2 text-xs shadow-md"
      :style="{ left: `${(tooltip.left / width) * 100}%` }"
      data-testid="trend-tooltip"
    >
      <div class="mb-1 font-medium text-gray-900">
        {{ fullDate(tooltip.point.date) }}
      </div>
      <div
        v-if="showPosts"
        class="flex items-center justify-between gap-3 py-0.5"
      >
        <span class="flex items-center gap-1.5 text-gray-600">
          <span class="inline-block h-2 w-2 rounded-sm bg-[#4CCBA0]"></span>
          {{ props.postsLabel }}
        </span>
        <span class="font-medium text-gray-900">
          {{ tooltip.point.posts }}
        </span>
      </div>
      <div
        v-if="showComments"
        class="flex items-center justify-between gap-3 py-0.5"
      >
        <span class="flex items-center gap-1.5 text-gray-600">
          <span class="inline-block h-2 w-2 rounded-sm bg-[#0E1731]"></span>
          {{ props.commentsLabel }}
        </span>
        <span class="font-medium text-gray-900">
          {{ tooltip.point.comments }}
        </span>
      </div>
    </div>
  </div>
</template>
