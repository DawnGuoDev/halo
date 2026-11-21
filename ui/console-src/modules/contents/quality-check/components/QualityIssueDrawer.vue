<script lang="ts" setup>
import {
  VAlert,
  VButton,
  VDescription,
  VDescriptionItem,
  VSpace,
  VTag,
} from "@halo-dev/components";
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  dotClass,
  severityClass,
  severityDotClass,
  statusClass,
} from "../quality-labels";
import type { QualityIssue } from "../types";

const props = defineProps<{
  issue: QualityIssue | null;
  open: boolean;
  mode?: "ignore" | null;
  busy?: boolean;
}>();

const emit = defineEmits<{
  (event: "close"): void;
  (event: "fixed", issue: QualityIssue): void;
  (event: "ignore", issue: QualityIssue, reason: string): void;
  (event: "restore", issue: QualityIssue): void;
}>();

const { t } = useI18n();
const ignoreMode = ref(false);
const reason = ref("");
const reasonError = ref("");
const reasonInput = ref<HTMLInputElement | null>(null);

const canIgnore = computed(() => props.issue?.status === "pending");

watch(
  () => props.open,
  async (open) => {
    ignoreMode.value = props.mode === "ignore";
    reason.value = "";
    reasonError.value = "";
    if (open && ignoreMode.value) {
      await nextTick();
      reasonInput.value?.focus();
    }
  }
);

watch(
  () => props.issue?.id,
  () => {
    ignoreMode.value = props.mode === "ignore";
    reason.value = "";
    reasonError.value = "";
  }
);

function close() {
  emit("close");
}

function requestIgnore() {
  if (!canIgnore.value) return;
  ignoreMode.value = true;
  reasonError.value = "";
  nextTick(() => reasonInput.value?.focus());
}

function submitIgnore() {
  if (!props.issue) return;
  if (!reason.value.trim()) {
    reasonError.value = t("core.content_quality.ignore.reason_required");
    reasonInput.value?.focus();
    return;
  }
  reasonError.value = "";
  emit("ignore", props.issue, reason.value.trim());
  ignoreMode.value = false;
}

function operatorLabel(operator: string) {
  return operator === "system"
    ? t("core.content_quality.operator.system")
    : t("core.content_quality.operator.current");
}
</script>

