<script lang="ts" setup>
import {
  IconAddCircle,
  IconDeleteBin,
  IconEye,
  IconInformation,
  IconNotificationBadgeLine,
  IconRefreshLine,
  IconRiPencilFill,
  IconSearch,
  IconStopCircle,
  VButton,
  VEmpty,
  VLoading,
  VPageHeader,
  VPagination,
  VSpace,
} from "@halo-dev/components";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useAnnouncementMockStore } from "./announcement-store";
import AnnouncementConfirmDialog from "./components/AnnouncementConfirmDialog.vue";
import AnnouncementDetailDrawer from "./components/AnnouncementDetailDrawer.vue";
import AnnouncementFormModal from "./components/AnnouncementFormModal.vue";
import type {
  Announcement,
  AnnouncementDraft,
  AnnouncementPosition,
  AnnouncementStatus,
} from "./types";
import {
  POSITION_OPTIONS,
  STATUS_OPTIONS,
  isDeletableStatus,
  isPublishedStatus,
  positionLabel,
  statusLabel,
} from "./types";
import {
  findActiveAnnouncementByPosition,
  formatRange,
  isShadowed,
} from "./utils";

const props = withDefaults(
  defineProps<{
    /** 独立预览入口使用 localStorage 持久化，便于刷新后继续验收 */
    persistent?: boolean;
  }>(),
  { persistent: false }
);

const store = useAnnouncementMockStore({ persistent: props.persistent });

const keyword = ref("");
const selectedPosition = ref<AnnouncementPosition | "">("");
const selectedStatus = ref<AnnouncementStatus | "">("");
const page = ref(1);
const size = ref(5);
const list = ref<Announcement[]>([]);
const total = ref(0);
const loadedOnce = ref(false);

const toast = reactive<{
  visible: boolean;
  type: "success" | "error" | "info";
  message: string;
}>({ visible: false, type: "info", message: "" });
let toastTimer: ReturnType<typeof setTimeout> | undefined;

function showToast(type: "success" | "error" | "info", message: string) {
  toast.type = type;
  toast.message = message;
  toast.visible = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.visible = false;
  }, 3600);
}

const hasFilters = computed(
  () =>
    !!keyword.value.trim() || !!selectedPosition.value || !!selectedStatus.value
);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / size.value))
);

const activeByPosition = computed(() => ({
  HOME_BANNER: findActiveAnnouncementByPosition(
    store.items.value,
    "HOME_BANNER"
  ),
  SITE_WIDE_NOTICE: findActiveAnnouncementByPosition(
    store.items.value,
    "SITE_WIDE_NOTICE"
  ),
}));

async function fetchList() {
  const result = await store.load({
    keyword: keyword.value,
    position: selectedPosition.value || undefined,
    status: selectedStatus.value || undefined,
    page: page.value,
    size: size.value,
  });
  total.value = result.total;
  if (page.value > totalPages.value && totalPages.value > 0) {
    page.value = totalPages.value;
    return fetchList();
  }
  list.value = result.items;
  loadedOnce.value = true;
}

watch([keyword, selectedPosition, selectedStatus], () => {
  page.value = 1;
  fetchList();
});
watch([page, size], () => fetchList());

function resetFilters() {
  keyword.value = "";
  selectedPosition.value = "";
  selectedStatus.value = "";
}

// ---------- form ----------
const formVisible = ref(false);
const editingAnnouncement = ref<Announcement | undefined>(undefined);
const saving = ref(false);

function openCreate() {
  editingAnnouncement.value = undefined;
  formVisible.value = true;
}

function openEdit(announcement: Announcement) {
  if (isPublishedStatus(announcement.status)) {
    showToast("error", "已发布公告不可直接编辑，请先停用");
    return;
  }
  editingAnnouncement.value = announcement;
  formVisible.value = true;
}

function closeForm() {
  if (saving.value) return;
  formVisible.value = false;
  editingAnnouncement.value = undefined;
}

async function handleSubmit(draft: AnnouncementDraft) {
  saving.value = true;
  try {
    if (editingAnnouncement.value) {
      await store.update(editingAnnouncement.value.id, draft);
      showToast("success", "保存成功，公告已回到草稿状态");
    } else {
      await store.create(draft);
      showToast("success", "草稿已保存");
    }
    formVisible.value = false;
    editingAnnouncement.value = undefined;
    page.value = 1;
    await fetchList();
  } catch (error) {
    showToast("error", (error as Error).message);
  } finally {
    saving.value = false;
  }
}

