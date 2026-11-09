/**
 * 外壳交互与路由契约测试。
 *
 * 覆盖三件事：
 *   1. `resolveShellLayout` —— 三种壳层状态各自渲染哪些槽位、用哪张背景。
 *   2. `resolveRouteShell` —— 路由 → 壳层状态的映射，以及页面内二级导航的归属。
 *   3. 顶栏分段与 `cplus-spec-lock.json` 的对齐 —— 保证「待声明清单」不会漏掉任何一屏。
 *
 * 一级导航的用例钉在「侧栏与 `PRIMARY_NAV_ITEMS` 同源」上：侧栏是**唯一**渲染方，
 * 那张表是唯一真源。两者曾经各写一份同样的 5 项（双份事实源），下面第一条用例
 * 就是防它再漂回去。
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";

import { resolveShellLayout, type ShellChrome } from "@/app/shell/model";
import {
  DEFAULT_SEARCH_PLACEHOLDER,
  DEFERRED_SEGMENTS,
  PRIMARY_NAV_ITEMS,
  ROUTE_SEGMENTS,
  SEARCH_PLACEHOLDER_BY_ROUTE,
  TOPBAR_NOTE_BY_ROUTE,
  composeSegmentCount,
  composeLocalMusicSegments,
  resolvePrimaryNavHref,
  resolveRouteShell,
  resolveSearchPlaceholder,
  resolveTopbarNote,
} from "@/layout/route-shell";
import {
  isSearchShortcut,
  isTypingTarget,
  normalizeSearchKeyword,
  shouldSubmitSearch,
} from "@/layout/topbar/search-model";

const spec = JSON.parse(readFileSync(path.resolve(process.cwd(), "docs/design/cplus-spec-lock.json"), "utf8")) as {
  topbarSegments: { byRoute: Record<string, string[]> };
  globalChrome: {
    search: {
      placeholder: string;
      placeholderByRoute: Record<string, string>;
    };
    topbarNote: { text: string; routes: string[] };
  };
};

describe("壳层状态", () => {
  const cases: { chrome: ShellChrome; hasTopbar: boolean; hasPlayer: boolean; background: string }[] = [
    { chrome: "default", hasTopbar: true, hasPlayer: true, background: "app" },
    { chrome: "immersive", hasTopbar: false, hasPlayer: false, background: "immersive" },
    { chrome: "bare", hasTopbar: false, hasPlayer: false, background: "none" },
  ];

  test.each(cases)("$chrome：顶栏 $hasTopbar / 播放栏 $hasPlayer", ({ chrome, hasTopbar, hasPlayer, background }) => {
    const layout = resolveShellLayout(chrome);
    expect(layout.hasTopbar).toBe(hasTopbar);
    expect(layout.hasPlayer).toBe(hasPlayer);
    expect(layout.background).toBe(background);
  });

  test("沉浸态仍然保留内容留白：底部控制带是页面内嵌的，不是播放栏", () => {
    // 这一条是防回归的：如果哪天为了「沉浸」把留白也去掉，
    // 页面里的进度条 y=700 / 控制带 752–808 这些硬锚点会全部失准。
    expect(resolveShellLayout("immersive").contentInset).toBe(true);
    expect(resolveShellLayout("bare").contentInset).toBe(false);
  });

  test("缺省即 default，不需要调用方先归一化", () => {
    expect(resolveShellLayout()).toEqual(resolveShellLayout("default"));
  });

  test("播放器只在稳定布局层初始化，沉浸页返回时不会重置播放进度", () => {
    const layoutSource = readFileSync(path.resolve(process.cwd(), "src/layout/index.tsx"), "utf8");
    const playbarSource = readFileSync(path.resolve(process.cwd(), "src/layout/playbar/index.tsx"), "utf8");

    expect(layoutSource).toContain("void initPlayer()");
    expect(playbarSource).not.toContain("state => state.init");
    expect(playbarSource).not.toContain("init()");
  });

  test("4188 响应式壳层按 900 / 640 两档压缩导航与搜索位", () => {
    const topbarSource = readFileSync(path.resolve(process.cwd(), "src/layout/topbar/index.tsx"), "utf8");
    const shellCss = readFileSync(path.resolve(process.cwd(), "src/app/shell/shell-4188.css"), "utf8");

    expect(shellCss).toContain("@media (width <= 900px)");
    expect(shellCss).toContain("@media (width <= 640px)");
    expect(shellCss).toContain("--lili-4188-sidebar-compact-width");
    expect(shellCss).toContain("width: calc(100% - 55px)");
    // 4188 设计稿顶栏只有返回/前进/搜索；账户入口唯一落在侧栏账户区。
    expect(topbarSource).not.toContain("<AvatarMenu");
    const sidebarSource = readFileSync(path.resolve(process.cwd(), "src/layout/sidebar/index.tsx"), "utf8");
    expect(sidebarSource).toContain("<ProfileMenu");
  });

  test("原生滚动容器与 OverlayScrollbars 使用同一套桌面主题", () => {
    const appCss = readFileSync(path.resolve(process.cwd(), "src/app.css"), "utf8");
    const scrollContainer = readFileSync(
      path.resolve(process.cwd(), "src/components/scroll-container/index.tsx"),
      "utf8",
    );
    const searchField = readFileSync(path.resolve(process.cwd(), "src/layout/topbar/search-field.tsx"), "utf8");

    expect(appCss).toContain("*::-webkit-scrollbar-thumb");
    expect(appCss).toContain(".os-theme-lili");
    expect(scrollContainer).toContain('theme: "os-theme-lili"');
    expect(searchField).toContain('theme: "os-theme-lili"');
  });

  test("搜索下拉层使用不透明表面且不会侵入播放器区域", () => {
    const searchField = readFileSync(path.resolve(process.cwd(), "src/layout/topbar/search-field.tsx"), "utf8");
    const shellCss = readFileSync(path.resolve(process.cwd(), "src/app/shell/shell-4188.css"), "utf8");

    expect(searchField).toContain("bg-[rgb(var(--lili-color-surface-raised))]");
    expect(searchField).toContain(
      "max-h-[calc(100dvh-var(--lili-layout-topbar-h)-var(--lili-layout-player-h)-0.5rem)]",
    );
    expect(searchField).toContain("absolute top-full right-0");
    expect(searchField).not.toContain("absolute top-full left-0");
    expect(searchField).toContain("overscroll-contain");
    expect(searchField).not.toContain("bg-[var(--lili-surface-sunken)]");
    // 高度规则只能命中 HeroUI Input 自己的槽位。两个坑都有真实事故：
    // 1. 曾用 `.shell4188-search > div`，把同为直接子 div 的建议浮层钉成
    //    搜索框高度（--lili-4188-search-height），浮层只剩 48px 一条；
    // 2. 曾把 base 写成后代选择器 `.shell4188-search [data-slot="base"]`，
    //    而下拉内部的 HeroUI Listbox 包装层**同样渲染 data-slot="base"**，
    //    于是它被钉成 48px、overflow:clip 裁掉列表内容，还被 :focus-within
    //    规则画上聚焦环 —— 见 2026-10-08 两次修复记录。
    // 因此 base 必须限定为直接子级（Input 才是根节点的直接子元素）。
    expect(shellCss).not.toContain(".shell4188-search > div");
    expect(shellCss).toContain('.shell4188-search > [data-slot="base"]');
    expect(shellCss).not.toContain('.shell4188-search [data-slot="base"]');
  });
});

describe("路由壳层契约", () => {
  test("沉浸态与迷你窗口由路由决定，不在组件内部推断", () => {
    expect(resolveRouteShell("/now-playing").chrome).toBe("immersive");
    expect(resolveRouteShell("/mini-player").chrome).toBe("bare");
  });

  test("其余路由一律 default", () => {
    for (const pathname of [
      "/",
      "/library",
      "/local-music",
      "/download-list",
      "/search",
      "/settings",
      "/queue",
      "/collection/123",
    ]) {
      expect(resolveRouteShell(pathname).chrome, pathname).toBe("default");
    }
  });

  test("未知路由回落到 default，而不是抛错", () => {
    expect(resolveRouteShell("/does-not-exist").chrome).toBe("default");
  });

  test("未声明分段的路由没有页面内二级导航（一级导航由侧栏独立承接）", () => {
    const { contextSegments, activeContextKey } = resolveRouteShell("/does-not-exist");
    expect(contextSegments).toEqual([]);
    expect(activeContextKey).toBe("");
  });

  test("一级导航覆盖五处一级入口，且互相不重复", () => {
    const hrefs = PRIMARY_NAV_ITEMS.map(item => item.href);
    expect(hrefs).toEqual(["/", "/chart", "/library", "/local-music", "/download-list"]);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  test("二级页映射回父级一级入口（侧栏高亮不丢）", () => {
    expect(resolvePrimaryNavHref("/collection/123")).toBe("/library");
    expect(resolvePrimaryNavHref("/collection/123?type=21")).toBe("/library");
    expect(resolvePrimaryNavHref("/user/456")).toBe("/follow");
    expect(resolvePrimaryNavHref("/user/456?tab=video")).toBe("/follow");
  });

  test("一级入口与独立页不是二级页，不映射父级", () => {
    for (const pathname of [
      "/",
      "/chart",
      "/library",
      "/local-music",
      "/download-list",
      "/queue",
      "/history",
      "/follow",
      "/settings",
      "/search",
      "/now-playing",
      "/mini-player",
    ]) {
      expect(resolvePrimaryNavHref(pathname), pathname).toBeUndefined();
    }
  });

  test("侧栏一级导航派生自真源，且每个入口都有图标", () => {
    // 侧栏曾硬编码一份与真源逐字相同的表（双份事实源，改一处漏一处）。
    // 这条把它钉成「派生」：一旦有人再抄一份，`PRIMARY_NAV_ITEMS.map` 消失、用例即红。
    const sidebarSource = readFileSync(path.resolve(process.cwd(), "src/layout/sidebar/index.tsx"), "utf8");
    expect(sidebarSource).toContain("PRIMARY_NAV_ITEMS.map");
    for (const item of PRIMARY_NAV_ITEMS) {
      expect(sidebarSource, `${item.href} 在侧栏缺少图标`).toContain(`"${item.href}": Ri`);
    }
  });

  test("页面筛选只进入页面内二级导航，不影响壳层状态", () => {
    // 详情页的类型 tab 已移除：/collection/:id 不再声明分段（三类 id 空间不同，
    // 无法在同 id 上切类型）。页面筛选仍由页面内分段承接，壳层状态不受影响。
    const shell = resolveRouteShell("/collection/123", "?type=21");
    expect(shell.contextSegments).toEqual([]);
    expect(shell.chrome).toBe("default");
  });
});

describe("顶栏分段与真值对齐", () => {
  const truthRoutes = Object.keys(spec.topbarSegments.byRoute);
  const declared = Object.keys(ROUTE_SEGMENTS);
  const deferred = Object.keys(DEFERRED_SEGMENTS);

  test("真值的每一屏都被「已声明」或「待声明」接住", () => {
    // 发现页的数据源切换由页面自己的筛选条承接，不占用全局或壳层二级导航。
    const covered = new Set([...declared, ...deferred, "/"]);
    const uncovered = truthRoutes.filter(route => !covered.has(route));
    expect(uncovered, "这些路由的分段组既没声明也没登记待办，会被静默遗忘").toEqual([]);
  });

  test("两边不能重复登记", () => {
    expect(declared.filter(route => deferred.includes(route))).toEqual([]);
  });

  test("已声明的分段标签必须与真值逐字一致（模板分段除外，见 /search 一节）", () => {
    for (const [pattern, entry] of Object.entries(ROUTE_SEGMENTS)) {
      // /search 的标签是「前缀 + 运行时计数」模板，字面标签里那个数字不是
      // 壳层能写死的 —— 见 spec-lock topbarSegments.labelSources 与下面的
      // 专属 describe。/library 真值已是归属轴两段（1.4.0），恢复逐字比对。
      if (pattern === "/search") continue;
      expect(
        entry.segments.map(segment => segment.label),
        `${pattern} 与真值不一致`,
      ).toEqual(spec.topbarSegments.byRoute[pattern]);
    }
  });

  test("待声明清单必须写明承接阶段与原因", () => {
    for (const [pattern, entry] of Object.entries(DEFERRED_SEGMENTS)) {
      expect(entry.phase, `${pattern} 缺阶段`).toMatch(/^P\d$/);
      expect(entry.reason.length, `${pattern} 的理由太短，等于没写`).toBeGreaterThan(10);
    }
  });
});

describe("/collection/:id 详情页", () => {
  // 类型 tab 整组移除（1.4.0）：数字是 CollectionType 类型码（误导读总数），
  // 且三类 id 空间不同（mlid / season_id / series_id），无法在同 id 上切类型。
  test("详情页不再声明类型分段", () => {
    const shell = resolveRouteShell("/collection/123");
    expect(shell.contextSegments).toEqual([]);
  });

  test("类型码不再泄漏到分段标签", () => {
    // 回归钉：旧的「收藏夹 · 11 / 合集 · 21 / 系列 · 31」尾巴是类型码，
    // 被用户读成集合数量。删 tab 后任何路由的分段都不该再出现这些字面量。
    for (const entry of Object.values(ROUTE_SEGMENTS)) {
      for (const segment of entry.segments) {
        expect(segment.label).not.toMatch(/· (11|21|31)$/);
      }
    }
  });
});

describe("/library 顶栏分段组", () => {
  test("按归属轴分两段：我创建的 / 我追的", () => {
    const shell = resolveRouteShell("/library");
    expect(shell.contextSegments.map(segment => segment.label)).toEqual(["我创建的", "我追的"]);
    expect(shell.activeContextKey).toBe("created");
  });

  test("激活段由 ?tab 决定，缺省 created", () => {
    expect(resolveRouteShell("/library", "?tab=followed").activeContextKey).toBe("followed");
    expect(resolveRouteShell("/library", "?tab=created").activeContextKey).toBe("created");
    // 旧链接 ?tab=collected / ?tab=collections 已无对应段，回落缺省。
    expect(resolveRouteShell("/library", "?tab=collected").activeContextKey).toBe("created");
  });

  test("两段都是可点的：跳到对应 tab，不是坏掉的开关", () => {
    for (const segment of resolveRouteShell("/library").contextSegments) {
      expect(segment.href, `${segment.label} 缺少 href`).toBeTruthy();
    }
  });
});

describe("/local-music 顶栏目录分段", () => {
  test("夹具保持设计稿标签，真实路径替换为实际目录名", () => {
    const declared = resolveRouteShell("/local-music").contextSegments;
    expect(composeLocalMusicSegments(declared, [], true).map(item => item.label)).toEqual([
      "全部目录",
      "D 盘 · Lossless",
      "E 盘 · Live 录音",
    ]);
    expect(composeLocalMusicSegments(declared, ["/Music/Lossless", "/Music/Live"], false)).toEqual([
      { key: "all", label: "全部目录", href: "?dir=all" },
      { key: "0", label: "Lossless", href: "?dir=0" },
      { key: "1", label: "Live", href: "?dir=1" },
    ]);
  });

  test("目录 query 决定激活段", () => {
    expect(resolveRouteShell("/local-music").activeContextKey).toBe("all");
    expect(resolveRouteShell("/local-music", "?dir=1").activeContextKey).toBe("1");
  });
});

describe("/search 顶栏分段组（模板 + 运行时计数）", () => {
  /**
   * 真值 byRoute 的「音乐视频 · 9」= 模板前缀「音乐视频」+ 计数槽 video 的
   * 「· 9」。计数是运行时结果数（spec-lock topbarSegments.labelSources），
   * 壳层只声明前缀与槽位，数字由结果页写入 useSearchSegments、Layout 组合。
   * 若哪天真值的前缀变了，这条会红 —— 那时必须同时改真值并给出新取证。
   */
  test("分段前缀与计数槽对齐真值的字面标签", () => {
    const truth = spec.topbarSegments.byRoute["/search"];
    expect(truth).toEqual(["音乐视频 · 9", "创作者 · 2"]);

    const segments = resolveRouteShell("/search").contextSegments;
    expect(segments.map(segment => segment.label)).toEqual(["音乐视频", "创作者"]);
    expect(segments.map(segment => segment.countKey)).toEqual(["video", "creator"]);
  });

  test("两段都是可点的：分段决定视口落在哪一段（两段结果同页共存）", () => {
    const segments = resolveRouteShell("/search").contextSegments;
    expect(segments.map(segment => segment.href)).toEqual(["?view=video", "?view=creator"]);
  });

  test("激活段由 ?view 决定，缺省 video（设计稿里「音乐视频」是激活段）", () => {
    expect(resolveRouteShell("/search").activeContextKey).toBe("video");
    expect(resolveRouteShell("/search", "?view=creator").activeContextKey).toBe("creator");
    // 夹具地址不带 view —— 与缺省一致，两段全灭就是退化。
    expect(resolveRouteShell("/search", "?fixture=06-search").activeContextKey).toBe("video");
  });

  test("计数未知 → count 缺省（无悬空分隔符）；0 是合法计数必须保留", () => {
    const segment = resolveRouteShell("/search").contextSegments[0]!;
    expect(composeSegmentCount(segment, { videoCount: null, creatorCount: null }).count).toBeUndefined();
    expect(composeSegmentCount(segment, { videoCount: 0, creatorCount: 0 }).count).toBe(0);
    expect(composeSegmentCount(segment, { videoCount: 9, creatorCount: 2 }).count).toBe(9);
    // 静态分段原样返回 —— 不引入多余的字段。
    const staticSegment = resolveRouteShell("/library").contextSegments[0]!;
    expect(composeSegmentCount(staticSegment, { videoCount: null, creatorCount: null })).toBe(staticSegment);
  });
});

