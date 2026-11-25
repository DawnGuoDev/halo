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
  /** 发布进行中：spec.publish=true 但 published/scheduling 标签尚未就绪（列表显示「发布中」） */
  publicizing?: boolean;
  publishTime?: string;
  updateTime: string;
  categories: string[];
  tags: string[];
  contributor: string;
  views: number;
  comments: number;
  pinned: boolean;
}
