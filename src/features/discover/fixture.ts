import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { PLACEHOLDER_RADIALS } from "@/ui/fixtures/placeholder-art";
import { DISCOVER_CARD_FIXTURE_NAME, SCREEN_07_DISCOVER_CARD_FIXTURE } from "@/ui/fixtures/screen-07-discover-card";
import { DISCOVER_LIST_FIXTURE_NAME, SCREEN_08_DISCOVER_LIST_FIXTURE } from "@/ui/fixtures/screen-08-discover-list";

import type { DiscoverListTrackRow } from "./discover-list-view";
import type { DiscoverAlbum, DiscoverFilter, DiscoverHero } from "./discover-view";

/**
 * 屏 07 / 08 夹具的读取与映射。
 *
 * 只有当 URL 携带 `?fixture=07-discover-card` 或 `?fixture=08-discover-list` 时才返回
 * 数据；真实路径（音乐中心的 new/music 与 comprehensive/web/rank 接口）完全不经过
 * 本文件。这样保真度比对（`verify.py --target app`）拿到的是设计稿第 8 / 9 页的逐字
 * 内容，而日常使用仍然走真实数据 —— 两条路径共享同一个视图模型。
 *
 * 与屏 01 / 02 / 06 同一处置：JSON（`tools/design-fidelity/fixtures/0N-*.json`）是
 * `verify.py` 的取数源，`src/ui/fixtures/screen-0N-*.ts` 是应用的取数源，
 * `tests/fixture-screen-0N.test.ts` 保证两者逐字不漂移。本文件只做「夹具 → 视图模型」
 * 的搬运，不含任何视觉值。
 *
 * **两个夹具是同一路由 `/` 的两条分支**（卡片 / 列表），不是两个页面：`MusicRecommend`
 * 按这个返回值分流，分流的判据只有夹具名，没有别的。
 */
export const useDiscoverFixtureName = (): string | null => {
  const [params] = useSearchParams();
  const name = params.get("fixture");

  return name === DISCOVER_CARD_FIXTURE_NAME || name === DISCOVER_LIST_FIXTURE_NAME ? name : null;
};

/** 卡片分支（屏 07）。保留为独立 hook：`DiscoverView` 的调用点只关心这一条。 */
export const useDiscoverFixture = (): boolean => useDiscoverFixtureName() === DISCOVER_CARD_FIXTURE_NAME;

export interface DiscoverFixtureData {
  title: string;
  lead: string;
  filters: DiscoverFilter[];
  heroSectionTitle: string;
  hero: DiscoverHero;
  albumSectionTitle: string;
  albums: DiscoverAlbum[];
  note: string;
}

