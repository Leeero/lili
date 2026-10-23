import { useCallback, useRef } from "react";

import type { Track } from "@/domain/track";

import { type ScrollRefObject } from "@/components/scroll-container";
import { executePlaylistBulkAction } from "@/features/playlist/bulk-actions";
import { PlaylistDetail } from "@/features/playlist/playlist-detail";
import { PlaylistTrackView } from "@/features/playlist/playlist-track-view";
import { executeTrackAction, type TrackActionKey } from "@/features/track/actions";

import type { CollectionDetailConfig } from "./types";

import Header from "../header";
import Operations from "../operation";
import { useCollectionDetail } from "./use-collection-detail";

/**
 * 三类详情（收藏夹 / 合集 / 系列）共享的页面组件。
 *
 * 组装 `Header`（页头）+ `Operations`（播放/收藏/排序/搜索）+ `PlaylistTrackView`
 * （曲目列表）。壳页只给 `CollectionDetailConfig`，状态机与渲染骨架只有这一份。
 * 顶部不再渲染类型 tab（三类 id 空间不同、无法在同 id 上切类型，已整组移除）。
 */
export const CollectionDetail = <TMedia, TInfo>({
  id,
  config,
}: {
  id: string | undefined;
  config: CollectionDetailConfig<TMedia, TInfo>;
}) => {
  const scrollRef = useRef<ScrollRefObject>(null);

  const {
    info,
    infoLoading,
    order,
    entries,
    filteredMedias,
    hasMore,
    listLoading,
    handleOrderChange,
    handleKeywordSearch,
    handleLoadMore,
  } = useCollectionDetail(id, config);

  const headerProps = config.header(info, filteredMedias);
  const isCreatedBySelf = config.isCreatedBySelf?.(info) ?? false;
  const isFavorite = config.favoriteToggle?.isFavorite(info) ?? false;
  const editAction = config.editAction?.();

  // 失效/合集条目不进「播放全部 / 入队」：它们没有可播源，塞进去只会让队列带进死条目。
  const playableTracks = (tracks: (Track | null | undefined)[]): Track[] =>
    tracks.filter((t): t is Track => Boolean(t) && !t!.invalid && t!.collectionHref === undefined);

  const onPlayAll = useCallback(async () => {
    const tracks = config.playAllTracks
      ? await config.playAllTracks(info)
      : playableTracks(filteredMedias.map(m => config.adaptToTrack(m)));
    if (tracks.length) await executePlaylistBulkAction("play-all", tracks);
  }, [config, info, filteredMedias]);

  const onAddToPlayList = useCallback(async () => {
    const tracks = config.playAllTracks
      ? await config.playAllTracks(info)
      : playableTracks(filteredMedias.map(m => config.adaptToTrack(m)));
    if (tracks.length) await executePlaylistBulkAction("add-all", tracks);
  }, [config, info, filteredMedias]);

  const getScrollElement = useCallback(
    () => (scrollRef.current?.osInstance()?.elements().viewport as HTMLElement | null) ?? null,
    [],
  );

  return (
    <PlaylistDetail
      scrollRef={scrollRef}
      resetKey={id}
      header={
        <Header
          loading={infoLoading}
          type={config.collectionType}
          cover={headerProps.cover}
          attr={headerProps.attr}
          title={headerProps.title}
          desc={headerProps.desc}
          upMid={headerProps.upMid}
          mediaCount={headerProps.mediaCount}
          onEdit={editAction?.onEdit}
        />
      }
      actions={
        <Operations
          loading={infoLoading}
          type={config.collectionType}
          order={order}
          onOrderChange={handleOrderChange}
          onKeywordSearch={handleKeywordSearch}
          orderOptions={config.orderOptions}
          mediaCount={headerProps.mediaCount}
          attr={headerProps.attr}
          isFavorite={isFavorite}
          isCreatedBySelf={isCreatedBySelf}
          onToggleFavorite={config.favoriteToggle ? async () => config.favoriteToggle?.toggle(info) : undefined}
          onPlayAll={() => void onPlayAll()}
          onAddToPlayList={() => void onAddToPlayList()}
          onClearInvalid={config.clearInvalid}
        />
      }
    >
      <PlaylistTrackView
        entries={entries}
        hasMore={hasMore}
        loading={infoLoading || listLoading}
        onLoadMore={handleLoadMore}
        getScrollElement={getScrollElement}
        getActions={entry => config.menuItems(entry.source, { isCreatedBySelf })}
        onAction={(key, entry) => {
          void (async () => {
            const handled = (await config.onMenuAction?.(key, entry.source, entry.track)) ?? false;
            if (!handled) {
              await executeTrackAction(key === "bililink" ? "open-source" : (key as TrackActionKey), entry.track);
            }
          })();
        }}
        onPlay={entry => void executeTrackAction("play", entry.track)}
      />
      {editAction?.modal}
    </PlaylistDetail>
  );
};
