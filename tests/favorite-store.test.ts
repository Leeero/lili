import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FavFolderCollectedItem, FavFolderCollectedListResponse } from "@/service/fav-folder-collected-list";

const getFavFolderCollectedList = vi.hoisted(() => vi.fn());

vi.mock("@/service/fav-folder-collected-list", () => ({
  getFavFolderCollectedList,
}));

import { useFavoritesStore } from "@/store/favorite";

const collectedItem = (id: number, type: number): FavFolderCollectedItem => ({
  id,
  type,
  fid: id * 10,
  mid: 1,
  attr: 0,
  title: type === 21 ? "收藏的合集" : "收藏的收藏夹",
  cover: "",
  upper: { mid: 1, name: "", face: "" },
  cover_type: 2,
  intro: "",
  ctime: 0,
  mtime: 0,
  state: 0,
  fav_state: 0,
  media_count: 3,
});

const collectedResponse = (items: FavFolderCollectedItem[]): FavFolderCollectedListResponse => ({
  code: 0,
  message: "0",
  ttl: 1,
  data: { count: items.length, list: items, has_more: false },
});

describe("favorites store collected source mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFavoritesStore.setState({ collectedFavorites: [], collectedOrder: [] });
  });

  it("收藏的合集（type 21）source 为 season，普通收藏夹（type 11）为 favorite-folder", async () => {
    getFavFolderCollectedList.mockResolvedValue(collectedResponse([collectedItem(101, 11), collectedItem(202, 21)]));

    await useFavoritesStore.getState().updateCollectedFavorites("1");

    const collected = useFavoritesStore.getState().collectedFavorites;
    expect(collected.map(item => [item.id, item.source])).toEqual([
      [101, "favorite-folder"],
      [202, "season"],
    ]);
  });
});
