import type { InjectionKey, Ref } from "vue";

/** 文章列表阅读密度：舒适为现有密度，紧凑减少行内上下间距。 */
export type PostListDensity = "comfortable" | "compact";

/**
 * 页面内存状态的注入键。列表项仅用于无障碍/样式钩子；
 * 实际行距由列表容器上的 `post-list--compact` 修饰类承担。
 * 注入对象本身为普通对象（浅层），避免切换时改变列表项插槽的响应式依赖。
 */
export const DENSITY_INJECTION_KEY: InjectionKey<{
  density: Ref<PostListDensity>;
}> = Symbol("post-list-density");