export const useDiscoverFixtureData = (): DiscoverFixtureData | null => {
  const enabled = useDiscoverFixture();

  return useMemo(() => {
    if (!enabled) return null;

    const fixture = SCREEN_07_DISCOVER_CARD_FIXTURE;

    return {
      title: fixture.head.title,
      lead: fixture.head.lead,
      /**
       * 5 枚药丸**都不可交互**：夹具模式不触网、不切换展示模式，
       * 画面必须稳定。所以一律不给 `onPress` —— 渲染成静态 `Pill`。
       * 这与设计稿的读法也一致：本屏这一条里只有「全部播放 / 随机播放」是
       * 动作，「数据源…」「去重后合并 27 条」是状态标记，「显示模式 · 卡片 ▾」
       * 是模式选择。夹具路径不兑现交互，也不假装兑现。
       */
      filters: fixture.filters.map((pill, index) => ({
        key: `fixture-pill-${index + 1}`,
        label: pill.label,
        variant: pill.variant,
      })),
      heroSectionTitle: fixture.heroSection.title,
      hero: {
        badge: fixture.hero.badge,
        ratioNote: fixture.hero.ratioNote,
        tag: fixture.hero.tag,
        title: fixture.hero.title,
        meta: fixture.hero.meta,
        tags: fixture.hero.tags.map((tag, index) => ({
          key: `fixture-hero-tag-${index + 1}`,
          label: tag.label,
          variant: tag.variant,
        })),
        // 卡片分支用 `heroCard` 档 —— 设计稿大卡的封面实测是**平色**
        // （x150–400 / y430–520，不同色数 = 1）。这一档写成等值渐变，唯一原因是
        // `Artwork` 走 `background-image` 通道而平色不是合法值（先例：`playbarCover`）。
        // `heroList` 是屏 08 列表分支那条固定渐变，不要在这里混用。
        // 具体色值只在 `placeholder-art.ts`（check-literals 放行的数据豁免文件），
        // 本文件**不复制它** —— 夹具只指名，不带值。
        artVariant: fixture.hero.artVariant,
        artPlaceholder: PLACEHOLDER_RADIALS[fixture.hero.artVariant],
        /**
         * 播放键**要渲染**（设计稿第 8 页大卡右端有一枚 56 的圆片，
         * x1304–1359.5，`right` 内容带就是靠它与第 3 张专辑卡一起覆盖的）。
         * 给一个空实现只是为了「夹具模式不触网」—— 与屏 06 的
         * `onQueryChange` 同一处置：不连网，但不假装控件不存在。
         */
        onPlay: () => {
          /* 夹具模式不触网：比对需要画面稳定。 */
        },
      },
      albumSectionTitle: fixture.albumSection.title,
      // 封面**逐字**取设计稿对应的那一档（`artVariant` 指向 placeholder-art 的
      // radialVariants），不做哈希挑选 —— 比对要求逐字一致，而且**亮度会进闸门**：
      // 原型那几条渐变的起点亮度高于内容带阈值，会把徽标墨迹并进封面那条带
      // （spec-lock 1.3.19 第 ④ 条）。
      albums: fixture.albums.map((album, index) => ({
        key: `fixture-album-${index + 1}`,
        badge: album.badge,
        title: album.title,
        meta: album.meta,
        tags: album.tags.map((tag, tagIndex) => ({
          key: `fixture-album-${index + 1}-tag-${tagIndex + 1}`,
          label: tag.label,
          variant: tag.variant,
        })),
        artPlaceholder: PLACEHOLDER_RADIALS[album.artVariant],
      })),
      note: fixture.note,
    };
  }, [enabled]);
};

export interface DiscoverListFixtureData {
  title: string;
  lead: string;
  filters: DiscoverFilter[];
  sectionTitle: string;
  /** 表头四列标签（顺序即列序）。 */
  head: string[];
  tracks: DiscoverListTrackRow[];
  /** 常驻演示操作带的行 id（设计稿第 04 行）。 */
  demoActionRowIds: string[];
  note: string;
}

/** 列表分支（屏 08）的夹具数据。 */
export const useDiscoverListFixtureData = (): DiscoverListFixtureData | null => {
  const enabled = useDiscoverFixtureName() === DISCOVER_LIST_FIXTURE_NAME;

  return useMemo(() => {
    if (!enabled) return null;

    const fixture = SCREEN_08_DISCOVER_LIST_FIXTURE;

    return {
      title: fixture.head.title,
      lead: fixture.head.lead,
      /**
       * 5 枚药丸**都不可交互**：夹具模式不触网、不切换展示模式，画面必须稳定。
       * 所以一律不给 `onPress` —— 渲染成静态 `Pill`。设计稿的读法也一致：本屏
       * 这一条里只有「全部播放 / 随机播放」是动作，后三枚是状态标记与模式选择。
       */
      filters: fixture.filters.map((pill, index) => ({
        key: `fixture-pill-${index + 1}`,
        label: pill.label,
        variant: pill.variant,
      })),
      sectionTitle: fixture.section.title,
      head: [...fixture.section.head],
      tracks: fixture.tracks.map(track => ({
        id: `fixture-track-${track.index}`,
        index: track.index,
        title: track.title,
        subtitle: track.subtitle,
        stats: track.stats,
        duration: track.duration,
        // 缩略图**逐行**取设计稿对应的那一档（`artVariant` 指向 placeholder-art 的
        // radialVariants），不做哈希挑选 —— 与屏 07 的专辑卡同一处置，理由也一样：
        // 比对要求逐字一致，而且封面亮度会进闸门。
        placeholder: PLACEHOLDER_RADIALS[track.artVariant],
      })),
      // 设计稿第 9 页**没有**当前行高亮（第 04 行与相邻行在操作带之外的列中位差
      // = 0.0）—— 它只是操作带常驻露出的演示行，故不下发 `current`，只登记演示位。
      // 详见 spec-lock `screens[07].rowStateRule`。
      demoActionRowIds: fixture.tracks.filter(track => track.demoActions).map(track => `fixture-track-${track.index}`),
      note: fixture.note,
    };
  }, [enabled]);
};
