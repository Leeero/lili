import { formatUrlProtocol } from "@/common/utils/url";
import { axiosInstance } from "@/service/request";
import { getWebPlayerInfo } from "@/service/web-player";

import type { LyricLine } from "./model";

/** 字幕文件（JSON）中的单条字幕 */
interface SubtitleBodyItem {
  /** 起始时间，秒 */
  from?: number;
  /** 结束时间，秒 */
  to?: number;
  content?: string;
}

/** 字幕文件（JSON）响应结构 */
interface SubtitleFileResponse {
  body?: SubtitleBodyItem[];
}

/** 去掉字幕里常见的 ♪♫ 装饰符号 */
const cleanSubtitleText = (raw: string) => raw.replace(/^[♪♫]+|[♪♫]+$/g, "").trim();

/**
 * 用视频字幕降级生成歌词行。
 *
 * 逻辑移植自上游 wood3n/biu（components/lyrics/get-lyrics.ts）：
 * 取 x/player/v2 返回的字幕列表，优先中文，下载字幕 JSON 后
 * 按 from（秒）转成毫秒时间轴。调用方应明确标注来源为
 * 「视频字幕」——接口字段无法可靠判断是否为 AI 生成，
 * 不得虚称为 AI 字幕。
 */
export const getSubtitleLyricLines = async (bvid: string, cid: string | number): Promise<LyricLine[]> => {
  const res = await getWebPlayerInfo({ bvid, cid: Number(cid) });
  const subtitles = res?.data?.subtitle?.subtitles ?? [];
  const picked = subtitles.find(item => item.lan === "zh-Hans" || item.lan === "zh-CN") ?? subtitles[0];
  const url = formatUrlProtocol(picked?.subtitle_url || picked?.subtitle_url_v2);
  if (!url) return [];

  const file = await axiosInstance.get<SubtitleFileResponse>(url);
  return (file?.body ?? [])
    .map(item => ({
      time: Math.max(0, Math.round((item.from ?? 0) * 1000)),
      text: cleanSubtitleText(item.content ?? ""),
    }))
    .filter(line => line.text)
    .toSorted((a, b) => a.time - b.time);
};
