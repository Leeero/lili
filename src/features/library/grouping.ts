import type { FavoriteItem } from "@/store/favorite";

import { adaptFavoriteItemToTile, adaptLocalDirToTile, type LibraryTile } from "./model";

/**
 * 「我的音乐」的分组与显隐。
 *
 * 设置页的显隐编辑器（`pages/settings/library-settings`）与我的音乐页
 * （`pages/library`）共用这一份拆分与过滤逻辑：设置里列出的条目，必然就是
 * 页面上可能出现的瓦片 —— 两边各写一遍是这类「配置项里看不到自己刚配的东西」
 * 的经典成因。
 *
 * 显隐配置存的是**瓦片键**（`${source}:${id}`，与 `LibraryTile.key` 同值），
 * 而不是收藏项 id：收藏夹 / 合集 / 系列三类各自带来源前缀，id 相同的两项
 * 不会互相顶掉。见 `LibrarySettings.hiddenLibraryKeys`。
 */

/** 显隐配置里的条目键。与 `adaptFavoriteItemToTile` 生成的 `LibraryTile.key` 必须同值。 */
export const favoriteTileKey = (item: FavoriteItem): string => `${item.source}:${item.id}`;

export interface LibraryTileGroups {
  /** 我创建的：自建收藏夹 + 自建合集/系列（徽标区分类型），外加本地目录。 */
  created: LibraryTile[];
  /** 我追的：收藏的收藏夹（favorite-folder）+ 收藏的合集/系列（season/series）。 */
  followed: LibraryTile[];
  /** 本地目录。独立列出，不进显隐配置（目录在本地音乐页管理）。 */
  local: LibraryTile[];
}

/**
 * 把收藏列表拆成「我创建的 / 我追的」两组。
 *
 * 归属轴（我创建 vs 我追的）由**列表来源**决定，不按类型再切：
 * - 我创建的 = `createdFavorites`（自建收藏夹）+ `seasonSeries`（自建合集/系列）；
 * - 我追的 = `collectedFavorites`（收藏的收藏夹，含收藏的合集）。
 * 类型差异（收藏夹 / 合集 / 系列）只体现在瓦片徽标上，不再单独成组。
 */
export const buildLibraryTileGroups = (
  createdFavorites: FavoriteItem[],
  collectedFavorites: FavoriteItem[],
  seasonSeries: FavoriteItem[],
  localMusicDirs: string[],
): LibraryTileGroups => {
  return {
    created: [...createdFavorites.map(adaptFavoriteItemToTile), ...seasonSeries.map(adaptFavoriteItemToTile)],
    followed: collectedFavorites.map(adaptFavoriteItemToTile),
    local: localMusicDirs.map(dir => adaptLocalDirToTile(dir)),
  };
};

/**
 * 按显隐配置过滤收藏项**本身**。
 *
 * 在条目层过滤而不是在瓦片层：页面上的条数与曲目总数都从同一份数据算，
 * 被隐去的条目不会留在「N 首」里，也不会被「全部播放」带上。
 */
export const filterVisibleFavorites = (items: FavoriteItem[], hiddenKeys: string[]): FavoriteItem[] => {
  if (!hiddenKeys.length) return items;
  const hidden = new Set(hiddenKeys);
  return items.filter(item => !hidden.has(favoriteTileKey(item)));
};