<template>
  <div v-if="open" class="quality-drawer" data-testid="issue-drawer">
    <div class="quality-drawer__layer" @click="close" />
    <section
      aria-labelledby="quality-drawer-title"
      aria-modal="true"
      class="quality-drawer__panel"
      role="dialog"
    >
      <header class="quality-drawer__header">
        <h2 id="quality-drawer-title" class="quality-drawer__title">
          {{ $t("core.content_quality.detail.title") }}
        </h2>
        <button
          :aria-label="$t('core.content_quality.detail.close')"
          class="quality-drawer__close"
          type="button"
          @click="close"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </header>
      <div class="quality-drawer__body">
        <div v-if="issue" class="quality-detail">
          <div class="quality-detail__head">
            <div>
              <div class="quality-detail__eyebrow">
                {{ $t("core.content_quality.detail.article") }}
              </div>
              <h3 class="quality-detail__title" data-testid="drawer-article">
                {{ issue.articleTitle }}
              </h3>
              <p class="quality-detail__location" data-testid="drawer-location">
                <span class="quality-detail__pin">{{
                  $t("core.content_quality.detail.location_label")
                }}</span>
                {{ issue.location }}
              </p>
            </div>
            <div class="quality-detail__badges">
              <VTag theme="default">{{
                $t(`core.content_quality.types.${issue.type}`)
              }}</VTag>
              <span :class="severityClass[issue.severity]" class="text-xs">
                <span
                  class="inline-block h-1.5 w-1.5 rounded-full"
                  :class="severityDotClass[issue.severity]"
                />
                {{ $t(`core.content_quality.severity.${issue.severity}`) }}
              </span>
              <span :class="statusClass[issue.status]" class="text-xs">
                <span
                  class="inline-block h-1.5 w-1.5 rounded-full"
                  :class="dotClass[issue.status]"
                />
                <span data-testid="drawer-status">
                  {{ $t(`core.content_quality.status.${issue.status}`) }}
                </span>
              </span>
            </div>
          </div>

          <VDescription class="quality-detail__meta">
            <VDescriptionItem
              :label="$t('core.content_quality.detail.detected_at')"
            >
              {{ issue.detectedAt }}
            </VDescriptionItem>
            <VDescriptionItem
              :label="$t('core.content_quality.detail.issue_id')"
            >
              {{ issue.id }}
            </VDescriptionItem>
          </VDescription>

          <section class="quality-detail__section">
            <h4>{{ $t("core.content_quality.detail.description") }}</h4>
            <p data-testid="drawer-description">{{ issue.description }}</p>
          </section>

          <section class="quality-detail__section">
            <h4>{{ $t("core.content_quality.detail.snippet") }}</h4>
            <pre class="quality-detail__snippet" data-testid="drawer-snippet">{{
              issue.snippet
            }}</pre>
            <p class="quality-detail__hint">
              {{ $t("core.content_quality.detail.snippet_hint") }}
            </p>
          </section>

          <section class="quality-detail__section">
            <h4>{{ $t("core.content_quality.detail.suggestion") }}</h4>
            <div
              class="quality-detail__suggestion"
              data-testid="drawer-suggestion"
            >
              {{ issue.suggestion }}
            </div>
          </section>

          <section
            v-if="issue.status === 'ignored'"
            class="quality-detail__section"
          >
            <h4>{{ $t("core.content_quality.detail.ignore_reason") }}</h4>
            <div
              class="quality-detail__reason"
              data-testid="drawer-ignore-reason"
            >
              {{ issue.ignoreReason }}
            </div>
            <VAlert
              class="!mt-3"
              type="info"
              :title="$t('core.content_quality.detail.ignored_alert_title')"
              :description="
                $t('core.content_quality.detail.ignored_alert_description')
              "
            />
          </section>

          <section class="quality-detail__section">
            <h4>{{ $t("core.content_quality.detail.records") }}</h4>
            <ol class="quality-timeline" data-testid="drawer-records">
              <li
                v-for="record in issue.records"
                :key="record.id"
                class="quality-timeline__item"
              >
                <span
                  class="quality-timeline__dot"
                  :class="
                    record.action === 'fixed'
                      ? 'bg-emerald-500'
                      : record.action === 'ignored'
                        ? 'bg-gray-400'
                        : record.action === 'restored'
                          ? 'bg-orange-400'
                          : 'bg-primary'
                  "
                />
                <div class="quality-timeline__body">
                  <div class="quality-timeline__head">
                    <span class="quality-timeline__action">
                      {{ $t(`core.content_quality.records.${record.action}`) }}
                    </span>
                    <span class="quality-timeline__time">{{ record.at }}</span>
                  </div>
                  <div class="quality-timeline__note">
                    {{ operatorLabel(record.operator)
                    }}<template v-if="record.note">
                      · {{ record.note }}</template
                    >
                  </div>
                </div>
              </li>
            </ol>
          </section>

          <section v-if="ignoreMode" class="quality-detail__ignore">
            <label class="quality-field">
              <span class="quality-field__label">
                {{ $t("core.content_quality.ignore.reason_label") }}
                <span class="text-red-500">*</span>
              </span>
              <input
                ref="reasonInput"
                v-model="reason"
                class="quality-field__input"
                data-testid="drawer-ignore-reason-input"
                :placeholder="
                  $t('core.content_quality.ignore.reason_placeholder')
                "
                type="text"
                :aria-invalid="reasonError ? 'true' : undefined"
                @input="reasonError = ''"
                @keyup.enter="submitIgnore"
              />
              <span
                v-if="reasonError"
                class="quality-field__error"
                data-testid="drawer-ignore-error"
                role="alert"
              >
                {{ reasonError }}
              </span>
            </label>
            <VSpace>
              <VButton
                data-testid="drawer-ignore-cancel"
                @click="ignoreMode = false"
              >
                {{ $t("core.common.buttons.cancel") }}
              </VButton>
              <VButton
                data-testid="drawer-ignore-submit"
                type="danger"
                :disabled="busy"
                @click="submitIgnore"
              >
                {{ $t("core.content_quality.ignore.confirm") }}
              </VButton>
            </VSpace>
          </section>

          <VAlert
            v-if="issue.status === 'fixed'"
            class="!mt-4"
            type="warning"
            :title="$t('core.content_quality.detail.fixed_guard_title')"
            :description="$t('core.content_quality.detail.fixed_guard')"
          />
        </div>
      </div>
      <footer class="quality-drawer__footer">
        <div class="quality-detail__footer">
          <span class="quality-detail__footer-hint">
            <template v-if="issue?.status === 'pending'">
              {{ $t("core.content_quality.detail.footer_pending") }}
            </template>
            <template v-else-if="issue?.status === 'fixed'">
              {{ $t("core.content_quality.detail.footer_fixed") }}
            </template>
            <template v-else>
              {{ $t("core.content_quality.detail.footer_ignored") }}
            </template>
          </span>
          <VSpace>
            <VButton data-testid="drawer-close" @click="close">
              {{ $t("core.content_quality.actions.close") }}
            </VButton>
            <VButton
              v-if="issue?.status === 'ignored'"
              data-testid="drawer-restore"
              @click="issue && emit('restore', issue)"
            >
              {{ $t("core.content_quality.actions.restore") }}
            </VButton>
            <VButton
              v-if="issue?.status === 'pending'"
              data-testid="drawer-ignore"
              :disabled="busy"
              @click="requestIgnore"
            >
              {{ $t("core.content_quality.actions.ignore") }}
            </VButton>
            <VButton
              v-if="issue?.status === 'pending'"
              data-testid="drawer-mark-fixed"
              type="primary"
              :loading="busy"
              @click="issue && emit('fixed', issue)"
            >
              {{ $t("core.content_quality.actions.mark_fixed") }}
            </VButton>
          </VSpace>
        </div>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.quality-drawer {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
}
.quality-drawer__layer {
  position: absolute;
  inset: 0;
  background: rgba(29, 33, 41, 0.42);
}
.quality-drawer__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(620px, calc(100vw - 24px));
  height: 100%;
  background: #fff;
  box-shadow: -8px 0 32px rgba(16, 24, 40, 0.12);
  animation: quality-drawer-in 0.2s ease-out;
}
.quality-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #eaecf0;
}
.quality-drawer__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
}
.quality-drawer__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  color: #6b7280;
  font-size: 13px;
  cursor: pointer;
}
.quality-drawer__close:hover {
  background: #f2f3f5;
  color: #1d2129;
}
.quality-drawer__close:focus-visible {
  outline: 2px solid #4ccba0;
  outline-offset: 2px;
}
.quality-drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;
}
.quality-drawer__footer {
  border-top: 1px solid #eaecf0;
  padding: 12px 18px;
}
@keyframes quality-drawer-in {
  from {
    transform: translateX(24px);
    opacity: 0.6;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
.quality-detail__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #eaecf0;
}
.quality-detail__eyebrow {
  font-size: 11px;
  color: #9299a5;
  margin-bottom: 4px;
}
.quality-detail__title {
  font-size: 16px;
  font-weight: 700;
  color: #1d2129;
  line-height: 1.4;
}
.quality-detail__location {
  margin-top: 6px;
  font-size: 12px;
  color: #4e5969;
}
.quality-detail__pin {
  display: inline-block;
  margin-right: 6px;
  padding: 0 5px;
  border-radius: 3px;
  background: #f2f3f5;
  color: #86909c;
  font-size: 11px;
}
.quality-detail__badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}
.quality-detail__meta {
  margin-top: 12px;
}
.quality-detail__section {
  margin-top: 18px;
}
.quality-detail__section h4 {
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 6px;
}
.quality-detail__section p {
  font-size: 13px;
  line-height: 1.7;
  color: #4e5969;
}
.quality-detail__hint {
  margin-top: 6px;
  font-size: 11px !important;
  color: #86909c !important;
}
.quality-detail__snippet {
  white-space: pre-wrap;
  word-break: break-all;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.7;
  color: #1d2129;
  background: #f7f8fa;
  border: 1px solid #eaecf0;
  border-left: 3px solid #4ccba0;
  border-radius: 4px;
  padding: 10px 12px;
}
.quality-detail__suggestion {
  font-size: 13px;
  line-height: 1.7;
  color: #1d2129;
  background: #f0fbf6;
  border: 1px solid #c6f0e0;
  border-radius: 4px;
  padding: 10px 12px;
}
.quality-detail__reason {
  font-size: 13px;
  line-height: 1.7;
  color: #4e5969;
  background: #f7f8fa;
  border-radius: 4px;
  padding: 10px 12px;
}
.quality-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
}
.quality-timeline__item {
  position: relative;
  display: flex;
  gap: 10px;
  padding: 0 0 14px;
}
.quality-timeline__item:not(:last-child)::before {
  content: "";
  position: absolute;
  left: 3px;
  top: 10px;
  bottom: 0;
  width: 1px;
  background: #eaecf0;
}
.quality-timeline__dot {
  position: relative;
  z-index: 1;
  display: block;
  width: 7px;
  height: 7px;
  margin-top: 5px;
  border-radius: 999px;
  flex-shrink: 0;
}
.quality-timeline__body {
  flex: 1;
  min-width: 0;
}
.quality-timeline__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.quality-timeline__action {
  font-size: 12px;
  font-weight: 600;
  color: #1d2129;
}
.quality-timeline__time {
  font-size: 11px;
  color: #86909c;
}
.quality-timeline__note {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.6;
  color: #6b7280;
}
.quality-detail__ignore {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid #f5d7d7;
  border-radius: 4px;
  background: #fffafa;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.quality-field {
  display: block;
}
.quality-field__label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #1d2129;
}
.quality-field__input {
  width: 100%;
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0 10px;
  font-size: 13px;
  outline: none;
}
.quality-field__input:focus {
  border-color: #4ccba0;
  box-shadow: 0 0 0 2px rgba(76, 203, 160, 0.18);
}
.quality-field__input[aria-invalid="true"] {
  border-color: #ef4444;
}
.quality-field__error {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #ef4444;
}
.quality-detail__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}
.quality-detail__footer-hint {
  font-size: 12px;
  color: #86909c;
}
</style>
