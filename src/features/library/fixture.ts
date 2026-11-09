import { useMemo } from "react";
import { useSearchParams } from "react-router";

import type { FavoriteItem } from "@/store/favorite";

import { CollectionType } from "@/common/constants/collection";
import { PLACEHOLDER_GRADIENTS } from "@/ui/fixtures/placeholder-art";
import {
  LIBRARY_FIXTURE_NAME,
  LIBRARY_TILE_ACTIONS,
  SCREEN_01_LIBRARY_FIXTURE,
  type FixtureLibraryTile,
} from "@/ui/fixtures/screen-01-library";

import { adaptFavoriteItemToTile, adaptLocalDirToTile, type LibraryTile } from "./model";

/**
 * 屏 01 夹具的读取与映射。
 *
 * 只有当 URL 携带 `?fixture=01-library` 时才返回数据；真实路径
 * （useFavoritesStore / useSettings / 下载 IPC）完全不经过本文件。
 * 这样保真度比对（verify.py --target app）拿到的是设计稿第 2 页的
 * 逐字内容，而日常使用仍然走真实数据 —— 两条路径共享同一个
 * LibraryTile 视图模型，渲染代码只有一份。
 */
export const useLibraryFixture = (): boolean => {
  const [params] = useSearchParams();
  return params.get("fixture") === LIBRARY_FIXTURE_NAME;
};

const fixtureMeta = (tile: FixtureLibraryTile) => `${tile.trackCount} 首 · ${tile.metaNote}`;

const fixtureTileToLibraryTile = (tile: FixtureLibraryTile): LibraryTile => {
  if (tile.type === "dir") {
    return {
      ...adaptLocalDirToTile(tile.title),
      // 本地目录的身份就是路径；夹具里没有真实路径，用标题本身占位。
      key: `local-dir:${tile.title}`,
      title: tile.title,
      artKey: `fixture-local-${tile.id}`,
      // 设计稿同款渐变走显式口（逐字比对目标），不进 cover（网络地址口）。
      coverGradient: PLACEHOLDER_GRADIENTS[tile.artIndex],
      meta: fixtureMeta(tile),
    };
  }

  const favorite: FavoriteItem = {
    id: tile.id,
    title: tile.title,
    type: tile.type,
    mid: SCREEN_01_LIBRARY_FIXTURE.user.mid,
    trackCount: tile.trackCount,
    source: sourceOf(tile),
  };

  return {
    ...adaptFavoriteItemToTile(favorite),
    // 封面用设计稿同款占位渐变（artIndex 指向 placeholder-art 的 gradients），
    // 不做哈希挑选 —— 比对要求逐字一致。
    coverGradient: PLACEHOLDER_GRADIENTS[tile.artIndex],
    meta: fixtureMeta(tile),
  };
};

export interface LibraryFixtureData {
  created: LibraryTile[];
  collected: LibraryTile[];
  /** 常驻演示操作带的瓦片 key（设计稿第 3 枚：Live 现场）。 */
  demoActionKeys: string[];
  overview: {
    localDirs: number;
    localFiles: number;
    tracks: number;
    qualityLabel: string;
    downloadsDone: number;
    downloadsActive: number;
  };
}

export const useLibraryFixtureData = (): LibraryFixtureData | null => {
  const enabled = useLibraryFixture();

  return useMemo(() => {
    if (!enabled) return null;

    const { library } = SCREEN_01_LIBRARY_FIXTURE;

    return {
      created: library.created.map(tile => fixtureTileToLibraryTile(tile)),
      collected: library.collected.map(tile => fixtureTileToLibraryTile(tile)),
      demoActionKeys: [...library.created, ...library.collected]
        .filter(tile => tile.demoActions)
        .map(tile => (tile.type === "dir" ? `local-dir:${tile.title}` : `${sourceOf(tile)}:${tile.id}`)),
      overview: library.overview,
    };
  }, [enabled]);
};

const sourceOf = (tile: FixtureLibraryTile): FavoriteItem["source"] => {
  switch (tile.type) {
    case CollectionType.VideoCollections:
      return "season";
    case CollectionType.VideoSeries:
      return "series";
    default:
      return "favorite-folder";
  }
};

export { LIBRARY_TILE_ACTIONS };
