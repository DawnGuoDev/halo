<script lang="ts" setup>
import { IconClose, IconNotificationBadgeLine } from "@halo-dev/components";
import { computed } from "vue";
import type { AnnouncementPosition } from "../types";

const props = withDefaults(
  defineProps<{
    position: AnnouncementPosition;
    title: string;
    content: string;
    dismissible?: boolean;
    compact?: boolean;
  }>(),
  {
    dismissible: false,
    compact: false,
  }
);

const paragraphs = computed(() =>
  props.content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
);

const placeholder = computed(() => !props.title.trim());
</script>

<template>
  <div
    class="announcement-preview"
    :class="{
      'announcement-preview--banner': position === 'HOME_BANNER',
      'announcement-preview--notice': position === 'SITE_WIDE_NOTICE',
      'announcement-preview--compact': compact,
    }"
  >
    <template v-if="position === 'HOME_BANNER'">
      <div class="announcement-preview__banner">
        <div class="announcement-preview__banner-inner">
          <div class="announcement-preview__eyebrow">
            <span class="announcement-preview__badge">公告</span>
            <span>首页横幅</span>
          </div>
          <h3 class="announcement-preview__banner-title">
            {{ title || "公告标题将展示在这里" }}
          </h3>
          <p
            v-for="(line, index) in paragraphs.length
              ? paragraphs
              : ['公告正文将展示在这里']"
            :key="index"
            class="announcement-preview__banner-text"
          >
            {{ line }}
          </p>
          <button type="button" class="announcement-preview__banner-action">
            查看详情
          </button>
        </div>
        <div v-if="dismissible" class="announcement-preview__banner-close">
          <IconClose />
        </div>
      </div>
    </template>
    <template v-else>
      <div class="announcement-preview__notice">
        <span class="announcement-preview__notice-icon">
          <IconNotificationBadgeLine />
        </span>
        <div class="announcement-preview__notice-body">
          <span class="announcement-preview__notice-title">
            {{ title || "公告标题将展示在这里" }}
          </span>
          <span class="announcement-preview__notice-text">
            {{ paragraphs[0] || "公告正文将展示在这里" }}
          </span>
        </div>
        <button type="button" class="announcement-preview__notice-action">
          了解详情
        </button>
        <span v-if="dismissible" class="announcement-preview__notice-close">
          <IconClose />
        </span>
      </div>
    </template>
    <p v-if="placeholder" class="announcement-preview__hint">
      填写标题和正文后可查看更接近真实的展示效果
    </p>
  </div>
</template>

<style scoped lang="scss">
.announcement-preview {
  width: 100%;

  &__banner {
    position: relative;
    overflow: hidden;
    border-radius: 8px;
    background:
      radial-gradient(
        circle at 85% 20%,
        rgba(76, 203, 160, 0.35),
        transparent 55%
      ),
      linear-gradient(135deg, #0e1731 0%, #1b2a4f 60%, #143c33 100%);
    color: #fff;
    padding: 24px 28px;
  }

  &__banner-inner {
    max-width: 640px;
  }

  &__eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.7);
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    background-color: #4ccba0;
    color: #0e1731;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  &__banner-title {
    margin-top: 12px;
    font-size: 22px;
    line-height: 1.35;
    font-weight: 700;
  }

  &__banner-text {
    margin-top: 8px;
    font-size: 14px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.82);
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__banner-action {
    margin-top: 16px;
    display: inline-flex;
    align-items: center;
    height: 32px;
    padding: 0 16px;
    border-radius: 4px;
    background-color: #fff;
    color: #0e1731;
    font-size: 13px;
    font-weight: 600;
  }

  &__banner-close {
    position: absolute;
    top: 12px;
    right: 12px;
    color: rgba(255, 255, 255, 0.7);
  }

  &__notice {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    border: 1px solid #d7efe6;
    border-left: 3px solid #4ccba0;
    border-radius: 4px;
    background-color: #f4fbf8;
    padding: 10px 12px;
  }

  &__notice-icon {
    display: flex;
    color: #19a97a;
    margin-top: 1px;
  }

  &__notice-body {
    flex: 1;
    min-width: 0;
  }

  &__notice-title {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #0e1731;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__notice-text {
    display: block;
    margin-top: 2px;
    font-size: 12px;
    line-height: 1.6;
    color: #4b5563;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__notice-action {
    flex: none;
    font-size: 12px;
    font-weight: 600;
    color: #0f9d75;
    padding-top: 1px;
  }

  &__notice-close {
    flex: none;
    color: #6b7280;
    padding-top: 1px;
  }

  &__hint {
    margin-top: 8px;
    font-size: 12px;
    color: #9ca3af;
  }

  &--compact {
    .announcement-preview__banner {
      padding: 16px 18px;
    }

    .announcement-preview__banner-title {
      font-size: 16px;
      margin-top: 8px;
    }

    .announcement-preview__banner-text {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .announcement-preview__banner-action {
      display: none;
    }
  }
}
</style>
