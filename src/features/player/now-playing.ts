import { useMemo } from "react";
import { useSearchParams } from "react-router";

import type { FixtureNowPlaying } from "@/ui/fixtures/now-playing";

import { AUDIO_QUALITY_LABEL } from "@/common/constants/audio";
import { usePlayList } from "@/store/play-list";
import { usePlayProgress } from "@/store/play-progress";
import { LIBRARY_FIXTURE_NAME, SCREEN_01_LIBRARY_FIXTURE } from "@/ui/fixtures/screen-01-library";
import {
  PLAYLIST_DETAIL_FIXTURE_NAME,
  SCREEN_02_PLAYLIST_DETAIL_FIXTURE,
} from "@/ui/fixtures/screen-02-playlist-detail";
import { LOCAL_MUSIC_FIXTURE_NAME, SCREEN_04_LOCAL_MUSIC_FIXTURE } from "@/ui/fixtures/screen-04-local-music";
import { DOWNLOADS_FIXTURE_NAME, SCREEN_05_DOWNLOADS_FIXTURE } from "@/ui/fixtures/screen-05-downloads";
import { SEARCH_FIXTURE_NAME, SCREEN_06_SEARCH_FIXTURE } from "@/ui/fixtures/screen-06-search";
import { DISCOVER_CARD_FIXTURE_NAME, SCREEN_07_DISCOVER_CARD_FIXTURE } from "@/ui/fixtures/screen-07-discover-card";
import { DISCOVER_LIST_FIXTURE_NAME, SCREEN_08_DISCOVER_LIST_FIXTURE } from "@/ui/fixtures/screen-08-discover-list";
import { QUEUE_FIXTURE_NAME, SCREEN_09_QUEUE_FIXTURE } from "@/ui/fixtures/screen-09-queue";
import { SETTINGS_FIXTURE_NAME, SCREEN_11_SETTINGS_FIXTURE } from "@/ui/fixtures/screen-11-settings";
import { MINI_PLAYER_FIXTURE_NAME, SCREEN_12_MINI_PLAYER_FIXTURE } from "@/ui/fixtures/screen-12-mini-player";

/**
 * 「正在播放」视图模型。
 *
 * 播放栏是**全局**组件：它不读页面数据，而读 `usePlayList` / `usePlayProgress`
 * 两个全局 store。这让保真度比对遇到一个别处没有的问题 —— 页面夹具能把列表带出来，
 * 却带不出播放栏（设计稿 12 页里 11 页的播放栏都是满态）。若靠 `usePlayList.setState`
 * 播种，演示队列会被 `persist` 写进 localStorage（`partialize` 含 `list` / `playId`），
 * 为了一张截图而改用户的持久化队列是不该接受的副作用。
 *
 * 因此这里把两者**合成一个只读视图**：夹具模式下取夹具，其余情况取 store，
 * 一份都不写回。形状与 `LibraryTile` 同一思路（见 `features/library/model.ts`）。
 *
 * **这张表是「夹具提供 `nowPlaying`」与「播放栏渲染出内容」之间的唯一接线。**
 * 1.3.21 之前屏 07 的夹具写了 `nowPlaying` 却没登记在这里 —— 页面夹具照常带出列表，
 * 播放栏却仍是空态，而它那屏又没有 `playbarDetail` 探针，于是差异一路走过两道闸门。
 * 现在由 `tests/now-playing-fixtures.test.ts` 兜住：遍历 `tools/design-fidelity/fixtures/*.json`，
 * 凡声明了 `nowPlaying` 的屏必须在这里有同名登记（内容还与 JSON 逐字一致），
 * 且不得有孤儿登记。补新屏夹具时忘了登记，测试会红。
 */
export const NOW_PLAYING_FIXTURES: Record<string, FixtureNowPlaying> = {
  [LIBRARY_FIXTURE_NAME]: SCREEN_01_LIBRARY_FIXTURE.nowPlaying,
  [PLAYLIST_DETAIL_FIXTURE_NAME]: SCREEN_02_PLAYLIST_DETAIL_FIXTURE.nowPlaying,
  [SEARCH_FIXTURE_NAME]: SCREEN_06_SEARCH_FIXTURE.nowPlaying,
  [DISCOVER_CARD_FIXTURE_NAME]: SCREEN_07_DISCOVER_CARD_FIXTURE.nowPlaying,
  [DISCOVER_LIST_FIXTURE_NAME]: SCREEN_08_DISCOVER_LIST_FIXTURE.nowPlaying,
  [LOCAL_MUSIC_FIXTURE_NAME]: SCREEN_04_LOCAL_MUSIC_FIXTURE.nowPlaying,
  [DOWNLOADS_FIXTURE_NAME]: SCREEN_05_DOWNLOADS_FIXTURE.nowPlaying,
  [QUEUE_FIXTURE_NAME]: SCREEN_09_QUEUE_FIXTURE.nowPlaying,
  [MINI_PLAYER_FIXTURE_NAME]: SCREEN_12_MINI_PLAYER_FIXTURE.nowPlaying,
  [SETTINGS_FIXTURE_NAME]: SCREEN_11_SETTINGS_FIXTURE.nowPlaying,
};

