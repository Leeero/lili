import { useMemo } from "react";

import clx from "classnames";

import { getActiveLyricIndex } from "@/components/lyrics/model";
import { useTrackLyrics } from "@/components/lyrics/use-track-lyrics";
import { usePlayList } from "@/store/play-list";
import { usePlayProgress } from "@/store/play-progress";
import { usePlaybarLyrics } from "@/store/playbar-lyrics";

/** 播放栏右段「词」药丸按钮，切换迷你歌词浮层。 */
export const LyricsButton = () => {
  const open = usePlaybarLyrics(state => state.open);
  const toggle = usePlaybarLyrics(state => state.toggle);

  return (
    <button
      type="button"
      className={clx("shell4188-lyrics-button", open && "is-active")}
      aria-pressed={open}
      title="歌词"
      onClick={toggle}
    >
      词
    </button>
  );
};

/**
 * 迷你歌词浮层：播放栏上方展示当前句及前后各一句。
 *
 * 复用 `useTrackLyrics`（标准歌词 / 视频字幕降级链）与 `getActiveLyricIndex`，
 * 与全屏播放器同一套歌词模型，不新增后端。无播放内容或浮层关闭时返回 null。
 */
export const MiniLyricsPanel = () => {
  const open = usePlaybarLyrics(state => state.open);
  const list = usePlayList(state => state.list);
  const playId = usePlayList(state => state.playId);
  const currentTime = usePlayProgress(state => state.currentTime);
  const item = useMemo(() => list.find(row => row.id === playId), [list, playId]);
  const { lines, loading } = useTrackLyrics(item);
  const activeIndex = getActiveLyricIndex(lines, Math.round(currentTime * 1000));

  if (!open || !item) return null;

  const start = activeIndex < 0 ? 0 : Math.max(0, activeIndex - 1);
  const visible = activeIndex < 0 ? [] : lines.slice(start, activeIndex + 2);

  return (
    <div className="shell4188-lyrics-panel">
      {loading ? (
        <span className="shell4188-lyrics-line">歌词加载中…</span>
      ) : visible.length ? (
        visible.map((line, i) => {
          const actualIndex = start + i;
          return (
            <p
              key={`${line.time}-${actualIndex}`}
              className={clx("shell4188-lyrics-line", actualIndex === activeIndex && "is-active")}
            >
              {line.text}
            </p>
          );
        })
      ) : (
        <span className="shell4188-lyrics-line">暂无歌词</span>
      )}
    </div>
  );
};
