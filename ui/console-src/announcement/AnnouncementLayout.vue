<script lang="ts" setup>
import {
  IconArrowDownLine,
  IconList,
  IconMore,
  IconNotificationBadgeLine,
  IconSearch,
  IconSettings,
} from "@halo-dev/components";
import type { Component } from "vue";
import { ref } from "vue";

defineProps<{
  active?: "announcement" | "posts" | "menus" | "settings";
}>();

interface NavItem {
  id: string;
  label: string;
  icon?: Component;
  badge?: string;
  active?: boolean;
}

const groups: { label?: string; items: NavItem[] }[] = [
  {
    items: [{ id: "overview", label: "仪表盘" }],
  },
  {
    label: "内容",
    items: [
      { id: "posts", label: "文章" },
      { id: "pages", label: "页面" },
      { id: "comments", label: "评论" },
      { id: "attachments", label: "附件" },
    ],
  },
  {
    label: "运营",
    items: [
      {
        id: "announcement",
        label: "站内公告",
        icon: IconNotificationBadgeLine,
        badge: "NEW",
        active: true,
      },
    ],
  },
  {
    label: "外观",
    items: [
      { id: "themes", label: "主题" },
      { id: "menus", label: "菜单" },
    ],
  },
  {
    label: "系统",
    items: [
      { id: "users", label: "用户" },
      { id: "settings", label: "设置" },
    ],
  },
];

const mobileMenuVisible = ref(false);
const current = ref<string>("announcement");
const titles: Record<string, string> = {
  overview: "仪表盘",
  posts: "文章",
  announcement: "站内公告",
  menus: "菜单",
  settings: "设置",
};
</script>

<template>
  <div class="announcement-layout">
    <aside class="announcement-layout__sidebar">
      <div class="announcement-layout__logo">
        <span class="announcement-layout__logo-mark">H</span>
        <span class="announcement-layout__logo-text">halo</span>
      </div>
      <div class="announcement-layout__search">
        <IconSearch />
        <span>搜索</span>
        <kbd>Ctrl+K</kbd>
      </div>
      <nav class="announcement-layout__nav" aria-label="控制台导航">
        <template v-for="(group, groupIndex) in groups" :key="groupIndex">
          <div v-if="group.label" class="announcement-layout__group-label">
            {{ group.label }}
          </div>
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            class="announcement-layout__nav-item"
            :class="{ 'is-active': item.id === current }"
            :title="`${item.label}（POC 仅站内公告可交互）`"
            @click="current = item.id"
          >
            <span class="announcement-layout__nav-icon">
              <component :is="item.icon || IconList" />
            </span>
            <span class="announcement-layout__nav-label">{{ item.label }}</span>
            <span v-if="item.badge" class="announcement-layout__nav-badge">
              {{ item.badge }}
            </span>
          </button>
        </template>
      </nav>
      <div class="announcement-layout__profile">
        <span class="announcement-layout__avatar">运</span>
        <div class="announcement-layout__profile-info">
          <div class="announcement-layout__profile-name">运营小助手</div>
          <div class="announcement-layout__profile-role">
            <span class="announcement-layout__role-dot" />
            超级管理员
          </div>
        </div>
        <button
          type="button"
          class="announcement-layout__profile-action"
          aria-label="账户菜单"
        >
          <IconArrowDownLine />
        </button>
      </div>
    </aside>

    <main class="announcement-layout__main">
      <div class="announcement-layout__mobile-bar">
        <button type="button" @click="mobileMenuVisible = !mobileMenuVisible">
          <IconList />
          {{ titles[current] || "站内公告" }}
        </button>
        <button type="button" aria-label="更多">
          <IconMore />
        </button>
      </div>
      <div v-if="mobileMenuVisible" class="announcement-layout__mobile-menu">
        <button
          v-for="item in groups.flatMap((g) => g.items)"
          :key="item.id"
          type="button"
          :class="{ 'is-active': item.id === current }"
          @click="
            current = item.id;
            mobileMenuVisible = false;
          "
        >
          {{ item.label }}
        </button>
      </div>

      <div
        v-if="current !== 'announcement'"
        class="announcement-layout__placeholder"
      >
        <IconSettings />
        <h2>{{ titles[current] || "该页面" }}暂未包含在本轮 POC 中</h2>
        <p>本原型仅实现「站内公告管理」，其他菜单用于展示控制台导航结构。</p>
        <button type="button" @click="current = 'announcement'">
          返回站内公告
        </button>
      </div>
      <slot v-else />
      <footer class="announcement-layout__footer">
        Powered by <a href="#" @click.prevent>Halo</a>
      </footer>
    </main>
  </div>