export const useNowPlayingFixture = (): FixtureNowPlaying | null => {
  const [params] = useSearchParams();
  const name = params.get("fixture");
  return (name && NOW_PLAYING_FIXTURES[name]) || null;
};

export interface NowPlaying {
  /** 有内容可播 —— 空队列时传输控件与进度条禁用（设计稿里播放键是**实心白**，不是灰）。 */
  ready: boolean;
  /** 队列只有一首 —— 上一首 / 下一首禁用。 */
  single: boolean;
  isPlaying: boolean;
  title?: string;
  /** 副行：UP 主名 / 「本地音乐」/ 夹具里的作品副题。 */
  sub?: string;
  /** 副行是否可点（本地曲目没有 UP 主主页）。 */
  ownerClickable: boolean;
  ownerMid?: number;
  /** 多集视频 —— 决定播放栏左段是否出现分集列表入口。 */
  hasMultiPart: boolean;
  /** 视频稿件（type mv）—— 决定播放栏左段是否出现「点赞」入口（音频区无点赞）。 */
  isVideo: boolean;
  /** 本地曲目 —— 收藏 / 更多菜单 / 副行跳转在本地曲目上都不适用。 */
  sourceIsLocal: boolean;
  cover?: string;
  /** 传输控件是否可用（与 `ready` 分开：`ready` 还管进度条的禁用）。 */
  controlsDisabled: boolean;
  /** 质量徽标文案（「无损 30251」/「杜比 30250」），无则为 null。 */
  badgeText: string | null;
  /** 队列长度 —— 药丸的「队列 · N」。 */
  queueCount: number;
  currentTime: number;
  duration: number;
}

export const useNowPlaying = (): NowPlaying => {
  const fixture = useNowPlayingFixture();
  const list = usePlayList(state => state.list);
  const playId = usePlayList(state => state.playId);
  const isPlaying = usePlayList(state => state.isPlaying);
  const duration = usePlayList(state => state.duration);
  const currentTime = usePlayProgress(state => state.currentTime);

  const playItem = useMemo(() => list.find(item => item.id === playId), [list, playId]);

  if (fixture) {
    return {
      ready: true,
      single: fixture.queueCount <= 1,
      isPlaying: fixture.playing,
      title: fixture.title,
      sub: fixture.sub,
      ownerClickable: false,
      ownerMid: undefined,
      hasMultiPart: false,
      isVideo: false,
      sourceIsLocal: fixture.source === "local",
      // 封面:**不给地址**, 由 Artwork 回落到 playbarCover 占位 —— 见 placeholder-art.ts。
      cover: undefined,
      controlsDisabled: false,
      badgeText: fixture.badgeText ?? (fixture.quality ? AUDIO_QUALITY_LABEL[fixture.quality] : null),
      queueCount: fixture.queueCount,
      currentTime: fixture.elapsedSeconds,
      duration: fixture.durationSeconds,
    };
  }

  const isEmpty = list.length === 0;

  return {
    ready: !isEmpty,
    single: list.length === 1,
    isPlaying,
    title: playItem?.pageTitle || playItem?.title,
    sub: playItem?.source === "local" ? "本地音乐" : playItem?.ownerName,
    ownerClickable: playItem?.source !== "local" && Boolean(playItem?.ownerMid),
    ownerMid: playItem?.ownerMid,
    hasMultiPart: Boolean(playItem?.hasMultiPart),
    isVideo: playItem?.type === "mv",
    sourceIsLocal: playItem?.source === "local",
    cover: playItem?.pageCover || playItem?.cover,
    controlsDisabled: isEmpty,
    badgeText: playItem?.isLossless
      ? AUDIO_QUALITY_LABEL.lossless
      : playItem?.isDolby
        ? AUDIO_QUALITY_LABEL.dolby
        : null,
    queueCount: list.length,
    currentTime,
    duration: duration ?? 0,
  };
};
