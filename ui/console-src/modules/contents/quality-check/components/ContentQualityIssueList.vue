<script lang="ts" setup>
import { VButton, VEmpty, VPagination } from "@halo-dev/components";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  dotClass,
  severityClass,
  severityDotClass,
  statusClass,
  typeDotClass,
} from "../quality-labels";
import type { QualityIssue } from "../types";

const props = defineProps<{
  issues: QualityIssue[];
  total: number;
  page: number;
  size: number;
  selectedIds: string[];
  hasFilters: boolean;
  emptyTitle: string;
  emptyMessage: string;
}>();

const { t } = useI18n();

const emit = defineEmits<{
  (event: "open", issue: QualityIssue): void;
  (event: "toggle", id: string, checked: boolean): void;
  (event: "select-page", checked: boolean): void;
  (event: "update:page", page: number): void;
  (event: "update:size", size: number): void;
  (event: "reset"): void;
}>();

const pageIds = computed(() => props.issues.map((item) => item.id));
const allChecked = computed(
  () =>
    pageIds.value.length > 0 &&
    pageIds.value.every((id) => props.selectedIds.includes(id))
);
const someChecked = computed(
  () =>
    !allChecked.value &&
    pageIds.value.some((id) => props.selectedIds.includes(id))
);
</script>

