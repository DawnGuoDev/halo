<script lang="ts" setup>
import {
  IconDeleteBin,
  IconEye,
  IconStopCircle,
  VTag,
} from "@halo-dev/components";
import { computed } from "vue";
import type { Announcement } from "../types";
import {
  isDeletableStatus,
  isPublishedStatus,
  positionLabel,
  statusLabel,
  statusTheme,
} from "../types";
import { formatDateTime, formatRange } from "../utils";
import AnnouncementPreview from "./AnnouncementPreview.vue";

const props = defineProps<{
  announcement: Announcement;
  busy?: boolean;
  shadowed?: boolean;
}>();

const emit = defineEmits<{
  (event: "close"): void;
  (event: "edit", announcement: Announcement): void;
  (event: "publish", announcement: Announcement): void;
  (event: "disable", announcement: Announcement): void;
  (event: "delete", announcement: Announcement): void;
}>();

const lines = computed(() =>
  props.announcement.content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
);
</script>

<template>
  <div class="announcement-detail" role="dialog" aria-modal="true">
    <div class="announcement-detail__mask" @click="emit('close')" />
    <aside class="announcement-detail__panel">
      <header class="announcement-detail__header">
        <div>
          <h2>公告详情</h2>
          <p>查看公告全部字段与当前展示状态</p>
        </div>
        <button
          type="button"
          class="announcement-detail__close"
          aria-label="关闭"
          @click="emit('close')"
        >
          ✕
        </button>
      </header>

      <div class="announcement-detail__body">
        <div class="announcement-detail__title-row">
          <h3>{{ announcement.title }}</h3>
          <VTag :theme="statusTheme(announcement.status)">
            {{ statusLabel(announcement.status) }}
          </VTag>
        </div>

        <div
          v-if="shadowed"
          class="announcement-detail__alert announcement-detail__alert--warning"
        >
          该公告与同位置的另一条公告同时在展示期，按「同一位置仅展示最新一条」规则，当前展示的是开始时间更晚的公告。
        </div>
        <div
          v-if="isPublishedStatus(announcement.status)"
          class="announcement-detail__alert"
        >
          已发布公告不可直接编辑，如需修改内容请先停用。
        </div>

        <div class="announcement-detail__preview">
          <div class="announcement-detail__preview-label">展示效果预览</div>
          <AnnouncementPreview
            :position="announcement.position"
            :title="announcement.title"
            :content="announcement.content"
            dismissible
          />
        </div>

        <dl class="announcement-detail__fields">
          <div>
            <dt>展示位置</dt>
            <dd>{{ positionLabel(announcement.position) }}</dd>
          </div>
          <div>
            <dt>开始时间</dt>
            <dd>{{ formatDateTime(announcement.startTime) }}</dd>
          </div>
          <div>
            <dt>结束时间</dt>
            <dd>{{ formatDateTime(announcement.endTime) }}</dd>
          </div>
          <div>
            <dt>展示时间</dt>
            <dd>
              {{ formatRange(announcement.startTime, announcement.endTime) }}
            </dd>
          </div>
          <div>
            <dt>发布时间</dt>
            <dd>{{ formatDateTime(announcement.publishTime) }}</dd>
          </div>
          <div>
            <dt>更新时间</dt>
            <dd>{{ formatDateTime(announcement.updateTime) }}</dd>
          </div>
        </dl>

        <section class="announcement-detail__content">
          <h4>正文</h4>
          <div class="announcement-detail__content-body">
            <p v-for="(line, index) in lines" :key="index">{{ line }}</p>
          </div>
        </section>
      </div>

      <footer class="announcement-detail__footer">
        <button
          v-if="isDeletableStatus(announcement.status)"
          type="button"
          class="announcement-detail__button announcement-detail__button--danger"
          :disabled="busy"
          @click="emit('delete', announcement)"
        >
          <IconDeleteBin />
          删除
        </button>
        <span class="announcement-detail__spacer" />
        <button
          v-if="isPublishedStatus(announcement.status)"
          type="button"
          class="announcement-detail__button"
          :disabled="busy"
          @click="emit('disable', announcement)"
        >
          <IconStopCircle />
          停用
        </button>
        <button
          v-if="
            announcement.status === 'DRAFT' ||
            announcement.status === 'DISABLED'
          "
          type="button"
          class="announcement-detail__button"
          :disabled="busy"
          @click="emit('edit', announcement)"
        >
          编辑
        </button>
        <button
          v-if="announcement.status === 'DRAFT'"
          type="button"
          class="announcement-detail__button announcement-detail__button--primary"
          :disabled="busy"
          @click="emit('publish', announcement)"
        >
          <IconEye />
          发布
        </button>
      </footer>
    </aside>
  </div>
</template>

<style scoped lang="scss">
.announcement-detail {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  justify-content: flex-end;

  &__mask {
    position: absolute;
    inset: 0;
    background-color: rgba(15, 23, 42, 0.4);
  }

  &__panel {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    width: 560px;
    max-width: 100%;
    height: 100%;
    background-color: #fff;
    box-shadow: -10px 0 40px rgba(15, 23, 42, 0.2);
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;

    h2 {
      font-size: 16px;
      font-weight: 700;
      color: #1f2937;
    }

    p {
      margin-top: 2px;
      font-size: 12px;
      color: #6b7280;
    }
  }

  &__close {
    color: #6b7280;
    font-size: 14px;
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  &__title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;

    h3 {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      line-height: 1.4;
      word-break: break-word;
    }
  }

  &__alert {
    margin-top: 12px;
    padding: 8px 12px;
    border-radius: 4px;
    background-color: #f3f4f6;
    color: #4b5563;
    font-size: 12px;
    line-height: 1.6;

    &--warning {
      background-color: #fff8e6;
      color: #92400e;
    }
  }

  &__preview {
    margin-top: 16px;
  }

  &__preview-label {
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
  }

  &__fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 16px;
    margin-top: 20px;
    padding: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;

    dt {
      font-size: 12px;
      color: #6b7280;
    }

    dd {
      margin-top: 2px;
      font-size: 13px;
      color: #111827;
      word-break: break-word;
    }
  }

  &__content {
    margin-top: 16px;

    h4 {
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }
  }

  &__content-body {
    padding: 12px 14px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    background-color: #f9fafb;
    font-size: 13px;
    line-height: 1.8;
    color: #1f2937;
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid #e5e7eb;
  }

  &__spacer {
    flex: 1;
  }

  &__button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 16px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background-color: #fff;
    font-size: 14px;
    color: #374151;

    &:hover:not(:disabled) {
      background-color: #f9fafb;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &--primary {
      border-color: #4ccba0;
      background-color: #4ccba0;
      color: #0e1731;
      font-weight: 600;

      &:hover:not(:disabled) {
        background-color: #3fbd92;
      }
    }

    &--danger {
      border-color: #fecaca;
      color: #d71d1d;

      &:hover:not(:disabled) {
        background-color: #fef2f2;
      }
    }
  }
}
</style>
