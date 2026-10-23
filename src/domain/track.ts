import type { CapabilityContext, TrackCapabilities } from "./capabilities";
import type { CreatorSummary } from "./creator";

export type TrackSource = "bilibili-video" | "bilibili-audio" | "local";

export interface TrackSourceRef {
  aid?: string;
  bvid?: string;
  cid?: string;
  sid?: number;
  localPath?: string;
  audioUrl?: string;
}

export interface Track {
  /** 跨页面稳定的领域 ID，不等同于播放队列实例 ID。 */
  id: string;
  source: TrackSource;
  title: string;
  /** 音乐作品所属专辑（B 站音乐中心接口返回；视频 / 本地无此字段）。 */
  album?: string;
  cover?: string;
  creator?: CreatorSummary;
  duration?: number;
  playCount?: number;
  publishedAt?: string;
  sourceRef: TrackSourceRef;
  /**
   * 失效标记（收藏夹里 attr 9/1 的条目）：渲染灰显、不可播放，但不从列表消失 ——
   * 否则用户看到「暂无内容」却不知道为什么（B 站侧仍计数）。
   */
  invalid?: boolean;
  /**
   * 合集条目（收藏夹里 type 21）：不是单曲、不可播放，点击跳进合集详情。
   * 值为详情路由（`/collection/:seasonId?type=21`）。
   */
  collectionHref?: string;
}

export const getTrackCapabilities = (track: Track, context: CapabilityContext): TrackCapabilities => {
  const isVideo = track.source === "bilibili-video";
  const isAudio = track.source === "bilibili-audio";
  const isLocal = track.source === "local";
  // 失效条目与合集条目都不可播放/入队/下载：失效没有可播源，合集不是单曲。
  const blocked = track.invalid === true || track.collectionHref !== undefined;
  const hasPlayableSource =
    !blocked &&
    (isLocal
      ? Boolean(track.sourceRef.audioUrl || track.sourceRef.localPath)
      : isVideo
        ? Boolean(track.sourceRef.bvid)
        : Boolean(track.sourceRef.sid));

  return {
    canPlay: hasPlayableSource,
    canPlayNext: hasPlayableSource,
    canAddToQueue: hasPlayableSource,
    canFavorite:
      !blocked &&
      context.isLoggedIn &&
      ((isVideo && Boolean(track.sourceRef.aid)) || (isAudio && track.sourceRef.sid !== undefined)),
    canDownloadAudio: !blocked && !isLocal && hasPlayableSource,
    canDownloadVideo: !blocked && isVideo && Boolean(track.sourceRef.bvid),
    // 失效/合集仍可「在 B 站打开」溯源（合集跳合集页，失效视频跳原稿件页）。
    canOpenSource: !isLocal && (Boolean(track.sourceRef.bvid) || track.sourceRef.sid !== undefined),
    canOpenCreator: Boolean(track.creator?.id),
  };
};
