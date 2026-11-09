import type { FixtureNowPlaying } from "./now-playing";

export const DOWNLOADS_FIXTURE_NAME = "05-downloads";

/** 夹具任务的原始下载状态（MediaDownloadStatus 枚举值）。 */
export interface FixtureDownloadTask {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  /** 原始 MediaDownloadStatus —— 操作带门控由它（而非 status 文案）派生。 */
  rawStatus: MediaDownloadStatus;
  status: string;
  progress?: number;
  size: string;
  artIndex: number;
}

export const SCREEN_05_DOWNLOADS_FIXTURE = {
  header: {
    title: "下载管理",
    lead: "9 种真实任务状态，暂停 / 继续 / 重试按状态门控，不发出无效操作。",
  },
  filterPills: [
    { kind: "primary", label: "打开下载目录 · ~/Music/lili" },
    { kind: "secondary", label: "暂停全部" },
    { kind: "neutral", label: "重试全部失败" },
    { kind: "neutral", label: "清空已完成" },
    { kind: "danger", label: "清空记录" },
  ],
  section: {
    title: "12 个任务 · 2 个进行中",
    head: ["#", "文件", "状态", "大小"],
  },
  tasks: [
    {
      id: "fixture-download-1",
      index: 1,
      title: "「神呀，接住她的眼泪吧」— 这首歌完整版来啦",
      subtitle: "无损 30251 · 音频 · FLAC · 今天 16:02",
      rawStatus: "downloading",
      status: "下载中 · 62%",
      progress: 62,
      size: "12.4 MB",
      artIndex: 0,
    },
    {
      id: "fixture-download-2",
      index: 2,
      title: "【猎 Hunter】｜「荒野求生的小曲」",
      subtitle: "杜比 30250 · 音频 · M4A · 今天 15:48",
      rawStatus: "merging",
      status: "合并分块中 · 40%",
      progress: 40,
      size: "18.7 MB",
      artIndex: 1,
    },
    {
      id: "fixture-download-3",
      index: 3,
      title: "我有两颗搞丸！！！",
      subtitle: "高清 30280 · 视频 · MP4 · 昨天 21:30",
      rawStatus: "completed",
      status: "已完成 · 可定位文件",
      size: "86.2 MB",
      artIndex: 2,
    },
    {
      id: "fixture-download-4",
      index: 4,
      title: "录歌 和好朋友在学校的最后一个晚上",
      subtitle: "自动 30232 · 音频 · 今天 14:11",
      rawStatus: "failed",
      status: "任务出错 · 可重试",
      size: "—",
      artIndex: 3,
    },
  ],
  note: "状态取自 MediaDownloadStatus 的 9 个真实值：等待中 / 下载中 / 下载暂停 / 合并中 / 合并暂停 / 转换中 / 转换暂停 / 已完成 / 任务出错。暂停仅对「下载中」有效、继续仅对三种「暂停」有效、重试仅对「任务出错」有效。",
  nowPlaying: {
    title: "《雨落长街》· 全专上线",
    sub: "卧室音乐计划 · 新碟 banner",
    quality: "lossless",
    elapsedSeconds: 82,
    durationSeconds: 228,
    queueCount: 12,
    playing: false,
  } satisfies FixtureNowPlaying,
} as const;
