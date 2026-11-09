import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { addToast } from "@heroui/react";
import { useRequest } from "ahooks";

import type { CollectionDetailConfig, CollectionDetailEntry } from "./types";

/**
 * 三类详情页的数据源驱动：info 拉取、媒体列表状态机（分页 / 全量）、
 * 过滤、排序、hasMore 归一。壳页只提供 `CollectionDetailConfig`。
 *
 * 行为对齐改动前的三个壳：
 * - 收藏夹（paged-server）：keyword/order 变化重查第一页；加载更多追加；id 变化整体重置。
 * - 合集（client 全量）：id 变化拉一次，客户端过滤排序。
 * - 系列（client 增量）：先拉 meta，meta 到位后拉第一批，之后 onLoadMore 追加。
 */
export const useCollectionDetail = <TMedia, TInfo>(
  id: string | undefined,
  config: CollectionDetailConfig<TMedia, TInfo>,
) => {
  const strategy = config.listStrategy;
  const defaultOrder = config.orderOptions[0]?.key ?? "";

  const [keyword, setKeyword] = useState("");
  const [order, setOrder] = useState(defaultOrder);
  const [medias, setMedias] = useState<TMedia[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  const pageRef = useRef(1);
  // config 由壳页每轮 render 用字面量构造，不能进 effect 依赖；ref 持最新一份。
  const configRef = useRef(config);
  configRef.current = config;
  const infoRef = useRef<TInfo | undefined>(undefined);

  const {
    loading: infoLoading,
    data: info,
    refreshAsync: refreshInfo,
    mutate: mutateInfo,
  } = useRequest(async () => (id ? configRef.current.fetchInfo(id) : undefined), {
    ready: Boolean(id),
    refreshDeps: [id],
    onSuccess: data => {
      infoRef.current = data;
      if (data) configRef.current.onInfoLoaded?.(data);
    },
  });
  infoRef.current = info;

  /* ---------------------------------------------------------- 列表加载 */

  const reportError = useCallback((error: unknown) => {
    addToast({
      title: error instanceof Error ? error.message : "获取内容失败",
      color: "danger",
    });
  }, []);

  const loadPagedFirst = useCallback(
    async (keywordValue: string, orderValue: string) => {
      if (configRef.current.listStrategy.kind !== "paged-server") return;
      const s = configRef.current.listStrategy;
      setListLoading(true);
      try {
        const page = await s.fetchPage(1, keywordValue, orderValue);
        pageRef.current = 1;
        setHasMore(page.hasMore);
        setMedias(page.medias);
      } catch (error) {
        reportError(error);
        setHasMore(false);
      } finally {
        setListLoading(false);
      }
    },
    [reportError],
  );

  const loadPagedNext = useCallback(async () => {
    if (configRef.current.listStrategy.kind !== "paged-server") return;
    const s = configRef.current.listStrategy;
    if (listLoading || !hasMore) return;
    const target = pageRef.current + 1;
    setListLoading(true);
    try {
      const page = await s.fetchPage(target, keyword, order);
      pageRef.current = target;
      setHasMore(page.hasMore);
      setMedias(prev => prev.concat(page.medias));
    } catch (error) {
      reportError(error);
      setHasMore(false);
    } finally {
      setListLoading(false);
    }
  }, [listLoading, hasMore, keyword, order, reportError]);

  const loadClient = useCallback(
    async (append: boolean) => {
      if (configRef.current.listStrategy.kind !== "client" || !id) return;
      const s = configRef.current.listStrategy;
      setListLoading(true);
      try {
        const batch = await s.fetchAll(id, infoRef.current);
        if (batch) {
          setMedias(prev => (append ? prev.concat(batch) : batch));
        }
      } finally {
        setListLoading(false);
      }
    },
    [id],
  );

  /* ---------------------------------------------------------- 生命周期 */

  // id 变化：整体重置（三种壳改动前一致）。
  useEffect(() => {
    setKeyword("");
    setOrder(defaultOrder);
    setMedias([]);
    setHasMore(false);
    pageRef.current = 1;
    infoRef.current = undefined;
    if (!id) return;
    if (strategy.kind === "paged-server") {
      void loadPagedFirst("", defaultOrder);
    }
    // client 策略（合集全量 / 系列增量）统一等 info 到位后由下面的 effect 拉列表。
    // 合集把 medias 挂在 fetchInfo 期间填充的 ref 上，必须等 info 再拉，否则读空列表。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // client：info 到位后拉列表（合集全量一次 / 系列增量第一批）；之后 handleLoadMore 追加。
  useEffect(() => {
    if (strategy.kind !== "client") return;
    if (!info || medias.length > 0) return;
    void loadClient(strategy.append === true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info]);

  // client 策略的 hasMore 归一（合集恒 false；系列由 strategy.hasMore 判定）。
  useEffect(() => {
    if (strategy.kind !== "client") return;
    setHasMore(strategy.hasMore?.(medias, info) ?? false);
  }, [strategy, medias, info]);

  /* ---------------------------------------------------------- 过滤 / 排序 */

  const handleOrderChange = useCallback(
    (next: string) => {
      setOrder(next);
      if (strategy.kind === "paged-server") {
        void loadPagedFirst(keyword, next);
      }
    },
    [strategy, keyword, loadPagedFirst],
  );

  const handleKeywordSearch = useCallback(
    (next?: string) => {
      const normalized = next ?? "";
      setKeyword(normalized);
      if (strategy.kind === "paged-server") {
        void loadPagedFirst(normalized, order);
      }
    },
    [strategy, order, loadPagedFirst],
  );

  const filteredMedias = useMemo(() => {
    if (strategy.kind === "paged-server") return medias;
    let result = medias;
    if (keyword) {
      const lower = keyword.toLowerCase();
      result = result.filter(item => configRef.current.adaptToTrack(item)?.title.toLowerCase().includes(lower));
    }
    return configRef.current.sortMedias ? configRef.current.sortMedias([...result], order) : result;
  }, [strategy, medias, keyword, order]);

  const entries: CollectionDetailEntry<TMedia>[] = useMemo(
    () =>
      filteredMedias.flatMap(media => {
        const track = config.adaptToTrack(media);
        return track
          ? [{ id: config.entryKey(media), track, source: media, timestamp: config.entryTimestamp?.(media) }]
          : [];
      }),
    [filteredMedias, config],
  );

  const handleLoadMore =
    strategy.kind === "paged-server"
      ? () => void loadPagedNext()
      : strategy.append
        ? () => void loadClient(true)
        : undefined;

  return {
    info,
    infoLoading,
    refreshInfo,
    mutateInfo,
    keyword,
    order,
    entries,
    filteredMedias,
    hasMore,
    listLoading,
    handleOrderChange,
    handleKeywordSearch,
    handleLoadMore,
  };
};