<template>
  <div>
    <div v-if="issues.length === 0" data-testid="issue-empty">
      <VEmpty :title="emptyTitle" :message="emptyMessage">
        <template #actions>
          <VButton
            v-if="hasFilters"
            data-testid="empty-reset"
            @click="emit('reset')"
          >
            {{ t("core.content_quality.filters.reset") }}
          </VButton>
        </template>
      </VEmpty>
    </div>
    <div v-else class="quality-table-wrap">
      <table
        class="quality-table"
        :aria-label="t('core.content_quality.table.aria')"
        data-testid="issue-table"
      >
        <colgroup>
          <col class="c-check" />
          <col class="c-issue" />
          <col class="c-article" />
          <col class="c-type" />
          <col class="c-severity" />
          <col class="c-status" />
          <col class="c-time" />
          <col class="c-actions" />
        </colgroup>
        <thead>
          <tr>
            <th class="quality-table__check">
              <input
                :checked="allChecked"
                :indeterminate.prop="someChecked"
                :aria-label="t('core.content_quality.selection.select_all')"
                data-testid="select-page"
                type="checkbox"
                @change="
                  emit(
                    'select-page',
                    ($event.target as HTMLInputElement).checked
                  )
                "
              />
            </th>
            <th>{{ t("core.content_quality.columns.issue") }}</th>
            <th>{{ t("core.content_quality.columns.article") }}</th>
            <th>{{ t("core.content_quality.columns.type") }}</th>
            <th>{{ t("core.content_quality.columns.severity") }}</th>
            <th>{{ t("core.content_quality.columns.status") }}</th>
            <th>{{ t("core.content_quality.columns.detected_at") }}</th>
            <th class="quality-table__actions">
              {{ t("core.content_quality.columns.actions") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="issue in issues"
            :key="issue.id"
            class="quality-table__row"
            :data-testid="`issue-row-${issue.id}`"
            @click="emit('open', issue)"
          >
            <td class="quality-table__check" @click.stop>
              <input
                :checked="selectedIds.includes(issue.id)"
                :aria-label="
                  t('core.content_quality.selection.select_issue', {
                    description: issue.description,
                  })
                "
                :data-testid="`issue-check-${issue.id}`"
                type="checkbox"
                @change="
                  emit(
                    'toggle',
                    issue.id,
                    ($event.target as HTMLInputElement).checked
                  )
                "
              />
            </td>
            <td>
              <button
                class="quality-table__title-link"
                type="button"
                @click.stop="emit('open', issue)"
              >
                {{ issue.description }}
              </button>
              <div class="quality-table__sub">{{ issue.location }}</div>
            </td>
            <td>
              <div class="quality-table__article">{{ issue.articleTitle }}</div>
              <div class="quality-table__sub quality-table__slug">
                /{{ issue.articleSlug }}
              </div>
            </td>
            <td>
              <span class="quality-type">
                <span
                  class="quality-type__dot"
                  :class="typeDotClass[issue.type]"
                />
                <span class="quality-type__label">
                  {{ t(`core.content_quality.types.${issue.type}`) }}
                </span>
              </span>
            </td>
            <td>
              <span
                :class="severityClass[issue.severity]"
                data-testid="severity-label"
              >
                <span
                  class="inline-block h-1.5 w-1.5 rounded-full"
                  :class="severityDotClass[issue.severity]"
                />
                {{ t(`core.content_quality.severity.${issue.severity}`) }}
              </span>
            </td>
            <td>
              <span :class="statusClass[issue.status]">
                <span
                  class="inline-block h-1.5 w-1.5 rounded-full"
                  :class="dotClass[issue.status]"
                />
                <span
                  class="whitespace-nowrap"
                  :data-testid="`row-status-${issue.id}`"
                >
                  {{ t(`core.content_quality.status.${issue.status}`) }}
                </span>
              </span>
            </td>
            <td class="quality-table__time">{{ issue.detectedAt }}</td>
            <td class="quality-table__actions" @click.stop>
              <button
                class="quality-link-btn"
                data-testid="issue-detail"
                type="button"
                @click="emit('open', issue)"
              >
                {{ t("core.content_quality.actions.view_detail") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="quality-pagination">
      <VPagination
        :page="page"
        :size="size"
        :total="total"
        :size-options="[8, 10, 20]"
        :page-label="t('core.components.pagination.page_label')"
        :size-label="t('core.components.pagination.size_label')"
        :total-label="t('core.components.pagination.total_label', { total })"
        @update:page="emit('update:page', $event)"
        @update:size="emit('update:size', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.quality-table-wrap {
  width: 100%;
  overflow-x: auto;
}
.quality-table {
  width: 100%;
  min-width: 910px;
  border-collapse: collapse;
  table-layout: fixed;
}
.quality-type {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  font-size: 12px;
  color: #4e5969;
}
.quality-type__label {
  color: #4e5969;
}
.quality-type__dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 999px;
}
.quality-table th {
  padding: 10px 8px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #86909c;
  background: #fafbfc;
  border-bottom: 1px solid #eaecf0;
  white-space: nowrap;
}
.quality-table td {
  padding: 12px 8px;
  font-size: 12.5px;
  color: #4e5969;
  border-bottom: 1px solid #f2f3f5;
  vertical-align: middle;
}
.quality-table col.c-check {
  width: 40px;
}
.quality-table col.c-issue {
  width: 26%;
}
.quality-table col.c-article {
  width: 22%;
}
.quality-table col.c-type {
  width: 78px;
}
.quality-table col.c-severity {
  width: 76px;
}
.quality-table col.c-status {
  width: 76px;
}
.quality-table col.c-time {
  width: 104px;
}
.quality-table col.c-actions {
  width: 52px;
}
.quality-table__check {
  width: 40px;
  padding-left: 14px !important;
}
.quality-table__check input {
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: #4ccba0;
}
.quality-table__row {
  cursor: pointer;
  transition: background 0.15s ease;
}
.quality-table__row:hover {
  background: #fafbfc;
}
.quality-table__title-link {
  display: -webkit-box;
  max-width: 100%;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-align: left;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  color: #1d2129;
  cursor: pointer;
}
.quality-table__title-link:hover {
  color: #16a37a;
}
.quality-table__article {
  font-size: 13px;
  line-height: 1.5;
  color: #1d2129;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.quality-table__sub {
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.5;
  color: #86909c;
}
.quality-table__slug {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.quality-table__time {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  font-size: 11px;
  color: #86909c !important;
}
.quality-table__actions {
  text-align: right;
  white-space: nowrap;
}
.quality-link-btn {
  border: 0;
  padding: 0;
  background: no-repeat;
  color: #11966f;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.quality-link-btn:hover {
  color: #0b7a59;
  text-decoration: underline;
}
.quality-link-btn:focus-visible {
  outline: 2px solid #4ccba0;
  outline-offset: 2px;
  border-radius: 2px;
}
.quality-pagination {
  display: flex;
  width: 100%;
  border-top: 1px solid #eaecf0;
  padding: 10px 16px;
}
.quality-pagination :deep(.pagination) {
  width: 100%;
}
</style>
