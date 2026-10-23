import { useCallback, useEffect, useRef, useState } from "react";

import { addToast } from "@heroui/react";

import { formatDuration, formatSecondsToDate } from "@/common/utils/time";
import ScrollContainer, { type ScrollRefObject } from "@/components/scroll-container";
import { AssetTrackList } from "@/features/assets/asset-track-list";
import { postHistoryClear } from "@/service/history-clear";
import { postHistoryDelete } from "@/service/history-delete";
import {
  searchWebInterfaceHistory,
  type HistoryListItem,
  type WebInterfaceHistorySearchParams,
} from "@/service/web-interface-history-search";
import { openLoginModal } from "@/store/login-modal";
import { useModalStore } from "@/store/modal";
import { usePlayList } from "@/store/play-list";
import { useUser } from "@/store/user";
import { Button } from "@/ui/primitives/button";
import { PageState } from "@/ui/states/page-state";

import HistorySearch from "./search";

import "./history-4188.css";

const SKELETON_ROWS = 6;

/** 历史项 → 可播放项：带上 history.cid，从对应分 P 起播（续播）。 */
const toHistoryPlayItem = (item: HistoryListItem) => ({
  type: "mv" as const,
  title: item.title,
  cover: item.cover,
  bvid: item.history.bvid,
  cid: item.history.cid === undefined ? undefined : String(item.history.cid),
  ownerName: item.author_name,
  ownerMid: item.author_mid,
});

const HistorySkeleton = () => (
  <div className="history4188-skeleton" role="status" aria-label="正在加载观看历史">
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <div key={index} className="history4188-skeleton-row">
        <span className="history4188-skeleton-index" />
        <span className="history4188-skeleton-cover" />
        <span className="history4188-skeleton-copy">
          <i />
          <i />
        </span>
        <span className="history4188-skeleton-middle" />
        <span className="history4188-skeleton-end" />
        <span />
      </div>
    ))}
  </div>
);

