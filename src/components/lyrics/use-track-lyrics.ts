import { useEffect, useState } from "react";

import type { PlayData } from "@/store/play-list";

import { getAudioSongInfo } from "@/service/audio-song-info";

import { parseLyrics, type LyricLine } from "./model";
import { getSubtitleLyricLines } from "./subtitle";

/** 歌词来源：标准歌词（B站音频区 lrc）或视频字幕降级 */
export type LyricSource = "standard" | "subtitle";

export interface TrackLyrics {
  lines: LyricLine[];
  source: LyricSource | null;
  loading: boolean;
}

/**
 * 解析当前播放项的歌词，带降级链：
 * 1. audio 类型：B站音频区 song/info 的 lrc 歌词 URL（标准歌词）
 * 2. mv 类型：x/player/v2 的视频字幕（降级，标注为「视频字幕」）
 * 3. 都没有：返回空，UI 展示「暂未匹配到歌词」及简介/投稿降级
 */
export const useTrackLyrics = (item: PlayData | undefined): TrackLyrics => {
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [source, setSource] = useState<LyricSource | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLines([]);
    setSource(null);
    if (!item) return;
    setLoading(true);

    const load = async () => {
      try {
        if (item.type === "audio" && item.sid) {
          const res = await getAudioSongInfo({ sid: item.sid });
          const lyricUrl = res?.data?.lyric;
          if (lyricUrl && !cancelled) {
            const text = await (await fetch(lyricUrl)).text();
            const parsed = parseLyrics(text);
            if (parsed.length > 0 && !cancelled) {
              setLines(parsed);
              setSource("standard");
              return;
            }
          }
        }
        if (item.type === "mv" && item.bvid && item.cid && !cancelled) {
          const subtitleLines = await getSubtitleLyricLines(item.bvid, item.cid);
          if (!cancelled && subtitleLines.length > 0) {
            setLines(subtitleLines);
            setSource("subtitle");
          }
        }
      } catch {
        // 歌词解析失败不抛错，保持空歌词，由 UI 展示降级
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [item]);

  return { lines, source, loading };
};
