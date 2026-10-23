import type { CollectionType } from "@/common/constants/collection";
import type { ContextMenuItem } from "@/components/context-menu";
import type { Track } from "@/domain/track";
import type { PlaylistTrackEntry } from "@/features/playlist/playlist-track-view";

/** 一次分页拉取的结果。 */
export interface PagedResult<TMedia> {
  medias: TMedia[];
  hasMore: boolean;
}

/**
 * 三类详情（收藏夹 / 合集 / 系列）的数据源配置。
 *
 * 三个壳页的差异收敛为这一份配置：数据怎么来（分页还是全量、过滤排序在服务端
 * 还是客户端）、媒体怎么映射成 Track、有哪些数据源特有的能力（收藏切换 / 编辑 /
 * 清理失效 / 自定义菜单动作）。共享的骨架（页头、操作条、曲目列表、过滤排序状态机）
 * 在 `use-collection-detail` / `collection-detail.tsx`，各壳不再各写一遍。
 */
export interface CollectionDetailConfig<TMedia, TInfo> {
  /** Header / Operations 的展示类型（收藏夹徽标、能力判断都要它）。 */
  collectionType: CollectionType;

  /** 页头信息：标题 / 简介 / 封面 / UP 主 / 条目数。 */
  fetchInfo: (id: string) => Promise<TInfo | undefined>;

  /**
   * 媒体列表策略。
   * - `paged-server`：收藏夹 —— 每页由服务端按 keyword/order 返回，过滤排序不下放客户端。
   * - `client`：合集 / 系列 —— 全量（或增量分页追加）拿到后在客户端过滤排序。
   */
  listStrategy:
    | {
        kind: "paged-server";
        fetchPage: (page: number, keyword: string, order: string) => Promise<PagedResult<TMedia>>;
      }
    | {
        kind: "client";
        /**
         * 拉取媒体。返回 `null` 表示还没有可拉的条件
         * （例如系列在拿到 meta.mid 之前不能拉稿件）。
         * - `append` 缺省（合集）：一次性返回全量。
         * - `append: true`（系列）：每次返回下一批，由 hook 追加。
         */
        fetchAll: (id: string, info: TInfo | undefined) => Promise<TMedia[] | null>;
        append?: boolean;
        /** 增量模式必填：判定是否还有下一批。 */
        hasMore?: (medias: TMedia[], info: TInfo | undefined) => boolean;
      };

  /** 媒体 → Track；返回 null/undefined 的条目不进列表（收藏夹里已失效的资源）。 */
  adaptToTrack: (media: TMedia) => Track | null | undefined;
  /** 列表行的稳定 key 与时间戳（卡片模式展示「收藏于 / 发布于」）。 */
  entryKey: (media: TMedia) => string;
  entryTimestamp?: (media: TMedia) => number | undefined;

  orderOptions: { key: string; label: string }[];
  /** 客户端策略的排序实现；paged-server 由服务端承担，不给。 */
  sortMedias?: (medias: TMedia[], order: string) => TMedia[];

  /* ------------------------------------------------------------ 数据源特有能力
   * 缺省 = 对应 UI 不出现 / 走默认动作。壳页按数据源真实能力注入，不伪造。
   */

  /** Header 右侧媒体数、收藏态判定等要读 info，由壳页从自己类型的 info 里取。 */
  header: (
    info: TInfo | undefined,
    medias: TMedia[],
  ) => {
    cover?: string;
    title?: string;
    desc?: string;
    upMid?: number;
    mediaCount?: number;
    attr?: number;
  };

  isCreatedBySelf?: (info: TInfo | undefined) => boolean;

  /** 收藏切换（收藏夹 / 合集有，系列没有）。 */
  favoriteToggle?: {
    isFavorite: (info: TInfo | undefined) => boolean;
    toggle: (info: TInfo | undefined) => Promise<void>;
  };

  /** 自建收藏夹的编辑弹窗：onEdit 打开封面热区，modal 为渲染节点。 */
  editAction?: () => { onEdit: () => void; modal: React.ReactNode } | undefined;

  /** 清理失效（仅自建收藏夹）。 */
  clearInvalid?: () => Promise<void>;

  /**
   * 右键菜单项。收藏夹的「移动 / 取消收藏」与合集的六件套是数据源语义差异，
   * 由壳页各自给出 —— 硬合并只会产生假参数化。
   */
  menuItems: (media: TMedia, ctx: { isCreatedBySelf: boolean }) => ContextMenuItem[];

  /**
   * 壳页先消费菜单动作；返回 false 走默认（`executeTrackAction`，
   * `bililink` 映射为 `open-source`）。收藏夹的「移动 / 取消收藏」在这里拦截。
   */
  onMenuAction?: (key: string, media: TMedia, track: Track) => Promise<boolean>;

  /** 「播放全部 / 入队」的曲目来源；缺省 = 当前过滤后的列表。 */
  playAllTracks?: (info: TInfo | undefined) => Promise<Track[]>;

  /** info 加载成功后的副作用（收藏夹回写 favorites store 的封面/标题）。 */
  onInfoLoaded?: (info: TInfo) => void;
}

export type CollectionDetailEntry<TMedia> = PlaylistTrackEntry<TMedia>;
