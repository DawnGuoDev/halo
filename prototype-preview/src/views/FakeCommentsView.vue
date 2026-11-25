<script lang="ts" setup>
import { IconMessage, VButton, VEmpty, VPageHeader } from "@halo-dev/components";
import { useRouter } from "vue-router";
import { t } from "@/i18n";

// 预览占位：业务控制台的评论管理页不在本原型工程范围内。
// 用于承接「评论管理」「全部文章」等跳转，回填时指向真实路由 /comments。
const router = useRouter();
</script>

<template>
  <VPageHeader :title="t('core.sidebar.menu.items.comments')">
    <template #icon><IconMessage /></template>
  </VPageHeader>
  <div class="m-0 p-4 md:m-4">
    <div class="rounded-lg bg-white p-6 shadow-sm ring-1 ring-[#eaecf0]">
      <VEmpty
        :title="t('core.operations.placeholder.comments_title')"
        :message="t('core.operations.placeholder.comments_message')"
      >
        <template #actions>
          <VButton @click="router.push('/operations')">
            {{ t("core.operations.placeholder.back") }}
          </VButton>
        </template>
      </VEmpty>
    </div>
  </div>
</template>
