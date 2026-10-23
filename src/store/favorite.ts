import { create } from "zustand";
import { persist } from "zustand/middleware";

import { CollectionType } from "@/common/constants/collection";
import { getFavFolderCollectedList } from "@/service/fav-folder-collected-list";
import { getFavFolderCreatedList } from "@/service/fav-folder-created-list";
import { getSpaceNavnum } from "@/service/space-navnum";
import { getSpaceSeasonsSeriesList, type SpaceSeasonsSeriesListResponse } from "@/service/space-seasons-series-list";

export interface FavoriteItem {
  id: number;
  title: string;
  cover?: string;
  type?: number;
  mid?: number;
  /** 收藏夹内容数（B 站 media_count）。旧持久化数据没有此字段，可选。 */
  trackCount?: number;
  /**
   * 内容加载方式：`favorite-folder` 走收藏夹媒体列表（media_id），`season` 走
   * 合集详情（season_id），`series` 走系列详情（series_id）。由条目的 `type` 决定
   * （见 `favoriteSourceByType`）：普通收藏夹（11/0）的 id 是 mlid，走
   * `favorite-folder`；收藏列表里的 type 21/31（收藏的合集/系列）id 是
   * season_id / series_id，走 `season` / `series`。
   */
  source: "favorite-folder" | "season" | "series";
}

interface State {
  createdFavorites: FavoriteItem[];
  collectedFavorites: FavoriteItem[];
  /** 用户自建的合集（season）/ 系列（series），id 为 season_id / series_id。 */
  seasonSeries: FavoriteItem[];
  createdOrder: number[];
  collectedOrder: number[];
}

interface Action {
  updateCreatedFavorites: (userMid: number | string) => Promise<void>;
  addCreatedFavorite: (favorite: FavoriteItem) => void;
  rmCreatedFavorite: (id: number) => void;
  /** 局部更新（id + 任意字段）；`source` 由创建时的列表来源决定，这里不重设。 */
  modifyCreatedFavorite: (favorite: Partial<FavoriteItem> & { id: number }) => void;
  reorderCreatedFavorites: (activeId: number, overId: number) => void;
  updateCollectedFavorites: (userMid: number | string) => Promise<void>;
  addCollectedFavorite: (favorite: FavoriteItem) => void;
  rmCollectedFavorite: (id: number) => void;
  reorderCollectedFavorites: (activeId: number, overId: number) => void;
  updateSeasonSeries: (userMid: number | string) => Promise<void>;
}

const applySavedOrder = <T extends { id: number }>(list: T[], order: number[]) => {
  if (!order.length) {
    return list;
  }

  const orderSet = new Set(order);
  const ordered = order.map(id => list.find(item => item.id === id)).filter((item): item is T => Boolean(item));
  const rest = list.filter(item => !orderSet.has(item.id));

  return [...ordered, ...rest];
};

const reorderList = <T extends { id: number }>(list: T[], activeId: number, overId: number) => {
  const from = list.findIndex(item => item.id === activeId);
  const to = list.findIndex(item => item.id === overId);

  if (from < 0 || to < 0 || from === to) {
    return list;
  }

  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);

  return next;
};

/**
 * 收藏夹列表条目的 type → 内容加载方式（source）。
 *
 * `fav/folder/collected/list` 里 type 21（收藏的合集）/ 31（收藏的系列）的
 * `id` 是 season_id / series_id（不是收藏夹 mlid）—— 详情页 `VideoCollections` /
 * `Series` 需要的就是这个 id；只有普通收藏夹（11 或 0）的 `id` 才是 mlid，
 * 走 `favorite-folder`（media_id）。与 `features/library/fixture.ts` 的
 * `sourceOf` 同一约定。
 */
const favoriteSourceByType = (type: number | undefined): FavoriteItem["source"] =>
  type === CollectionType.VideoCollections
    ? "season"
    : type === CollectionType.VideoSeries
      ? "series"
      : "favorite-folder";

