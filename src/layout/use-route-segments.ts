import { useMemo } from "react";
import { useLocation } from "react-router";

import { useSearchSegments } from "@/store/search-segments";
import { useSettings } from "@/store/settings";

import { composeLocalMusicSegments, composeSegmentCount, resolveRouteShell } from "./route-shell";

/**
 * 当前路由的页面内分段组（供页面在内容区渲染下划线 tab）。
 *
 * 它把原先散在 `Layout` 里的三段组合逻辑收敛成单一 hook：
 *   1. `resolveRouteShell` 给出声明侧的分段 + 激活键；
 *   2. `composeSegmentCount` 把 `/search` 的模板分段拼上运行时计数；
 *   3. `/local-music` 用 `composeLocalMusicSegments` 把设计态目录名替换为真实目录。
 *
 * 壳层不再渲染分段（见 `layout/index.tsx`），各页需要时自行调用本 hook，
 * 把结果喂给 `SegmentNav variant="underline"`。
 */
export const useRouteSegments = () => {
  const location = useLocation();
  const localMusicDirs = useSettings(state => state.localMusicDirs);
  const { videoCount, creatorCount } = useSearchSegments();

  const { contextSegments, activeContextKey } = resolveRouteShell(location.pathname, location.search);

  return useMemo(() => {
    const counted = contextSegments.map(segment => composeSegmentCount(segment, { videoCount, creatorCount }));
    if (location.pathname !== "/local-music") {
      return { segments: counted, activeKey: activeContextKey };
    }
    const segments = composeLocalMusicSegments(
      counted,
      localMusicDirs,
      new URLSearchParams(location.search).has("fixture"),
    );
    return { segments, activeKey: activeContextKey };
  }, [activeContextKey, contextSegments, creatorCount, localMusicDirs, location.pathname, location.search, videoCount]);
};