describe("顶栏搜索占位与真值对齐", () => {
  test("缺省占位与真值一致", () => {
    expect(DEFAULT_SEARCH_PLACEHOLDER).toBe(spec.globalChrome.search.placeholder);
  });

  test("逐页占位表与真值逐字一致", () => {
    expect(SEARCH_PLACEHOLDER_BY_ROUTE).toEqual(spec.globalChrome.search.placeholderByRoute);
  });

  test("按路由解析占位，未登记的路由回落缺省值", () => {
    expect(resolveSearchPlaceholder("/collection/123")).toBe("搜索收藏夹与合集");
    expect(resolveSearchPlaceholder("/library")).toBe(DEFAULT_SEARCH_PLACEHOLDER);
    expect(resolveSearchPlaceholder("/")).toBe(DEFAULT_SEARCH_PLACEHOLDER);
  });
});

describe("顶栏说明与真值对齐", () => {
  /**
   * `/` 上那句「已下线: 流行 / 鬼畜」是**路由级 chrome**（不是页面内容），
   * 真值登记在 `globalChrome.topbarNote`。它与分段组同机制：声明在
   * `route-shell.ts`、由 `TopBar` 渲染，所以也在这里钉住。
   */
  test("开发阶段说明不得进入产品顶栏", () => {
    expect(TOPBAR_NOTE_BY_ROUTE).toEqual({});
  });

  test("只有登记过的路由带说明，其余路由没有这一段", () => {
    expect(resolveTopbarNote("/")).toBeUndefined();
    expect(resolveTopbarNote("/library")).toBeUndefined();
    expect(resolveTopbarNote("/search")).toBeUndefined();
  });

  test("它随路由契约一起下发，不是页面自己塞的", () => {
    expect(resolveRouteShell("/").topbarNote).toBeUndefined();
    expect(resolveRouteShell("/library").topbarNote).toBeUndefined();
  });

  test("末尾斜杠归一后再匹配（/ 的说明不能因为多一个斜杠就消失）", () => {
    // `matchesPattern` 会把尾部斜杠去掉，所以 `/` 与 `//` 都要命中。
    // 这条防的是「有人把说明的查找换成按 pathname 直接取键」。
    expect(resolveTopbarNote("//")).toBe(resolveTopbarNote("/"));
  });
});

