import { describe, expect, test } from "vitest";

import { adaptMediaDownloadTask } from "@/adapters/download/task";
import { adaptCollectedFavoriteToPlaylist, adaptCreatedFavoriteToPlaylist } from "@/adapters/playlist/favorite";
import { adaptSeriesArchiveToTrack, adaptSeriesMetaToPlaylist } from "@/adapters/playlist/series";
import { getTrackSourceUrl, toFavoriteSelection, toMediaDownloadInfo, toPlayItem } from "@/adapters/track/actions";
import { adaptCreatorPostToTrack } from "@/adapters/track/creator";
import { adaptFavoriteResourceToTrack } from "@/adapters/track/favorite";
import { adaptSearchVideoToTrack } from "@/adapters/track/search";

describe("stage 1 domain adapters", () => {
  test("maps search duration and identifiers", () => {
    const track = adaptSearchVideoToTrack({
      aid: 10,
      bvid: "BV10",
      title: '<em class="keyword">Result</em>',
      author: "Artist",
      pic: "cover",
      mid: 20,
      play: 99,
      duration: "01:02:03",
    });
    expect(track).toMatchObject({
      id: "bilibili-video:BV10",
      title: "Result",
      duration: 3723,
      creator: { id: "20", name: "Artist" },
      sourceRef: { aid: "10", bvid: "BV10" },
    });
  });

  test("maps creator posts into the shared track model", () => {
    expect(
      adaptCreatorPostToTrack({
        aid: 10,
        bvid: "BV10",
        title: "Creator track",
        pic: "cover",
        play: 99,
        comment: 3,
        author: "Artist",
        mid: 20,
        created: 1_700_000_000,
        length: "03:21",
      }),
    ).toMatchObject({
      id: "bilibili-video:BV10",
      duration: 201,
      creator: { id: "20", name: "Artist" },
      sourceRef: { aid: "10", bvid: "BV10" },
    });
  });

  test("maps video/audio favorite resources; keeps invalid and collection entries with markers", () => {
    const base = {
      title: "Favorite",
      cover: "cover",
      intro: "",
      page: 1,
      duration: 100,
      upper: { mid: 1, name: "Artist", face: "avatar" },
      attr: 0,
      cnt_info: { collect: 1, play: 2, danmaku: 3 },
      link: "",
      ctime: 0,
      pubtime: 0,
      fav_time: 0,
      bv_id: "",
      bvid: "",
      season: null,
    } as const;
    expect(adaptFavoriteResourceToTrack({ ...base, id: 10, type: 12 })).toMatchObject({
      id: "bilibili-audio:10",
      source: "bilibili-audio",
      sourceRef: { sid: 10 },
      invalid: false,
    });
    expect(adaptFavoriteResourceToTrack({ ...base, id: 20, type: 2, bvid: "BV20" })).toMatchObject({
      id: "bilibili-video:BV20",
      sourceRef: { aid: "20", bvid: "BV20" },
      invalid: false,
    });
    // 失效条目（attr 1/9）不再丢弃：打 invalid 标记，灰显但留在列表里。
    expect(adaptFavoriteResourceToTrack({ ...base, id: 30, type: 2, attr: 1, bvid: "BV30" })).toMatchObject({
      id: "bilibili-video:BV30",
      invalid: true,
    });
    expect(adaptFavoriteResourceToTrack({ ...base, id: 31, type: 12, attr: 9 })).toMatchObject({
      id: "bilibili-audio:31",
      invalid: true,
    });
    // 合集条目（type 21）：打 collectionHref，点击跳合集详情，不是单曲。
    expect(adaptFavoriteResourceToTrack({ ...base, id: 40, type: 21 })).toMatchObject({
      id: "bilibili-collection:40",
      collectionHref: "/collection/40?type=21",
    });
    // 视频缺 bvid（无法溯源）才真正丢弃。
    expect(adaptFavoriteResourceToTrack({ ...base, id: 50, type: 2, bvid: "", bv_id: "" })).toBeUndefined();
  });

  test("keeps created and collected playlist ownership semantics", () => {
    const common = {
      id: 1,
      fid: 1,
      mid: 2,
      attr: 0,
      title: "Folder",
      cover: "cover",
      upper: { mid: 2, name: "Owner", face: "avatar" },
      cover_type: 0,
      intro: "",
      ctime: 0,
      mtime: 0,
      state: 0,
      fav_state: 0,
      media_count: 3,
    };
    expect(
      adaptCreatedFavoriteToPlaylist({
        ...common,
        attr_desc: "",
        view_count: 0,
        vt: 0,
        is_top: false,
        play_switch: 0,
        type: 11,
        link: "",
        bvid: "",
      }),
    ).toMatchObject({ source: "favorite-folder", isOwnedByCurrentUser: true });
    expect(adaptCollectedFavoriteToPlaylist({ ...common, type: 21 })).toMatchObject({
      id: "season:1",
      source: "season",
      isOwnedByCurrentUser: false,
    });
  });

  test.each([
    ["downloadPaused", "paused", 30],
    ["merging", "processing", 40],
    ["converting", "processing", 50],
    ["completed", "completed", 100],
  ] as const)("maps download state %s", (status, expected, progress) => {
    expect(
      adaptMediaDownloadTask({
        id: "task",
        outputFileType: "audio",
        title: "Track",
        status,
        downloadProgress: status === "downloadPaused" || status === "completed" ? progress : 10,
        mergeProgress: status === "merging" ? progress : 0,
        convertProgress: status === "converting" ? progress : 0,
      }),
    ).toMatchObject({ status: expected, progress });
  });

  test("bridges domain tracks to existing playback, favorite and download contracts", () => {
    const track = adaptSearchVideoToTrack({
      aid: 10,
      bvid: "BV10",
      title: "Result",
      author: "Artist",
      pic: "cover",
      mid: 20,
    });
    expect(toPlayItem(track)).toMatchObject({ type: "mv", bvid: "BV10", ownerName: "Artist" });
    expect(toFavoriteSelection(track)).toEqual({ rid: 10, type: 2, title: "Result" });
    expect(toMediaDownloadInfo(track, "audio")).toMatchObject({
      outputFileType: "audio",
      bvid: "BV10",
    });
    expect(getTrackSourceUrl(track)).toBe("https://www.bilibili.com/video/BV10");
  });

  test("maps series metadata and archives to playlist and tracks", () => {
    const playlist = adaptSeriesMetaToPlaylist({
      category: 0,
      cover: "series.jpg",
      creator: "Artist",
      ctime: 0,
      description: "Description",
      keywords: [],
      last_update_ts: 0,
      mid: 20,
      mtime: 0,
      name: "Series",
      raw_keywords: "",
      series_id: 30,
      state: 0,
      total: 2,
    });
    const track = adaptSeriesArchiveToTrack(
      {
        aid: 10,
        bvid: "BV10",
        ctime: 0,
        duration: 180,
        enable_vt: false,
        interactive_video: false,
        pic: "cover.jpg",
        playback_position: 0,
        pubdate: 1_700_000_000,
        stat: { view: 100, vt: 0 },
        state: 0,
        title: "Track",
        ugc_pay: 0,
        vt_display: "",
      },
      { id: "20", name: "Artist" },
    );
    expect(playlist).toMatchObject({ id: "series:30", source: "series", trackCount: 2 });
    expect(track).toMatchObject({ id: "bilibili-video:BV10", sourceRef: { aid: "10", bvid: "BV10" } });
  });
});
