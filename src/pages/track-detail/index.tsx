import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { addToast, Tooltip } from "@heroui/react";
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiChat3Line,
  RiCoinLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiFileMusicLine,
  RiMessage2Line,
  RiPauseLargeFill,
  RiPlayCircleLine,
  RiPlayFill,
  RiShareForwardLine,
  RiStarLine,
  RiThumbUpLine,
  RiVolumeUpLine,
} from "@remixicon/react";
import clx from "classnames";

import type { Track } from "@/domain/track";

import { getTrackSourceUrl, toFavoriteSelection, toMediaDownloadInfo, toPlayItem } from "@/adapters/track/actions";
import { formatNumber } from "@/common/utils/number";
import { stripHtml } from "@/common/utils/str";
import { formatDuration, formatSecondsToDate } from "@/common/utils/time";
import ScrollContainer from "@/components/scroll-container";
import { getWebInterfaceView, type Page as VideoPage, type WebInterfaceViewData } from "@/service/web-interface-view";
import { useModalStore } from "@/store/modal";
import { usePlayList } from "@/store/play-list";
import { Artwork } from "@/ui/primitives/artwork";
import { PageState } from "@/ui/states/page-state";

import "./track-detail-4188.css";

/** 视频详情（web-interface/view）→ Track。详情页只消费展示与动作所需字段。 */
const adaptViewToTrack = (data: WebInterfaceViewData): Track => ({
  id: `bilibili-video:${data.bvid}`,
  source: "bilibili-video",
  title: data.title,
  cover: data.pic,
  creator: { id: String(data.owner.mid), name: data.owner.name, avatar: data.owner.face },
  duration: data.duration,
  playCount: data.stat.view,
  publishedAt: new Date(data.pubdate * 1000).toISOString(),
  sourceRef: { aid: String(data.aid), bvid: data.bvid, cid: String(data.cid) },
});

const num = (value?: number) => (typeof value === "number" ? formatNumber(value) : "—");

/** 打开分P时给队列的标题：首P沿用视频标题，其余P补上分P名，避免播放栏只显示同一串大标题。 */
const partTitle = (data: WebInterfaceViewData, page: VideoPage) =>
  page.page === 1 || !page.part ? data.title : `${data.title} · ${page.part}`;

/** 详情页加载骨架：与真实构图同形，避免转圈后出现大幅布局跳动。 */
const DetailSkeleton = () => (
  <div className="detail4188-skeleton-page" role="status" aria-busy="true" aria-label="正在加载视频详情">
    <span className="detail4188-skeleton" style={{ display: "block", width: "72%", height: 36 }} />
    <span className="detail4188-skeleton" style={{ display: "block", width: "44%", height: 36, marginTop: 8 }} />
    <span className="detail4188-skeleton" style={{ display: "block", width: 220, height: 26, marginTop: 14 }} />
    <div className="detail4188-skeleton-hero">
      <span className="detail4188-skeleton" style={{ width: "100%", aspectRatio: "16 / 9" }} />
      <span className="detail4188-skeleton" style={{ width: "100%" }} />
    </div>
    <div className="detail4188-skeleton-body">
      <span className="detail4188-skeleton" />
      <span className="detail4188-skeleton" />
    </div>
  </div>
);

