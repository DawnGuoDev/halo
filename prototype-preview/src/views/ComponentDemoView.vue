<script lang="ts" setup>
import {
  Toast,
  VAlert,
  VAvatar,
  VButton,
  VCard,
  VDescription,
  VDescriptionItem,
  VPageHeader,
  VSpace,
  VSwitch,
  VTabItem,
  VTabbar,
  VTag,
} from "@halo-dev/components";
import { ref } from "vue";

// 常用组件最小示例：用于验证独立工程内 @halo-dev/components 的主题与样式接入
const activeTab = ref("basic");
const enabled = ref(true);
const loading = ref(false);
</script>

<template>
  <VPageHeader title="组件示例">
    <template #icon>
      <span class="text-primary">◆</span>
    </template>
    <template #actions>
      <VButton size="sm" @click="Toast.info('这是预览提示')">提示</VButton>
    </template>
  </VPageHeader>

  <div class="m-0 flex flex-col gap-4 md:m-4">
    <VAlert type="info" title="预览工程" closable>
      本页用于确认主题色、组件样式与弹层能在独立工程中正常工作。
    </VAlert>

    <VTabbar v-model:active-id="activeTab">
      <VTabItem id="basic" label="基础" />
      <VTabItem id="feedback" label="反馈" />
    </VTabbar>

    <VCard title="按钮与标签">
      <VSpace spacing="lg" class="flex-wrap">
        <VButton>默认</VButton>
        <VButton type="secondary">次要</VButton>
        <VButton type="danger">危险</VButton>
        <VButton :loading="loading" @click="loading = !loading">
          加载状态
        </VButton>
        <VTag>默认标签</VTag>
        <VTag theme="primary">primary</VTag>
        <VTag theme="danger">danger</VTag>
      </VSpace>
    </VCard>

    <VCard title="描述列表与开关">
      <VDescription>
        <VDescriptionItem label="站点名称">Halo 原型预览</VDescriptionItem>
        <VDescriptionItem label="主题色">
          <span class="inline-flex items-center gap-2">
            <span class="h-4 w-4 rounded bg-primary"></span>#4CCBA0
          </span>
        </VDescriptionItem>
        <VDescriptionItem label="预览账号">
          <VSpace>
            <VAvatar :src="undefined" alt="A" />
            Administrator
          </VSpace>
        </VDescriptionItem>
      </VDescription>
      <div class="mt-4 flex items-center gap-3 text-sm">
        <VSwitch v-model="enabled" />
        <span>{{ enabled ? "已启用" : "已停用" }}</span>
      </div>
    </VCard>
  </div>
</template>
