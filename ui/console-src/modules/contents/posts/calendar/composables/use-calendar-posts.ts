import { ref } from "vue";
import { mockPosts, type CalendarPost } from "../mock-posts";

export type ViewMode = "calendar" | "list";

/**
 * 演示数据源：只在内存中维护文章列表。
 * 接入真实接口时替换为 useQuery + consoleApiClient.content.post.listPosts，
 * 并将 updatePublishTime 改为调用 coreApiClient.content.post.patchPost。
 */
export function useCalendarPosts() {
  const posts = ref<CalendarPost[]>(mockPosts.map((post) => ({ ...post })));
  const loading = ref(false);
  const failed = ref(false);

  async function load(forceFail = false) {
    loading.value = true;
    await new Promise((resolve) => setTimeout(resolve, 450));
    loading.value = false;
    failed.value = forceFail;
  }

  function updatePublishTime(name: string, publishTime: string) {
    posts.value = posts.value.map((post) =>
      post.name === name ? { ...post, publishTime } : post
    );
  }

  return {
    posts,
    loading,
    failed,
    load,
    updatePublishTime,
  };
}
