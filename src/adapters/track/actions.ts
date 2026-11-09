import type { Track } from "@/domain/track";
import type { PlayItem } from "@/store/play-list";

export const toPlayItem = (track: Track): PlayItem => ({
  type: track.source === "bilibili-video" ? "mv" : "audio",
  id: track.source === "local" ? track.id.replace(/^local:/, "") : undefined,
  source: track.source === "local" ? "local" : "online",
  audioUrl: track.sourceRef.audioUrl,
  title: track.title,
  bvid: track.sourceRef.bvid,
  cid: track.sourceRef.cid,
  sid: track.sourceRef.sid,
  cover: track.cover,
  ownerName: track.creator?.name,
  ownerMid: track.creator?.id ? Number(track.creator.id) || undefined : undefined,
});

export const toFavoriteSelection = (track: Track) => {
  if (track.source === "bilibili-video" && track.sourceRef.aid) {
    return { rid: Number(track.sourceRef.aid), type: 2, title: track.title };
  }
  if (track.source === "bilibili-audio" && track.sourceRef.sid !== undefined) {
    return { rid: track.sourceRef.sid, type: 12, title: track.title };
  }
  return undefined;
};

export const toMediaDownloadInfo = (
  track: Track,
  outputFileType: MediaDownloadOutputFileType,
): MediaDownloadInfo | undefined => {
  if (track.source === "local") return undefined;
  if (!track.sourceRef.bvid && track.sourceRef.sid === undefined) return undefined;
  return {
    outputFileType,
    title: track.title,
    cover: track.cover,
    bvid: track.sourceRef.bvid,
    cid: track.sourceRef.cid,
    sid: track.sourceRef.sid,
  };
};

export const getTrackSourceUrl = (track: Track) => {
  if (track.sourceRef.bvid) return `https://www.bilibili.com/video/${track.sourceRef.bvid}`;
  if (track.sourceRef.sid !== undefined) return `https://www.bilibili.com/audio/au${track.sourceRef.sid}`;
  return undefined;
};
