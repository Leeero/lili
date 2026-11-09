import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

describe("发现音乐真实数据源契约", () => {
  test("合并音乐中心的三个「歌」数据源，不再读音乐分区视频流", () => {
    const source = readFileSync(path.resolve(process.cwd(), "src/pages/music-recommend/index.tsx"), "utf8");

    // 新碟 banner + 新歌 + 综合推荐（音乐中心的三份「歌」数据）。
    expect(source).toContain("getNewMusicBanner");
    expect(source).toContain("getNewMusic");
    expect(source).toContain("getMusicComprehensiveWebRank");
    // 音乐分区视频流（rid=1003）已从发现页移除。
    expect(source).not.toContain("getRegionFeedRcmd");
    expect(source).not.toContain("from_region");
  });

  test("综合推荐段只取首页（ps=12），不做分页", () => {
    const source = readFileSync(path.resolve(process.cwd(), "src/pages/music-recommend/index.tsx"), "utf8");
    expect(source).toContain("getMusicComprehensiveWebRank({ pn: 1, ps: PAGE_SIZE })");
  });
});
