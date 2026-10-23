import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactElement } from "react";
import { useNavigate, useSearchParams } from "react-router";

import {
  RiArrowLeftLine,
  RiCloseLine,
  RiListCheck2,
  RiOrderPlayLine,
  RiPauseLargeFill,
  RiPlayLargeFill,
  RiRepeat2Line,
  RiRepeatOneLine,
  RiShuffleLine,
  RiSkipBackFill,
  RiSkipForwardFill,
  RiVolumeMuteLine,
  RiVolumeUpLine,
} from "@remixicon/react";

import { PlayMode } from "@/common/constants/audio";
import { formatDuration } from "@/common/utils/time";
import { getActiveLyricIndex } from "@/components/lyrics/model";
import { useTrackFallback } from "@/components/lyrics/use-track-fallback";
import { useTrackLyrics } from "@/components/lyrics/use-track-lyrics";
import { buildQueueViewModel } from "@/features/player/queue";
import { usePlayList } from "@/store/play-list";
import { usePlayProgress } from "@/store/play-progress";
import { NOW_PLAYING_PAGE_FIXTURE_NAME, SCREEN_10_NOW_PLAYING_FIXTURE } from "@/ui/fixtures/screen-10-now-playing";
import { Artwork } from "@/ui/primitives/artwork";

type MainView = "cover" | "video";
type SideView = "lyrics" | "parts" | "queue";
const MODE_LABEL: Record<PlayMode, string> = {
  [PlayMode.Sequence]: "顺序播放",
  [PlayMode.Loop]: "列表循环",
  [PlayMode.Random]: "随机播放",
  [PlayMode.Single]: "单曲循环",
};
// 四种模式各配独立图标，避免顺序/列表循环/单曲循环共用同一个 repeat 图标，当前模式一目了然。
const MODE_ICON: Record<PlayMode, ReactElement> = {
  [PlayMode.Sequence]: <RiOrderPlayLine />,
  [PlayMode.Loop]: <RiRepeat2Line />,
  [PlayMode.Random]: <RiShuffleLine />,
  [PlayMode.Single]: <RiRepeatOneLine />,
};

const NowPlayingPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isFixture = params.get("fixture") === NOW_PLAYING_PAGE_FIXTURE_NAME;
  const [mainView, setMainView] = useState<MainView>("cover");
  const [sideView, setSideView] = useState<SideView>("lyrics");
  // 视频态下右侧面板收成抽屉，由右上角浮层开关唤出；封面态下该值不生效。
  const [videoSideOpen, setVideoSideOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  // 用户手动滚动后暂停自动跟随 5 秒，避免跟用户抢滚动条。
  const userScrollPauseUntil = useRef(0);
  // 程序化滚动时屏蔽 onScroll，避免误判为用户手动滚动。
  const programmaticScroll = useRef(false);
  const list = usePlayList(s => s.list),
    playId = usePlayList(s => s.playId),
    nextId = usePlayList(s => s.nextId),
    isPlaying = usePlayList(s => s.isPlaying),
    duration = usePlayList(s => s.duration) ?? 0,
    playMode = usePlayList(s => s.playMode),
    volume = usePlayList(s => s.volume),
    isMuted = usePlayList(s => s.isMuted),
    rate = usePlayList(s => s.rate);
  const togglePlay = usePlayList(s => s.togglePlay),
    previous = usePlayList(s => s.prev),
    next = usePlayList(s => s.next),
    seek = usePlayList(s => s.seek),
    togglePlayMode = usePlayList(s => s.togglePlayMode),
    setVolume = usePlayList(s => s.setVolume),
    toggleMute = usePlayList(s => s.toggleMute);
  const currentTime = usePlayProgress(s => s.currentTime);
  const item = useMemo(() => list.find(row => row.id === playId), [list, playId]);
  const queue = useMemo(() => buildQueueViewModel(list, playId, nextId), [list, nextId, playId]);
  // 分P：多 P 视频播放时所有分 P 都在队列里（store/play-list 的 getMVData），
  // 按 bvid 聚拢即分 P 列表。单 P 视频不展示该页签。
  const parts = useMemo(() => {
    if (!item?.hasMultiPart || !item.bvid) return [];
    return list
      .filter(row => row.type === "mv" && row.bvid === item.bvid)
      .toSorted((a, b) => (a.pageIndex ?? 0) - (b.pageIndex ?? 0));
  }, [list, item]);
  const {
    lines: lyricLines,
    source: lyricSource,
    loading: lyricsLoading,
  } = useTrackLyrics(isFixture ? undefined : item);
  const title = isFixture ? SCREEN_10_NOW_PLAYING_FIXTURE.title : item?.pageTitle || item?.title || "尚未播放";
  const artist = isFixture ? SCREEN_10_NOW_PLAYING_FIXTURE.meta.join(" · ") : item?.ownerName || "未知来源";
  const lyrics = isFixture ? SCREEN_10_NOW_PLAYING_FIXTURE.lyrics : lyricLines.map(line => line.text);
  const resolvedDuration = isFixture ? 242 : duration,
    resolvedTime = isFixture ? 108 : currentTime,
    progress = resolvedDuration > 0 ? Math.min(100, (resolvedTime / resolvedDuration) * 100) : 0,
    disabled = !isFixture && !item;
  const activeLyricIndex = isFixture
    ? SCREEN_10_NOW_PLAYING_FIXTURE.currentLine
    : getActiveLyricIndex(lyricLines, Math.round(resolvedTime * 1000));
  // 视频视图：有视频地址且非夹具时，把封面盘切换成全出血视频。
  const showVideo = mainView === "video" && Boolean(item?.videoUrl) && !isFixture;

  // 视频只是「画面」，音频由主引擎播放。这里把视频的倍速与播放/暂停状态对齐到引擎：
  // 起播前先把画面跳到音频当前位置，避免从 0 秒开始，出现「画面与进度条各走各的」。
  // item?.videoUrl 进依赖：分 P 连播换集时 src 变化，视频元素会重载并停在 0 秒，
  // 必须重新起播 / 对齐，否则新一集的画面会卡住。
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate || 1;
    if (isPlaying) {
      const audioTime = usePlayProgress.getState().currentTime || 0;
      if (Math.abs(video.currentTime - audioTime) > 0.75) {
        video.currentTime = audioTime;
      }
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, rate, showVideo, item?.videoUrl]);

  // 播放中持续对齐：音频引擎 currentTime 每 ~250ms 更新一次，画面漂移超过 0.75s 就拉回；
  // 暂停态下拖进度条也会经此把画面跳到对应帧。
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideo) return;
    if (Math.abs(video.currentTime - currentTime) > 0.75) {
      video.currentTime = currentTime;
    }
  }, [currentTime, showVideo, item?.videoUrl]);

  // 歌词自动滚动：高亮行变化时将其滚动到容器中央；用户手动滚动后 5 秒内不抢。
  useEffect(() => {
    if (sideView !== "lyrics" || activeLyricIndex < 0) return;
    if (Date.now() < userScrollPauseUntil.current) return;
    const container = lyricsRef.current;
    const active = container?.querySelector("p.is-active") as HTMLElement | null;
    if (!container || !active) return;
    const targetTop = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2;
    programmaticScroll.current = true;
    container.scrollTo({ top: targetTop, behavior: "smooth" });
    // smooth 滚动结束后解除屏蔽（取一个保守的超时）。
    window.setTimeout(() => {
      programmaticScroll.current = false;
    }, 600);
  }, [activeLyricIndex, sideView]);
  // 无歌词降级：歌词加载完成且为空时，才拉简介与同 UP 主投稿。
  const showFallback = !isFixture && !lyricsLoading && lyrics.length === 0;
  const fallback = useTrackFallback(showFallback ? item : undefined);
  const handleSeek = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled || resolvedDuration <= 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    seek(((event.clientX - bounds.left) / bounds.width) * resolvedDuration);
  };
  return (
    <div className="np4188-page">
      <header className="np4188-dragbar window-drag">
        <button type="button" className="np4188-back window-no-drag" onClick={() => navigate(-1)}>
          <RiArrowLeftLine />
          返回应用
        </button>
      </header>
      <main className={["np4188-main", showVideo ? "is-video" : ""].filter(Boolean).join(" ")}>
        <section className="np4188-art-column">
          <div className="np4188-stage">
            {!showVideo && (
              <svg className="np4188-tonearm" viewBox="0 0 100 100" aria-hidden="true">
                <defs>
                  <linearGradient id="np4188-metal" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#f2f3f6" />
                    <stop offset="1" stopColor="#9a9ba3" />
                  </linearGradient>
                </defs>
                {/* 配重块 + 转轴（盘外左上） */}
                <rect
                  className="np4188-tonearm-metal"
                  x="0"
                  y="2"
                  width="14"
                  height="20"
                  rx="7"
                  fill="url(#np4188-metal)"
                />
                <circle className="np4188-tonearm-metal" cx="12" cy="12" r="5" fill="url(#np4188-metal)" />
                {/* 唱臂杆 + 唱头（伸向盘面外圈刻痕） */}
                <line
                  className="np4188-tonearm-arm"
                  x1="14"
                  y1="14"
                  x2="58"
                  y2="58"
                  stroke="url(#np4188-metal)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle className="np4188-tonearm-metal" cx="58" cy="58" r="4" fill="url(#np4188-metal)" />
                <circle className="np4188-tonearm-stylus" cx="65" cy="65" r="1.8" />
              </svg>
            )}
            {item?.videoUrl && !isFixture && (
              <button
                type="button"
                className="np4188-view-toggle"
                onClick={() => {
                  setMainView(v => (v === "cover" ? "video" : "cover"));
                  setVideoSideOpen(false);
                }}
              >
                {mainView === "cover" ? "视频" : "封面"}
              </button>
            )}
            <div
              className={[
                "np4188-art",
                showVideo ? "is-video" : "is-cover",
                !showVideo && isPlaying ? "is-spinning" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {showVideo ? (
                <video ref={videoRef} src={item?.videoUrl} aria-label="当前播放视频画面" muted playsInline />
              ) : (
                <span className="np4188-cover">
                  <Artwork
                    src={isFixture ? undefined : item?.pageCover || item?.cover}
                    alt="当前播放封面"
                    radius="none"
                    gradient="immersive"
                    className="size-full"
                  />
                </span>
              )}
            </div>
          </div>
        </section>
        {showVideo && !videoSideOpen && (
          <button
            type="button"
            className="np4188-side-toggle"
            onClick={() => setVideoSideOpen(true)}
            aria-label="打开歌词与队列面板"
            title="歌词 / 分P / 播放队列"
          >
            <RiListCheck2 />
          </button>
        )}
        {showVideo && videoSideOpen && (
          <div className="np4188-side-backdrop" onClick={() => setVideoSideOpen(false)} aria-hidden="true" />
        )}
        <aside
          className={["np4188-side", showVideo ? "is-drawer" : "", showVideo && videoSideOpen ? "is-open" : ""]
            .filter(Boolean)
            .join(" ")}
        >
          {showVideo && (
            <button
              type="button"
              className="np4188-side-close"
              onClick={() => setVideoSideOpen(false)}
              aria-label="收起面板"
            >
              <RiCloseLine />
            </button>
          )}
          <div className="np4188-tabs">
            <button
              type="button"
              className={sideView === "lyrics" ? "is-active" : ""}
              onClick={() => setSideView("lyrics")}
            >
              歌词
            </button>
            {parts.length > 1 && (
              <button
                type="button"
                className={sideView === "parts" ? "is-active" : ""}
                onClick={() => setSideView("parts")}
              >
                分P<em>{parts.length}</em>
              </button>
            )}
            <button
              type="button"
              className={sideView === "queue" ? "is-active" : ""}
              onClick={() => setSideView("queue")}
            >
              播放队列<em>{queue.length}</em>
            </button>
          </div>
          {sideView === "parts" ? (
            <div className="np4188-queue">
              <span>分P 列表</span>
              {parts.map(row => (
                <button key={row.id} type="button" onClick={() => void usePlayList.getState().playListItem(row.id)}>
                  <b>{String(row.pageIndex ?? 0).padStart(2, "0")}</b>
                  {row.pageCover || row.cover ? <img src={row.pageCover || row.cover} alt="" /> : <i />}
                  <span>
                    <strong>{row.pageTitle || row.title}</strong>
                    <small>{row.ownerName}</small>
                  </span>
                  <time>{typeof row.duration === "number" ? formatDuration(row.duration) : ""}</time>
                </button>
              ))}
            </div>
          ) : sideView === "lyrics" ? (
            <div
              className="np4188-lyrics"
              ref={lyricsRef}
              onScroll={() => {
                if (programmaticScroll.current) return;
                userScrollPauseUntil.current = Date.now() + 5000;
              }}
            >
              <span>歌词同步 · 自动滚动</span>
              {!isFixture && lyricSource && <span>{lyricSource === "standard" ? "标准歌词" : "视频字幕"}</span>}
              {lyricsLoading && lyrics.length === 0 ? (
                <div className="np4188-side-empty">
                  <strong>歌词加载中…</strong>
                </div>
              ) : lyrics.length ? (
                lyrics.map((line, index) => (
                  <p key={`${line}-${index}`} className={index === activeLyricIndex ? "is-active" : ""}>
                    {line}
                  </p>
                ))
              ) : (
                <div className="np4188-side-empty">
                  <strong>暂未匹配到歌词</strong>
                  {fallback.loading ? (
                    <span>正在加载简介…</span>
                  ) : (
                    <>
                      {fallback.desc && (
                        <div className="np4188-fallback-desc">
                          <span>视频简介</span>
                          <p>{fallback.desc}</p>
                        </div>
                      )}
                      {fallback.posts.length > 0 && (
                        <div className="np4188-fallback-posts">
                          <span>同 UP 主投稿</span>
                          {fallback.posts.map(post => (
                            <button
                              key={post.bvid}
                              type="button"
                              onClick={() =>
                                void usePlayList
                                  .getState()
                                  .play({ type: "mv", bvid: post.bvid, title: post.title, cover: post.cover })
                              }
                            >
                              {post.cover ? <img src={post.cover} alt="" /> : <i />}
                              <span>
                                <strong>{post.title}</strong>
                                {post.duration && <small>{post.duration}</small>}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="np4188-queue">
              <span>接下来播放</span>
              {queue
                .filter(row => !row.isCurrent)
                .map(row => (
                  <button key={row.id} type="button" onClick={() => void usePlayList.getState().playListItem(row.id)}>
                    <b>{String(row.index).padStart(2, "0")}</b>
                    {row.cover ? <img src={row.cover} alt="" /> : <i />}
                    <span>
                      <strong>{row.title}</strong>
                      <small>{row.artist}</small>
                    </span>
                    <time>{row.duration}</time>
                  </button>
                ))}
            </div>
          )}
        </aside>
      </main>
      <footer className="np4188-controls">
        <div className="np4188-progress">
          <time>{formatDuration(resolvedTime)}</time>
          <button
            type="button"
            aria-label={`播放进度 ${formatDuration(resolvedTime)} / ${formatDuration(resolvedDuration)}`}
            title={`${formatDuration(resolvedTime)} / ${formatDuration(resolvedDuration)}`}
            disabled={disabled}
            onClick={handleSeek}
          >
            <i style={{ width: `${progress}%` }}>
              <span />
            </i>
          </button>
          <time>{formatDuration(resolvedDuration)}</time>
        </div>
        <div className="np4188-control-row">
          <div className="np4188-track">
            <div className="np4188-track-head">
              <span className="np4188-track-title" title={title}>
                {title}
              </span>
              <span className={isPlaying ? "np4188-badge-status is-playing" : "np4188-badge-status"}>
                {isPlaying ? "正在播放" : "已暂停"}
              </span>
            </div>
            <div className="np4188-track-sub">
              <span className="np4188-track-artist">{artist}</span>
              <span>{item?.isLossless ? "无损音质" : "标准音质"}</span>
              <span>{item?.source === "local" ? "本地音乐" : "来自 Bilibili"}</span>
              {!disabled && (
                <span className="np4188-track-meta">
                  {formatDuration(resolvedDuration)}
                  {item?.hasMultiPart && typeof item.totalPage === "number"
                    ? ` · 第 ${item.pageIndex ?? 1}/${item.totalPage} 集`
                    : ""}
                </span>
              )}
            </div>
          </div>
          <div className="np4188-transport">
            <button
              type="button"
              className="np4188-mode"
              onClick={togglePlayMode}
              title="点击切换播放模式：顺序播放 → 列表循环 → 随机播放 → 单曲循环"
              aria-label={`播放模式：${MODE_LABEL[playMode]}，点击切换`}
            >
              {MODE_ICON[playMode]}
            </button>
            <button type="button" aria-label="上一首" disabled={disabled} onClick={() => void previous()}>
              <RiSkipBackFill />
            </button>
            <button
              type="button"
              className="np4188-play"
              aria-label={isPlaying ? "暂停" : "播放"}
              disabled={disabled}
              onClick={togglePlay}
            >
              {isPlaying ? <RiPauseLargeFill /> : <RiPlayLargeFill />}
            </button>
            <button type="button" aria-label="下一首" disabled={disabled} onClick={() => void next()}>
              <RiSkipForwardFill />
            </button>
            <button type="button" aria-label="查看播放队列" onClick={() => setSideView("queue")}>
              <RiListCheck2 />
            </button>
          </div>
          <div className="np4188-volume">
            <button type="button" aria-label={isMuted ? "取消静音" : "静音"} onClick={toggleMute}>
              {isMuted ? <RiVolumeMuteLine /> : <RiVolumeUpLine />}
            </button>
            <input
              aria-label="音量"
              type="range"
              min="0"
              max="100"
              value={Math.round(volume * 100)}
              onChange={event => setVolume(Number(event.target.value) / 100)}
            />
            <span className="np4188-volume-value">{isMuted ? "0%" : `${Math.round(volume * 100)}%`}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default NowPlayingPage;
