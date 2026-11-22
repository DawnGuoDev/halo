<script setup lang="ts">
defineProps<{
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
}>();
</script>

<template>
  <div
    :class="[
      'rounded-base border px-3 py-2 text-sm',
      tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : tone === 'danger'
          ? 'border-red-200 bg-red-50 text-red-900'
          : tone === 'success'
            ? 'border-green-200 bg-green-50 text-green-900'
            : 'border-gray-200 bg-gray-50 text-gray-700',
    ]"
    role="status"
  >
    <div v-if="title" class="font-medium">{{ title }}</div>
    <div :class="{ 'mt-1': !!title }"><slot /></div>
  </div>
</template>
