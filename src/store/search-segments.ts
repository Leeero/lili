import { create } from "zustand";

/**
 * `/search` 顶栏分段的**运行时结果数**。
 *
 * 设计稿第 7 页的分段标签是「音乐视频 · 9 / 创作者 · 2」，尾巴是搜索结果数 ——
 * 属运行时数据，随查询变化（spec-lock `topbarSegments.labelSources`）。壳层
 * 不得写死数字：分段在 `ROUTE_SEGMENTS` 里只声明**模板**（前缀 + 计数槽），
 * 计数由结果页在拿到结果集后写进这里，`Layout` 把两者组合成最终标签。
 *
 * **非持久化**是有意的：结果数是易失的派生数据，落盘只会制造过期数字。
 * 计数未知（查询未提交、页面未挂载）时两槽都是 `null` —— 分段只渲染前缀，
 * 不得出现「音乐视频 · 」这种悬空分隔符。
 *
 * 为什么不用 React state：顶栏在 `<Layout />`，结果页在 `<Outlet />`，
 * 两者是兄弟不是父子 —— 计数需要一个双方都能读写的共享源；zustand 的非持久化
 * store 恰好是「模块级共享、不落盘」的最小形态（与 `usePlayProgress` 同类）。
 */
export interface SearchSegmentCounts {
  /** 「音乐视频 · N」的 N —— search_type=video 的结果总数。 */
  video: number;
  /** 「创作者 · N」的 N —— search_type=bili_user 的结果总数。 */
  creator: number;
}

interface SearchSegmentsState {
  videoCount: number | null;
  creatorCount: number | null;
  /** 结果页拿到结果集后写入。0 是合法值（无结果），不能用 falsy 判断。 */
  setCounts: (counts: SearchSegmentCounts) => void;
  /** 单类型结果页各自写入；`null` 表示该类型正在重新搜索、计数未知。 */
  setVideoCount: (count: number | null) => void;
  setCreatorCount: (count: number | null) => void;
  /** 离开搜索语境（清空查询词 / 卸载结果页）时归位到「未知」。 */
  reset: () => void;
}

export const useSearchSegments = create<SearchSegmentsState>()(set => ({
  videoCount: null,
  creatorCount: null,
  setCounts: ({ video, creator }) => set({ videoCount: video, creatorCount: creator }),
  setVideoCount: count => set({ videoCount: count }),
  setCreatorCount: count => set({ creatorCount: count }),
  reset: () => set({ videoCount: null, creatorCount: null }),
}));
