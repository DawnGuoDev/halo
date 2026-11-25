<script lang="ts" setup>
import {
  IconBookRead,
  IconMessage,
  IconRefreshLine,
  IconRocketLine,
  IconTimerLine,
  Toast,
  VButton,
  VEmpty,
  VEntity,
  VEntityContainer,
  VEntityField,
  VLoading,
  VPageHeader,
  VSpace,
  VStatusDot,
  VSwitch,
  VTag,
} from "@halo-dev/components";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import OperationsTrendChart from "@/components/trend/OperationsTrendChart.vue";
import { t } from "@/i18n";
import {
  canManageComments,
  getHotState,
  getOverview,
  getPendingState,
  resetOperationalMock,
  type OperationalOverview,
} from "@/mock/operational";
import { formatDateTime, timeAgo } from "@/utils/datetime";
import ArticleSummaryDrawer from "./ArticleSummaryDrawer.vue";
import CommentReviewDrawer from "./CommentReviewDrawer.vue";
import MetricCard from "./MetricCard.vue";
import OperationalCard from "./OperationalCard.vue";

// 站点运营概览：参考控制台仪表盘（VPageHeader + WidgetCard 组合 + VEntity 列表）
// 与评论列表（VEntity / VStatusDot / VModal）的既有用法；数据来自 @/mock/operational。
// 本次范围不含访问量、导出与自定义时间范围。

type RangeDays = 7 | 30;

const router = useRouter();
resetOperationalMock();
const canManage = canManageComments();

// URL ?range=30 支持直接打开 30 天视图，默认最近 7 天
const initialRange = new URLSearchParams(window.location.search).get("range");
const rangeDays = ref<RangeDays>(initialRange === "30" ? 30 : 7);

// 趋势显示开关与时间范围相互独立：切换范围不改变这两个状态
const showPosts = ref(true);
const showComments = ref(true);

const overview = ref<OperationalOverview>();
const loading = ref(true);
const refreshing = ref(false);

// 区域级状态：待审核 / 热门文章可独立失败与重试
const pendingFailed = ref(false);
const pendingLoading = ref(false);
const hotFailed = ref(false);
const hotLoading = ref(false);

let requestSeq = 0;

async function loadOverview(options: { silent?: boolean } = {}) {
  const seq = ++requestSeq;
  if (!options.silent) loading.value = true;
  refreshing.value = true;
  const [data, pending, hot] = await Promise.all([
    getOverview(rangeDays.value),
    getPendingState(),
    getHotState(),
  ]);
  if (seq !== requestSeq) return;
  overview.value = data;
  pendingFailed.value = pending.failed;
  hotFailed.value = hot.failed;
  loading.value = false;
  refreshing.value = false;
}

async function retryPending() {
  pendingLoading.value = true;
  const state = await getPendingState();
  pendingFailed.value = state.failed;
  pendingLoading.value = false;
  if (!state.failed) await loadOverview({ silent: true });
}

async function retryHot() {
  hotLoading.value = true;
  const state = await getHotState();
  hotFailed.value = state.failed;
  hotLoading.value = false;
  if (!state.failed) await loadOverview({ silent: true });
}

onMounted(() => loadOverview());

// 切换时间范围：指标、趋势、热门文章一起刷新；待审核不受影响。再次选择当前项不请求。
function selectRange(next: RangeDays) {
  if (next === rangeDays.value) return;
  rangeDays.value = next;
  void loadOverview();
}

const trendEmpty = computed(() => {
  const trend = overview.value?.trend || [];
  return trend.every((p) => p.posts === 0 && p.comments === 0);
});

const noSeriesSelected = computed(() => !showPosts.value && !showComments.value);

const summaryArticle = ref<{ name: string; title: string }>();
const reviewComment = ref<string>();

function openSummary(article: { name: string; title: string; deleted: boolean }) {
  if (article.deleted) return;
  summaryArticle.value = { name: article.name, title: article.title };
}

function openReview(name: string) {
  reviewComment.value = name;
}

function handleRefresh() {
  void loadOverview();
}

function handleProcessed(payload: {
  result: "approved" | "rejected" | "stale";
}) {
  reviewComment.value = undefined;
  if (payload.result === "stale") {
    Toast.warning(t("core.operations.comment.stale"));
  }
  // 处理后同步更新待审核数量与列表（重新拉取概览）
  void loadOverview({ silent: true });
}

function goToComments() {
  router.push("/comments");
}

const rangeOptions: Array<{ value: RangeDays; label: string }> = [
  { value: 7, label: t("core.operations.range.last_7_days") },
  { value: 30, label: t("core.operations.range.last_30_days") },
];
</script>

