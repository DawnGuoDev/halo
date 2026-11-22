<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  /** Existing Halo console i18n key. */
  keyPath: string;
  /** Fallback copy when the key is not present in the locale file. */
  fallback?: string;
}>();

const { t, te } = useI18n();
const text = computed(() =>
  te(props.keyPath) ? t(props.keyPath) : props.fallback || props.keyPath
);
</script>

<template>{{ text }}</template>
