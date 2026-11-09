import { useParams } from "react-router";

import { addToast, useDisclosure } from "@heroui/react";

import type { FavResourceInfo } from "@/service/fav-resource-infos";

import { adaptFavoriteResourceToTrack } from "@/adapters/track/favorite";
import { CollectionType } from "@/common/constants/collection";
import { getAllFavTracks } from "@/common/utils/fav";
import FavoritesEditModal from "@/components/favorites-edit-modal";
import { executeTrackAction } from "@/features/track/actions";
import { postFavFolderFav } from "@/service/fav-folder-fav";
import { getFavFolderInfo, type FavFolderInfoData } from "@/service/fav-folder-info";
import { postFavFolderUnfav } from "@/service/fav-folder-unfav";
import { getFavResourceList, type FavMedia } from "@/service/fav-resource";
import { postFavResourceBatchDel } from "@/service/fav-resource-batch-del";
import { postFavResourceClean } from "@/service/fav-resource-clean";
import { useFavoritesStore } from "@/store/favorite";
import { useModalStore } from "@/store/modal";
import { useMusicFavStore } from "@/store/music-fav";
import { isSame, usePlayList } from "@/store/play-list";
import { useUser } from "@/store/user";

import type { CollectionDetailConfig } from "../detail/types";

import { CollectionDetail } from "../detail/collection-detail";
import { getContextMenus } from "./menu";

/**
 * 收藏夹详情。数据源配置 + 收藏夹特有能力（编辑 / 清理失效 / 移动 / 取消收藏 /
 * 全量播放）都在这里；列表骨架与状态机在 `detail/`。
 */
