// 预览用数据形状：与 @halo-dev/api-client 的 ListedPost 保持可控子集（不做正式接口契约）
export interface MockPost {
  name: string;
  title: string;
  slug: string;
  visible: "PUBLIC" | "INTERNAL" | "PRIVATE";
  published: boolean;
  publishTime?: string;
  categories: string[];
  tags: string[];
  contributor: string;
  views: number;
  excerpt: string;
  pinned: boolean;
}
