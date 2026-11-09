import type { Track } from "@/domain/track";
import type { SearchVideoItem } from "@/service/web-interface-search-type";

import { stripHtml } from "@/common/utils/str";
import { formatUrlProtocol } from "@/common/utils/url";

const parseDuration = (value?: string | number) => {
  if (typeof value === "number") return value;
  if (!value) return undefined;
  const parts = value.split(":").map(Number);
  if (parts.some(Number.isNaN)) return undefined;
  return parts.reduce((total, part) => total * 60 + part, 0);
};

export const adaptSearchVideoToTrack = (item: SearchVideoItem): Track => ({
  id: `bilibili-video:${item.bvid}`,
  source: "bilibili-video",
  title: stripHtml(item.title),
  cover: formatUrlProtocol(item.pic),
  creator: { id: String(item.mid), name: item.author },
  duration: parseDuration(item.duration),
  playCount: item.play,
  publishedAt: item.pubdate ? new Date(item.pubdate * 1000).toISOString() : undefined,
  sourceRef: { aid: String(item.aid), bvid: item.bvid },
});
