import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { countDownloadStatuses } from "@/features/downloads/model";
import { useLibraryFixtureData } from "@/features/library/fixture";
import { buildLibraryTileGroups, filterVisibleFavorites } from "@/features/library/grouping";
import { LibraryView } from "@/features/library/library-view";
import { buildLibraryOverviewLines, type LibraryTile } from "@/features/library/model";
import { executePlaylistBulkAction } from "@/features/playlist/bulk-actions";
import { loadAllPlaylistTracks, type PlaylistTrackSource } from "@/features/playlist/load-tracks";
import SegmentNav from "@/layout/topbar/segment-nav";
import { useRouteSegments } from "@/layout/use-route-segments";
import { useFavoritesStore } from "@/store/favorite";
import { openLoginModal } from "@/store/login-modal";
import { useSettings } from "@/store/settings";
import { useUser } from "@/store/user";
import { AnnotationBand } from "@/ui/patterns/annotation-band";
import { PageState } from "@/ui/states/page-state";

/** 设置里音质档位的展示文案（与 system-settings 的 SelectItem 一致）。 */
const QUALITY_LABELS: Record<string, string> = {
  auto: "自动",
  lossless: "无损优先",
  high: "高品质",
  medium: "中等",
  low: "低品质",
};

/** LibraryTile.source → 曲目加载器支持的来源；本地目录没有远程加载器。 */
const TRACK_SOURCES = new Set<PlaylistTrackSource>(["favorite-folder", "season", "series"]);