describe("顶栏搜索", () => {
  test("normalizes keyboard search submissions and rejects blank values", () => {
    expect(normalizeSearchKeyword("  周杰伦  ")).toBe("周杰伦");
    expect(shouldSubmitSearch("  周杰伦  ")).toBe(true);
    expect(shouldSubmitSearch("   ")).toBe(false);
  });

  test("Ctrl K 提示可见就必须可用：Ctrl 与 ⌘ 都接", () => {
    expect(isSearchShortcut({ key: "k", ctrlKey: true, metaKey: false })).toBe(true);
    expect(isSearchShortcut({ key: "K", ctrlKey: true, metaKey: false })).toBe(true);
    expect(isSearchShortcut({ key: "k", ctrlKey: false, metaKey: true })).toBe(true);
    expect(isSearchShortcut({ key: "j", ctrlKey: true, metaKey: false })).toBe(false);
    expect(isSearchShortcut({ key: "k", ctrlKey: false, metaKey: false })).toBe(false);
  });

  test("已经在输入类元素里时不抢焦点", () => {
    const target = (tagName: string, isContentEditable = false) =>
      ({ tagName, isContentEditable }) as unknown as EventTarget;

    expect(isTypingTarget(target("INPUT"))).toBe(true);
    expect(isTypingTarget(target("TEXTAREA"))).toBe(true);
    expect(isTypingTarget(target("DIV", true))).toBe(true);
    expect(isTypingTarget(target("DIV"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

/**
 * 「搜索框里躺着上一次搜的词」曾是一个真实缺陷：`keyword`（当前查询词）被一起
 * 持久化了，而输入框又用 `useState(keyword)` 取初值 —— 每次冷启动都像是被自动
 * 填充。下面三条分别钉住两处改动的**行为**（不是源码形状），以及存量数据的迁移。
 */
describe("顶栏搜索框不记住上一次的查询词", () => {
  test("输入框初值恒为空，不从 store 的当前查询词回填", () => {
    const searchField = readFileSync(path.resolve(process.cwd(), "src/layout/topbar/search-field.tsx"), "utf8");
    expect(searchField).toContain('useState("")');
    expect(searchField).not.toContain("useState(keyword)");
    // 只改初值还不够：只要还订阅着 keyword，将来有人顺手把它接回初值就又回填了。
    expect(searchField).not.toContain("s => s.keyword");
  });

  test("当前查询词不落盘，搜索历史照旧进 localStorage", async () => {
    localStorage.clear();
    vi.resetModules();
    const { useSearchHistory } = await import("@/store/search-history");

    useSearchHistory.getState().add("下雨");

    // 会话内 `/search` 页仍要能读到查询词。
    expect(useSearchHistory.getState().keyword).toBe("下雨");
    const persisted = JSON.parse(localStorage.getItem("search-history") ?? "{}") as {
      state: Record<string, unknown> & { items: { value: string }[] };
    };
    expect(Object.keys(persisted.state)).not.toContain("keyword");
    expect(persisted.state.items.map(item => item.value)).toEqual(["下雨"]);
  });

  test("老数据里存过的 keyword 在升版水合时被清掉", async () => {
    // 只改 partialize 治不了存量数据：那份数据里**已经有** keyword，
    // 水合时会合并回内存 —— 老用户升级后照样被回填。
    localStorage.setItem(
      "search-history",
      JSON.stringify({ state: { keyword: "下雨", items: [{ value: "下雨", time: 1 }] }, version: 0 }),
    );
    vi.resetModules();
    const { useSearchHistory } = await import("@/store/search-history");

    expect(useSearchHistory.getState().keyword).toBe("");
    expect(useSearchHistory.getState().items.map(item => item.value)).toEqual(["下雨"]);
  });
});

/**
 * 错误边界的**位置**是一份壳层契约，不是实现细节。
 *
 * 2026-10-10 的事故：当时唯一的边界包着 `<AppShell>` 加全部全局弹层。运行中的
 * 应用产物被清理后，点任何懒加载页面都会 `ChunkLoadError`，于是**整个壳层**
 * 被兜底页替换 —— 侧栏、账户卡、播放栏、登录弹窗宿主一起消失，用户既没有出口、
 * 也点不到登录（截图里那张「ERROR 404」插画页就是这么来的）。
 *
 * 现在分两层：页面级边界只包 `<Outlet />`（下面第一条），整页兜底留给应用级
 * 边界（第二条钉在 `app.tsx` 上）。谁把两层合回去，这里就红。
 */
describe("错误边界分层", () => {
  const readSource = (relativePath: string) =>
    readFileSync(path.resolve(process.cwd(), relativePath), "utf8")
      // 下面的断言看的是**代码结构**（元素顺序、用了哪个组件）。注释里同样会出现
      // `<Outlet />` 这类字样（解释「为什么」时躲不开），先剥掉注释再比对，
      // 否则一段说明文字就能把顺序断言带偏。
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

  test("页面级边界只包住路由内容，壳层与全局弹层留在边界外", () => {
    const layoutSource = readSource("src/layout/index.tsx");
    const indexOf = (needle: string) => layoutSource.indexOf(needle);

    const shellStart = indexOf("<AppShell");
    const boundaryStart = indexOf("<ErrorBoundary");
    const outlet = indexOf("<Outlet />");
    const boundaryEnd = indexOf("</ErrorBoundary>");

    expect(shellStart).toBeGreaterThan(-1);
    // 边界嵌在 AppShell **内部**，且只圈住 <Outlet />。
    expect(boundaryStart).toBeGreaterThan(shellStart);
    expect(outlet).toBeGreaterThan(boundaryStart);
    expect(boundaryEnd).toBeGreaterThan(outlet);

    // 全局弹层与登录宿主必须排在边界**之后**（即边界之外）。
    for (const host of [
      "<FavoritesSelectModal />",
      "<ConfirmModal />",
      "<VideoPagesDownloadSelectModal />",
      "<ReleaseNoteModal />",
      "<LoginHost />",
    ]) {
      const at = indexOf(host);
      expect(at, `${host} 应在页面级边界之外`).toBeGreaterThan(boundaryEnd);
    }
  });

  test("页面级兜底是内容区尺寸，整页兜底只给应用级边界用", () => {
    const layoutSource = readSource("src/layout/index.tsx");
    const appSource = readSource("src/app.tsx");
    const contentFallback = readSource("src/components/error-fallback/content.tsx");

    expect(layoutSource).toContain("FallbackComponent={ContentFallback}");
    // 整页兜底（h-screen）不允许再出现在壳层里 —— 那正是事故形态。
    expect(layoutSource).not.toContain('from "@/components/error-fallback";');
    expect(contentFallback).not.toContain("h-screen");

    // 壳层自己崩了仍有兜底：应用级边界负责整页恢复页。
    expect(appSource).toContain("FallbackComponent={Fallback}");
  });
});
