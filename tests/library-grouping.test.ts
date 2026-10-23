import { describe, expect, it } from "vitest";

import type { FavoriteItem } from "@/store/favorite";

import { CollectionType } from "@/common/constants/collection";
import { buildLibraryTileGroups, favoriteTileKey, filterVisibleFavorites } from "@/features/library/grouping";
import { adaptFavoriteItemToTile } from "@/features/library/model";

const folder = (id: number, title: string, type = CollectionType.Favorite): FavoriteItem => ({
  id,
  title,
  type,
  source:
    type === CollectionType.VideoCollections
      ? "season"
      : type === CollectionType.VideoSeries
        ? "series"
        : "favorite-folder",
});
const season = (id: number, title: string): FavoriteItem => ({
  id,
  title,
  type: CollectionType.VideoCollections,
  source: "season",
});
const series = (id: number, title: string): FavoriteItem => ({
  id,
  title,
  type: CollectionType.VideoSeries,
  source: "series",
});

describe("library grouping", () => {
  it("按归属轴拆成我创建的 / 我追的，本地目录单列", () => {
    const groups = buildLibraryTileGroups(
      [folder(1, "通勤"), folder(2, "演唱会")],
      [folder(3, "古典"), folder(4, "纪录片", CollectionType.VideoCollections)],
      [season(5, "合集"), series(6, "系列")],
      ["/music/only"],
    );

    // 我创建的 = 自建收藏夹 + 自建合集/系列（徽标区分类型）。
    expect(groups.created.map(tile => [tile.key, tile.badge])).toEqual([
      ["favorite-folder:1", "收藏夹"],
      ["favorite-folder:2", "收藏夹"],
      ["season:5", "合集"],
      ["series:6", "系列"],
    ]);
    // 我追的 = 收藏的收藏夹 + 收藏的合集（type 21 source 是 season，徽标仍是「合集」）。
    expect(groups.followed.map(tile => [tile.key, tile.badge])).toEqual([
      ["favorite-folder:3", "收藏夹"],
      ["season:4", "合集"],
    ]);
    expect(groups.local.map(tile => tile.key)).toEqual(["local-dir:/music/only"]);
  });

  it("显隐配置键与瓦片键同值", () => {
    const items = [folder(1, "普通"), folder(2, "缺 type", 0 as CollectionType), season(3, "合集"), series(4, "系列")];

    for (const item of items) {
      expect(favoriteTileKey(item)).toBe(adaptFavoriteItemToTile(item).key);
    }
  });

  it("只隐藏被勾掉的条目，其余原样保留", () => {
    const created = [folder(1, "通勤"), folder(2, "综艺")];
    const collected = [folder(3, "古典")];

    expect(filterVisibleFavorites(created, ["favorite-folder:1"]).map(item => item.id)).toEqual([2]);
    expect(filterVisibleFavorites(collected, ["favorite-folder:1"]).map(item => item.id)).toEqual([3]);
    expect(filterVisibleFavorites(created, []).map(item => item.id)).toEqual([1, 2]);
  });

  it("同 id 的收藏夹与合集互不影响（靠来源前缀区分）", () => {
    const items = [folder(7, "歌单"), season(7, "合集")];

    expect(filterVisibleFavorites(items, ["season:7"]).map(item => item.title)).toEqual(["歌单"]);
    expect(filterVisibleFavorites(items, ["favorite-folder:7"]).map(item => item.title)).toEqual(["合集"]);
  });
});
