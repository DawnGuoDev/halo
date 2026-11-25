// 预览用数据形状：与 @halo-dev/api-client 的 ListedPost 保持可控子集（不做正式接口契约）
export type MockVisible = "PUBLIC" | "INTERNAL" | "PRIVATE";

export interface MockCategory {
  name: string;
  displayName: string;
  parent?: string;
  postCount: number;
}

export interface MockTag {
  name: string;
  displayName: string;
  color: string;
  postCount: number;
}

export interface MockUser {
  name: string;
  displayName: string;
  avatar?: string;
}

export interface MockPost {
  name: string;
  title: string;
  slug: string;
  visible: MockVisible;
  published: boolean;
  scheduling: boolean;
  publishTime?: string;
  updateTime: string;
  categories: string[];
  tags: string[];
  contributor: string;
  views: number;
  comments: number;
  pinned: boolean;
}
