<script lang="ts" setup>
import { computed, toRefs } from "vue";
import { useI18n } from "vue-i18n";
import { postLabels } from "@/constants/labels";
import { usePostFilterValues } from "../composables/use-post-filter-values";
import type { PostFilterChipKey } from "../utils/post-filter-chips";
import PostFilterChip from "./PostFilterChip.vue";

interface PostFilterChipItem {
  key: PostFilterChipKey;
  label: string;
  value: string;
}

const props = withDefaults(
  defineProps<{
    keyword?: string;
    status?: string;
    visible?: string;
    category?: string;
    tag?: string;
    contributor?: string;
  }>(),
  {
    keyword: undefined,
    status: undefined,
    visible: undefined,
    category: undefined,
    tag: undefined,
    contributor: undefined,
  }
);

const emit = defineEmits<{
  (event: "remove", key: PostFilterChipKey): void;
  (event: "clear"): void;
}>();

const { t } = useI18n();
const { category, tag, contributor } = toRefs(props);

const { categoryDisplayName, tagDisplayName, contributorDisplayName } =
  usePostFilterValues({ category, tag, contributor });

const normalize = (value?: string) => (value ? value.trim() : "");

const statusLabels = computed<Record<string, string>>(() => ({
  [`${postLabels.PUBLISHED}=true`]: t(
    "core.post.filters.status.items.published"
  ),
  [`${postLabels.PUBLISHED}=false`]: t("core.post.filters.status.items.draft"),
  [`${postLabels.SCHEDULING_PUBLISH}=true`]: t(
    "core.post.filters.status.items.scheduling"
  ),
}));

const visibleLabels = computed<Record<string, string>>(() => ({
  PUBLIC: t("core.post.filters.visible.items.public"),
  INTERNAL: t("core.post.filters.visible.items.internal"),
  PRIVATE: t("core.post.filters.visible.items.private"),
}));

const chips = computed<PostFilterChipItem[]>(() => {
  const items: PostFilterChipItem[] = [];

  const keywordValue = normalize(props.keyword);
  if (keywordValue) {
    items.push({
      key: "keyword",
      label: t("core.post.filters.chips.keyword"),
      value: keywordValue,
    });
  }

  if (props.status !== undefined) {
    items.push({
      key: "status",
      label: t("core.common.filters.labels.status"),
      value: statusLabels.value[props.status] ?? props.status,
    });
  }

  if (props.visible) {
    items.push({
      key: "visible",
      label: t("core.post.filters.visible.label"),
      value: visibleLabels.value[props.visible] ?? props.visible,
    });
  }

  if (props.category) {
    items.push({
      key: "category",
      label: t("core.post.filters.category.label"),
      value: categoryDisplayName.value ?? props.category,
    });
  }

  if (props.tag) {
    items.push({
      key: "tag",
      label: t("core.post.filters.tag.label"),
      value: tagDisplayName.value ?? props.tag,
    });
  }

  if (props.contributor) {
    items.push({
      key: "contributor",
      label: t("core.post.filters.author.label"),
      value: contributorDisplayName.value ?? props.contributor,
    });
  }

  return items;
});

const hasChips = computed(() => chips.value.length > 0);
</script>

<template>
  <div
    v-if="hasChips"
    class="post-filter-chips flex flex-wrap items-center gap-2"
    role="group"
    :aria-label="$t('core.post.filters.chips.label')"
  >
    <PostFilterChip
      v-for="chip in chips"
      :key="chip.key"
      :label="chip.label"
      :value="chip.value"
      :data-filter-chip="chip.key"
      @remove="emit('remove', chip.key)"
    />
    <button
      type="button"
      class="post-filter-chips__clear cursor-pointer rounded px-1.5 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      @click="emit('clear')"
    >
      {{ $t("core.post.filters.chips.clear_all") }}
    </button>
  </div>
</template>