export const useFavoritesStore = create<State & Action>()(
  persist(
    (set, get) => ({
      createdFavorites: [],
      collectedFavorites: [],
      seasonSeries: [],
      createdOrder: [],
      collectedOrder: [],
      updateCreatedFavorites: async (userMid: number | string) => {
        const favorites = await getAllCreatedFavorites(userMid);
        const ordered = applySavedOrder(favorites, get().createdOrder);

        set(() => ({
          createdFavorites: ordered,
          createdOrder: ordered.map(item => item.id),
        }));
      },
      addCreatedFavorite: (favorite: FavoriteItem) =>
        set(state => {
          const next = [favorite, ...state.createdFavorites];

          return {
            createdFavorites: next,
            createdOrder: next.map(item => item.id),
          };
        }),
      rmCreatedFavorite: (id: number) =>
        set(state => {
          const next = state.createdFavorites.filter(item => item.id !== id);

          return {
            createdFavorites: next,
            createdOrder: next.map(item => item.id),
          };
        }),
      modifyCreatedFavorite: (favorite: Partial<FavoriteItem> & { id: number }) =>
        set(state => ({
          createdFavorites: state.createdFavorites.map(item =>
            item.id === favorite.id
              ? {
                  ...item,
                  ...favorite,
                }
              : item,
          ),
        })),
      reorderCreatedFavorites: (activeId: number, overId: number) =>
        set(state => {
          const next = reorderList(state.createdFavorites, activeId, overId);

          if (next === state.createdFavorites) {
            return state;
          }

          return {
            createdFavorites: next,
            createdOrder: next.map(item => item.id),
          };
        }),
      updateCollectedFavorites: async (userMid: number | string) => {
        const favorites = await getAllCollectedFavorites(userMid);
        const ordered = applySavedOrder(favorites, get().collectedOrder);

        set(() => ({
          collectedFavorites: ordered,
          collectedOrder: ordered.map(item => item.id),
        }));
      },
      addCollectedFavorite: (favorite: FavoriteItem) =>
        set(state => {
          const next = [favorite, ...state.collectedFavorites];

          return {
            collectedFavorites: next,
            collectedOrder: next.map(item => item.id),
          };
        }),
      rmCollectedFavorite: (id: number) =>
        set(state => {
          const next = state.collectedFavorites.filter(item => item.id !== id);

          return {
            collectedFavorites: next,
            collectedOrder: next.map(item => item.id),
          };
        }),
      reorderCollectedFavorites: (activeId: number, overId: number) =>
        set(state => {
          const next = reorderList(state.collectedFavorites, activeId, overId);

          if (next === state.collectedFavorites) {
            return state;
          }

          return {
            collectedFavorites: next,
            collectedOrder: next.map(item => item.id),
          };
        }),
      updateSeasonSeries: async (userMid: number | string) => {
        const seasonSeries = await getAllSeasonSeries(userMid);
        set(() => ({ seasonSeries }));
      },
    }),
    {
      name: "favorites-order",
      partialize: state => ({
        createdOrder: state.createdOrder,
        collectedOrder: state.collectedOrder,
      }),
    },
  ),
);

async function getAllCreatedFavorites(userMid: number | string) {
  const res = await getSpaceNavnum({
    mid: userMid,
  });

  if (res.code !== 0) {
    return [];
  }

  const total = res.data?.favourite?.master ?? 0;

  if (!total) {
    return [];
  }

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const requests = Array.from({ length: totalPages }, (_, index) =>
    getFavFolderCreatedList({
      up_mid: userMid,
      ps: pageSize,
      pn: index + 1,
    }),
  );

  const favorites: FavoriteItem[] = [];

  const results = await Promise.allSettled(requests);

  results.forEach(result => {
    if (result.status !== "fulfilled") {
      return;
    }

    const response = result.value;

    if (response.code !== 0 || !response.data?.list?.length) {
      return;
    }

    response.data.list.forEach(item => {
      if (item.state === 0) {
        favorites.push({
          id: item.id,
          title: item.title,
          cover: item.cover,
          type: item.type,
          mid: item.mid,
          trackCount: item.media_count,
          source: favoriteSourceByType(item.type),
        });
      }
    });
  });

  return favorites;
}

