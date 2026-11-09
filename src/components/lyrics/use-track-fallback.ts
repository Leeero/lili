import { useEffect, useState } from "react";

import type { PlayData } from "@/store/play-list";

import { getAudioSongInfo } from "@/service/audio-song-info";
import { getSpaceWbiArcSearch } from "@/service/space-wbi-arc-search";
import { getWebInterfaceView } from "@/service/web-interface-view";

export interface FallbackPost {
  bvid: string;
  title: string;
  cover?: string;
  duration?: string;
}

export interface TrackFallback {
  /** 视频简介（mv）或音频简介（audio），无则为空字符串 */
  desc: string;
  /** 同 UP 主公开投稿（不含当前播放） */
  posts: FallbackPost[];
  loading: boolean;
}

/**
 * 无歌词时的降级内容：视频简介 + 同 UP 主投稿。
 *
 * 数据来源均为现有接口，不虚构：
 * - 简介：x/web-interface/view 的 desc（mv）/ song/info 的 intro（audio）
 * - 投稿：x/space/wbi/arc/search（公开投稿，无需登录）
 */
export const useTrackFallback = (item: PlayData | undefined): TrackFallback => {
  const [desc, setDesc] = useState("");
  const [posts, setPosts] = useState<FallbackPost[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDesc("");
    setPosts([]);
    if (!item) return;
    setLoading(true);

    const load = async () => {
      try {
        const [descResult, postsResult] = await Promise.all([
          (async () => {
            if (item.type === "mv" && item.bvid) {
              const res = await getWebInterfaceView({ bvid: item.bvid });
              return res?.data?.desc ?? "";
            }
            if (item.type === "audio" && item.sid) {
              const res = await getAudioSongInfo({ sid: item.sid });
              return res?.data?.intro ?? "";
            }
            return "";
          })(),
          (async (): Promise<FallbackPost[]> => {
            if (!item.ownerMid) return [];
            const res = await getSpaceWbiArcSearch({ mid: item.ownerMid, ps: 6, pn: 1 });
            return (res?.data?.list?.vlist ?? [])
              .filter(v => v.bvid && v.bvid !== item.bvid)
              .slice(0, 5)
              .map(v => ({ bvid: v.bvid, title: v.title, cover: v.pic, duration: v.length }));
          })(),
        ]);
        if (cancelled) return;
        setDesc(descResult.trim());
        setPosts(postsResult);
      } catch {
        // 降级内容拿不到就保持空，UI 只展示「暂未匹配到歌词」
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [item]);

  return { desc, posts, loading };
};
