import { onMounted, ref } from "vue";
import {
  getUserDetail,
  listAllTags,
  listCategoryTree,
  listUsers,
} from "@/mock";
import type { MockCategory, MockTag, MockUser } from "@/types";

// 替代业务仓库的 @tanstack/vue-query 查询（usePostCategory / useAllPostTagsQuery /
// UserFilterDropdown 内的 useQuery）。函数签名与返回结构保留，回填时删除适配层。
export function usePostCategory() {
  const categories = ref<MockCategory[]>([]);
  const isLoading = ref(true);

  async function refetch() {
    isLoading.value = true;
    try {
      categories.value = await listCategoryTree();
    } finally {
      isLoading.value = false;
    }
  }

  onMounted(refetch);

  return { categories, isLoading, refetch };
}

export function useAllPostTagsQuery() {
  const data = ref<MockTag[]>([]);

  onMounted(async () => {
    data.value = await listAllTags();
  });

  return { data };
}

export function useUserQueries(modelValue: { value?: string }) {
  const selectedUser = ref<MockUser>();
  const users = ref<MockUser[]>([]);
  const isFetching = ref(false);
  const keyword = ref("");

  onMounted(async () => {
    users.value = await listUsers({ keyword: keyword.value });
    if (modelValue.value) {
      selectedUser.value = await getUserDetail(modelValue.value);
    }
  });

  async function search(value: string) {
    keyword.value = value;
    isFetching.value = true;
    try {
      users.value = await listUsers({ keyword: value });
    } finally {
      isFetching.value = false;
    }
  }

  return { selectedUser, users, isFetching, search };
}
