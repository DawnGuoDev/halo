<script lang="ts" setup>
import type { ListedPost } from "@halo-dev/api-client";
import { consoleApiClient } from "@halo-dev/api-client";
import { IconStarFill, IconStarLine, Toast } from "@halo-dev/components";
import { useQueryClient } from "@tanstack/vue-query";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  post: ListedPost;
}>();

const { t } = useI18n();
const queryClient = useQueryClient();

const pending = ref(false);
const isFavorite = ref(props.post.favorite === true);

// The list polls every second while a post is publishing or deleting. Ignore a stale
// server value briefly after a successful mutation so the icon does not jump back.
let ignoreServerValueUntil = 0;

watch(
  () => props.post.favorite,
  (value) => {
    const serverValue = value === true;
    if (serverValue === isFavorite.value) {
      ignoreServerValueUntil = 0;
      return;
    }
    if (Date.now() < ignoreServerValueUntil) {
      return;
    }
    isFavorite.value = serverValue;
  }
);

const label = computed(() => {
  return isFavorite.value
    ? t("core.post.list.fields.unfavorite")
    : t("core.post.list.fields.favorite");
});

async function toggleFavorite() {
  if (pending.value) {
    return;
  }

  const target = !isFavorite.value;
  pending.value = true;
  isFavorite.value = target;

  try {
    if (target) {
      await consoleApiClient.content.post.favoritePost({
        name: props.post.post.metadata.name,
      });
    } else {
      await consoleApiClient.content.post.unfavoritePost({
        name: props.post.post.metadata.name,
      });
    }

    ignoreServerValueUntil = Date.now() + 2000;
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
  } catch {
    isFavorite.value = !target;
    ignoreServerValueUntil = 0;
    Toast.error(t("core.post.toast.favorite_failed"));
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <button
    v-if="!post.post.spec.deleted"
    v-tooltip="label"
    type="button"
    :aria-label="label"
    :aria-pressed="isFavorite"
    :disabled="pending"
    class="inline-flex h-[22px] w-[22px] items-center justify-center rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    :class="[
      isFavorite
        ? 'text-primary hover:text-primary'
        : 'text-gray-300 hover:text-gray-600',
      pending ? 'cursor-wait opacity-60' : 'cursor-pointer',
    ]"
    @click.stop.prevent="toggleFavorite"
  >
    <IconStarFill v-if="isFavorite" class="h-3.5 w-3.5" />
    <IconStarLine v-else class="h-3.5 w-3.5" />
  </button>
</template>
