import { apiRequest } from "./request";

/**
 * web 播放器信息（WBI）
 * GET https://api.bilibili.com/x/player/wbi/v2
 *
 * 移植自上游 wood3n/biu（src/service/web-player.ts）。
 * 本项目主要使用其中的 subtitle（视频字幕）能力：
 * 标准歌词缺失时，用视频字幕降级展示，解决翻唱/混剪等
 * 难以匹配标准歌词的场景。
 */
export interface WebPlayerParams {
  /** 稿件 avid，可与 bvid 任选其一 */
  aid?: number;
  /** 稿件 bvid，可与 aid 任选其一 */
  bvid?: string;
  /** 稿件 cid，必传 */
  cid: number;
  /** 番剧 season_id，可选 */
  season_id?: number;
  /** 剧集 ep_id，可选 */
  ep_id?: number;
  /** 清晰度，示例：80=1080P+，64=1080P */
  qn?: number;
  /** 视频流标识组合，默认 4048（audio+video） */
  fnval?: number;
  /** 视频流版本，默认 0 */
  fnver?: number;
  /** 是否启用 4K：0/1 */
  fourk?: number;
  /** WBI 签名；若使用 useWbi=true 则自动补齐 */
  w_rid?: string;
  /** WBI 时间戳；若使用 useWbi=true 则自动补齐 */
  wts?: number;
}

export interface WebPlayerResponse {
  code: number;
  message: string;
  ttl: number;
  data?: WebPlayerData;
}

export interface WebPlayerData {
  aid: number;
  bvid: string;
  cid: number;
  title?: string;
  pic?: string;
  duration?: number;
  owner?: { mid: number; name: string; face: string };
  subtitle?: WebPlayerSubtitleBlock;
  view_points?: WebPlayerViewPoint[];
  online_count?: number;
  last_play_time?: number;
  last_play_cid?: number;
  now_time?: number;
}

export interface WebPlayerSubtitleBlock {
  allow_submit?: boolean;
  lan?: string;
  lan_doc?: string;
  subtitles: WebPlayerSubtitle[];
}

export interface WebPlayerSubtitle {
  ai_status?: number;
  ai_type?: number;
  id?: number;
  id_str?: string;
  is_lock?: boolean;
  /** 字幕语言，如 zh-Hans */
  lan?: string;
  lan_doc?: string;
  subtitle_url?: string;
  subtitle_url_v2?: string;
  type?: number;
}

export interface WebPlayerViewPoint {
  content?: string;
  /** 开始秒 */
  from?: number;
  /** 结束秒 */
  to?: number;
  imgUrl?: string;
  logoUrl?: string;
  type?: number;
}

/**
 * 获取 web 播放器信息（WBI）
 */
export function getWebPlayerInfo(params: WebPlayerParams) {
  return apiRequest.get<WebPlayerResponse>("/x/player/wbi/v2", {
    params,
    useWbi: true,
  });
}
