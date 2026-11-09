import { useNavigate } from "react-router";

import type { ContextMenuItem } from "@/components/context-menu";
import type { Track } from "@/domain/track";

import MusicListItem from "@/components/music-list-item";

interface TrackRowProps {
  track: Track;
  index?: number;
  compact?: boolean;
  hidePublishedAt?: boolean;
  actions?: ContextMenuItem[];
  onAction?: (key: string) => void;
  onPlay?: () => void;
}

const noActions: ContextMenuItem[] = [];

/**
 * 单行曲目。
 *
 * 失效条目（`track.invalid`）灰显、不可播放；合集条目（`track.collectionHref`）
 * 不是单曲，点击跳进合集详情而不是播放。两者由 adapter 打标，这里只消费。
 */
export const TrackRow = ({ track, index, hidePublishedAt, actions = noActions, onAction, onPlay }: TrackRowProps) => {
  const navigate = useNavigate();

  // 合集条目点击跳详情；失效与合集都不触发播放。
  const handlePress =
    track.collectionHref !== undefined
      ? () => navigate(track.collectionHref as string)
      : track.invalid
        ? undefined
        : onPlay;

  return (
    <MusicListItem
      title={track.title}
      type={track.source === "bilibili-video" ? "mv" : "audio"}
      bvid={track.sourceRef.bvid}
      sid={track.sourceRef.sid}
      cover={track.cover}
      upName={track.creator?.name}
      upMid={track.creator?.id ? Number(track.creator.id) || undefined : undefined}
      playCount={track.playCount}
      duration={track.duration}
      index={index}
      pubTime={track.publishedAt?.slice(0, 10)}
      hidePubTime={hidePublishedAt}
      menus={actions}
      onMenuAction={onAction}
      onPress={handlePress}
      invalid={track.invalid}
    />
  );
};