const Library = () => {
  const fixture = useLibraryFixtureData();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const libraryTab = tabParam === "followed" ? "followed" : "created";
  const user = useUser(state => state.user);
  const createdFavorites = useFavoritesStore(state => state.createdFavorites);
  const collectedFavorites = useFavoritesStore(state => state.collectedFavorites);
  const seasonSeries = useFavoritesStore(state => state.seasonSeries);
  const updateCreatedFavorites = useFavoritesStore(state => state.updateCreatedFavorites);
  const updateCollectedFavorites = useFavoritesStore(state => state.updateCollectedFavorites);
  const updateSeasonSeries = useFavoritesStore(state => state.updateSeasonSeries);
  const hiddenLibraryKeys = useSettings(state => state.hiddenLibraryKeys);
  const audioQuality = useSettings(state => state.audioQuality);
  const navigate = useNavigate();
  const { segments: librarySegments, activeKey: libraryActiveKey } = useRouteSegments();
  const libraryTabs =
    librarySegments.length > 0 ? <SegmentNav segments={librarySegments} activeKey={libraryActiveKey} /> : null;
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [downloadCounts, setDownloadCounts] = useState<{ done: number; active: number }>();

  const refresh = useCallback(async () => {
    if (!user?.mid) return;
    setLoading(true);
    setLoadError(false);
    try {
      await Promise.all([
        updateCreatedFavorites(user.mid),
        updateCollectedFavorites(user.mid),
        updateSeasonSeries(user.mid),
      ]);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [updateCollectedFavorites, updateCreatedFavorites, updateSeasonSeries, user?.mid]);

  useEffect(() => {
    if (fixture) return; // 夹具模式不触网：比对需要确定性。
    void refresh();
  }, [fixture, refresh]);

  useEffect(() => {
    if (fixture) return;
    let cancelled = false;
    void window.electron
      .getMediaDownloadTaskList()
      .then(list => {
        if (cancelled) return;
        const counts = countDownloadStatuses(list);
        setDownloadCounts({ done: counts.completed, active: counts.waiting + counts.downloading + counts.processing });
      })
      .catch(() => {
        /* 下载统计拿不到时概览面板少一行，不阻塞页面。 */
      });
    return () => {
      cancelled = true;
    };
  }, [fixture]);

  /** 把一组瓦片的曲目全部加载完（收藏族）。加载失败返回空数组。 */
  const loadTilesTracks = useCallback(async (tiles: LibraryTile[]) => {
    const remote = tiles.filter(tile => tile.source !== "local-dir" && TRACK_SOURCES.has(tile.source));
    const results = await Promise.allSettled(
      remote.map(tile => loadAllPlaylistTracks(tile.source as PlaylistTrackSource, String(tile.favorite?.id ?? ""))),
    );
    return results.flatMap(result => (result.status === "fulfilled" ? result.value : []));
  }, []);

  const playTiles = useCallback(
    async (tiles: LibraryTile[], shuffle: boolean) => {
      setBulkPending(true);
      try {
        const tracks = await loadTilesTracks(tiles);
        if (!tracks.length) return;
        // 随机播放 = 以乱序一次性入列播放；不改全局播放模式
        //（那会改变用户已选的循环 / 单曲偏好，超出「这次点一下」的语义）。
        const items = shuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks;
        await executePlaylistBulkAction("play-all", items);
      } finally {
        setBulkPending(false);
      }
    },
    [loadTilesTracks],
  );

  const onTileAction = useCallback(async (tile: LibraryTile, actionKey: string) => {
    // 「入队」在播放列表这一层是批量能力（add-all）；「下一首 / 收藏 / 下载音频」
    // 是单曲能力，落点在详情页与行内上下文（features/track/actions），
    // 瓦片层不重复接线 —— 见施工矩阵 01 的能力对齐表。
    if (actionKey !== "play" && actionKey !== "queue-add") return;
    if (tile.source === "local-dir" || !tile.favorite) return;
    const action: "play-all" | "add-all" = actionKey === "play" ? "play-all" : "add-all";
    setBulkPending(true);
    try {
      const tracks = await loadAllPlaylistTracks(tile.source as PlaylistTrackSource, String(tile.favorite.id));
      await executePlaylistBulkAction(action, tracks);
    } finally {
      setBulkPending(false);
    }
  }, []);

  if (fixture) {
    const { created, collected, demoActionKeys, overview } = fixture;
    const total = created.length + collected.length;

    return (
      <>
        <LibraryView
          lead={`${total} 个播放列表 · ${overview.tracks} 首 · 我创建 ${created.length} / 我收藏 ${collected.length}`}
          tabs={libraryTabs}
          overviewLines={buildLibraryOverviewLines({
            createdCount: created.length,
            collectedCount: collected.length,
            qualityLabel: overview.qualityLabel,
            localDirs: overview.localDirs,
            localFiles: overview.localFiles,
            tracks: overview.tracks,
            downloadsDone: overview.downloadsDone,
            downloadsActive: overview.downloadsActive,
          })}
          createdTiles={created}
          followedTiles={collected}
          demoActionKeys={searchParams.get("preview") === "4188" ? [] : demoActionKeys}
          onTilePress={() => {
            /* 夹具模式下不跳转：比对需要画面稳定。 */
          }}
          onTileAction={() => {
            /* 夹具模式下不触网。 */
          }}
          onPlayAll={() => undefined}
          onShuffleAll={() => undefined}
        />
        {searchParams.get("preview") !== "4188" && (
          <AnnotationBand anchor="low">
            悬停或选中瓦片：玻璃操作带直接露出 5 个主操作（播放 / 下一首 / 入队 / 收藏 /
            下载音频），其余进入右键菜单——每个 Track 的 8 项能力都有落点。
          </AnnotationBand>
        )}
      </>
    );
  }

  // 未登录降级：收藏夹 / 合集需登录态，直接落到登录引导。
  // 本地目录在侧栏「本地音乐」有独立入口，不在库页重复展示。
  if (!user?.isLogin) {
    return (
      <PageState
        kind="empty"
        title="登录后查看我的收藏"
        description="收藏内容同步自当前 B 站账号"
        actionLabel="去登录"
        onAction={openLoginModal}
      />
    );
  }

  // 两组拆分与显隐过滤的真源在 features/library/grouping —— 设置页的
  // 「我的音乐显示」共用同一份，设置里列出的条目就是这里能出现的瓦片。
  const visibleCreatedFavorites = filterVisibleFavorites(createdFavorites, hiddenLibraryKeys ?? []);
  const visibleCollectedFavorites = filterVisibleFavorites(collectedFavorites, hiddenLibraryKeys ?? []);
  const visibleSeasonSeries = filterVisibleFavorites(seasonSeries, hiddenLibraryKeys ?? []);
  const groups = buildLibraryTileGroups(visibleCreatedFavorites, visibleCollectedFavorites, visibleSeasonSeries, []);
  const createdTiles: LibraryTile[] = groups.created;
  const followedTiles = groups.followed;
  const allFavorites = [...visibleCreatedFavorites, ...visibleCollectedFavorites, ...visibleSeasonSeries];
  const trackTotal = allFavorites.reduce((sum, item) => sum + (item.trackCount ?? 0), 0);
  const hasTrackCounts = allFavorites.some(item => item.trackCount !== undefined);

  const overviewLines = buildLibraryOverviewLines({
    createdCount: visibleCreatedFavorites.length + visibleSeasonSeries.length,
    collectedCount: visibleCollectedFavorites.length,
    qualityLabel: QUALITY_LABELS[audioQuality] ?? audioQuality,
    localDirs: undefined,
    tracks: hasTrackCounts ? trackTotal : undefined,
    downloadsDone: downloadCounts?.done,
    downloadsActive: downloadCounts?.active,
  });

  const hasAnyTiles = createdTiles.length + followedTiles.length > 0;
  // 工具条动作作用于当前 tab 的列表：在「我追的」上点全部播放，不能去播「我创建的」。
  const activeTiles = libraryTab === "created" ? createdTiles : followedTiles;
  const otherTab = libraryTab === "created" ? "followed" : "created";
  const emptyState =
    activeTiles.length === 0 ? (
      <PageState
        kind="empty"
        title="当前分类暂无内容"
        description="另一个分类里还有内容"
        actionLabel={otherTab === "created" ? "查看我创建的" : "查看我追的"}
        onAction={() => navigate(`/library?tab=${otherTab}`)}
      />
    ) : undefined;
  // 收藏内容还在、只是被设置全部隐去：与「确实没有收藏」是两种状态，
  // 给同一句「暂无收藏内容」会把人指向错误的方向（去 B 站收藏更多）。
  const allHidden = createdFavorites.length + collectedFavorites.length + seasonSeries.length > 0 && !hasAnyTiles;

  return (
    <>
      {loading && !hasAnyTiles ? (
        <PageState kind="loading" className="min-h-[320px]" />
      ) : loadError ? (
        <PageState kind="error" actionLabel="重新加载" onAction={() => void refresh()} />
      ) : allHidden ? (
        <PageState
          kind="empty"
          title="收藏内容已全部隐藏"
          description="在「设置 · 常规 · 我的音乐显示」里重新勾选要展示的条目"
          actionLabel="去设置"
          onAction={() => navigate("/settings?tab=general")}
        />
      ) : !hasAnyTiles ? (
        <PageState kind="empty" title="暂无收藏内容" description="在 B 站创建或收藏的播放列表会显示在这里" />
      ) : (
        <>
          <LibraryView
            // lead 保留曲目总数与创建/追的拆分；概览卡片已移除，这里不再有重复来源。
            lead={
              hasTrackCounts
                ? `${trackTotal} 首 · 我创建 ${visibleCreatedFavorites.length + visibleSeasonSeries.length} / 我追 ${visibleCollectedFavorites.length}`
                : `我创建 ${visibleCreatedFavorites.length + visibleSeasonSeries.length} / 我追 ${visibleCollectedFavorites.length}`
            }
            tabs={libraryTabs}
            overviewLines={overviewLines}
            createdTiles={libraryTab === "created" ? createdTiles : []}
            followedTiles={libraryTab === "followed" ? followedTiles : []}
            demoActionKeys={[]}
            onTilePress={tile => navigate(tile.href)}
            onTileAction={(tile, key) => void onTileAction(tile, key)}
            onPlayAll={() => void playTiles(activeTiles, false)}
            onShuffleAll={() => void playTiles(activeTiles, true)}
            bulkPending={bulkPending}
            emptyState={emptyState}
            compact
          />
        </>
      )}
    </>
  );
};

export default Library;