// ---------- detail ----------
const detailAnnouncement = ref<Announcement | undefined>(undefined);

function openDetail(announcement: Announcement) {
  detailAnnouncement.value = announcement;
}

const detailLive = computed(() => {
  if (!detailAnnouncement.value) return undefined;
  return store.getById(detailAnnouncement.value.id);
});

const detailShadowed = computed(() => {
  if (!detailLive.value) return false;
  return isShadowed(detailLive.value, store.items.value);
});

// ---------- confirm dialogs ----------
type DialogAction = "publish" | "disable" | "delete";
const dialog = reactive<{
  visible: boolean;
  action: DialogAction;
  announcement?: Announcement;
}>({ visible: false, action: "publish" });

const dialogLoading = ref(false);

const dialogConfig = computed(() => {
  const target = dialog.announcement;
  const position = target ? positionLabel(target.position) : "";
  if (dialog.action === "delete") {
    return {
      title: "删除公告",
      description: `确定删除「${target?.title ?? ""}」吗？\n删除后无法恢复，且该公告不会再出现在${position}的展示排期中。`,
      confirmText: "确认删除",
      danger: true,
    };
  }
  if (dialog.action === "disable") {
    return {
      title: "停用公告",
      description: `停用「${target?.title ?? ""}」后，前端将不再展示该公告。\n停用后可编辑内容，保存后公告会回到草稿状态，需要重新发布才会展示。`,
      confirmText: "确认停用",
      danger: false,
    };
  }
  return {
    title: "发布公告",
    description: `发布后将根据开始/结束时间决定状态：未到开始时间为「待生效」，时间内为「展示中」，已过结束时间为「已结束」。\n发布后不可直接编辑，需先停用。`,
    confirmText: "确认发布",
    danger: false,
  };
});

function askDialog(action: DialogAction, announcement: Announcement) {
  dialog.action = action;
  dialog.announcement = announcement;
  dialog.visible = true;
}

function closeDialog() {
  if (dialogLoading.value) return;
  dialog.visible = false;
  dialog.announcement = undefined;
}

async function runAction(action: DialogAction, announcement: Announcement) {
  const target = store.getById(announcement.id);
  if (!target) {
    showToast("error", "公告不存在或已被删除");
    return;
  }
  try {
    if (action === "publish") {
      const updated = await store.publish(target.id);
      showToast(
        "success",
        `发布成功，当前状态：${statusLabel(updated.status)}`
      );
    } else if (action === "disable") {
      await store.disable(target.id);
      showToast("success", "已停用，可编辑后重新发布");
    } else {
      await store.remove(target.id);
      showToast("success", "删除成功");
    }
    detailAnnouncement.value = undefined;
    await fetchList();
  } catch (error) {
    showToast("error", (error as Error).message);
  }
}

function handleConfirm() {
  if (!dialog.announcement) return;
  const target = dialog.announcement;
  const action = dialog.action;
  dialogLoading.value = true;
  runAction(action, target).finally(() => {
    dialogLoading.value = false;
    dialog.visible = false;
    dialog.announcement = undefined;
  });
}

function handleQuickPublish(announcement: Announcement) {
  askDialog("publish", announcement);
}

function handleQuickDisable(announcement: Announcement) {
  askDialog("disable", announcement);
}

function handleQuickDelete(announcement: Announcement) {
  askDialog("delete", announcement);
}

function rowShadowed(announcement: Announcement) {
  return isShadowed(announcement, store.items.value);
}

function activeName(position: AnnouncementPosition) {
  return activeByPosition.value[position]?.title;
}

onMounted(fetchList);

defineExpose({ store });
</script>

