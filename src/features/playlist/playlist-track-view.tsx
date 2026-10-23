import { useNavigate } from "react-router";

import type { ContextMenuItem } from "@/components/context-menu";
import type { Track } from "@/domain/track";

import MusicCard from "@/components/music-card";
import MusicListHeader from "@/components/music-list-item/header";
import VirtualGridPageList from "@/components/virtual-grid-page-list";
import VirtualPageList from "@/components/virtual-page-list";
import { useSettings } from "@/store/settings";
import { TrackRow } from "@/ui/patterns/track-row";

export interface PlaylistTrackEntry<T> {
  id: string;
  track: Track;
  source: T;
  timestamp?: number;
}

interface PlaylistTrackViewProps<T> {
  entries: PlaylistTrackEntry<T>[];
  loading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  getScrollElement: () => HTMLElement | null;
  getActions: (entry: PlaylistTrackEntry<T>) => ContextMenuItem[];
  onAction: (key: string, entry: PlaylistTrackEntry<T>) => void;
  onPlay: (entry: PlaylistTrackEntry<T>) => void;
}

export const PlaylistTrackView = <T,>({
  entries,
  loading,
  hasMore,
  onLoadMore,
  getScrollElement,
  getActions,
  onAction,
  onPlay,
}: PlaylistTrackViewProps<T>) => {
  const displayMode = useSettings(state => state.displayMode);
  const navigate = useNavigate();

  // 合集条目点跳详情；失效与合集都不触发播放（与 TrackRow 列表模式一致）。
  const pressOf = (entry: PlaylistTrackEntry<T>) => {
    if (entry.track.collectionHref !== undefined) return () => navigate(entry.track.collectionHref as string);
    if (entry.track.invalid) return undefined;
    return () => onPlay(entry);
  };

  if (displayMode === "card") {
    return (
      <VirtualGridPageList
        items={entries}
        itemKey="id"
        loading={loading}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        getScrollElement={getScrollElement}
        renderItem={entry => (
          <MusicCard
            title={entry.track.title}
            cover={entry.track.cover ?? ""}
            playCount={entry.track.playCount}
            duration={entry.track.duration}
            ownerName={entry.track.creator?.name}
            ownerMid={entry.track.creator?.id ? Number(entry.track.creator.id) || undefined : undefined}
            time={entry.timestamp}
            menus={getActions(entry)}
            onMenuAction={key => onAction(key, entry)}
            onPress={pressOf(entry)}
            invalid={entry.track.invalid}
          />
        )}
      />
    );
  }

  return (
    <div className="w-full">
      <MusicListHeader />
      <VirtualPageList
        items={entries}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        getScrollElement={getScrollElement}
        rowHeight={displayMode === "compact" ? 36 : 64}
        renderItem={(entry, index) => (
          <TrackRow
            track={entry.track}
            index={index + 1}
            actions={getActions(entry)}
            onAction={key => onAction(key, entry)}
            onPlay={() => onPlay(entry)}
          />
        )}
      />
    </div>
  );
};