const Favorites = () => {
  const { id: favFolderId } = useParams();
  const userMid = useUser(state => state.user?.mid);
  const addCollectedFavorite = useFavoritesStore(state => state.addCollectedFavorite);
  const rmCollectedFavorite = useFavoritesStore(state => state.rmCollectedFavorite);

  const { isOpen: isEditOpen, onOpen: onEditOpen, onOpenChange: onEditChange } = useDisclosure();

  const config: CollectionDetailConfig<FavMedia, FavFolderInfoData> = {
    collectionType: CollectionType.Favorite,

    fetchInfo: async id => {
      const res = await getFavFolderInfo({ media_id: id });
      return res?.data ?? undefined;
    },

    listStrategy: {
      kind: "paged-server",
      fetchPage: async (page, keyword, order) => {
        const res = await getFavResourceList({
          media_id: favFolderId as string,
          ps: 20,
          pn: page,
          platform: "web",
          keyword: keyword || undefined,
          order,
          tid: 0,
          type: 0,
        });
        if (!res?.data) throw new Error("获取收藏夹内容失败");
        return { medias: res.data.medias ?? [], hasMore: res.data.has_more ?? false };
      },
    },

    adaptToTrack: media => adaptFavoriteResourceToTrack(media as FavResourceInfo),
    entryKey: media => adaptFavoriteResourceToTrack(media as FavResourceInfo)?.id ?? `fav-media:${media.id}`,
    entryTimestamp: media => media.fav_time,

    orderOptions: [
      { key: "mtime", label: "最近收藏" },
      { key: "view", label: "最多播放" },
      { key: "pubtime", label: "最近投稿" },
    ],

    header: info => ({
      cover: info?.cover,
      attr: info?.attr,
      title: info?.title,
      desc: info?.intro,
      upMid: info?.upper?.mid,
      mediaCount: info?.media_count,
    }),

    isCreatedBySelf: info => Boolean(info?.upper) && Boolean(userMid) && userMid === info?.upper?.mid,

    favoriteToggle: {
      isFavorite: info => info?.fav_state === 1,
      toggle: async info => {
        if (info?.fav_state === 1) {
          const res = await postFavFolderUnfav({ media_id: Number(favFolderId), platform: "web" });
          if (res.code === 0) {
            rmCollectedFavorite(Number(favFolderId));
            const { promise, resolve } = Promise.withResolvers<void>();
            setTimeout(resolve, 500);
            await promise;
          }
        } else {
          const res = await postFavFolderFav({ media_id: Number(favFolderId), platform: "web" });
          if (res.code === 0) {
            addCollectedFavorite({
              id: info?.id as number,
              title: info?.title || "未命名收藏夹",
              cover: info?.cover,
              type: CollectionType.Favorite,
              mid: info?.upper?.mid,
              source: "favorite-folder",
            });
            const { promise, resolve } = Promise.withResolvers<void>();
            setTimeout(resolve, 500);
            await promise;
          }
        }
      },
    },

    // 编辑弹窗只在自建收藏夹时出现（改动前行为）；他人收藏夹无封面热区。
    editAction: () => {
      const owned = Boolean(userMid);
      return favFolderId && owned
        ? {
            onEdit: onEditOpen,
            modal: (
              <FavoritesEditModal
                mid={Number(favFolderId)}
                isOpen={isEditOpen}
                onOpenChange={onEditChange}
                onSuccess={info => {
                  useFavoritesStore.getState().modifyCreatedFavorite({
                    id: info.id,
                    cover: info.cover,
                    title: info.title,
                  });
                }}
              />
            ),
          }
        : undefined;
    },

    clearInvalid: async () => {
      const res = await postFavResourceClean({ media_id: Number(favFolderId) });
      if (res.code === 0) {
        // 清理后回到第一页：重查与改动前的 loadPage(1) 等价。
        window.location.reload();
      }
    },

    menuItems: (media, ctx) =>
      getContextMenus({ isCreatedBySelf: ctx.isCreatedBySelf, type: media.type, invalid: media.attr !== 0 }),

    onMenuAction: async (key, media, track) => {
      const createdBySelf = Boolean(userMid);
      switch (key) {
        case "favorite":
          await executeTrackAction("favorite", track, {
            onFavoriteSuccess: selectedIds => {
              if (createdBySelf && !selectedIds.includes(Number(favFolderId))) {
                /* 移出当前收藏夹：分页列表由 hook 持有，刷新首页对齐改动前行为。 */
              }
            },
          });
          return true;
        case "cancelFavorite":
          useModalStore.getState().onOpenConfirmModal({
            title: `确认取消收藏${media.title}？`,
            onConfirm: async () => {
              if (!favFolderId) return false;
              const res = await postFavResourceBatchDel({
                resources: `${media.id}:${media.type}`,
                media_id: favFolderId,
                platform: "web",
              });
              if (res.code === 0) {
                if (
                  isSame(
                    {
                      type: media.type === 2 ? "mv" : "audio",
                      bvid: media.bvid,
                      sid: media.type === 12 ? media.id : undefined,
                    },
                    usePlayList.getState().getPlayItem(),
                  )
                ) {
                  await useMusicFavStore.getState().refreshIsFav();
                }
                const { promise, resolve } = Promise.withResolvers<void>();
                setTimeout(resolve, 1000);
                await promise;
              } else {
                addToast({ title: res.message, color: "danger" });
              }
              return res.code === 0;
            },
          });
          return true;
        default:
          return false;
      }
    },

    playAllTracks: async info => {
      if (!favFolderId) {
        addToast({ title: "收藏夹 ID 无效", color: "danger" });
        return [];
      }
      if (!(info?.media_count ?? 0)) {
        addToast({ title: "收藏夹为空", color: "warning" });
        return [];
      }
      try {
        return await getAllFavTracks({ id: favFolderId });
      } catch {
        addToast({ title: "获取收藏夹全部歌曲失败", color: "danger" });
        return [];
      }
    },

    onInfoLoaded: info => {
      if (info?.id) {
        useFavoritesStore.getState().modifyCreatedFavorite({
          id: info.id,
          cover: info.cover,
          title: info.title,
        });
      }
    },
  };

  return <CollectionDetail id={favFolderId} config={config} />;
};

export default Favorites;
