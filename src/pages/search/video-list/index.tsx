import React, { useCallback, useEffect, useRef, useState } from "react";

import { addToast } from "@heroui/react";
import { RiFolderMusicLine, RiSearchEyeLine } from "@remixicon/react";

import type { Track } from "@/domain/track";

import { getTrackSourceUrl, toFavoriteSelection, toMediaDownloadInfo, toPlayItem } from "@/adapters/track/actions";
import { adaptSearchVideoToTrack } from "@/adapters/track/search";
import { executePlaylistBulkAction } from "@/features/playlist/bulk-actions";
import { getWebInterfaceWbiSearchType, type SearchVideoItem } from "@/service/web-interface-search-type";
import { useModalStore } from "@/store/modal";
import { usePlayList } from "@/store/play-list";
import { useSearchSegments } from "@/store/search-segments";
import { PageState } from "@/ui/states/page-state";

import type { SearchViewMode, SortOrder } from "../search-sort";

import GridList from "./grid-list";
import List from "./list";
import SearchHeader from "./search-header";

export type SearchVideoProps = {
  keyword: string;
  getScrollElement: () => HTMLElement | null;
  order: SortOrder;
  musicOnly: boolean;
  mode: SearchViewMode;
  onOrderChange: (order: SortOrder) => void;
  onMusicOnlyChange: (value: boolean) => void;
  onModeChange: (mode: SearchViewMode) => void;
  onLocalSearch: () => void;
  /** 「综合」里的视频段：只取前几条做聚合摘要，不参与无限滚动。 */
  preview?: boolean;
  /** 预览段的「查看全部」出口（切到「音乐视频」tab）。 */
  onSeeAll?: () => void;
};

const SKELETON_COUNT = 6;
const PAGE_SIZE = 24;
const PREVIEW_COUNT = 6;

const SearchGridSkeleton = () => (
  <div className="search4188-grid-skeleton" role="status" aria-label="正在加载搜索结果">
    {Array.from({ length: SKELETON_COUNT }, (_, index) => (
      <span key={index} className="search4188-card-skeleton">
        <span className="search4188-card-skeleton-cover" />
        <span className="search4188-card-skeleton-line" />
        <span className="search4188-card-skeleton-line is-short" />
      </span>
    ))}
  </div>
);

/**
 * 音乐视频结果列表。
 *
 * 排序 / 分区 / 视图是**受控**的（由结果页写进 URL），列表只负责取数与呈现；
 * 结果总数写进 `useSearchSegments`，页头与 tab 的数字都从这里来。
 *
 * 「播放全部」现在真的起播：走 `play-all` bulk action（替换队列并让播放器播第一条），
 * 而不是原来的 `addList` —— 旧实现按钮写着“播放全部”，实际只是把已载入的 24 条
 * 塞进队列，提示语还是“已添加”。
 */