async function getAllCollectedFavorites(userMid: number | string) {
  const pageSize = 50;

  const firstRes = await getFavFolderCollectedList({
    up_mid: userMid,
    ps: pageSize,
    pn: 1,
    platform: "web",
  });

  if (firstRes.code !== 0 || !firstRes.data) {
    return [];
  }

  const favorites: FavoriteItem[] = [];

  if (firstRes.data.list?.length) {
    firstRes.data.list.forEach(item => {
      if (item.state === 0) {
        favorites.push({
          id: item.id,
          title: item.title,
          cover: item.cover,
          type: item.type,
          mid: item.mid,
          trackCount: item.media_count,
          source: favoriteSourceByType(item.type),
        });
      }
    });
  }

  const total = firstRes.data.count ?? favorites.length;
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) {
    return favorites;
  }

  const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
    getFavFolderCollectedList({
      up_mid: userMid,
      ps: pageSize,
      pn: index + 2,
      platform: "web",
    }),
  );

  const results = await Promise.allSettled(requests);

  results.forEach(result => {
    if (result.status !== "fulfilled") {
      return;
    }

    const response = result.value;

    if (response.code !== 0 || !response.data?.list?.length) {
      return;
    }

    response.data.list.forEach(item => {
      if (item.state === 0) {
        favorites.push({
          id: item.id,
          title: item.title,
          cover: item.cover,
          type: item.type,
          mid: item.mid,
          trackCount: item.media_count,
          source: favoriteSourceByType(item.type),
        });
      }
    });
  });

  return favorites;
}

/**
 * 拉取用户自建的合集（season）与系列（series）。
 *
 * 自建合集/系列**不在**收藏夹列表接口里 —— `fav/folder/created/list` 只返回
 * 普通收藏夹（type 0，id 是 mlid），而详情页 `VideoCollections` / `Series` 需要的
 * 是 `season_id` / `series_id`，用 mlid 去查合集详情只会得到空内容。合集与系列的
 * 正确 id 来自本接口的 `meta.season_id` / `meta.series_id`
 * （`user-profile/series` 页同源）。
 */
async function getAllSeasonSeries(userMid: number | string) {
  const pageSize = 50;
  const mid = Number(userMid);

  const pushPage = (response: SpaceSeasonsSeriesListResponse, items: FavoriteItem[]) => {
    response.data?.items_lists?.seasons_list?.forEach(item => {
      items.push({
        id: item.meta.season_id,
        title: item.meta.name,
        cover: item.meta.cover,
        type: CollectionType.VideoCollections,
        mid: item.meta.mid,
        trackCount: item.meta.total,
        source: "season",
      });
    });
    response.data?.items_lists?.series_list?.forEach(item => {
      items.push({
        id: item.meta.series_id,
        title: item.meta.name,
        cover: item.meta.cover,
        type: CollectionType.VideoSeries,
        mid: item.meta.mid,
        trackCount: item.meta.total,
        source: "series",
      });
    });
  };

  const firstRes = await getSpaceSeasonsSeriesList({
    mid,
    page_size: pageSize,
    page_num: 1,
    web_location: "0.0",
  });

  if (firstRes.code !== 0 || !firstRes.data) {
    return [];
  }

  const items: FavoriteItem[] = [];
  pushPage(firstRes, items);

  const total = firstRes.data.items_lists.page.total ?? items.length;
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) {
    return items;
  }

  const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
    getSpaceSeasonsSeriesList({
      mid,
      page_size: pageSize,
      page_num: index + 2,
      web_location: "0.0",
    }),
  );

  const results = await Promise.allSettled(requests);

  results.forEach(result => {
    if (result.status === "fulfilled") {
      pushPage(result.value, items);
    }
  });

  return items;
}
