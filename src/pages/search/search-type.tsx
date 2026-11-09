export enum SearchType {
  All = "all",
  Video = "video",
  User = "user",
}

/**
 * 结果页的三个 tab。
 *
 * 「播放列表」不在其中：它不是 B 站搜索的一种结果类型，原先那个 tab 只是一张
 * 「前往我的音乐」的静态说明卡。本地曲库检索改由页头的
 * `在本地音乐中搜索` 入口承载（跳到 `/local-music?key=…`）。
 */
export const SearchTypeOptions = [
  { label: "综合", value: SearchType.All },
  { label: "音乐视频", value: SearchType.Video },
  { label: "创作者", value: SearchType.User },
] as const;
