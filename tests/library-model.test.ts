import { describe, expect, it } from "vitest";

import { CollectionType } from "@/common/constants/collection";
import { adaptFavoriteItemToPlaylist, getFavoriteItemHref } from "@/features/library/model";

describe("library model", () => {
  it("adapts created favorites without inventing unavailable metadata", () => {
    expect(adaptFavoriteItemToPlaylist({ id: 12, title: "通勤", source: "favorite-folder" }, true)).toEqual({
      id: "favorite-folder:12",
      source: "favorite-folder",
      title: "通勤",
      cover: undefined,
      isOwnedByCurrentUser: true,
    });
  });

  it("routes favorite folders and collections through the existing detail route", () => {
    expect(getFavoriteItemHref({ id: 12, title: "通勤", mid: 34, source: "favorite-folder" })).toBe(
      "/collection/12?type=11&mid=34",
    );
    expect(
      getFavoriteItemHref({ id: 56, title: "现场", type: CollectionType.VideoCollections, source: "season" }),
    ).toBe("/collection/56?type=21");
  });
});