<template>
  <div class="announcement-page">
    <VPageHeader title="站内公告管理">
      <template #icon>
        <IconNotificationBadgeLine />
      </template>
      <template #actions>
        <span class="announcement-page__poc-tag">POC · 模拟数据</span>
        <VButton size="sm" @click="fetchList">
          <template #icon>
            <IconRefreshLine
              :class="{ 'animate-spin': store.listLoading.value }"
            />
          </template>
          刷新
        </VButton>
        <VButton size="sm" type="secondary" @click="openCreate">
          <template #icon>
            <IconAddCircle />
          </template>
          新建公告
        </VButton>
      </template>
    </VPageHeader>

    <div class="announcement-page__content">
      <div class="announcement-page__notice">
        <IconInformation />
        <span>
          本轮为
          POC，数据保存在浏览器内存，刷新后回到初始模拟数据，不会发布到线上站点。发布后不可直接编辑，需先停用，保证已展示内容与审核记录一致。
        </span>
      </div>

      <section class="announcement-page__active">
        <h3>当前展示排期</h3>
        <p class="announcement-page__active-desc">
          同一位置仅展示最新一条：多条「展示中」公告时，按开始时间倒序取最新一条。运营需自行错开排期。
        </p>
        <div class="announcement-page__active-grid">
          <div
            v-for="option in POSITION_OPTIONS"
            :key="option.value"
            class="announcement-page__active-card"
          >
            <div class="announcement-page__active-head">
              <span>{{ option.label }}</span>
              <span
                v-if="activeName(option.value)"
                class="announcement-page__active-status"
              >
                展示中
              </span>
              <span v-else class="announcement-page__active-status is-empty">
                暂无展示
              </span>
            </div>
            <template v-if="activeByPosition[option.value]">
              <button
                type="button"
                class="announcement-page__active-title"
                @click="openDetail(activeByPosition[option.value]!)"
              >
                {{ activeByPosition[option.value]?.title }}
              </button>
              <div class="announcement-page__active-time">
                {{
                  formatRange(
                    activeByPosition[option.value]!.startTime,
                    activeByPosition[option.value]!.endTime
                  )
                }}
              </div>
            </template>
            <div v-else class="announcement-page__active-empty">
              该位置暂无正在展示的公告
            </div>
          </div>
        </div>
      </section>

      <section class="announcement-page__card">
        <div class="announcement-page__filters">
          <div class="announcement-page__search">
            <IconSearch />
            <input
              v-model="keyword"
              type="search"
              placeholder="搜索公告标题"
              aria-label="搜索公告标题"
            />
            <button
              v-if="keyword"
              type="button"
              class="announcement-page__search-clear"
              aria-label="清空关键词"
              @click="keyword = ''"
            >
              ✕
            </button>
          </div>
          <label class="announcement-page__select">
            <span>展示位置</span>
            <select v-model="selectedPosition">
              <option value="">全部位置</option>
              <option
                v-for="option in POSITION_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="announcement-page__select">
            <span>状态</span>
            <select v-model="selectedStatus">
              <option value="">全部状态</option>
              <option
                v-for="option in STATUS_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <button
            v-if="hasFilters"
            type="button"
            class="announcement-page__reset"
            @click="resetFilters"
          >
            重置筛选
          </button>
          <span class="announcement-page__count">
            共 {{ total }} 条<template v-if="hasFilters">（已筛选）</template>
          </span>
        </div>

        <div class="announcement-page__table-wrap">
          <VLoading v-if="store.listLoading.value" />
          <div v-else-if="!list.length" class="announcement-page__empty">
            <VEmpty
              :title="hasFilters ? '没有符合条件的公告' : '暂无公告'"
              :message="
                hasFilters
                  ? '尝试调整关键词、展示位置或状态筛选条件'
                  : '创建第一条站内公告，安排展示时间并预览效果'
              "
            >
              <template #actions>
                <VSpace>
                  <VButton v-if="hasFilters" @click="resetFilters"
                    >清空筛选</VButton
                  >
                  <VButton v-else type="secondary" @click="openCreate">
                    <template #icon>
                      <IconAddCircle />
                    </template>
                    新建公告
                  </VButton>
                </VSpace>
              </template>
            </VEmpty>
          </div>
          <table v-else class="announcement-page__table">
            <thead>
              <tr>
                <th class="is-title">标题</th>
                <th>展示位置</th>
                <th>状态</th>
                <th class="is-time">展示时间</th>
                <th class="is-time">更新时间</th>
                <th class="is-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in list" :key="item.id">
                <td class="is-title">
                  <button
                    type="button"
                    class="announcement-page__title-link"
                    @click="openDetail(item)"
                  >
                    {{ item.title }}
                  </button>
                  <span
                    v-if="rowShadowed(item)"
                    class="announcement-page__shadow-tag"
                    :title="'同位置展示中另有开始时间更晚的公告，当前不会展示该条'"
                  >
                    同位置较旧，暂不展示
                  </span>
                </td>
                <td class="is-position">{{ positionLabel(item.position) }}</td>
                <td class="is-status">
                  <span
                    class="announcement-page__status"
                    :class="`announcement-page__status--${item.status.toLowerCase()}`"
                  >
                    {{ statusLabel(item.status) }}
                  </span>
                </td>
                <td class="is-time">
                  {{ formatRange(item.startTime, item.endTime) }}
                </td>
                <td class="is-time">{{ item.updateTime }}</td>
                <td class="is-actions">
                  <div class="announcement-page__actions">
                    <button
                      v-if="item.status === 'DRAFT'"
                      type="button"
                      class="announcement-page__action"
                      @click="handleQuickPublish(item)"
                    >
                      <IconEye />
                      发布
                    </button>
                    <button
                      v-if="
                        item.status === 'DRAFT' || item.status === 'DISABLED'
                      "
                      type="button"
                      class="announcement-page__action"
                      @click="openEdit(item)"
                    >
                      <IconRiPencilFill />
                      编辑
                    </button>
                    <button
                      v-if="isPublishedStatus(item.status)"
                      type="button"
                      class="announcement-page__action"
                      @click="handleQuickDisable(item)"
                    >
                      <IconStopCircle />
                      停用
                    </button>
                    <button
                      v-if="isPublishedStatus(item.status)"
                      type="button"
                      class="announcement-page__action"
                      disabled
                      title="已发布公告不可直接编辑，请先停用"
                    >
                      <IconRiPencilFill />
                      编辑
                    </button>
                    <button
                      v-if="isDeletableStatus(item.status)"
                      type="button"
                      class="announcement-page__action announcement-page__action--danger"
                      @click="handleQuickDelete(item)"
                    >
                      <IconDeleteBin />
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="loadedOnce && total > 0"
          class="announcement-page__pagination"
        >
          <VPagination
            v-model:page="page"
            v-model:size="size"
            page-label="页"
            size-label="条 / 页"
            :total-label="`共 ${total} 项数据`"
            :total="total"
            :size-options="[5, 10, 20]"
          />
        </div>
      </section>

      <p class="announcement-page__footer-note">
        模拟数据覆盖草稿、待生效、展示中、已结束、已停用五种状态及两类展示位置；刷新页面或切换筛选会按当前时间校正待生效/展示中的状态。
      </p>
    </div>

    <AnnouncementFormModal
      v-if="formVisible"
      :visible="formVisible"
      :announcement="editingAnnouncement"
      :submitting="saving"
      @close="closeForm"
      @submit="handleSubmit"
    />

    <AnnouncementDetailDrawer
      v-if="detailLive"
      :announcement="detailLive"
      :busy="!!store.mutating.value"
      :shadowed="detailShadowed"
      @close="detailAnnouncement = undefined"
      @edit="openEdit"
      @publish="handleQuickPublish"
      @disable="handleQuickDisable"
      @delete="handleQuickDelete"
    />

    <AnnouncementConfirmDialog
      :visible="dialog.visible"
      :title="dialogConfig.title"
      :description="dialogConfig.description"
      :confirm-text="dialogConfig.confirmText"
      :danger="dialogConfig.danger"
      :loading="dialogLoading"
      @cancel="closeDialog"
      @confirm="handleConfirm"
    />

    <Transition name="announcement-toast">
      <div
        v-if="toast.visible"
        class="announcement-toast"
        :class="`announcement-toast--${toast.type}`"
        role="status"
        aria-live="polite"
      >
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.announcement-page {
  &__poc-tag {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 8px;
    border-radius: 999px;
    background-color: #eef7f3;
    color: #0f9d75;
    font-size: 12px;
    font-weight: 600;
  }

  &__content {
    margin: 0;
    padding: 12px;

    @media (min-width: 768px) {
      margin: 0 16px;
      padding: 0;
    }
  }

  &__notice {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 12px;
    padding: 10px 12px;
    border-radius: 4px;
    background-color: #f0f7ff;
    color: #1e40af;
    font-size: 12px;
    line-height: 1.7;
  }

  &__active {
    margin-bottom: 12px;
    padding: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    background-color: #fff;
  }

  &__active h3 {
    font-size: 14px;
    font-weight: 700;
    color: #1f2937;
  }

  &__active-desc {
    margin-top: 2px;
    font-size: 12px;
    color: #6b7280;
  }

  &__active-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 12px;
  }

  &__active-card {
    padding: 12px;
    border: 1px solid #eef0f3;
    border-radius: 4px;
    background-color: #fafbfc;
  }

  &__active-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    color: #4b5563;
  }

  &__active-title {
    display: block;
    margin-top: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    text-align: left;

    &:hover {
      color: #0f9d75;
      text-decoration: underline;
    }
  }

  &__active-status {
    display: inline-flex;
    align-items: center;
    height: 20px;
    padding: 0 8px;
    border-radius: 999px;
    background-color: #e8f8f2;
    color: #0f9d75;
    font-size: 11px;
    font-weight: 600;

    &.is-empty {
      background-color: #f3f4f6;
      color: #9ca3af;
      font-weight: 400;
    }
  }

  &__active-time {
    margin-top: 2px;
    font-size: 12px;
    color: #6b7280;
  }

  &__active-empty {
    margin-top: 8px;
    font-size: 12px;
    color: #9ca3af;
  }

  &__card {
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    background-color: #fff;
    overflow: hidden;
  }

  &__filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 16px;
    background-color: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  &__search {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    width: 260px;
    max-width: 100%;
    padding: 0 10px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background-color: #fff;
    color: #9ca3af;
    font-size: 13px;

    &:focus-within {
      border-color: #4ccba0;
      box-shadow: 0 0 0 3px rgba(76, 203, 160, 0.15);
    }

    input {
      flex: 1;
      min-width: 0;
      height: 100%;
      border: none;
      outline: none;
      font-size: 13px;
      color: #111827;
      background: transparent;
    }
  }

  &__search-clear {
    color: #9ca3af;
    font-size: 11px;
  }

  &__select {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 10px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background-color: #fff;
    font-size: 13px;
    color: #6b7280;

    select {
      border: none;
      outline: none;
      background: transparent;
      font-size: 13px;
      color: #111827;
      max-width: 140px;
    }
  }

  &__reset {
    font-size: 12px;
    color: #0f9d75;

    &:hover {
      text-decoration: underline;
    }
  }

  &__count {
    margin-left: auto;
    font-size: 12px;
    color: #6b7280;
  }

  &__table-wrap {
    overflow-x: auto;
    min-height: 200px;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    th,
    td {
      padding: 12px 10px;
      text-align: left;
      vertical-align: middle;
      border-bottom: 1px solid #f0f1f3;
    }

    th {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      background-color: #fff;
      white-space: nowrap;
    }

    tbody tr:hover {
      background-color: #f9fafb;
    }

    th:first-child,
    td:first-child {
      padding-left: 16px;
    }

    th:last-child,
    td:last-child {
      padding-right: 16px;
    }

    .is-title {
      min-width: 180px;
    }

    .is-time {
      white-space: nowrap;
      color: #4b5563;
    }

    .is-position {
      white-space: nowrap;
      color: #4b5563;
    }

    .is-status {
      white-space: nowrap;
    }

    .is-actions {
      width: 1%;
      white-space: nowrap;
    }
  }

  &__title-link {
    font-weight: 600;
    color: #111827;
    text-align: left;

    &:hover {
      color: #0f9d75;
      text-decoration: underline;
    }
  }

  &__status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;

    &::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #9ca3af;
    }

    &--draft {
      color: #6b7280;
    }

    &--scheduled {
      color: #b45309;

      &::before {
        background-color: #f59e0b;
      }
    }

    &--published {
      color: #0f9d75;

      &::before {
        background-color: #10b981;
      }
    }

    &--finished {
      color: #6b7280;

      &::before {
        background-color: #9ca3af;
      }
    }

    &--disabled {
      color: #d71d1d;

      &::before {
        background-color: #ef4444;
      }
    }
  }

  &__shadow-tag {
    display: inline-flex;
    margin-left: 6px;
    padding: 0 6px;
    border-radius: 999px;
    background-color: #fff8e6;
    color: #92400e;
    font-size: 11px;
    line-height: 18px;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  &__action {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    color: #4b5563;

    &:hover:not(:disabled) {
      background-color: #f3f4f6;
      color: #111827;
    }

    &:disabled {
      color: #c0c4cc;
      cursor: not-allowed;
    }

    &--danger {
      color: #d71d1d;

      &:hover:not(:disabled) {
        background-color: #fef2f2;
        color: #b91c1c;
      }
    }
  }

  &__empty {
    padding: 16px 0 32px;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    padding: 8px 16px;
    border-top: 1px solid #f0f1f3;
  }

  &__footer-note {
    margin-top: 12px;
    font-size: 12px;
    color: #9ca3af;
  }
}

.announcement-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 80;
  max-width: 90vw;
  padding: 10px 16px;
  border-radius: 4px;
  background-color: #1f2937;
  color: #fff;
  font-size: 13px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.25);

  &--success {
    background-color: #0f9d75;
  }

  &--error {
    background-color: #d71d1d;
  }

  &--info {
    background-color: #1f2937;
  }
}

.announcement-toast-enter-active,
.announcement-toast-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.announcement-toast-enter-from,
.announcement-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}

@media (max-width: 767px) {
  .announcement-page {
    &__active-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    &__count {
      margin-left: 0;
    }
  }
}
</style>
