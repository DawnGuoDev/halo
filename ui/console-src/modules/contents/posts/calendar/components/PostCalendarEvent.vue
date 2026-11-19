<script lang="ts" setup>
import { VStatusDot } from "@halo-dev/components";
import { computed } from "vue";
import type { PostCalendarStatus } from "../composables/use-post-calendar";

const props = withDefaults(
  defineProps<{
    name: string;
    title: string;
    status: PostCalendarStatus;
    time?: string;
  }>(),
  { time: undefined }
);

const emit = defineEmits<{
  (event: "select", name: string): void;
}>();

const statusText = computed(() =>
  props.status === "scheduled" ? "scheduled" : "published"
);
</script>

<template>
  <button
    type="button"
    class="mb-1 block w-full rounded-base border-l-2 bg-gray-50 px-1.5 py-1 text-left text-xs transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    :class="status === 'scheduled' ? 'border-primary' : 'border-gray-300'"
    :aria-label="`${title}，${$t(
      `core.post.calendar.status.${statusText}`
    )}${time ? '，' + time : ''}`"
    @click="emit('select', name)"
  >
    <span class="block truncate font-medium text-gray-900">{{ title }}</span>
    <span class="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
      <VStatusDot
        :state="status === 'scheduled' ? 'success' : 'default'"
        :text="$t(`core.post.calendar.status.${statusText}`)"
      />
      <span v-if="time" class="tabular-nums">{{ time }}</span>
    </span>
  </button>
</template>
