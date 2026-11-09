import { chunk } from "es-toolkit/array";

import { toPlayItem } from "@/adapters/track/actions";
import { adaptFavoriteResourcesToTracks } from "@/adapters/track/favorite";
import { getFavResourceIds } from "@/service/fav-resource";
import { getFavResourceInfos, type FavResourceInfo } from "@/service/fav-resource-infos";

/** 是否个人私密收藏夹 */
export const isPrivateFav = (attr: number) => {
  return (attr & 1) === 1;
};

/** 是否默认收藏夹 */
export const isDefaultFav = (attr?: number) => {
  if (attr === undefined || attr === null) return false;
  return ((attr >> 1) & 1) === 0;
};

export const getAllFavTracks = async ({ id: favFolderId }: { id: string }) => {
  const idsRes = await getFavResourceIds({
    media_id: Number(favFolderId),
    platform: "web",
  });

  if (idsRes.code !== 0 || !idsRes.data) {
    return [];
  }

  const allIds = idsRes.data;
  if (allIds.length === 0) {
    return [];
  }

  const validIds = allIds.filter(item => item.type === 2 || item.type === 12);
  if (validIds.length === 0) {
    return [];
  }

  const chunkSize = 50;
  const chunks = chunk(validIds, chunkSize);
  const results = await Promise.allSettled(
    chunks.map(items => {
      const resources = items.map(item => `${item.id}:${item.type}`).join(",");
      return getFavResourceInfos({ resources, platform: "web" });
    }),
  );

  const allInfos: FavResourceInfo[] = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.code === 0 && result.value.data) {
      allInfos.push(...result.value.data);
    }
  }

  // 失效/合集条目不进播放队列：没有可播源，塞进去只会带进死条目。
  return adaptFavoriteResourcesToTracks(allInfos).filter(t => !t.invalid && t.collectionHref === undefined);
};

export const getAllFavMedia = async ({ id }: { id: string }) => (await getAllFavTracks({ id })).map(toPlayItem);
