import { describe, expect, test } from "vitest";

import { adaptLocalMusicToTrack } from "@/adapters/track/local";
import {
  adaptNewMusicBannerToTrack,
  adaptNewMusicToTrack,
  adaptRankItemToTrack,
  dedupeTracks,
} from "@/adapters/track/recommendation";
import { getTrackCapabilities } from "@/domain/track";

describe("track adapters", () => {
  test("榜单项按「歌」口径展示，related_archive 只作为播放载体", () => {
    const track = adaptRankItemToTrack(
      {
        id: 1,
        music_title: "I Met A Boy",
        music_id: "m1",
        music_corner: "",
        cid: "old-cid",
        jump_url: "",
        author: "Mimi Webb",
        bvid: "BVOLD",
        album: "Confessions",
        aid: "10",
        cover: "music-cover.jpg",
        score: 212,
        related_archive: {
          aid: "20",
          bvid: "BVNEW",
          cid: "new-cid",
          cover: "video-cover.jpg",
          title: "【MV】【Mimi Webb】「I Met A Boy」",
          uid: 2,
          username: "fallinforjulia",
          vt_display: "",
          vv_count: 100,
          is_vt: 0,
          fname: "MV",
          duration: 200,
        },
      },
      "rank-1",
    );

    // 展示是「歌」：歌名 / 歌手 / 专辑 / 音乐封面；播放源是 related_archive 的 bvid/aid/cid。
    expect(track).toMatchObject({
      id: "bilibili-video:BVNEW",
      title: "I Met A Boy",
      album: "Confessions",
      cover: "music-cover.jpg",
      creator: { name: "Mimi Webb" },
      sourceRef: { aid: "20", bvid: "BVNEW", cid: "new-cid" },
    });
  });

  test("榜单项没有歌名/封面时回落到关联稿件", () => {
    const track = adaptRankItemToTrack(
      {
        id: 1,
        music_title: "",
        music_id: "m1",
        music_corner: "",
        cid: "old-cid",
        jump_url: "",
        author: "",
        bvid: "BVOLD",
        album: "",
        aid: "10",
        cover: "",
        score: 1,
        related_archive: {
          aid: "20",
          bvid: "BVNEW",
          cid: "new-cid",
          cover: "video-cover.jpg",
          title: "Archive title",
          uid: 2,
          username: "Artist",
          vt_display: "",
          vv_count: 100,
          is_vt: 0,
          fname: "",
          duration: 200,
        },
      },
      "rank-2",
    );

    expect(track).toMatchObject({
      title: "Archive title",
      cover: "video-cover.jpg",
      creator: { name: "Artist" },
    });
  });

  test("新歌映射歌名 / 歌手 / 专辑，banner 保持同一稳定身份", () => {
    const listTrack = adaptNewMusicToTrack(
      { bvid: "BV1", music_title: "A", author: "歌手", album: "专辑", cover: "a.jpg" },
      "list",
    );
    expect(listTrack).toMatchObject({
      title: "A",
      album: "专辑",
      creator: { name: "歌手" },
    });

    const bannerTrack = adaptNewMusicBannerToTrack({ bvid: "BV1", archive_title: "A" }, "banner");
    expect(dedupeTracks([bannerTrack, listTrack])).toEqual([bannerTrack]);
  });

  test("maps local files to playable local tracks", () => {
    const track = adaptLocalMusicToTrack({
      id: "file-1",
      path: "C:\\Music\\a.mp3",
      dir: "C:\\Music",
      title: "Local",
      size: 10,
      format: "mp3",
      duration: 120,
    });
    expect(track).toMatchObject({
      id: "local:file-1",
      source: "local",
      sourceRef: { localPath: "C:\\Music\\a.mp3", audioUrl: "file://C:/Music/a.mp3" },
    });
  });

  test("derives actions only from existing backend and local capabilities", () => {
    const video = adaptNewMusicToTrack(
      { bvid: "BV100", aid: "100", music_title: "Song", cover: "cover.jpg" },
      "fallback",
    );
    expect(getTrackCapabilities(video, { isLoggedIn: false })).toMatchObject({
      canPlay: true,
      canFavorite: false,
      canDownloadAudio: true,
      canDownloadVideo: true,
    });
    expect(getTrackCapabilities(video, { isLoggedIn: true }).canFavorite).toBe(true);

    const unavailable = adaptNewMusicToTrack({ music_title: "No source" }, "missing");
    expect(getTrackCapabilities(unavailable, { isLoggedIn: true })).toMatchObject({
      canPlay: false,
      canFavorite: false,
      canDownloadAudio: false,
      canDownloadVideo: false,
    });
  });

  test("invalid and collection entries are not playable but keep source link", () => {
    const base = adaptNewMusicToTrack(
      { bvid: "BV100", aid: "100", music_title: "Song", cover: "cover.jpg" },
      "fallback",
    );
    const caps = { isLoggedIn: true };
    // 失效条目：一切播放/入队/下载/收藏关闭，仅可溯源。
    expect(getTrackCapabilities({ ...base, invalid: true }, caps)).toMatchObject({
      canPlay: false,
      canPlayNext: false,
      canAddToQueue: false,
      canFavorite: false,
      canDownloadAudio: false,
      canDownloadVideo: false,
      canOpenSource: true,
    });
    // 合集条目：同上（不是单曲）。
    expect(getTrackCapabilities({ ...base, collectionHref: "/collection/1?type=21" }, caps)).toMatchObject({
      canPlay: false,
      canAddToQueue: false,
      canDownloadAudio: false,
      canOpenSource: true,
    });
  });
});
