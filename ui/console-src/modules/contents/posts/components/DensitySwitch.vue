<script lang="ts" setup>
import { IconList, IconListSettings } from "@halo-dev/components";
import { computed, inject, markRaw } from "vue";
import { useI18n } from "vue-i18n";
import { DENSITY_INJECTION_KEY, type PostListDensity } from "../density";

const { t } = useI18n();

const densityState = inject(DENSITY_INJECTION_KEY, undefined);

const density = computed<PostListDensity>(
  () => densityState?.density.value ?? "comfortable"
);

const items = computed(() => [
  {
    id: "comfortable",
    label: t("core.post.list.density.comfortable"),
    icon: markRaw(IconListSettings),
  },
  {
    id: "compact",
    label: t("core.post.list.density.compact"),
    icon: markRaw(IconList),
  },
]);

const handleChange = (event: Event) => {
  const { value } = event.target as HTMLInputElement;
  if (densityState && (value === "comfortable" || value === "compact")) {
    densityState.density.value = value;
  }
};
</script>

<template>
  <div
    class="density-switch inline-flex h-9 items-center rounded-base bg-gray-100 p-0.5"
    :aria-label="$t('core.post.list.density.label')"
    role="radiogroup"
  >
    <label
      v-for="item in items"
      :key="item.id"
      :data-density-option="item.id"
      :class="[
        'inline-flex h-8 cursor-pointer items-center gap-1 rounded-sm px-2.5 text-xs transition-colors',
        density === item.id
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-600 hover:bg-white/70',
      ]"
    >
      <input
        :checked="density === item.id"
        class="sr-only"
        name="post-list-density"
        type="radio"
        :value="item.id"
        :aria-label="item.label"
        @change="handleChange"
      />
      <component :is="item.icon" class="h-3.5 w-3.5" aria-hidden="true" />
      <span>{{ item.label }}</span>
    </label>
  </div>
</template>