</template>

<style scoped lang="scss">
.announcement-layout {
  display: flex;
  min-height: 100vh;
  background-color: #f5f5f5;

  &__sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 20;
    display: none;
    flex-direction: column;
    width: 16rem;
    background-color: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

    @media (min-width: 768px) {
      display: flex;
    }
  }

  &__logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px 0;
  }

  &__logo-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background-color: #4ccba0;
    color: #0e1731;
    font-weight: 800;
    font-size: 16px;
  }

  &__logo-text {
    font-size: 20px;
    font-weight: 700;
    color: #0e1731;
    letter-spacing: -0.02em;
  }

  &__search {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 12px 8px;
    padding: 8px;
    border-radius: 4px;
    background-color: #f3f4f6;
    color: #9ca3af;
    font-size: 14px;

    span {
      flex: 1;
    }

    kbd {
      font-size: 12px;
      font-family: inherit;
    }
  }

  &__nav {
    flex: 1;
    overflow-y: auto;
    padding: 4px 8px 12px;
  }

  &__group-label {
    padding: 14px 10px 4px;
    font-size: 12px;
    color: #9ca3af;
  }

  &__nav-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border-radius: 4px;
    font-size: 14px;
    color: #4b5563;
    text-align: left;

    &:hover {
      background-color: #f3f4f6;
      color: #111827;
    }

    &.is-active {
      background-color: #eef7f3;
      color: #0f9d75;
      font-weight: 600;

      &::before {
        content: "";
        position: absolute;
        left: 0;
        top: 8px;
        bottom: 8px;
        width: 3px;
        border-radius: 999px;
        background-color: #4ccba0;
      }
    }
  }

  &__nav-icon {
    display: inline-flex;
    font-size: 15px;
  }

  &__nav-label {
    flex: 1;
  }

  &__nav-badge {
    padding: 0 6px;
    border-radius: 999px;
    background-color: #4ccba0;
    color: #0e1731;
    font-size: 10px;
    font-weight: 700;
    line-height: 16px;
  }

  &__profile {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 70px;
    padding: 12px;
    border-top: 1px solid #f0f1f3;
  }

  &__avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: #0e1731;
    color: #fff;
    font-size: 13px;
  }

  &__profile-info {
    flex: 1;
    min-width: 0;
  }

  &__profile-name {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
  }

  &__profile-role {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 2px;
    font-size: 11px;
    color: #6b7280;
  }

  &__role-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #4ccba0;
  }

  &__profile-action {
    color: #9ca3af;
    font-size: 14px;
  }

  &__main {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 100vh;

    @media (min-width: 768px) {
      width: calc(100% - 16rem);
      margin-left: 16rem;
    }
  }

  &__mobile-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    padding: 0 16px;
    background-color: #fff;
    border-bottom: 1px solid #e5e7eb;

    button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 600;
      color: #111827;
    }

    @media (min-width: 768px) {
      display: none;
    }
  }

  &__mobile-menu {
    display: flex;
    flex-direction: column;
    padding: 8px;
    background-color: #fff;
    border-bottom: 1px solid #e5e7eb;

    button {
      height: 36px;
      padding: 0 10px;
      border-radius: 4px;
      font-size: 14px;
      text-align: left;
      color: #4b5563;

      &.is-active {
        background-color: #eef7f3;
        color: #0f9d75;
        font-weight: 600;
      }
    }

    @media (min-width: 768px) {
      display: none;
    }
  }

  &__placeholder {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 48px 24px;
    color: #6b7280;

    h2 {
      margin-top: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #111827;
    }

    p {
      font-size: 13px;
    }

    button {
      margin-top: 12px;
      height: 36px;
      padding: 0 16px;
      border-radius: 4px;
      background-color: #4ccba0;
      color: #0e1731;
      font-size: 14px;
      font-weight: 600;
    }
  }

  &__footer {
    margin-top: auto;
    padding: 16px;
    text-align: center;
    font-size: 14px;
    color: #4b5563;

    a {
      color: #4b5563;

      &:hover {
        color: #111827;
      }
    }
  }
}
</style>
