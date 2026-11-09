import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import { addToast } from "@heroui/react";

import type { Track } from "@/domain/track";

import { toFavoriteSelection, toMediaDownloadInfo, toPlayItem } from "@/adapters/track/actions";
import {
  adaptNewMusicBannerToTrack,
  adaptNewMusicToTrack,
  adaptRankItemToTrack,
  dedupeTracks,
} from "@/adapters/track/recommendation";
import { formatDuration } from "@/common/utils/time";
import ScrollContainer from "@/components/scroll-container";
import { DiscoverListView, discoverListColumns } from "@/features/discover/discover-list-view";
import {
  DiscoverBody,
  DiscoverView,
  type DiscoverAlbum,
  type DiscoverHero,
  type DiscoverSection,
} from "@/features/discover/discover-view";
import {
  useDiscoverFixtureData,
  useDiscoverFixtureName,
  useDiscoverListFixtureData,
} from "@/features/discover/fixture";
import { DISCOVER_LIST_TRACK_ACTIONS } from "@/features/discover/track-actions";
import { getMusicComprehensiveWebRank } from "@/service/music-comprehensive-web-rank";
import { getNewMusic } from "@/service/web-interface-new-music";
import { getNewMusicBanner } from "@/service/web-interface-new-music-banner";
import { useModalStore } from "@/store/modal";
import { usePlayList } from "@/store/play-list";
import { DISCOVER_CARD_FIXTURE_NAME } from "@/ui/fixtures/screen-07-discover-card";
import { DISCOVER_LIST_FIXTURE_NAME } from "@/ui/fixtures/screen-08-discover-list";
import { AnnotationBand } from "@/ui/patterns/annotation-band";
import { PageState } from "@/ui/states/page-state";

/** 卡片副行：歌手 · 专辑；没有专辑时只留歌手。 */
const albumMeta = (track: Track) => [track.creator?.name, track.album].filter(Boolean).join(" · ") || "未知创作者";

const toHero = (track: Track, onPlay?: () => void): DiscoverHero => ({
  badge: "B站音乐",
  ratioNote: "16:9",
  tag: "新碟推荐",
  title: track.title,
  meta: track.creator?.name ?? "未知创作者",
  tags: [],
  art: track.cover,
  artKey: track.id,
  onPlay,
});

const toAlbum = (track: Track, currentId: string | undefined, onPlay?: () => void): DiscoverAlbum => ({
  key: track.id,
  badge: "B站音乐",
  title: track.title,
  meta: albumMeta(track),
  tags: [],
  art: track.cover,
  artKey: track.id,
  duration: typeof track.duration === "number" ? formatDuration(track.duration) : undefined,
  current: track.id === currentId,
  onPlay,
});

const PAGE_SIZE = 12;

/**
 * 发现音乐（真实路径）。
 *
 * 数据源从「音乐分区视频（rid=1003）+ 新碟新歌」收敛为**音乐中心的三份「歌」数据**：
 *   · 新碟 banner（`new/music/banner`）→ 首屏 hero；
 *   · 新歌（`new/music`）→ 「新歌」段；
 *   · 综合推荐（`music/comprehensive/web/rank` 首页）→ 「综合推荐」段。
 *
 * 三者都是 B 站音乐中心的**音乐作品**（歌名 / 歌手 / 专辑 / 方形专辑封面），
 * 展示口径是「歌」而不是「视频」。`related_archive` / 自身的 bvid·aid·cid 只是
 * 播放载体，见 `adapters/track/recommendation.ts` 的说明。
 *
 * 与音乐榜单页的关系：榜单页用同一接口做「完整榜单 + 分页」，这里只取首页做
 * 「推荐」段 —— 有意让首页和榜单有重叠，但两处角色不同（推荐 vs 榜）。
 */
