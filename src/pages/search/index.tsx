import React, { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { RiArrowRightSLine, RiFolderMusicLine } from "@remixicon/react";

import Empty from "@/components/empty";
import ScrollContainer, { type ScrollRefObject } from "@/components/scroll-container";
import { PLAYLIST_DETAIL_TRACK_ACTIONS } from "@/features/playlist/track-actions";
import { useSearchFixture, useSearchFixtureData } from "@/features/search/fixture";
import { SearchView } from "@/features/search/search-view";
import {
  getWebInterfaceWbiSearchType,
  type SearchUserItem,
  type SearchVideoItem,
} from "@/service/web-interface-search-type";
import { useSearchHistory } from "@/store/search-history";
import { useSearchSegments } from "@/store/search-segments";
import { useSettings } from "@/store/settings";
import { AnnotationBand } from "@/ui/patterns/annotation-band";

import { CreatorPreview } from "./creator-preview";
import { DEFAULT_SORT_ORDER, isSortOrder, type SearchViewMode, type SortOrder } from "./search-sort";
import { SearchTabs } from "./search-tabs";
import { SearchType } from "./search-type";
import UserList from "./user-list";
import VideoList from "./video-list";

import "./search-4188.css";

/**
 * 屏 06 的夹具渲染（`?fixture=06-search`）。
 *
 * 注解带放在 `<SearchView>` 的**兄弟**位置：它 `position: absolute; top 598`
 * （`anchor="high"`，屏 06 的 noteTop 容器相对值），定位上下文是壳层 `<main>`，
 * 必须落在滚动容器之外（见屏 01 LibraryView 的同款说明）。
 */
const FixtureSearch = () => {
  const fixture = useSearchFixtureData();
  const [searchParams] = useSearchParams();
  const setCounts = useSearchSegments(state => state.setCounts);

  useEffect(() => {
    if (fixture) setCounts(fixture.counts);
  }, [fixture, setCounts]);

  if (!fixture) return null;

  return (
    <>
      <SearchView
        query={fixture.query}
        localLink={fixture.localLink}
        lead={fixture.lead}
        videoSectionTitle={fixture.videoSectionTitle}
        videos={fixture.videos}
        creatorSectionTitle={fixture.creatorSectionTitle}
        creators={fixture.creators}
        rowActions={PLAYLIST_DETAIL_TRACK_ACTIONS}
        demoActionRowIds={searchParams.get("preview") === "4188" ? [] : fixture.demoActionRowIds}
        onQueryChange={() => {
          /* 夹具模式不触网：比对需要画面稳定。 */
        }}
        onLocalLinkPress={() => {
          /* 夹具模式不跳转。 */
        }}
        onRowAction={() => {
          /* 夹具模式不触网。 */
        }}
      />
      {/* 文字跨度收 1216px 复现设计的两行断点（行 2 = 「主操作。」）——
          Chrome 排版比设计稿 PDF 窄，不收宽度会排成一行。
          spec-lock meta.revisions 1.3.14（字体度量差补偿）。 */}
      {searchParams.get("preview") !== "4188" && (
        <AnnotationBand anchor="high" className="[&>span:last-child]:max-w-[1216px]">
          {fixture.note}
        </AnnotationBand>
      )}
    </>
  );
};

const isSearchType = (value: string | null): value is SearchType =>
  value !== null && Object.values(SearchType).includes(value as SearchType);

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollerRef = useRef<ScrollRefObject>(null);
  const storeKeyword = useSearchHistory(s => s.keyword);
  // 查询词本身也进 URL：否则刷新 / 分享链接时 order、music、mode 还在，结果却
  // 因为 keyword 只活在内存里而变成空页。冷启动没有 store 值时用 `?q=` 兜底。
  const queryParam = searchParams.get("q") ?? "";
  const keyword = storeKeyword || queryParam;

  const videoCount = useSearchSegments(state => state.videoCount);
  const creatorCount = useSearchSegments(state => state.creatorCount);
  const setVideoCount = useSearchSegments(state => state.setVideoCount);
  const setCreatorCount = useSearchSegments(state => state.setCreatorCount);
  const resetCounts = useSearchSegments(state => state.reset);
  const settingMode = useSettings(state => state.displayMode);

  const typeParam = searchParams.get("type");
  const type = isSearchType(typeParam) ? typeParam : SearchType.All;
  const orderParam = searchParams.get("order");
  const order: SortOrder = isSortOrder(orderParam) ? orderParam : DEFAULT_SORT_ORDER;
  const musicOnly = searchParams.get("music") !== "0";
  const modeParam = searchParams.get("mode");
  const mode: SearchViewMode =
    modeParam === "card" || modeParam === "list" ? modeParam : settingMode === "card" ? "card" : "list";

  useEffect(() => {
    resetCounts();
  }, [keyword, resetCounts]);

  useEffect(() => {
    if (!storeKeyword && queryParam) useSearchHistory.setState({ keyword: queryParam });
  }, [storeKeyword, queryParam]);

  useEffect(() => {
    if (!keyword || searchParams.get("q") === keyword) return;
    const next = new URLSearchParams(searchParams);
    next.set("q", keyword);
    setSearchParams(next, { replace: true });
  }, [keyword, searchParams, setSearchParams]);

  /**
   * 非当前 tab 的结果数。每个列表只负责自己那一类（视频列表写视频数、创作者
   * 列表写创作者数），所以直接落在 `?type=user` / `?type=video` 时另一侧的 tab
   * 会没有数字。这里只补**当前 tab 不会产出**的那个计数，避免和列表请求重复。
   */
  useEffect(() => {
    if (!keyword) return;
    let cancelled = false;

    if (type === SearchType.User && videoCount === null) {
      void getWebInterfaceWbiSearchType<SearchVideoItem>({
        search_type: "video",
        keyword,
        page: 1,
        page_size: 1,
        order,
        ...(musicOnly && { tids: 3 }),
      })
        .then(res => {
          if (!cancelled) setVideoCount(res?.data?.numResults ?? null);
        })
        .catch(() => {
          /* 计数失败不影响结果列表本身：tab 上不显示数字即可。 */
        });
    }

    if (type === SearchType.Video && creatorCount === null) {
      void getWebInterfaceWbiSearchType<SearchUserItem>({
        search_type: "bili_user",
        keyword,
        page: 1,
        page_size: 1,
        order: 0,
        order_sort: 0,
      })
        .then(res => {
          if (!cancelled) setCreatorCount(res?.data?.numResults ?? null);
        })
        .catch(() => {
          /* 同上。 */
        });
    }

    return () => {
      cancelled = true;
    };
  }, [keyword, type, order, musicOnly, videoCount, creatorCount, setVideoCount, setCreatorCount]);

  const updateParams = (patch: Record<string, string | null>, options?: { push?: boolean }) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null) next.delete(key);
      else next.set(key, value);
    });
    if (keyword) next.set("q", keyword);
    // tab 是可回退的浏览位置（后退应回到上一个 tab）；排序 / 过滤 / 视图只是
    // 同一结果集的呈现开关，用 replace 避免每点一次就多一条历史。
    setSearchParams(next, { replace: !options?.push });
  };

  const setType = (next: SearchType) => {
    if (next === type) return;
    updateParams({ type: next === SearchType.All ? null : next }, { push: true });
  };

  const setOrder = (next: SortOrder) => {
    updateParams({ order: next === DEFAULT_SORT_ORDER ? null : next });
  };

  const setMusicOnly = (next: boolean) => {
    updateParams({ music: next ? null : "0" });
  };

  const setMode = (next: SearchViewMode) => {
    updateParams({ mode: next });
  };

  if (!keyword) {
    return <Empty />;
  }

  const total = videoCount !== null && creatorCount !== null ? videoCount + creatorCount : null;
  const summary =
    type === SearchType.Video
      ? videoCount === null
        ? "正在搜索…"
        : `共 ${videoCount} 个音乐视频 · 来自 B 站`
      : type === SearchType.User
        ? creatorCount === null
          ? "正在搜索…"
          : `共 ${creatorCount} 个创作者 · 来自 B 站`
        : videoCount === null
          ? "正在搜索…"
          : creatorCount === null
            ? `共 ${videoCount} 个视频 · 来自 B 站`
            : `共 ${total} 个结果 · 来自 B 站`;
  const counts: Record<SearchType, number | null> = {
    [SearchType.All]: total,
    [SearchType.Video]: videoCount,
    [SearchType.User]: creatorCount,
  };
  const getScrollElement = () => scrollerRef.current?.osInstance()?.elements().viewport ?? null;
  const openLocalSearch = () => navigate(`/local-music?key=${encodeURIComponent(keyword)}`);

  return (
    <ScrollContainer
      enableBackToTop
      ref={scrollerRef}
      className="h-full w-full"
      resetOnChange={`${keyword}|${type}|${order}|${musicOnly}|${mode}`}
    >
      <div className="search4188-results-page">
        <header className="search4188-head">
          <div className="search4188-heading">
            <h1>搜索 “{keyword}”</h1>
            <p className="search4188-summary" aria-live="polite">
              {summary}
            </p>
          </div>
          <button type="button" className="search4188-local" onClick={openLocalSearch}>
            <RiFolderMusicLine size={15} aria-hidden="true" />
            在本地音乐中搜索
            <RiArrowRightSLine size={14} aria-hidden="true" />
          </button>
        </header>

        <SearchTabs value={type} counts={counts} onChange={setType} />

        <div
          id="search-panel-all"
          role="tabpanel"
          aria-labelledby="search-tab-all"
          hidden={type !== SearchType.All}
          className="search4188-panel"
        >
          {type === SearchType.All && (
            <>
              <CreatorPreview keyword={keyword} onSeeAll={() => setType(SearchType.User)} />
              <VideoList
                keyword={keyword}
                getScrollElement={getScrollElement}
                order={order}
                musicOnly={musicOnly}
                mode={mode}
                onOrderChange={setOrder}
                onMusicOnlyChange={setMusicOnly}
                onModeChange={setMode}
                onLocalSearch={openLocalSearch}
                preview
                onSeeAll={() => setType(SearchType.Video)}
              />
            </>
          )}
        </div>

        <div
          id="search-panel-video"
          role="tabpanel"
          aria-labelledby="search-tab-video"
          hidden={type !== SearchType.Video}
          className="search4188-panel"
        >
          {type === SearchType.Video && (
            <VideoList
              keyword={keyword}
              getScrollElement={getScrollElement}
              order={order}
              musicOnly={musicOnly}
              mode={mode}
              onOrderChange={setOrder}
              onMusicOnlyChange={setMusicOnly}
              onModeChange={setMode}
              onLocalSearch={openLocalSearch}
            />
          )}
        </div>

        <div
          id="search-panel-user"
          role="tabpanel"
          aria-labelledby="search-tab-user"
          hidden={type !== SearchType.User}
          className="search4188-panel"
        >
          {type === SearchType.User && <UserList keyword={keyword} getScrollElement={getScrollElement} />}
        </div>
      </div>
    </ScrollContainer>
  );
};

/**
 * 路由入口只做一件事：夹具模式（`?fixture=06-search`）直接渲染设计稿的 SearchView，
 * 不挂真实结果页的取数 / 计数 effect —— 否则父组件的 `reset()` 会把夹具刚写入的
 * 顶栏分段计数清掉。
 */
const Search = () => {
  const fixtureEnabled = useSearchFixture();
  if (fixtureEnabled) return <FixtureSearch />;
  return <SearchResults />;
};

export default Search;