const TrackDetail = () => {
  const { bvid } = useParams<{ bvid: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<WebInterfaceViewData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descOverflow, setDescOverflow] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);
  const partsRef = useRef<HTMLOListElement>(null);
  const activePartRef = useRef<HTMLButtonElement>(null);

  const currentBvid = usePlayList(state => state.list.find(item => item.id === state.playId)?.bvid);
  const currentCid = usePlayList(state => state.list.find(item => item.id === state.playId)?.cid);
  const isPlaying = usePlayList(state => state.isPlaying);
  const togglePlay = usePlayList(state => state.togglePlay);

  useEffect(() => {
    if (!bvid) {
      setLoading(false);
      setError(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    setDetail(undefined);
    setDescExpanded(false);
    void getWebInterfaceView({ bvid })
      .then(res => {
        if (cancelled) return;
        if (res.code === 0) setDetail(res.data);
        else setError(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bvid, reloadKey]);

  const track = useMemo(() => (detail ? adaptViewToTrack(detail) : undefined), [detail]);
  const pages = detail?.pages ?? [];
  const description = useMemo(
    () => (detail ? stripHtml(detail.desc || detail.desc_v2?.map(item => item.raw_text).join("\n") || "") : ""),
    [detail],
  );

  const isThisVideo = Boolean(detail && currentBvid === detail.bvid);
  const activePage = isThisVideo ? pages.find(page => String(page.cid) === currentCid) : undefined;
  const showPause = isThisVideo && isPlaying;

  const stats = detail
    ? [
        { label: "播放", value: num(detail.stat.view), icon: <RiPlayCircleLine size={15} /> },
        { label: "弹幕", value: num(detail.stat.danmaku), icon: <RiChat3Line size={15} /> },
        { label: "收藏", value: num(detail.stat.favorite), icon: <RiStarLine size={15} /> },
        { label: "评论", value: num(detail.stat.reply), icon: <RiMessage2Line size={15} /> },
      ]
    : [];
  const extraStats = detail
    ? [
        { label: "点赞", value: detail.stat.like, icon: <RiThumbUpLine size={14} /> },
        { label: "投币", value: detail.stat.coin, icon: <RiCoinLine size={14} /> },
        { label: "分享", value: detail.stat.share, icon: <RiShareForwardLine size={14} /> },
      ].filter(item => item.value > 0)
    : [];

  /** 把某一 P 变成 Track：cid / 时长 / 封面都换成该 P 的值，首P仍用视频标题。 */
  const toPageTrack = (page: VideoPage): Track | undefined => {
    if (!track || !detail) return undefined;
    return {
      ...track,
      id: `${track.id}:p${page.page}`,
      title: partTitle(detail, page),
      cover: page.first_frame || track.cover,
      duration: page.duration,
      sourceRef: { ...track.sourceRef, cid: String(page.cid) },
    };
  };

  const playPage = (page: VideoPage) => {
    if (activePage?.cid === page.cid) {
      togglePlay();
      return;
    }
    const pageTrack = toPageTrack(page);
    if (!pageTrack) return;
    void usePlayList.getState().play(toPlayItem(pageTrack));
  };

  const handlePlay = () => {
    if (isThisVideo) {
      togglePlay();
      return;
    }
    if (pages[0]) playPage(pages[0]);
  };

  const handleFavorite = () => {
    if (!track) return;
    const selection = toFavoriteSelection(track);
    if (selection) useModalStore.getState().onOpenFavSelectModal(selection);
  };

  const handleDownload = async () => {
    const target = activePage ? toPageTrack(activePage) : track;
    if (!target) return;
    const task = toMediaDownloadInfo(target, "audio");
    if (!task) return;
    try {
      await window.electron.addMediaDownloadTask(task);
      addToast({ title: "已添加音频下载任务", color: "success" });
    } catch {
      addToast({ title: "下载任务添加失败", color: "danger" });
    }
  };

  const handleOpenSource = () => {
    if (!track) return;
    const url = getTrackSourceUrl(track);
    if (!url) return;
    const page = activePage ?? pages[0];
    window.electron.openExternal(page && page.page > 1 ? `${url}?p=${page.page}` : url);
  };

  const handleCopyBvid = async () => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.bvid);
      addToast({ title: "已复制 BV 号", color: "success" });
    } catch {
      addToast({ title: "复制失败，请手动选择", color: "danger" });
    }
  };

  // 分P很多时，把正在播放的那一P滚进可视区（只在列表内部滚动，不动整页）。
  useEffect(() => {
    const list = partsRef.current;
    const item = activePartRef.current;
    if (!list || !item) return;
    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    if (itemRect.top < listRect.top) {
      list.scrollBy({ top: itemRect.top - listRect.top - 8, behavior: "smooth" });
    } else if (itemRect.bottom > listRect.bottom) {
      list.scrollBy({ top: itemRect.bottom - listRect.bottom + 8, behavior: "smooth" });
    }
  }, [activePage?.cid]);

  // 简介是否真的超过 4 行：用 DOM 实测而不是字数阈值，宽窗口下短简介不会出现无意义的「展开」。
  useLayoutEffect(() => {
    if (descExpanded) return;
    const element = descRef.current;
    if (!element) return;
    const measure = () => setDescOverflow(element.scrollHeight > element.clientHeight + 1);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [description, descExpanded]);

  const playLabel = showPause ? "暂停" : isThisVideo ? "继续播放" : "播放";
  const coverArt = track?.cover;

  return (
    <ScrollContainer className="h-full w-full" resetOnChange={bvid}>
      <div className="detail4188-page">
        {loading ? (
          <DetailSkeleton />
        ) : error || !detail || !track ? (
          <PageState kind="error" actionLabel="重新加载" onAction={() => setReloadKey(key => key + 1)} />
        ) : (
          <>
            <header className="detail4188-head">
              <h1 className="detail4188-title">{track.title}</h1>
              <div className="detail4188-byline">
                {track.creator && (
                  <button
                    type="button"
                    className="detail4188-byline-creator"
                    onClick={() => navigate(`/user/${track.creator?.id}`)}
                  >
                    <Artwork
                      src={track.creator.avatar}
                      artKey={track.creator.id}
                      alt=""
                      radius="round"
                      gradient="avatar"
                      params="160w_160h_1c.avif"
                      className="detail4188-byline-avatar"
                    />
                    <span>{track.creator.name}</span>
                    <span className="detail4188-byline-role">UP主</span>
                    <RiArrowRightSLine size={14} aria-hidden="true" />
                  </button>
                )}
                {detail.pubdate !== undefined && (
                  <>
                    <span className="detail4188-dot" aria-hidden="true" />
                    <span>{formatSecondsToDate(detail.pubdate)} 发布</span>
                  </>
                )}
              </div>
            </header>

            <section className="detail4188-hero">
              <button
                type="button"
                className="detail4188-poster"
                onClick={handlePlay}
                disabled={!pages.length}
                aria-label={`${playLabel}：${track.title}`}
              >
                <span className="detail4188-poster-media">
                  <Artwork
                    src={coverArt}
                    artKey={detail.bvid}
                    alt=""
                    radius="none"
                    params="1280w_720h_1c.avif"
                    className="h-full w-full"
                  />
                </span>
                <span className="detail4188-poster-shade" aria-hidden="true" />
                <span className="detail4188-poster-play" aria-hidden="true">
                  {showPause ? <RiPauseLargeFill size={30} /> : <RiPlayFill size={30} />}
                </span>
                {showPause && <span className="detail4188-poster-state">正在播放</span>}
                {track.duration !== undefined && (
                  <span className="detail4188-poster-duration">{formatDuration(track.duration)}</span>
                )}
              </button>

              <div className="detail4188-summary">
                <div className="detail4188-summary-data">
                  <div className="detail4188-stats" role="group" aria-label="视频数据">
                    {stats.map(item => (
                      <div key={item.label} className="detail4188-stat">
                        <span className="detail4188-stat-icon" aria-hidden="true">
                          {item.icon}
                        </span>
                        <span className="detail4188-stat-value">{item.value}</span>
                        <span className="detail4188-stat-label">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  {extraStats.length > 0 && (
                    <div className="detail4188-extra">
                      {extraStats.map(item => (
                        <span key={item.label}>
                          {item.icon}
                          {item.label} {num(item.value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="detail4188-actions">
                  <button type="button" className="detail4188-play" onClick={handlePlay} disabled={!pages.length}>
                    {showPause ? (
                      <RiPauseLargeFill size={17} aria-hidden="true" />
                    ) : (
                      <RiPlayFill size={17} aria-hidden="true" />
                    )}
                    {playLabel}
                  </button>
                  <Tooltip content="收藏" placement="top" delay={300}>
                    <button type="button" className="detail4188-icon-action" onClick={handleFavorite} aria-label="收藏">
                      <RiStarLine size={17} />
                    </button>
                  </Tooltip>
                  <Tooltip content="下载音频" placement="top" delay={300}>
                    <button
                      type="button"
                      className="detail4188-icon-action"
                      onClick={() => void handleDownload()}
                      aria-label="下载音频"
                    >
                      <RiFileMusicLine size={17} />
                    </button>
                  </Tooltip>
                  <Tooltip content="在 B 站打开" placement="top" delay={300}>
                    <button
                      type="button"
                      className="detail4188-icon-action"
                      onClick={handleOpenSource}
                      aria-label="在 B 站打开"
                    >
                      <RiExternalLinkLine size={17} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </section>

            <div className="detail4188-body">
              <div className="detail4188-main">
                <section className="detail4188-card" aria-labelledby="detail4188-desc-title">
                  <div className="detail4188-card-head">
                    <h2 id="detail4188-desc-title" className="detail4188-card-title">
                      简介
                    </h2>
                    {description && <span className="detail4188-card-count">{description.length} 字</span>}
                  </div>
                  {description ? (
                    <>
                      <p ref={descRef} className={clx("detail4188-desc", !descExpanded && "is-clamped")}>
                        {description}
                      </p>
                      {descOverflow && (
                        <button
                          type="button"
                          className="detail4188-desc-toggle"
                          aria-expanded={descExpanded}
                          onClick={() => setDescExpanded(open => !open)}
                        >
                          {descExpanded ? "收起" : "展开全文"}
                          <RiArrowDownSLine size={14} aria-hidden="true" />
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="detail4188-empty">该视频没有填写简介。</p>
                  )}
                </section>

                {pages.length > 1 && (
                  <section className="detail4188-card" aria-labelledby="detail4188-parts-title">
                    <div className="detail4188-card-head">
                      <h2 id="detail4188-parts-title" className="detail4188-card-title">
                        分P
                        <span className="detail4188-card-count">共 {pages.length} P</span>
                      </h2>
                    </div>
                    <ol className="detail4188-parts" aria-label="分P列表" ref={partsRef}>
                      {pages.map(page => {
                        const active = activePage?.cid === page.cid;
                        return (
                          <li key={page.cid}>
                            <button
                              type="button"
                              ref={active ? activePartRef : undefined}
                              className={clx("detail4188-part", active && "is-active")}
                              aria-current={active ? "true" : undefined}
                              aria-label={`${active && isPlaying ? "暂停" : "播放"} P${page.page} ${page.part}`}
                              onClick={() => playPage(page)}
                            >
                              <span className="detail4188-part-index">P{page.page}</span>
                              <span className="detail4188-part-title">{page.part || `第 ${page.page} P`}</span>
                              <span className="detail4188-part-duration">{formatDuration(page.duration)}</span>
                              <span className="detail4188-part-play" aria-hidden="true">
                                {active && isPlaying ? <RiVolumeUpLine size={15} /> : <RiPlayFill size={15} />}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                )}
              </div>

              <aside className="detail4188-aside">
                <section className="detail4188-card" aria-labelledby="detail4188-info-title">
                  <div className="detail4188-card-head">
                    <h2 id="detail4188-info-title" className="detail4188-card-title">
                      视频信息
                    </h2>
                  </div>
                  <div className="detail4188-info">
                    <div className="detail4188-info-row">
                      <span className="detail4188-info-label">分区</span>
                      <span className="detail4188-info-value">{detail.tname || "—"}</span>
                    </div>
                    <div className="detail4188-info-row">
                      <span className="detail4188-info-label">发布</span>
                      <span className="detail4188-info-value">{formatSecondsToDate(detail.pubdate) || "—"}</span>
                    </div>
                    <div className="detail4188-info-row">
                      <span className="detail4188-info-label">时长</span>
                      <span className="detail4188-info-value">{formatDuration(detail.duration)}</span>
                    </div>
                    <div className="detail4188-info-row">
                      <span className="detail4188-info-label">分P</span>
                      <span className="detail4188-info-value">{pages.length} P</span>
                    </div>
                    <div className="detail4188-info-row">
                      <span className="detail4188-info-label">分辨率</span>
                      <span className="detail4188-info-value">
                        {detail.dimension ? `${detail.dimension.width} × ${detail.dimension.height}` : "—"}
                      </span>
                    </div>
                    <div className="detail4188-info-row">
                      <span className="detail4188-info-label">版权</span>
                      <span className="detail4188-info-value">{detail.copyright === 1 ? "原创" : "转载"}</span>
                    </div>
                    <div className="detail4188-info-row">
                      <span className="detail4188-info-label">BV 号</span>
                      <span className="detail4188-info-value detail4188-bv-row">
                        <span className="detail4188-bv">{detail.bvid}</span>
                        <button
                          type="button"
                          className="detail4188-copy"
                          onClick={() => void handleCopyBvid()}
                          aria-label="复制 BV 号"
                          title="复制 BV 号"
                        >
                          <RiFileCopyLine size={13} />
                        </button>
                      </span>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </ScrollContainer>
  );
};

export default TrackDetail;
