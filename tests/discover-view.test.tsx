/**
 * 屏 07「发现音乐 · 卡片」呈现层测试。
 *
 * 钉三件事：
 *   1. 页面里的屏级节奏（`DISCOVER_RHYTHM`）与真值 `screens[06].rhythmImplementation`
 *      逐项一致 —— 那五个值是设计稿第 8 页的实测，第 9 页就不一样，
 *      所以它们既不能进组件档位表，也不能只活在页面里没人管。
 *   2. **H1 的基线是 `aligned`**。真值里写的 `head-main--flat` 是原型类名，
 *      照它用 flat 会让 H1 落到 111（比设计稿的 121 高 10px）—— 这是
 *      `prototypeBaseline` 里「原型整体高 10」的成因，必须拦住。
 *   3. 夹具内容渲染出的**结构**：单列页头、两段、注解带按页流（不是固定底带）、
 *      专辑卡没有画幅说明、大卡的播放键在。
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";

import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import { DISCOVER_HEAD_RHYTHM } from "@/features/discover/discover-heading";
import { DISCOVER_RHYTHM, DiscoverBody, DiscoverView, type DiscoverViewProps } from "@/features/discover/discover-view";
import { PLACEHOLDER_RADIALS } from "@/ui/fixtures/placeholder-art";
import { SCREEN_07_DISCOVER_CARD_FIXTURE } from "@/ui/fixtures/screen-07-discover-card";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const spec = JSON.parse(readFileSync(path.resolve(process.cwd(), "docs/design/cplus-spec-lock.json"), "utf8")) as {
  screens: { no: string; rhythmImplementation: Record<string, unknown> }[];
};

const screen07 = spec.screens.find(item => item.no === "07");
if (!screen07) throw new Error("真值里找不到屏 07（screens[].no === '07'）");

const mounted: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const render = async (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  await act(async () => root.render(<MemoryRouter>{node}</MemoryRouter>));
  return container;
};

afterEach(async () => {
  for (const item of mounted.splice(0)) {
    await act(async () => item.root.unmount());
    item.container.remove();
  }
});

/** 夹具内容 → `DiscoverView` 的 props（与 `features/discover/fixture.ts` 同形状）。 */
const fixtureProps = (): DiscoverViewProps => {
  const fixture = SCREEN_07_DISCOVER_CARD_FIXTURE;

  return {
    title: fixture.head.title,
    lead: fixture.head.lead,
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
      artVariant: fixture.hero.artVariant,
      artPlaceholder: PLACEHOLDER_RADIALS[fixture.hero.artVariant],
      onPlay: () => {},
    },
    albumSectionTitle: fixture.albumSection.title,
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
      // 封面逐字取设计稿对应的那一档。**不要**按哈希挑（那是真实路径的
      // `pickPlaceholderGradient`）：比对要求逐字一致，而且封面亮度会进闸门
      // —— 原型渐变的起点亮度 69.7 > 内容带阈值 60，会把封面左侧徽标的墨迹
      // 并进同一条带（spec-lock 1.3.19 第 ④ 条）。
      artPlaceholder: PLACEHOLDER_RADIALS[album.artVariant],
    })),
    note: fixture.note,
  };
};

describe("屏 07 的屏级节奏与真值一致", () => {
  const truth = screen07.rhythmImplementation;

  test("四个像素值逐项相等（它们与第 9 页并不相同，不能从别处抄）", () => {
    expect(DISCOVER_RHYTHM.leadMarginTop).toBe(truth.leadMarginTop);
    expect(DISCOVER_RHYTHM.filterMarginTop).toBe(truth.filterMarginTop);
    expect(DISCOVER_RHYTHM.sectionGap).toBe(truth.sectionGap);
    expect(DISCOVER_RHYTHM.sectionHeadMarginBottom).toBe(truth.sectionHeadMarginBottom);
  });

  test("H1 基线是 aligned —— 真值里的 flat 是原型类名，照它用会整体高 10px", () => {
    const baseline = String(truth.h1Baseline);

    expect(baseline.startsWith("aligned")).toBe(true);
    // 「不是 flat」这句要留在真值里，否则下一个人读到 `head-main--flat`
    // 又会去把基线去掉。
    expect(baseline).toContain("flat");
    // 屏级节奏走像素覆写，**不得**回到组件档位表（那里每屏加一档会无限膨胀）。
    expect(Object.keys(truth)).not.toContain("leadOffset");
  });

  test("段间距是同一处的值：筛选条→首段与段→段都是 sectionGap", () => {
    expect(String(truth.closing)).toContain("sectionGap");
    expect(DISCOVER_RHYTHM.sectionGap).toBe(25);
  });
});

