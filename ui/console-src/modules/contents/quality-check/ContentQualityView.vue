<script lang="ts" setup>
import {
  VButton,
  VCard,
  VFilterDropdown,
  VSpace,
  Toast,
} from "@halo-dev/components";
import { computed, nextTick, ref } from "vue";
import { useI18n } from "vue-i18n";
import ContentQualityIssueList from "./components/ContentQualityIssueList.vue";
import QualityIssueDrawer from "./components/QualityIssueDrawer.vue";
import { useContentQuality } from "./composables/use-content-quality";
import { issueCopyEn } from "./mock/issue-copy.en";
import { issueCopyZhCN } from "./mock/issue-copy.zh-CN";
import { createMockApi } from "./mock/mock";
import type { IssueFilters, QualityIssue } from "./types";

const { t, locale } = useI18n();
// Mock 接入点：后端 ContentQualityIssue 接口落地后替换为真实数据源。
const api = createMockApi(
  locale.value.toLowerCase().startsWith("en") ? issueCopyEn : issueCopyZhCN
);
// 原型包显示 Mock 标记；接入真实数据源时由集成改动切换为 false。
const showDemoTag = import.meta.env.DEV;
const q = useContentQuality(api);

const drawerOpen = ref(false);
const drawerIssue = ref<QualityIssue | null>(null);
const drawerMode = ref<"ignore" | null>(null);
const drawerBusy = ref(false);

const batchOpen = ref(false);
const batchReason = ref("");
const batchError = ref("");
const batchInput = ref<HTMLTextAreaElement | null>(null);

const batchSplit = computed(() => {
  const split = q.splitForIgnore(q.selectedIds.value);
  return { ...split, eligibleCount: split.eligible.length };
});

function openIssue(issue: QualityIssue) {
  drawerIssue.value = issue;
  drawerMode.value = null;
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
  drawerMode.value = null;
  drawerIssue.value = null;
}

function visibleIssue(issue: QualityIssue | null) {
  if (!issue) return null;
  const current = q.result.value.items.find((item) => item.id === issue.id);
  return current ?? issue;
}

async function handleFixed(issue: QualityIssue) {
  drawerBusy.value = true;
  await new Promise((resolve) => setTimeout(resolve, 180));
  q.markFixed([issue.id]);
  drawerBusy.value = false;
  drawerIssue.value = null;
  closeDrawer();
  Toast.success(t("core.content_quality.toast.fixed"));
}

async function handleDrawerIgnore(issue: QualityIssue, reason: string) {
  drawerBusy.value = true;
  await new Promise((resolve) => setTimeout(resolve, 120));
  q.ignoreIssues([issue.id], reason);
  drawerBusy.value = false;
  closeDrawer();
  Toast.success(t("core.content_quality.toast.ignored", { count: 1 }));
}

function handleRestore(issue: QualityIssue) {
  q.restoreIssues([issue.id]);
  drawerIssue.value = null;
  closeDrawer();
  Toast.success(t("core.content_quality.toast.restored"));
}

function openBatchIgnore() {
  batchReason.value = "";
  batchError.value = "";
  batchOpen.value = true;
  nextTick(() => batchInput.value?.focus());
}

async function submitBatchIgnore() {
  if (!batchReason.value.trim()) {
    batchError.value = t("core.content_quality.ignore.reason_required");
    batchInput.value?.focus();
    return;
  }
  const split = batchSplit.value;
  if (split.eligible.length === 0) return;
  batchError.value = "";
  const count = q.ignoreIssues(split.eligible, batchReason.value.trim());
  batchOpen.value = false;
  Toast.success(t("core.content_quality.toast.ignored", { count }));
}

const typeOptions = computed(() => [
  { label: t("core.content_quality.types.broken-link"), value: "broken-link" },
  {
    label: t("core.content_quality.types.missing-image"),
    value: "missing-image",
  },
  {
    label: t("core.content_quality.types.missing-excerpt"),
    value: "missing-excerpt",
  },
]);
const severityOptions = computed(() => [
  { label: t("core.content_quality.severity.critical"), value: "critical" },
  { label: t("core.content_quality.severity.normal"), value: "normal" },
  { label: t("core.content_quality.severity.tip"), value: "tip" },
]);
const statusOptions = computed(() => [
  { label: t("core.content_quality.status.pending"), value: "pending" },
  { label: t("core.content_quality.status.fixed"), value: "fixed" },
  { label: t("core.content_quality.status.ignored"), value: "ignored" },
]);

