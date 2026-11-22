<script lang="ts" setup>
import { computed, type CSSProperties } from "vue";
import type { RouteLocationRaw } from "vue-router";

const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    route?: RouteLocationRaw;
    width?: string | number;
    maxWidth?: string | number;
    /**
     * Expand long titles to at most three lines instead of the default single
     * truncated line. Opt-in so existing entity rows keep their layout.
     */
    expandable?: boolean;
  }>(),
  {
    title: undefined,
    description: undefined,
    route: undefined,
    width: undefined,
    maxWidth: undefined,
    expandable: false,
  }
);

const emit = defineEmits<{
  (event: "click"): void;
}>();

const wrapperStyles = computed(() => {
  const styles: CSSProperties = {};
  if (props.width) {
    styles.width = getWidthStyleValue(props.width);
  }
  if (props.maxWidth) {
    styles.maxWidth = getWidthStyleValue(props.maxWidth);
  }
  return styles;
});

function getWidthStyleValue(value: string | number) {
  return typeof value === "string" ? value : `${value}px`;
}
</script>

<template>
  <div
    :class="['entity-field-wrapper', { 'entity-field-expandable': expandable }]"
    :style="wrapperStyles"
  >
    <div v-if="title || $slots.title" class="entity-field-title-body">
      <slot name="title">
        <div class="entity-field-title" @click="emit('click')">
          <RouterLink
            v-if="route"
            class="hover:text-gray-600"
            :to="route"
            :title="title"
          >
            {{ title }}
          </RouterLink>
          <span v-else :title="title">
            {{ title }}
          </span>
        </div>
        <slot name="extra" />
      </slot>
    </div>
    <div
      v-if="description || $slots.description"
      class="entity-field-description-body"
    >
      <slot name="description">
        <span
          v-if="description"
          class="entity-field-description"
          :title="description"
        >
          {{ description }}
        </span>
      </slot>
    </div>
  </div>
</template>

<style lang="scss">
.entity-field-wrapper {
  @apply inline-flex max-w-xs flex-col gap-1;

  .entity-field-title-body {
    @apply inline-flex min-w-0 max-w-full flex-row items-center whitespace-nowrap;

    .entity-field-title {
      @apply mr-2 truncate text-sm font-medium text-gray-900;
    }
  }

  &.entity-field-expandable {
    width: 100%;

    .entity-field-title-body {
      @apply inline-flex items-start whitespace-normal;
    }

    .entity-field-title {
      @apply line-clamp-3 min-w-0 max-w-full flex-1 whitespace-normal break-words;
      overflow-wrap: anywhere;
    }
  }

  .entity-field-description-body {
    @apply inline-flex items-center whitespace-nowrap;

    .entity-field-description {
      @apply truncate text-xs text-gray-500;
    }
  }
}
</style>
