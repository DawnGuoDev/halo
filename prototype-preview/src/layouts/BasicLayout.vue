<script lang="ts" setup>
import {
  IconBookRead,
  IconDashboard,
  IconRocketLine,
  IconPages,
  IconSettings,
  IconUserLine,
  VMenu,
  VMenuItem,
} from "@halo-dev/components";
import type { Component } from "vue";
import { computed } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import { mockCurrentUser } from "@/mock/data";

interface MenuGroup {
  id: string;
  label: string;
  items: { path: string; title: string; icon: Component }[];
}

// 菜单结构参考业务仓库 ui/console-src/router/constant.ts 与 ui/src/components/menu/RoutesMenu.tsx
const groups: MenuGroup[] = [
  {
    id: "dashboard",
    label: "",
    items: [
      { path: "/operations", title: "运营概览", icon: IconRocketLine },
      { path: "/demo", title: "组件示例", icon: IconDashboard },
    ],
  },
  {
    id: "content",
    label: "内容",
    items: [{ path: "/posts", title: "文章", icon: IconBookRead }],
  },
  {
    id: "interface",
    label: "外观",
    items: [{ path: "/demo/sections", title: "页面", icon: IconPages }],
  },
  {
    id: "system",
    label: "系统",
    items: [
      { path: "/demo/users", title: "用户", icon: IconUserLine },
      { path: "/demo/settings", title: "设置", icon: IconSettings },
    ],
  },
];

const route = useRoute();
const router = useRouter();

const activePath = computed(() => route.path);
const openIds = computed(() => groups.map((group) => group.id));

function handleSelect(id: string) {
  router.push(id);
}
</script>

<template>
  <div class="console-layout">
    <aside class="console-sidebar">
      <div class="flex justify-center py-5">
        <RouterLink to="/posts" title="Halo 控制台">
          <img
            src="/logo.svg"
            class="h-8 w-auto select-none transition hover:brightness-125"
            alt="Halo"
          />
        </RouterLink>
      </div>
      <div class="console-sidebar__section">
        <template v-for="group in groups" :key="group.id">
          <div v-if="group.label" class="console-menu-label px-3">
            {{ group.label }}
          </div>
          <VMenu :open-ids="openIds">
            <VMenuItem
              v-for="item in group.items"
              :id="item.path"
              :key="item.path"
              :title="item.title"
              :active="activePath === item.path"
              @select="handleSelect"
            >
              <template #icon>
                <component :is="item.icon" />
              </template>
            </VMenuItem>
          </VMenu>
        </template>
      </div>
      <div class="border-t border-gray-100 p-3">
        <div class="flex items-center gap-2 rounded p-2 hover:bg-gray-50">
          <div
            class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600"
          >
            A
          </div>
          <div class="flex flex-col">
            <span class="text-sm">{{ mockCurrentUser.displayName }}</span>
            <span class="text-[11px] text-gray-500">预览账号（Mock）</span>
          </div>
        </div>
      </div>
    </aside>

    <main class="console-main">
      <RouterView />
      <footer class="console-footer">
        <span>Powered by </span>
        <span class="font-semibold">Halo</span>
        <span class="ml-2 text-xs text-gray-400">
          · 独立原型工程（Mock 数据）
        </span>
      </footer>
    </main>
  </div>
</template>