const typeProxy = computed({
  get: () => q.filters.type,
  set: (value: IssueFilters["type"]) => {
    q.filters.type = (value as IssueFilters["type"]) || "";
  },
});
const severityProxy = computed({
  get: () => q.filters.severity,
  set: (value: IssueFilters["severity"]) => {
    q.filters.severity = (value as IssueFilters["severity"]) || "";
  },
});
const statusProxy = computed({
  get: () => q.filters.status,
  set: (value: IssueFilters["status"]) => {
    q.filters.status = (value as IssueFilters["status"]) || "";
  },
});

const stats = computed(() => q.stats.value);
const check = computed(() => q.check);

function handlePage(next: number) {
  q.setPage(next);
}
function handleSize() {
  q.setPage(1);
}
</script>

<template>
  <div class="quality-page" data-testid="page-ready">
    <div class="quality-page__header">
      <div class="quality-page__title-row">
        <div>
          <h1 class="quality-page__title">
            {{ $t("core.content_quality.title") }}
          </h1>
          <p class="quality-page__subtitle">
            {{ $t("core.content_quality.description") }}
            <span
              v-if="showDemoTag"
              class="quality-page__demo-tag"
              :title="$t('core.content_quality.demo.banner_desc')"
            >
              {{ $t("core.content_quality.demo.banner", { count: 20 }) }}
            </span>
          </p>
        </div>
        <VSpace>
          <VButton
            data-testid="recheck"
            :disabled="check.state === 'running'"
            :loading="check.state === 'running'"
            @click="q.startCheck()"
          >
            {{ $t("core.content_quality.actions.recheck") }}
          </VButton>
        </VSpace>
      </div>
      <div class="quality-stats" data-testid="stats">
        <div
          class="quality-stat quality-stat--primary"
          data-testid="stat-pending"
        >
          <div class="quality-stat__label">
            {{ $t("core.content_quality.stats.pending") }}
          </div>
          <div class="quality-stat__value">{{ stats.pending }}</div>
          <div class="quality-stat__hint">
            {{ $t("core.content_quality.stats.pending_hint") }}
          </div>
        </div>
        <div class="quality-stat" data-testid="stat-articles">
          <div class="quality-stat__label">
            {{ $t("core.content_quality.stats.articles") }}
          </div>
          <div class="quality-stat__value">{{ stats.articles }}</div>
          <div class="quality-stat__hint">
            {{ $t("core.content_quality.stats.articles_hint") }}
          </div>
        </div>
        <div class="quality-stat" data-testid="stat-critical">
          <div class="quality-stat__label">
            {{ $t("core.content_quality.stats.critical") }}
          </div>
          <div class="quality-stat__value quality-stat__value--danger">
            {{ stats.critical }}
          </div>
          <div class="quality-stat__hint">
            {{ $t("core.content_quality.stats.critical_hint") }}
          </div>
        </div>
        <div class="quality-stat" data-testid="stat-ignored">
          <div class="quality-stat__label">
            {{ $t("core.content_quality.stats.ignored") }}
          </div>
          <div class="quality-stat__value">{{ stats.ignored }}</div>
          <div class="quality-stat__hint">
            {{ $t("core.content_quality.stats.ignored_hint") }}
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="check.state === 'running'"
      class="quality-check-banner"
      data-testid="check-panel"
      data-state="running"
    >
      <div class="quality-check-banner__head">
        <span class="quality-check-banner__spinner" aria-hidden="true" />
        <span class="quality-check-banner__title">
          {{
            $t("core.content_quality.recheck.running", {
              current: Math.min(20, Math.ceil((check.percent / 100) * 20)),
              total: 20,
            })
          }}
        </span>
        <span class="quality-check-banner__percent">{{ check.percent }}%</span>
      </div>
      <div
        class="quality-progress"
        role="progressbar"
        :aria-valuenow="check.percent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          class="quality-progress__bar"
          :style="{ width: `${check.percent}%` }"
        />
      </div>
      <p class="quality-check-banner__hint">
        {{ $t("core.content_quality.recheck.running_hint") }}
      </p>
    </div>
    <div
      v-else-if="check.state === 'failed'"
      class="quality-check-banner quality-check-banner--failed"
      data-testid="check-panel"
      data-state="failed"
    >
      <div class="quality-check-banner__head">
        <span class="quality-check-banner__title">{{
          $t("core.content_quality.recheck.failed")
        }}</span>
        <VSpace>
          <VButton
            data-testid="check-dismiss"
            size="sm"
            @click="q.clearCheckNotice()"
          >
            {{ $t("core.content_quality.recheck.dismiss") }}
          </VButton>
          <VButton
            data-testid="check-retry"
            size="sm"
            type="primary"
            @click="q.startCheck()"
          >
            {{ $t("core.content_quality.recheck.retry") }}
          </VButton>
        </VSpace>
      </div>
      <p class="quality-check-banner__hint">
        {{ $t("core.content_quality.recheck.failed_message", { count: 3 }) }}
      </p>
    </div>
    <div
      v-else-if="check.state === 'success'"
      class="quality-check-banner quality-check-banner--success"
      data-testid="check-panel"
      data-state="success"
    >
      <div class="quality-check-banner__head">
        <span class="quality-check-banner__title">
          {{
            $t("core.content_quality.recheck.success", {
              count: q.checkUpdatedCount.value,
            })
          }}
        </span>
        <VButton
          data-testid="check-dismiss"
          size="sm"
          @click="q.clearCheckNotice()"
        >
          {{ $t("core.content_quality.recheck.dismiss") }}
        </VButton>
      </div>
      <p class="quality-check-banner__hint">
        {{ $t("core.content_quality.recheck.success_hint") }}
      </p>
    </div>

    <VCard :body-class="['!p-0']" data-testid="quality-card">
      <template #header>
        <div class="quality-toolbar">
          <div class="quality-toolbar__search">
            <input
              v-model="q.filters.keyword"
              :aria-label="$t('core.content_quality.filters.keyword')"
              class="quality-search"
              data-testid="keyword"
              :placeholder="$t('core.content_quality.filters.keyword')"
              type="search"
            />
          </div>
          <div class="quality-toolbar__filters">
            <VFilterDropdown
              v-model="typeProxy"
              data-testid="filter-type"
              :label="$t('core.content_quality.filters.type')"
              :options="typeOptions"
              show-clear-option
              :clear-label="
                $t('core.content_quality.filters.clear', {
                  label: $t('core.content_quality.filters.type'),
                })
              "
            />
            <VFilterDropdown
              v-model="severityProxy"
              data-testid="filter-severity"
              :label="$t('core.content_quality.filters.severity')"
              :options="severityOptions"
              show-clear-option
              :clear-label="
                $t('core.content_quality.filters.clear', {
                  label: $t('core.content_quality.filters.severity'),
                })
              "
            />
            <VFilterDropdown
              v-model="statusProxy"
              data-testid="filter-status"
              :label="$t('core.content_quality.filters.status')"
              :options="statusOptions"
              show-clear-option
              :clear-label="
                $t('core.content_quality.filters.clear', {
                  label: $t('core.content_quality.filters.status'),
                })
              "
            />
            <VButton data-testid="reset" @click="q.clearFilters()">
              {{ $t("core.content_quality.filters.reset") }}
            </VButton>
          </div>
        </div>
      </template>

      <div
        v-if="q.selectedIds.value.length"
        class="quality-selection-bar"
        data-testid="selection-bar"
      >
        <div>
          <span class="quality-selection-bar__count">
            {{
              $t("core.content_quality.selection.selected", {
                count: q.selectedIds.value.length,
              })
            }}
          </span>
          <span class="quality-selection-bar__hint">{{
            $t("core.content_quality.selection.hint")
          }}</span>
        </div>
        <VSpace>
          <VButton
            data-testid="clear-selection"
            @click="q.selectedIds.value = []"
          >
            {{ $t("core.content_quality.selection.clear") }}
          </VButton>
          <VButton
            data-testid="batch-ignore"
            type="secondary"
            @click="openBatchIgnore()"
          >
            {{ $t("core.content_quality.selection.batch_ignore") }}
          </VButton>
        </VSpace>
      </div>

      <ContentQualityIssueList
        :issues="q.result.value.items"
        :total="q.result.value.total"
        :page="q.page.value"
        :size="q.size"
        :selected-ids="q.selectedIds.value"
        :has-filters="q.hasFilters.value"
        :empty-title="
          q.hasFilters.value
            ? $t('core.content_quality.empty.title')
            : $t('core.content_quality.empty.all_clear')
        "
        :empty-message="
          q.hasFilters.value
            ? $t('core.content_quality.empty.message')
            : $t('core.content_quality.empty.all_clear_message')
        "
        @open="openIssue"
        @toggle="q.toggleSelected"
        @select-page="q.selectPage"
        @update:page="handlePage"
        @update:size="handleSize"
        @reset="q.clearFilters()"
      />
    </VCard>

    <QualityIssueDrawer
      :issue="visibleIssue(drawerIssue)"
      :open="drawerOpen"
      :mode="drawerMode"
      :busy="drawerBusy"
      @close="closeDrawer"
      @fixed="handleFixed"
      @ignore="handleDrawerIgnore"
      @restore="handleRestore"
    />

    <div
      v-if="batchOpen"
      class="quality-batch-overlay"
      data-testid="batch-dialog"
    >
      <div class="quality-batch-layer" @click="batchOpen = false" />
      <section
        aria-labelledby="quality-batch-title"
        aria-modal="true"
        class="quality-batch-panel"
        role="dialog"
      >
        <header class="quality-batch-header">
          <h2 id="quality-batch-title">
            {{ $t("core.content_quality.ignore.batch_title") }}
          </h2>
          <button
            :aria-label="$t('core.content_quality.ignore.close')"
            class="quality-batch-close"
            type="button"
            @click="batchOpen = false"
          >
            ✕
          </button>
        </header>
        <div class="quality-batch-body">
          <p class="quality-batch__summary">
            {{ $t("core.content_quality.ignore.description") }}
          </p>
          <div
            v-if="batchSplit.skipped > 0"
            class="quality-batch__mixed"
            data-testid="batch-mixed"
          >
            <span
              class="quality-batch__mixed-dot"
              :class="
                batchSplit.eligibleCount > 0 ? 'bg-orange-400' : 'bg-red-400'
              "
            />
            <span v-if="batchSplit.eligibleCount > 0">
              {{
                $t("core.content_quality.ignore.mixed", {
                  total: batchSplit.total,
                  eligible: batchSplit.eligibleCount,
                  skipped: batchSplit.skipped,
                })
              }}
            </span>
            <span v-else>{{
              $t("core.content_quality.ignore.none_eligible")
            }}</span>
          </div>
          <div class="quality-field">
            <label class="quality-field__label" for="batch-ignore-reason">
              {{ $t("core.content_quality.ignore.reason_label") }}
              <span class="text-red-500">*</span>
            </label>
            <textarea
              id="batch-ignore-reason"
              ref="batchInput"
              v-model="batchReason"
              :aria-label="$t('core.content_quality.ignore.reason_label')"
              class="quality-field__textarea"
              data-testid="batch-reason"
              :placeholder="$t('core.content_quality.ignore.batch_placeholder')"
              rows="3"
              :aria-invalid="batchError ? 'true' : undefined"
              @input="batchError = ''"
            />
            <span
              v-if="batchError"
              class="quality-field__error"
              data-testid="batch-error"
              role="alert"
            >
              {{ batchError }}
            </span>
          </div>
          <div
            v-if="batchSplit.eligibleCount > 0"
            class="quality-batch__will-ignore"
            data-testid="batch-eligible-count"
          >
            {{
              $t("core.content_quality.ignore.will_ignore", {
                count: batchSplit.eligibleCount,
              })
            }}
          </div>
        </div>
        <footer class="quality-batch-footer">
          <div class="quality-batch__footer">
            <VSpace>
              <VButton data-testid="batch-cancel" @click="batchOpen = false">
                {{ $t("core.common.buttons.cancel") }}
              </VButton>
              <VButton
                data-testid="batch-confirm"
                type="danger"
                :disabled="batchSplit.eligibleCount === 0"
                @click="submitBatchIgnore"
              >
                {{ $t("core.content_quality.ignore.confirm") }}
              </VButton>
            </VSpace>
          </div>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.quality-page {
  padding: 16px;
  max-width: 1500px;
}
.quality-page__header {
  margin-bottom: 16px;
}
.quality-page__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.quality-page__title {
  font-size: 20px;
  font-weight: 700;
  color: #1d2129;
  line-height: 1.4;
}
.quality-page__subtitle {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: #6b7280;
}
.quality-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.quality-stat {
  position: relative;
  overflow: hidden;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #eaecf0;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.03);
}
.quality-stat--primary {
  border-color: #c6f0e0;
  background: linear-gradient(135deg, #f0fbf6 0%, #ffffff 70%);
}
.quality-stat__label {
  font-size: 12px;
  color: #86909c;
}
.quality-stat__value {
  margin-top: 6px;
  font-size: 26px;
  line-height: 1.2;
  font-weight: 700;
  color: #1d2129;
  font-variant-numeric: tabular-nums;
}
.quality-stat__value--danger {
  color: #d71d1d;
}
.quality-stat__hint {
  margin-top: 4px;
  font-size: 11px;
  color: #a0a7b2;
}
.quality-check-banner {
  margin-bottom: 12px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #d6e9ff;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
}
.quality-check-banner--failed {
  border-color: #f5d7d7;
  background: #fffafa;
}
.quality-check-banner--success {
  border-color: #c6f0e0;
  background: #f7fdfa;
}
.quality-check-banner__head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.quality-check-banner__head > :last-child {
  margin-left: auto;
}
.quality-check-banner__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #c9e1ff;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: quality-spin 0.8s linear infinite;
}
.quality-check-banner__title {
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
}
.quality-check-banner__percent {
  margin-left: auto;
  font-size: 12px;
  color: #3b82f6;
  font-variant-numeric: tabular-nums;
}
.quality-check-banner__hint {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}
.quality-progress {
  height: 6px;
  margin-top: 10px;
  border-radius: 999px;
  background: #eef2f7;
  overflow: hidden;
}
.quality-progress__bar {
  height: 100%;
  border-radius: inherit;
  background: #4ccba0;
  transition: width 0.12s linear;
}
.quality-page__demo-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 11px;
  color: #6b7280;
  background: #f2f3f5;
  border: 1px solid #eaecf0;
  border-radius: 3px;
  cursor: help;
}
.quality-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: #fafbfc;
  border-radius: 4px 4px 0 0;
}
.quality-toolbar__search {
  flex: 1 1 260px;
  max-width: 360px;
}
.quality-search {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  font-size: 13px;
  color: #1d2129;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  outline: none;
}
.quality-search:focus {
  border-color: #4ccba0;
  box-shadow: 0 0 0 2px rgba(76, 203, 160, 0.18);
}
.quality-toolbar__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.quality-selection-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 16px;
  background: #f0fbf6;
  border-bottom: 1px solid #c6f0e0;
  font-size: 12px;
  color: #1d2129;
}
.quality-selection-bar__count {
  font-weight: 600;
}
.quality-selection-bar__hint {
  margin-left: 8px;
  color: #6b7280;
}
.quality-batch__summary {
  font-size: 13px;
  line-height: 1.7;
  color: #4e5969;
}
.quality-batch__mixed {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.7;
  color: #1d2129;
  background: #fffaf0;
  border: 1px solid #f5e3b3;
  border-radius: 4px;
}
.quality-batch__mixed-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  margin-top: 7px;
  border-radius: 999px;
}
.quality-field {
  display: block;
  margin-top: 14px;
}
.quality-field__label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #1d2129;
}
.quality-field__textarea {
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.6;
  color: #1d2129;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  outline: none;
  resize: vertical;
}
.quality-field__textarea:focus {
  border-color: #4ccba0;
  box-shadow: 0 0 0 2px rgba(76, 203, 160, 0.18);
}
.quality-field__textarea[aria-invalid="true"] {
  border-color: #ef4444;
}
.quality-field__error {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #ef4444;
}
.quality-batch__will-ignore {
  margin-top: 10px;
  font-size: 12px;
  font-weight: 500;
  color: #16a37a;
}
.quality-batch__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.quality-batch-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.quality-batch-layer {
  position: absolute;
  inset: 0;
  background: rgba(29, 33, 41, 0.45);
}
.quality-batch-panel {
  position: relative;
  width: min(520px, calc(100vw - 24px));
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 16px 40px rgba(16, 24, 40, 0.2);
  animation: quality-dialog-in 0.18s ease-out;
}
.quality-batch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #eaecf0;
}
.quality-batch-header h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
}
.quality-batch-close {
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 999px;
  color: #6b7280;
  cursor: pointer;
}
.quality-batch-close:hover {
  background: #f2f3f5;
  color: #1d2129;
}
.quality-batch-body {
  padding: 14px 16px;
}
.quality-batch-footer {
  padding: 10px 16px;
  border-top: 1px solid #eaecf0;
}
@keyframes quality-dialog-in {
  from {
    transform: translateY(6px) scale(0.99);
    opacity: 0.6;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
@keyframes quality-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 900px) {
  .quality-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .quality-toolbar__filters {
    margin-left: 0;
  }
}
</style>
