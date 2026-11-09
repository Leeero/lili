import React, { useCallback, useEffect, useRef, useState } from "react";

import { RiSearchEyeLine } from "@remixicon/react";

import VirtualGridPageList from "@/components/virtual-grid-page-list";
import { getRelationRelations } from "@/service/relation-relations";
import { getWebInterfaceWbiSearchType, type SearchUserItem } from "@/service/web-interface-search-type";
import { useSearchSegments } from "@/store/search-segments";
import { PageState } from "@/ui/states/page-state";

import SearchHeader from "./search-header";
import UserCard from "./user-card";
import { getSortParams, type SearchUserItemWithRelation, type UserSortKey } from "./utils";

interface UserListProps {
  keyword: string;
  getScrollElement: () => HTMLElement | null;
}

const SKELETON_COUNT = 4;

const UserGridSkeleton = () => (
  <div className="search4188-user-skeleton-grid" role="status" aria-label="正在加载创作者">
    {Array.from({ length: SKELETON_COUNT }, (_, index) => (
      <span key={index} className="search4188-user-skeleton" />
    ))}
  </div>
);

/** 创作者完整列表：关注状态、分页与排序都在这里；结果数写回 `useSearchSegments`。 */
export default function UserList({ keyword, getScrollElement }: UserListProps) {
  const setCreatorCount = useSearchSegments(state => state.setCreatorCount);
  const [list, setList] = useState<SearchUserItemWithRelation[]>([]);
  const [sortKey, setSortKey] = useState<UserSortKey>("default");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [error, setError] = useState(false);
  const requestSeq = useRef(0);

  const fetchPage = useCallback(
    async (pn: number) => {
      const { order, order_sort } = getSortParams(sortKey);
      const res = await getWebInterfaceWbiSearchType<SearchUserItem>({
        search_type: "bili_user",
        keyword,
        page: pn,
        page_size: 24,
        order,
        order_sort,
      });
      let items: SearchUserItemWithRelation[] = [];
      const rawItems = res?.data?.result ?? [];
      const total = res?.data?.numResults ?? 0;

      if (rawItems.length > 0) {
        try {
          const fids = rawItems.map(item => item.mid).join(",");
          const relationRes = await getRelationRelations({ fids });
          if (relationRes.code === 0 && relationRes.data) {
            items = rawItems.map(item => {
              const rel = relationRes.data[item.mid];
              // attribute: 0:未关注 1:悄悄关注 2:已关注 6:已互粉 128:已拉黑
              const is_followed = rel ? rel.attribute === 2 || rel.attribute === 6 : false;
              return { ...item, is_followed };
            });
          } else {
            items = rawItems.map(item => ({ ...item, is_followed: false }));
          }
        } catch {
          items = rawItems.map(item => ({ ...item, is_followed: false }));
        }
      }

      return { items, total };
    },
    [keyword, sortKey],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || initialLoading) return;
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
  }, [page, loadingMore, hasMore, initialLoading, fetchPage]);

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
    try {
      const { items, total } = await fetchPage(1);
      if (seq !== requestSeq.current) return;
      setList(items);
      setHasMore(items.length < total);
      setCreatorCount(total);
    } catch {
      if (seq !== requestSeq.current) return;
      setError(true);
    } finally {
      if (seq === requestSeq.current) setInitialLoading(false);
    }
  }, [fetchPage, keyword, setCreatorCount]);

  useEffect(() => {
    void retryInitial();
    return () => {
      requestSeq.current += 1;
    };
  }, [retryInitial]);

  return (
    <>
      <SearchHeader sortKey={sortKey} onSortChange={setSortKey} />

      {initialLoading && <UserGridSkeleton />}

      {!initialLoading && error && (
        <PageState kind="error" actionLabel="重新加载" onAction={() => void retryInitial()} className="min-h-[320px]" />
      )}

      {!initialLoading && !error && list.length === 0 && (
        <div className="search4188-empty">
          <RiSearchEyeLine size={30} aria-hidden="true" />
          <h3>没有找到相关创作者</h3>
          <p>换一个关键词，或者回到「音乐视频」看看。</p>
        </div>
      )}

      {!initialLoading && !error && list.length > 0 && (
        <VirtualGridPageList
          items={list}
          itemKey="mid"
          renderItem={user => <UserCard key={user.mid} u={user} />}
          getScrollElement={getScrollElement}
          onLoadMore={loadMore}
          hasMore={hasMore}
          loading={loadingMore}
          rowHeight={240}
        />
      )}

      {!initialLoading && !error && loadMoreError && (
        <div className="search4188-more-error" role="alert">
          <span>加载更多失败</span>
          <button type="button" onClick={retryLoadMore}>
            重试
          </button>
        </div>
      )}
    </>
  );
}