<template>
  <VPageHeader :title="t('core.operations.title')">
    <template #icon>
      <IconRocketLine />
    </template>
    <template #actions>
      <VButton :loading="refreshing" data-testid="page-refresh" @click="handleRefresh">
        <template #icon><IconRefreshLine /></template>
        {{ t("core.common.buttons.refresh") }}
      </VButton>
    </template>
  </VPageHeader>

  <div class="m-0 flex flex-col gap-4 p-4 md:m-4" data-testid="ops-overview">
    <!-- 时间范围切换 -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div
        class="inline-flex rounded-md border border-gray-200 bg-white p-0.5"
        role="group"
        :aria-label="t('core.operations.range.label')"
      >
        <button
          v-for="option in rangeOptions"
          :key="option.value"
          type="button"
          :aria-pressed="rangeDays === option.value"
          :data-testid="`range-${option.value}`"
          :class="[
            'rounded px-3 py-1.5 text-sm transition',
            rangeDays === option.value
              ? 'bg-[#0E1731] text-white'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
          ]"
          @click="selectRange(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <span
        v-if="overview"
        class="text-xs text-gray-400"
        data-testid="range-caption"
      >
        {{
          t("core.operations.range.caption", {
            start: overview.rangeStart,
            end: overview.rangeEnd,
            days: rangeDays,
          })
        }}
      </span>
    </div>

    <VLoading v-if="loading && !overview" />

    <template v-if="overview">
      <!-- 指标区 -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          :label="t('core.operations.metrics.posts')"
          :value="overview.metrics.posts"
          :change="overview.metrics.postsChange"
          :icon="IconBookRead"
          testid="metric-posts"
        />
        <MetricCard
          :label="t('core.operations.metrics.comments')"
          :value="overview.metrics.comments"
          :change="overview.metrics.commentsChange"
          :icon="IconMessage"
          testid="metric-comments"
        />
        <MetricCard
          :label="t('core.operations.metrics.pending')"
          :value="overview.metrics.pending"
          :icon="IconTimerLine"
          testid="metric-pending"
        />
      </div>

      <!-- 趋势图 -->
      <OperationalCard
        :title="t('core.operations.trend.title')"
        :description="t('core.operations.trend.description')"
        :refreshing="refreshing"
        @refresh="handleRefresh"
      >
        <template #actions>
          <div class="flex items-center gap-4">
            <label
              class="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700"
            >
              <VSwitch v-model="showPosts" data-testid="toggle-posts" />
              <span class="inline-block h-2 w-2 rounded-sm bg-[#4CCBA0]"></span>
              {{ t("core.operations.trend.series.posts") }}
            </label>
            <label
              class="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700"
            >
              <VSwitch v-model="showComments" data-testid="toggle-comments" />
              <span class="inline-block h-2 w-2 rounded-sm bg-[#0E1731]"></span>
              {{ t("core.operations.trend.series.comments") }}
            </label>
          </div>
        </template>
        <div
          class="flex min-h-[260px] items-center justify-center"
          data-testid="trend-body"
        >
          <VEmpty
            v-if="noSeriesSelected"
            :title="t('core.operations.trend.empty.no_series')"
            :message="t('core.operations.trend.empty.no_series_message')"
          />
          <VEmpty
            v-else-if="trendEmpty"
            :title="t('core.operations.trend.empty.no_data')"
            :message="t('core.operations.trend.empty.no_data_message')"
          />
          <OperationsTrendChart
            v-else
            :points="overview.trend"
            :show-posts="showPosts"
            :show-comments="showComments"
            :posts-label="t('core.operations.trend.series.posts')"
            :comments-label="t('core.operations.trend.series.comments')"
          />
        </div>
      </OperationalCard>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <!-- 评论最多的文章 -->
        <OperationalCard
          :title="t('core.operations.hot.title')"
          :description="t('core.operations.hot.description')"
          :refreshing="hotLoading"
          @refresh="retryHot"
        >
          <template #actions>
            <VButton type="secondary" size="sm" @click="router.push('/posts')">
              {{ t("core.operations.hot.all_posts") }}
            </VButton>
          </template>
          <div
            class="flex min-h-[220px] items-center justify-center"
            data-testid="hot-body"
          >
            <VEmpty
              v-if="hotFailed"
              :title="t('core.operations.error.title')"
              :message="t('core.operations.error.hot_message')"
            >
              <template #actions>
                <VButton
                  :loading="hotLoading"
                  data-testid="hot-retry"
                  @click="retryHot"
                >
                  {{ t("core.common.buttons.retry") }}
                </VButton>
              </template>
            </VEmpty>
            <VEmpty
              v-else-if="!overview.hotArticles.length"
              :title="t('core.operations.hot.empty')"
              :message="t('core.operations.hot.empty_message')"
            />
            <VEntityContainer v-else class="w-full" data-testid="hot-list">
              <VEntity
                v-for="(article, index) in overview.hotArticles"
                :key="article.name"
                :class="['entity-wrapper', { 'cursor-pointer': !article.deleted }]"
                :data-testid="`hot-article-${article.name}`"
                @click="openSummary(article)"
              >
                <template #start>
                  <VEntityField :width="'100%'" :max-width="'100%'">
                    <template #title>
                      <div class="flex min-w-0 items-center gap-2">
                        <span
                          :class="[
                            'inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-medium',
                            index === 0
                              ? 'bg-[#4CCBA0] text-white'
                              : 'bg-gray-100 text-gray-600',
                          ]"
                        >
                          {{ index + 1 }}
                        </span>
                        <span
                          :class="[
                            'truncate text-sm font-medium',
                            article.deleted
                              ? 'text-gray-400'
                              : 'text-gray-900 hover:text-gray-600',
                          ]"
                          data-testid="hot-article-title"
                        >
                          {{ article.title }}
                        </span>
                      </div>
                    </template>
                    <template #description>
                      <span class="text-xs text-gray-500">
                        {{
                          t("core.operations.hot.published_at", {
                            time: formatDateTime(article.publishTime),
                          })
                        }}
                      </span>
                    </template>
                  </VEntityField>
                </template>
                <template #end>
                  <VEntityField>
                    <template #description>
                      <span
                        class="text-sm font-medium text-gray-900"
                        data-testid="hot-article-count"
                      >
                        {{
                          t("core.operations.hot.comment_count", {
                            count: article.commentCount,
                          })
                        }}
                      </span>
                    </template>
                  </VEntityField>
                </template>
              </VEntity>
            </VEntityContainer>
          </div>
        </OperationalCard>

        <!-- 待审核评论 -->
        <OperationalCard
          :title="t('core.operations.pending.title')"
          :description="t('core.operations.pending.description')"
          :refreshing="pendingLoading"
          @refresh="retryPending"
        >
          <template #actions>
            <VButton type="secondary" size="sm" @click="goToComments">
              {{ t("core.operations.pending.manage") }}
            </VButton>
          </template>
          <div
            class="flex min-h-[220px] items-start justify-center"
            data-testid="pending-body"
          >
            <VEmpty
              v-if="pendingFailed"
              :title="t('core.operations.error.title')"
              :message="t('core.operations.error.pending_message')"
            >
              <template #actions>
                <VButton
                  :loading="pendingLoading"
                  data-testid="pending-retry"
                  @click="retryPending"
                >
                  {{ t("core.common.buttons.retry") }}
                </VButton>
              </template>
            </VEmpty>
            <VEmpty
              v-else-if="!overview.pendingComments.length"
              :title="t('core.operations.pending.empty.title')"
              :message="t('core.operations.pending.empty.message')"
              data-testid="pending-empty"
            >
              <template #actions>
                <VButton @click="goToComments">
                  {{ t("core.operations.pending.empty.action") }}
                </VButton>
              </template>
            </VEmpty>
            <VEntityContainer v-else class="w-full" data-testid="pending-list">
              <VEntity
                v-for="comment in overview.pendingComments"
                :key="comment.name"
                class="entity-wrapper cursor-pointer"
                :data-testid="`pending-comment-${comment.name}`"
                @click="openReview(comment.name)"
              >
                <template #start>
                  <VEntityField :width="'100%'" :max-width="'100%'">
                    <template #title>
                      <span
                        class="line-clamp-1 text-sm font-medium text-gray-900"
                        data-testid="pending-comment-summary"
                      >
                        {{ comment.summary }}
                      </span>
                    </template>
                    <template #description>
                      <VSpace>
                        <span class="text-xs text-gray-700">
                          {{ comment.author }}
                        </span>
                        <span class="text-xs text-gray-400">
                          {{ t("core.operations.pending.commented_on") }}
                        </span>
                        <span
                          :class="[
                            'max-w-[16rem] truncate text-xs',
                            comment.articleTitle ===
                            t('core.operations.hot.deleted_post')
                              ? 'text-gray-400'
                              : 'text-gray-700',
                          ]"
                          data-testid="pending-comment-article"
                        >
                          {{ comment.articleTitle }}
                        </span>
                      </VSpace>
                    </template>
                  </VEntityField>
                </template>
                <template #end>
                  <VEntityField>
                    <template #description>
                      <VStatusDot
                        state="warning"
                        animate
                        :text="t('core.operations.pending.status')"
                      />
                    </template>
                  </VEntityField>
                  <VEntityField
                    v-tooltip="formatDateTime(comment.submittedAt)"
                    :description="timeAgo(comment.submittedAt)"
                  />
                </template>
              </VEntity>
            </VEntityContainer>
          </div>
        </OperationalCard>
      </div>
    </template>

    <ArticleSummaryDrawer
      v-if="summaryArticle"
      :article-name="summaryArticle.name"
      :title="summaryArticle.title"
      @close="summaryArticle = undefined"
    />
    <CommentReviewDrawer
      v-if="reviewComment"
      :comment-name="reviewComment"
      :can-manage="canManage"
      @close="reviewComment = undefined"
      @processed="handleProcessed"
    />
  </div>
</template>
