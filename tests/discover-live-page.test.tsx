/**
 * 发现音乐**真实路径**的装配测试。
 *
 * 这一页按产品要求与服务端原型分了岔：页头（H1 / 导语 / 药丸筛选行）移除，内容直接铺；
 * 数据源从「音乐分区视频流」收敛为音乐中心的三份「歌」数据（新碟 banner + 新歌 + 综合推荐）。
 * 夹具屏 07/08 走的是另一条装配（`DiscoverView` / `DiscoverListView`），保真比对
 * 不受影响 —— 本文件钉的正是「两条装配各自成立」。
 *
 * 服务与 store 全部 mock：这里要验的是页面结构与 chrome，不是取数。
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";

import { afterEach, describe, expect, test, vi } from "vitest";

import MusicRecommend from "@/pages/music-recommend";

vi.mock("@/service/web-interface-new-music-banner", () => ({
  getNewMusicBanner: vi.fn(async () => ({
    code: 0,
    data: { list: [{ bvid: "BVbanner", archive_title: "新碟主打", cover: "banner.jpg", author: "歌手甲" }] },
  })),
}));

vi.mock("@/service/web-interface-new-music", () => ({
  getNewMusic: vi.fn(async () => ({
    code: 0,
    data: {
      list: [
        { bvid: "BV1", music_title: "新歌甲", album: "专辑A", author: "歌手甲", cover: "a.jpg" },
        { bvid: "BV2", music_title: "新歌乙", album: "专辑B", author: "歌手乙", cover: "b.jpg" },
      ],
    },
  })),
}));

vi.mock("@/service/music-comprehensive-web-rank", () => ({
  getMusicComprehensiveWebRank: vi.fn(async () => ({
    code: 0,
    data: {
      list: [
        {
          music_title: "热歌丙",
          album: "专辑C",
          author: "歌手丙",
          cover: "c.jpg",
          related_archive: { bvid: "BVr1", aid: "1", cid: "c1", duration: 200 },
        },
      ],
    },
  })),
}));

/* 播放列表与弹窗 store 走真身会连带持久化（`window.electron` 在测试里是 undefined）。 */
vi.mock("@/store/play-list", () => ({
  usePlayList: Object.assign((selector: (state: unknown) => unknown) => selector({ playId: undefined }), {
    getState: () => ({ play: vi.fn(), addToNext: vi.fn(), addList: vi.fn() }),
  }),
}));

vi.mock("@/store/modal", () => ({
  useModalStore: { getState: () => ({ onOpenFavSelectModal: vi.fn() }) },
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const render = async (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  await act(async () => root.render(<MemoryRouter initialEntries={["/"]}>{node}</MemoryRouter>));
  return container;
};

afterEach(async () => {
  for (const item of mounted.splice(0)) {
    await act(async () => item.root.unmount());
    item.container.remove();
  }
});

describe("发现音乐真实路径", () => {
  test("不渲染页头，也没有数据源/视图切换控件", async () => {
    const container = await render(<MusicRecommend />);

    const h1 = container.querySelector("h1");
    // H1 保留但视觉隐藏：内容区段标题是 h2，页面缺 h1 会让读屏标题树从二级开始。
    expect(h1?.textContent).toBe("发现音乐");
    expect(h1?.className).toContain("sr-only");

    // 旧页头的导语、药丸行、数据源切换、视图切换全部消失。
    expect(container.querySelector('[aria-label="发现音乐筛选"]')).toBeNull();
    expect(container.querySelector('[aria-label="数据源"]')).toBeNull();
    expect(container.querySelector('[aria-label="显示模式"]')).toBeNull();
    expect(container.querySelector(".discover4188-toolbar")).toBeNull();
  });

  test("内容按「歌」口径展示：hero + 新歌 + 综合推荐，副行是歌手 · 专辑", async () => {
    const container = await render(<MusicRecommend />);

    await vi.waitFor(() => expect(container.textContent).toContain("新歌甲"));

    // hero：新碟主打。
    expect(container.querySelector(".discover4188-hero h2")?.textContent).toBe("新碟主打");

    // 两段标题按序。
    const headings = Array.from(container.querySelectorAll(".discover4188-section-head h2")).map(
      node => node.textContent,
    );
    expect(headings).toEqual(["新歌", "综合推荐"]);

    // 卡片副行是「歌手 · 专辑」。
    expect(container.textContent).toContain("歌手甲 · 专辑A");
    expect(container.textContent).toContain("歌手丙 · 专辑C");

    // 新歌段 2 张 + 综合推荐 1 张。
    expect(container.querySelectorAll("article.discover4188-card")).toHaveLength(3);
  });
});