describe("屏 07 呈现结构", () => {
  test("单列页头，H1 只有一枚", async () => {
    const container = await render(<DiscoverView {...fixtureProps()} />);
    const fixture = SCREEN_07_DISCOVER_CARD_FIXTURE;

    const headings = container.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe(fixture.head.title);
    // 设计稿第 8 页的页头**没有右栏**（第 01 屏才有）—— 有 aside 时会写内联
    // grid-template-columns。
    expect(container.querySelector('[style*="grid-template-columns"]')).toBeNull();
  });

  test("导语与筛选条走共享页头组件（与列表分支同一个）", async () => {
    const container = await render(<DiscoverView {...fixtureProps()} />);
    const fixture = SCREEN_07_DISCOVER_CARD_FIXTURE;

    const lead = Array.from(container.querySelectorAll("p")).find(node => node.textContent === fixture.head.lead);
    expect(lead).toBeDefined();
    // 两个展示分支共用 `DiscoverHeading`（走 `PageHeader`），不再是自研的
    // `.discover4188-heading`。页头几何因此只有一处描述 —— 详见
    // `src/features/discover/discover-heading.tsx`。
    expect((lead as HTMLElement).style.marginTop).toBe(`${DISCOVER_HEAD_RHYTHM.leadMarginTop}px`);

    // 筛选条是 L1 硬锚点：`FilterBar` 的条高 48 / 药丸 36 / 间隔 4，
    // 两个分支都不再用 `.discover4188-filters` 那套自研按钮。
    const bar = container.querySelector('[aria-label="发现音乐筛选"]');
    expect(bar).not.toBeNull();
    expect((bar as HTMLElement).style.marginTop).toBe(`${DISCOVER_HEAD_RHYTHM.filterMarginTop}px`);
    expect(bar?.className).toContain("bg-[var(--lili-surface-sunken)]");
  });

  test("大卡和专辑区使用同一 4188 命名空间", async () => {
    const container = await render(<DiscoverView {...fixtureProps()} />);

    const sections = Array.from(container.querySelectorAll("section"));
    expect(sections).toHaveLength(2);
    expect(sections[0]?.className).toBe("discover4188-hero");
    expect(sections[1]?.className).toBe("discover4188-section");
  });

  test("大卡占位资产与播放动作都落在正式 4188 组件中", async () => {
    const container = await render(<DiscoverView {...fixtureProps()} />);

    // hero-card 布局：16:9 封面（占位渐变落在 art 内层，不在整卡上）+ 圆形播放键。
    const art = container.querySelector(".discover4188-hero-art") as HTMLElement | null;
    expect(art).not.toBeNull();
    expect(art?.style.getPropertyValue("--discover-art")).toBe(PLACEHOLDER_RADIALS.heroCard);

    const play = container.querySelector(".discover4188-hero-play");
    expect(play).not.toBeNull();
    expect(play?.getAttribute("aria-label")).toContain("播放");
  });

  test("专辑卡是 3 张，封面尺寸走令牌，且**没有画幅说明**", async () => {
    const container = await render(<DiscoverView {...fixtureProps()} />);
    const fixture = SCREEN_07_DISCOVER_CARD_FIXTURE;

    expect(container.querySelectorAll("article.discover4188-card")).toHaveLength(fixture.albums.length);

    const covers = Array.from(container.querySelectorAll(".discover4188-art-fallback"));
    expect(covers).toHaveLength(fixture.albums.length);

    // 设计稿第 8 页三张专辑封面左下角逐点为空 —— 原型的「1:1」是原型发挥。
    // 这里从**渲染结果**上再确认一次：大卡的画幅说明在，专辑卡的不在。
    const ratioNotes = Array.from(container.querySelectorAll("span")).filter(node =>
      node.textContent?.includes("16:9 原始比例"),
    );
    expect(ratioNotes).toHaveLength(1);
    expect(container.textContent).not.toContain("1:1");
  });

  test("产品预览不渲染开发注解正文", async () => {
    const container = await render(<DiscoverView {...fixtureProps()} />);
    const fixture = SCREEN_07_DISCOVER_CARD_FIXTURE;

    expect(container.textContent).not.toContain(fixture.note);
  });

  test("拿不到 banner 时首段整段不渲染（真实路径的缺数据态）", async () => {
    const container = await render(<DiscoverView {...fixtureProps()} hero={null} />);

    expect(container.querySelectorAll("section")).toHaveLength(1);
    expect(container.querySelector("article")).not.toBeNull();
  });
});

/**
 * 真实路径（发现音乐）按产品要求不要页头，直接用 `DiscoverBody`（hero + 若干段）。
 * 夹具路径仍走 `DiscoverView`（页头 + 同一份内容区的单段形态）。这一组钉住
 * 「内容区自己不带页头」，否则哪天有人把页头挪进 `DiscoverBody`，
 * 真实路径会悄悄长回 H1 与导语，而屏 07 的比对仍然是绿的。
 */
describe("DiscoverBody：无页头的内容区", () => {
  test("只渲染内容区，H1 / 导语 / 筛选条一个都没有", async () => {
    const props = fixtureProps();
    const container = await render(
      <DiscoverBody hero={props.hero} sections={[{ title: props.albumSectionTitle, albums: props.albums }]} />,
    );

    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector("p")).toBeNull();
    expect(container.querySelector('[aria-label="发现音乐筛选"]')).toBeNull();
    // 大卡 + 专辑区两段，页头不在其中。
    expect(container.querySelectorAll("section")).toHaveLength(2);
  });

  test("content 槽位整段替换内容区（页面框因此得以常驻不闪）", async () => {
    const props = fixtureProps();
    const container = await render(
      <DiscoverBody
        content={<p className="fixture-state">加载中</p>}
        hero={props.hero}
        sections={[{ title: props.albumSectionTitle, albums: props.albums }]}
      />,
    );

    expect(container.textContent).toBe("加载中");
    expect(container.querySelectorAll("section")).toHaveLength(0);
  });

  test("多段按序渲染，空段自动跳过", async () => {
    const props = fixtureProps();
    const container = await render(
      <DiscoverBody
        hero={null}
        sections={[
          { title: "新歌", albums: props.albums },
          { title: "空段", albums: [] },
          { title: "综合推荐", albums: props.albums },
        ]}
      />,
    );

    const headings = Array.from(container.querySelectorAll(".discover4188-section-head h2")).map(
      node => node.textContent,
    );
    expect(headings).toEqual(["新歌", "综合推荐"]);
    expect(container.querySelectorAll("section.discover4188-section")).toHaveLength(2);
  });
});