export default function SearchVideo({
  keyword,
  getScrollElement,
  order,
  musicOnly,
  mode,
  onOrderChange,
  onMusicOnlyChange,
  onModeChange,
  onLocalSearch,
  preview = false,
  onSeeAll,
}: SearchVideoProps) {
  const setVideoCount = useSearchSegments(state => state.setVideoCount);
  const videoCount = useSearchSegments(state => state.videoCount);

  const [list, setList] = useState<Track[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [error, setError] = useState(false);
  const requestSeq = useRef(0);

  const fetchPage = useCallback(
    async (pn: number) => {
      const res = await getWebInterfaceWbiSearchType<SearchVideoItem>({
        search_type: "video",
        keyword,
        page: pn,
        page_size: preview ? PREVIEW_COUNT : PAGE_SIZE,
        order,
        ...(musicOnly && { tids: 3 }), // 音乐分区ID为3
      });
      const items = (res?.data?.result ?? []).map(adaptSearchVideoToTrack);
      const total = res?.data?.numResults ?? 0;
      return { items, total };
    },
    [keyword, musicOnly, order, preview],
  );

  const loadMore = useCallback(async () => {
    if (preview || loadingMore || !hasMore || initialLoading) return;
    const seq = requestSeq.current;
    try {
      setLoadingMore(true);
      setLoadMoreError(false);
      const nextPage = page + 1;
      const { items, total } = await fetchPage(nextPage);
      if (seq !== requestSeq.current) return;
      setList(prev => {
        const nextList = [...prev, ...items];
        setHasMore(nextList.length < total);
        return nextList;
      });
      setPage(nextPage);
    } catch {
      if (seq === requestSeq.current) setLoadMoreError(true);
    } finally {
      if (seq === requestSeq.current) setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore, initialLoading, fetchPage, preview]);

  const retryLoadMore = () => {
    setLoadMoreError(false);
    void loadMore();
  };

  const retryInitial = useCallback(async () => {
    if (!keyword) return;
    const seq = ++requestSeq.current;
    setInitialLoading(true);
    setError(false);
    setLoadMoreError(false);
    setList([]);
    setPage(1);
    setHasMore(true);
    setVideoCount(null);
    try {
      const { items, total } = await fetchPage(1);
      if (seq !== requestSeq.current) return;
      setList(preview ? items.slice(0, PREVIEW_COUNT) : items);
      setHasMore(preview ? false : items.length < total);
      setVideoCount(total);
    } catch {
      if (seq !== requestSeq.current) return;
      setError(true);
      setVideoCount(null);
    } finally {
      if (seq === requestSeq.current) setInitialLoading(false);
    }
  }, [fetchPage, keyword, setVideoCount, preview]);

  useEffect(() => {
    void retryInitial();
    return () => {
      requestSeq.current += 1;
    };
  }, [retryInitial]);

  const handlePlayAll = useCallback(async () => {
    if (!list.length) return;
    await executePlaylistBulkAction("play-all", list);
  }, [list]);

  const handleMenuAction = useCallback(async (key: string, item: Track) => {
    switch (key) {
      case "play-next":
        usePlayList.getState().addToNext(toPlayItem(item));
        addToast({ title: "已添加到下一首播放", color: "success" });
        break;
      case "add-to-playlist":
        usePlayList.getState().addList([toPlayItem(item)]);
        addToast({ title: "已添加到播放列表", color: "success" });
        break;
      case "favorite": {
        const selection = toFavoriteSelection(item);
        if (selection) useModalStore.getState().onOpenFavSelectModal(selection);
        break;
      }
      case "download-audio": {
        const audioTask = toMediaDownloadInfo(item, "audio");
        if (!audioTask) return;
        await window.electron.addMediaDownloadTask(audioTask);
        addToast({ title: "已添加下载任务", color: "success" });
        break;
      }
      case "download-video": {
        const videoTask = toMediaDownloadInfo(item, "video");
        if (!videoTask) return;
        await window.electron.addMediaDownloadTask(videoTask);
        addToast({ title: "已添加下载任务", color: "success" });
        break;
      }
      case "bililink": {
        const url = getTrackSourceUrl(item);
        if (url) window.electron.openExternal(url);
        break;
      }
      default:
        break;
    }
  }, []);

  // 「综合」里的视频段是聚合摘要：没有视频但可能还有创作者，不要把这里渲染成
  // 整个搜索的失败/空态（视频 tab 才有完整的空态出口）。
  if (preview && !initialLoading && !error && list.length === 0) {
    return null;
  }

  return (
    <>
      <SearchHeader
        order={order}
        onOrderChange={onOrderChange}
        musicOnly={musicOnly}
        onMusicOnlyChange={onMusicOnlyChange}
        mode={mode}
        onModeChange={onModeChange}
        onPlayAll={() => void handlePlayAll()}
        playAllDisabled={initialLoading || list.length === 0}
        loadedCount={list.length}
        resultCount={videoCount}
        onSeeAll={preview ? onSeeAll : undefined}
      />

      {initialLoading && <SearchGridSkeleton />}

      {!initialLoading && error && (
        <PageState kind="error" actionLabel="重新加载" onAction={() => void retryInitial()} className="min-h-[320px]" />
      )}

      {!initialLoading && !error && list.length === 0 && (
        <div className="search4188-empty">
          <RiSearchEyeLine size={30} aria-hidden="true" />
          <h3>没有找到“{keyword}”</h3>
          <p>
            {musicOnly
              ? "试试关闭「仅音乐分区」，或换一个更短的关键词。"
              : "换一个更短的关键词，或者去本地音乐里找找。"}
          </p>
          <div className="search4188-empty-actions">
            {musicOnly && (
              <button type="button" className="search4188-empty-primary" onClick={() => onMusicOnlyChange(false)}>
                在全部分区中搜索
              </button>
            )}
            <button type="button" className="search4188-empty-secondary" onClick={onLocalSearch}>
              <RiFolderMusicLine size={14} aria-hidden="true" />
              在本地音乐中搜索
            </button>
          </div>
        </div>
      )}

      {!initialLoading && !error && list.length > 0 && (
        <>
          {mode === "card" ? (
            <GridList
              items={list}
              getScrollElement={getScrollElement}
              onMenuAction={handleMenuAction}
              loading={loadingMore}
              hasMore={hasMore}
              onLoadMore={loadMore}
            />
          ) : (
            <List
              items={list}
              getScrollElement={getScrollElement}
              onMenuAction={handleMenuAction}
              loading={loadingMore}
              hasMore={hasMore}
              onLoadMore={loadMore}
            />
          )}
          {!preview && loadMoreError && (
            <div className="search4188-more-error" role="alert">
              <span>加载更多失败</span>
              <button type="button" onClick={retryLoadMore}>
                重试
              </button>
            </div>
          )}
          {!preview && !hasMore && <p className="search4188-end">已显示全部 {list.length} 个结果</p>}
        </>
      )}
    </>
  );
}
