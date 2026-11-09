import { useMemo, useRef } from "react";
import { useParams } from "react-router";

import { CollectionType } from "@/common/constants/collection";
import { adaptCollectionMediaToTrack } from "@/features/playlist/tracks";
import { postFavSeasonFav } from "@/service/fav-season-fav";
import { postFavSeasonUnfav } from "@/service/fav-season-unfav";
import { getUserVideoArchivesList, type Media } from "@/service/user-video-archives-list";
import { useFavoritesStore } from "@/store/favorite";
import { useUser } from "@/store/user";

import type { CollectionDetailConfig } from "../detail/types";

import { CollectionDetail } from "../detail/collection-detail";
import { getContextMenus } from "./menu";

interface SeasonInfo {
  id: number;
  title: string;
  cover: string;
  intro: string;
  media_count: number;
  upper?: { mid: number; name: string };
}

/** 视频合集。一次性全量 + 客户端过滤排序；收藏切换走 season 接口。 */
const VideoCollections = () => {
  const { id } = useParams();
  const userMid = useUser(state => state.user?.mid);
  const collectedFavorites = useFavoritesStore(state => state.collectedFavorites);
  const addCollectedFavorite = useFavoritesStore(state => state.addCollectedFavorite);
  const rmCollectedFavorite = useFavoritesStore(state => state.rmCollectedFavorite);

  // 合集接口 info 与 medias 同响应；fetchInfo 时带出到 ref，client 策略读取。
  // 挂组件实例上（useRef），重渲染不丢。
  const seasonMediasRef = useRef<Media[]>([]);

  const config: CollectionDetailConfig<Media, SeasonInfo> = useMemo(
    () => ({
      collectionType: CollectionType.VideoCollections,

      fetchInfo: async seasonId => {
        const res = await getUserVideoArchivesList({ season_id: Number(seasonId) });
        const data = res?.data;
        if (!data) return undefined;
        seasonMediasRef.current = data.medias ?? [];
        return data.info;
      },

      listStrategy: {
        kind: "client",
        fetchAll: async () => seasonMediasRef.current,
      },

      adaptToTrack: adaptCollectionMediaToTrack,
      entryKey: media => `bilibili-video:${media.bvid}`,
      entryTimestamp: media => media.pubtime,

      orderOptions: [
        { key: "pubtime", label: "最近投稿" },
        { key: "play", label: "最多播放" },
        { key: "collect", label: "最多收藏" },
      ],

      sortMedias: (medias, order) => {
        switch (order) {
          case "play":
            return medias.sort((a, b) => (b.cnt_info?.play || 0) - (a.cnt_info?.play || 0));
          case "collect":
            return medias.sort((a, b) => (b.cnt_info?.collect || 0) - (a.cnt_info?.collect || 0));
          case "pubtime":
            return medias.sort((a, b) => (b.pubtime || 0) - (a.pubtime || 0));
          default:
            return medias;
        }
      },

      header: info => ({
        cover: info?.cover,
        title: info?.title,
        desc: info?.intro,
        upMid: info?.upper?.mid,
        mediaCount: info?.media_count,
      }),

      isCreatedBySelf: info => info?.upper?.mid === userMid,

      favoriteToggle: {
        isFavorite: () => collectedFavorites?.some(item => item.id === Number(id)) ?? false,
        toggle: async info => {
          if (collectedFavorites?.some(item => item.id === Number(id))) {
            const res = await postFavSeasonUnfav({ season_id: Number(id), platform: "web" });
            if (res.code === 0) rmCollectedFavorite(Number(id));
          } else {
            const res = await postFavSeasonFav({ season_id: Number(id), platform: "web" });
            if (res.code === 0) {
              addCollectedFavorite({
                id: Number(id),
                title: info?.title || "未命名合集",
                cover: info?.cover,
                type: CollectionType.VideoCollections,
                mid: info?.upper?.mid,
                // 收藏后立即按 season_id 打开（乐观更新拿不到收藏夹 mlid）；刷新后
                // 收藏列表会以 mlid 重写为 favorite-folder。
                source: "season",
              });
            }
          }
        },
      },

      menuItems: () => getContextMenus(),
    }),
    [id, userMid, collectedFavorites, addCollectedFavorite, rmCollectedFavorite],
  );

  return <CollectionDetail id={id} config={config} />;
};

export default VideoCollections;