const History = () => {
  const scrollerRef = useRef<ScrollRefObject>(null);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [list, setList] = useState<HistoryListItem[]>([]);
  // 首页加载失败时的错误信息；为空表示无错误（避免用空态伪装请求失败）
  const [loadError, setLoadError] = useState<null | string>(null);
  const [loadMoreError, setLoadMoreError] = useState<null | string>(null);
  const [hasMore, setHasMore] = useState(true);
  const [filtersActive, setFiltersActive] = useState(false);
  const [filterVersion, setFilterVersion] = useState(0);
  const pageRef = useRef(1);
  const keywordRef = useRef("");
  const dateRangeRef = useRef<{ start?: number; end?: number } | null>(null);
  const loadingMoreRef = useRef(false);
  const user = useUser(state => state.user);

  // 当前播放稿件：用于行内播放/暂停切换与青色标记。
  const currentBvid = usePlayList(state => state.list.find(item => item.id === state.playId)?.bvid);
  const isPlaying = usePlayList(state => state.isPlaying);

  // 加载历史记录；返回 false 表示失败，供加载更多回退页码。
  const fetchHistory = useCallback(async (): Promise<boolean> => {
    try {
      const params: WebInterfaceHistorySearchParams = {
        pn: pageRef.current,
        keyword: keywordRef.current,
        business: "archive",
      };

      if (dateRangeRef.current) {
        if (dateRangeRef.current.start) {
          params.add_time_start = Math.floor(dateRangeRef.current.start / 1000);
        }
        if (dateRangeRef.current.end) {
          params.add_time_end = Math.floor(dateRangeRef.current.end / 1000);
        }
      }

      const res = await searchWebInterfaceHistory(params);

      if (res.code !== 0) {
        if (res.code === -101) throw new Error("请先登录");
        throw new Error(res.message || "获取历史记录失败");
      }

      const newList = res.data?.list || [];
      setLoadError(null);
      setLoadMoreError(null);
      if (pageRef.current === 1) setList(newList);
      else setList(prev => [...prev, ...newList]);
      setHasMore(res.data.has_more);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "获取历史记录失败";
      if (pageRef.current === 1) {
        setList([]);
        setHasMore(false);
        setLoadError(message);
      } else {
        setLoadMoreError(message);
      }
      return false;
    }
  }, []);

  const refreshList = useCallback(async () => {
    pageRef.current = 1;
    setLoadError(null);
    setLoadMoreError(null);
    setLoading(true);
    try {
      await fetchHistory();
    } finally {
      setLoading(false);
    }
  }, [fetchHistory]);

  const loadNextPage = useCallback(async () => {
    if (loading || loadingMoreRef.current || !hasMore || loadMoreError) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    pageRef.current += 1;
    try {
      const ok = await fetchHistory();
      if (!ok) pageRef.current -= 1;
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [loading, hasMore, loadMoreError, fetchHistory]);

  const retryLoadMore = () => {
    if (loading || loadingMoreRef.current) return;
    setLoadMoreError(null);
    loadingMoreRef.current = true;
    setLoadingMore(true);
    pageRef.current += 1;
    void fetchHistory().then(ok => {
      if (!ok) pageRef.current -= 1;
      loadingMoreRef.current = false;
      setLoadingMore(false);
    });
  };

  const handleSearch = useCallback(
    async (keyword: string) => {
      keywordRef.current = keyword;
      pageRef.current = 1;
      setFiltersActive(Boolean(keyword) || Boolean(dateRangeRef.current));
      setFilterVersion(version => version + 1);
      setLoading(true);
      try {
        await fetchHistory();
      } finally {
        setLoading(false);
      }
    },
    [fetchHistory],
  );

  const handleDateRangeChange = useCallback(
    async (range: { start?: number; end?: number } | null) => {
      dateRangeRef.current = range;
      pageRef.current = 1;
      setFiltersActive(Boolean(range) || Boolean(keywordRef.current));
      setFilterVersion(version => version + 1);
      setLoading(true);
      try {
        await fetchHistory();
      } finally {
        setLoading(false);
      }
    },
    [fetchHistory],
  );

  useEffect(() => {
    // 未登录时由登录门禁接管，不再发起必然失败的请求
    if (!user?.isLogin) return;
    void refreshList();
  }, [refreshList, user?.isLogin]);

  const handleMenuAction = useCallback(
    async (key: string, item: HistoryListItem) => {
      switch (key) {
        case "play": {
          const same = Boolean(currentBvid && item.history.bvid && item.history.bvid === currentBvid);
          if (same) usePlayList.getState().togglePlay();
          else await usePlayList.getState().play(toHistoryPlayItem(item));
          break;
        }
        case "play-next":
          usePlayList.getState().addToNext(toHistoryPlayItem(item));
          break;
        case "add-to-playlist":
          usePlayList.getState().addList([toHistoryPlayItem(item)]);
          break;
        case "download-audio":
          await window.electron.addMediaDownloadTask({
            outputFileType: "audio",
            title: item.title,
            cover: item.cover,
            bvid: item.history.bvid,
            cid: item.history.cid,
          });
          addToast({
            title: "已添加下载任务",
            color: "success",
          });
          break;
        case "delete":
          useModalStore.getState().onOpenConfirmModal({
            title: `删除记录「${item.title}」`,
            confirmText: "删除",
            onConfirm: async () => {
              const res = await postHistoryDelete({
                kid: `${item.history.business}_${item.kid}`,
              });

              if (res.code === 0) {
                setList(prev => prev.filter(record => record.kid !== item.kid));
                addToast({
                  title: "已删除记录",
                  color: "success",
                });
              }
              return res.code === 0;
            },
          });
          break;
      }
    },
    [currentBvid],
  );

  const handleClear = useCallback(() => {
    useModalStore.getState().onOpenConfirmModal({
      title: "确认删除所有历史记录？",
      confirmText: "删除",
      onConfirm: async () => {
        const res = await postHistoryClear();
        if (res.code === 0) {
          refreshList();
        }
        return res.code === 0;
      },
    });
  }, [refreshList]);

  const isEmpty = !loading && list.length === 0;
  const countLabel = hasMore ? `已载入 ${list.length} 条` : `共 ${list.length} 条`;

  return (
    <ScrollContainer
      enableBackToTop
      ref={scrollerRef}
      className="h-full w-full"
      resetOnChange={filterVersion}
      onReachEnd={loadNextPage}
    >
      <div className="asset4188-page">
        <h1 className="sr-only">观看历史</h1>

        {user?.isLogin && (
          <HistorySearch
            onSearch={keyword => void handleSearch(keyword)}
            onDateRangeChange={range => void handleDateRangeChange(range)}
            actions={
              <button type="button" className="history4188-clear" disabled={!user.isLogin} onClick={handleClear}>
                清空历史
              </button>
            }
          />
        )}

        {!user?.isLogin ? (
          <PageState
            kind="empty"
            title="登录后查看观看历史"
            description="历史记录同步自当前 B 站账号，登录后即可查看与清理"
            actionLabel="去登录"
            onAction={openLoginModal}
          />
        ) : loading && list.length === 0 ? (
          <HistorySkeleton />
        ) : loadError && list.length === 0 ? (
          <PageState kind="error" description={loadError} actionLabel="重新加载" onAction={() => void refreshList()} />
        ) : isEmpty ? (
          <PageState
            kind="empty"
            title={filtersActive ? "当前筛选下没有记录" : "暂无历史记录"}
            description={filtersActive ? "换个时间范围或关键词试试" : "在 B 站观看过的内容会同步到这里"}
          />
        ) : (
          <section className="asset4188-section history4188-section" aria-busy={loading}>
            <div className="asset4188-section-head">
              <h2>观看记录 · {countLabel}</h2>
              {loading && <span className="history4188-updating">更新中…</span>}
            </div>
            <AssetTrackList
              label="观看记录"
              showHeader
              keepRank
              headerLabels={{ index: "#", title: "标题", middle: "进度", end: "观看时间" }}
              rows={list.map((item, index) => {
                const progress = item.progress ?? 0;
                const duration = item.duration ?? 0;
                const percent = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;
                const progressText = duration > 0 ? `${formatDuration(progress)} / ${formatDuration(duration)}` : "—";

                return {
                  id: `${item.history.business}-${item.kid}`,
                  index: index + 1,
                  title: item.title,
                  subtitle: (
                    <span>
                      {item.author_name}
                      <span className="history4188-mobile-progress"> · {progressText}</span>
                    </span>
                  ),
                  art: item.cover,
                  middle: (
                    <span className="history4188-progress">
                      <span className="history4188-progress-track" aria-hidden="true">
                        <span style={{ width: `${percent}%` }} />
                      </span>
                      <span className="history4188-progress-text">{progressText}</span>
                    </span>
                  ),
                  end: formatSecondsToDate(item.view_at),
                  current: Boolean(currentBvid && item.history.bvid && currentBvid === item.history.bvid),
                  playing: isPlaying,
                  source: item,
                };
              })}
              actions={[
                { key: "play-next", label: "下一首", icon: "next" },
                { key: "add-to-playlist", label: "入队", icon: "queue-add" },
                { key: "download-audio", label: "下载", icon: "download" },
                { key: "delete", label: "删除", icon: "trash" },
              ]}
              onAction={(row, key) => void handleMenuAction(key, row.source)}
            />

            {loadMoreError && (
              <div className="history4188-more-error" role="alert">
                <span>加载更多失败</span>
                <button type="button" onClick={retryLoadMore}>
                  重试
                </button>
              </div>
            )}

            {hasMore && !loadMoreError && (
              <div className="history4188-more">
                <Button variant="neutral" disabled={loadingMore} onClick={() => void loadNextPage()}>
                  {loadingMore ? "加载中…" : "加载更多"}
                </Button>
              </div>
            )}

            {!hasMore && <p className="history4188-end">已显示全部 {list.length} 条</p>}
          </section>
        )}
      </div>
    </ScrollContainer>
  );
};

export default History;