const MusicRecommendLive = () => {
  const [bannerTrack, setBannerTrack] = useState<Track | null>(null);
  const [newTracks, setNewTracks] = useState<Track[]>([]);
  const [rankTracks, setRankTracks] = useState<Track[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("请稍后重试");
  const playId = usePlayList(state => state.playId);

  /** 请求序号，丢弃过期响应（点「重新加载」或路由快速切换时的竞态护栏）。 */
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setStatus("loading");
    setErrorMessage("请稍后重试");
    try {
      const [bannerRes, newMusicRes, rankRes] = await Promise.all([
        getNewMusicBanner(),
        getNewMusic(),
        getMusicComprehensiveWebRank({ pn: 1, ps: PAGE_SIZE }),
      ]);
      if (seq !== requestSeq.current) return;

      const banner =
        (bannerRes.data?.list ?? []).map((item, i) => adaptNewMusicBannerToTrack(item, `banner-${i}`))[0] ?? null;
      const songs = (newMusicRes.data?.list ?? []).map((item, i) => adaptNewMusicToTrack(item, `music-${i}`));
      const rank = (rankRes.data?.list ?? []).map((item, i) => adaptRankItemToTrack(item, `rank-${i}`));

      // banner 也来自 new/music 一族：hero 的歌不要在「新歌」段再出现一次。
      const visibleSongs = banner ? dedupeTracks([banner, ...songs]).slice(1) : dedupeTracks(songs);

      setBannerTrack(banner);
      setNewTracks(visibleSongs);
      setRankTracks(rank);
      setStatus("ready");
    } catch (error) {
      if (seq !== requestSeq.current) return;
      setBannerTrack(null);
      setNewTracks([]);
      setRankTracks([]);
      setErrorMessage(error instanceof Error ? error.message : "无法加载 B 站音乐推荐");
      setStatus("error");
    }
  }, []);
  useEffect(() => void load(), [load]);

  const act = useCallback(async (track: Track, key: string) => {
    if (key === "play") return usePlayList.getState().play(toPlayItem(track));
    if (key === "play-next") return usePlayList.getState().addToNext(toPlayItem(track));
    if (key === "queue-add") return usePlayList.getState().addList([toPlayItem(track)]);
    if (key === "favorite") {
      const selection = toFavoriteSelection(track);
      if (selection) useModalStore.getState().onOpenFavSelectModal(selection);
      return;
    }
    if (key === "download-audio") {
      const task = toMediaDownloadInfo(track, "audio");
      if (task) await window.electron.addMediaDownloadTask(task);
      addToast({ title: "已添加下载任务", color: "success" });
    }
  }, []);

  /**
   * 内容区状态。三个非 `ready` 态只替换内容区、不换页面框 —— 见 `DiscoverBodyProps.content`。
   *
   * `min-h-[420px]` 是给加载态的：别让内容区塌到 256px（`PageState` 自己的
   * `min-h-64`），否则加载完成时滚动位置会猛跳一截。
   */
  const content = useMemo(() => {
    if (status === "loading") return <PageState kind="loading" className="min-h-[420px]" />;
    if (status === "error")
      return <PageState kind="error" description={errorMessage} actionLabel="重新加载" onAction={() => void load()} />;
    if (!bannerTrack && !newTracks.length && !rankTracks.length) return <PageState kind="empty" />;
    return undefined;
  }, [bannerTrack, errorMessage, load, newTracks.length, rankTracks.length, status]);

  // hero 与两段在渲染时装配（不在 load 里），`playId` 每次都取最新值做「播放中」标记。
  const hero = bannerTrack ? toHero(bannerTrack, () => void act(bannerTrack, "play")) : null;
  const sections: DiscoverSection[] = [
    {
      title: "新歌",
      albums: newTracks.slice(0, PAGE_SIZE).map(track => toAlbum(track, playId, () => void act(track, "play"))),
    },
    {
      title: "综合推荐",
      albums: rankTracks.slice(0, PAGE_SIZE).map(track => toAlbum(track, playId, () => void act(track, "play"))),
    },
  ];

  return (
    <ScrollContainer enableBackToTop className="h-full w-full">
      <div className="discover4188">
        {/*
          页头（H1 / 导语 / 药丸行）已移除，首屏直接铺内容。H1 保留为视觉隐藏：
          内容区段标题是 h2，页面没有 h1 会让读屏的标题树从二级开始，而
          「每屏有且只有一枚 h1」是壳层既有约定。
        */}
        <h1 className="sr-only">发现音乐</h1>
        <DiscoverBody content={content} hero={hero} sections={sections} />
      </div>
    </ScrollContainer>
  );
};

const FixtureDiscover = () => {
  const fixture = useDiscoverFixtureData();
  return fixture ? (
    <ScrollContainer enableBackToTop className="h-full w-full">
      <DiscoverView {...fixture} />
    </ScrollContainer>
  ) : null;
};
const FixtureDiscoverList = () => {
  const fixture = useDiscoverListFixtureData();
  const [searchParams] = useSearchParams();
  return fixture ? (
    <>
      <DiscoverListView
        title={fixture.title}
        lead={fixture.lead}
        filters={fixture.filters}
        sectionTitle={fixture.sectionTitle}
        columns={discoverListColumns(fixture.head)}
        tracks={fixture.tracks}
        rowActions={DISCOVER_LIST_TRACK_ACTIONS}
        demoActionRowIds={fixture.demoActionRowIds}
        onPillPress={() => {}}
        onRowAction={() => {}}
      />
      {searchParams.get("preview") !== "4188" && <AnnotationBand>{fixture.note}</AnnotationBand>}
    </>
  ) : null;
};

const MusicRecommend = () => {
  const fixture = useDiscoverFixtureName();
  if (fixture === DISCOVER_CARD_FIXTURE_NAME) return <FixtureDiscover />;
  if (fixture === DISCOVER_LIST_FIXTURE_NAME) return <FixtureDiscoverList />;
  return <MusicRecommendLive />;
};
export default MusicRecommend;
