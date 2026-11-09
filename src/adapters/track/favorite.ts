import type { Track } from "@/domain/track";
import type { FavResourceInfo } from "@/service/fav-resource-infos";

/**
 * 收藏夹条目 → Track。
 *
 * 不再把「失效 / 合集」条目过滤掉 —— 它们在 B 站侧仍计入收藏夹总数，过滤掉会让
 * 详情页显示「暂无内容」而用户不知道原因。改为：
 * - 失效（attr 9/1）：打 `invalid`，灰显、不可播放，但仍在列表里。
 * - 合集（type 21）：打 `collectionHref`，不是单曲、点击跳进合集详情。
 * - 只有真正无法表达的形态（视频缺 bvid）才返回 undefined。
 */
export const adaptFavoriteResourceToTrack = (item: FavResourceInfo): Track | undefined => {
  // 合集条目：不是单曲，打 collectionHref 让渲染层跳详情。
  if (item.type === 21) {
    return {
      id: `bilibili-collection:${item.id}`,
      source: "bilibili-video",
      title: item.title,
      cover: item.cover,
      creator: item.upper ? { id: String(item.upper.mid), name: item.upper.name, avatar: item.upper.face } : undefined,
      playCount: item.cnt_info?.play,
      publishedAt: item.pubtime ? new Date(item.pubtime * 1000).toISOString() : undefined,
      sourceRef: { aid: String(item.id), bvid: item.bvid || item.bv_id || undefined },
      collectionHref: `/collection/${item.id}?type=21`,
    };
  }

  // 音频 / 视频稿件。失效的（attr 9/1）打 invalid 保留在列表。
  if (![2, 12].includes(item.type)) return undefined;
  const isVideo = item.type === 2;
  const bvid = item.bvid || item.bv_id || undefined;
  // 视频必须能溯源（bvid），否则连「在 B 站打开」都做不到 —— 这种形态不渲染。
  if (isVideo && !bvid) return undefined;

  const invalid = item.attr !== 0;

  return {
    id: isVideo ? `bilibili-video:${bvid}` : `bilibili-audio:${item.id}`,
    source: isVideo ? "bilibili-video" : "bilibili-audio",
    title: item.title,
    cover: item.cover,
    creator: item.upper ? { id: String(item.upper.mid), name: item.upper.name, avatar: item.upper.face } : undefined,
    duration: item.duration,
    playCount: item.cnt_info?.play,
    publishedAt: item.pubtime ? new Date(item.pubtime * 1000).toISOString() : undefined,
    sourceRef: isVideo ? { aid: String(item.id), bvid } : { sid: item.id },
    invalid,
  };
};

/** 批量映射：只滤掉真正无法表达的（undefined），失效/合集条目保留。 */
export const adaptFavoriteResourcesToTracks = (items: FavResourceInfo[]) =>
  items.map(adaptFavoriteResourceToTrack).filter((track): track is Track => Boolean(track));
