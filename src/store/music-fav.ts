import { create } from "zustand";

import { getCollResourceCheck } from "@/service/medialist-gateway-coll-resource-check";
import { postWebInterfaceArchiveLike } from "@/service/web-interface-archive-like";
import { getWebInterfaceArchiveRelation } from "@/service/web-interface-archive-relation";
import { usePlayList } from "@/store/play-list";
import { useUser } from "@/store/user";

interface State {
  isThumb: boolean;
  isFav: boolean;
}

interface Action {
  setIsFav: (value: boolean) => void;
  setIsThumb: (value: boolean) => void;
  refreshIsFav: () => Promise<void>;
  /** 点赞 / 取消点赞（仅视频稿件有「点赞」，音频区无此关系）。 */
  toggleThumb: () => Promise<void>;
}

export const useMusicFavStore = create<State & Action>()((set, get) => ({
  isThumb: false,
  isFav: false,
  setIsFav: value => {
    set({ isFav: value });
  },
  setIsThumb: value => {
    set({ isThumb: value });
  },
  refreshIsFav: async () => {
    const user = useUser.getState().user;
    const playItem = usePlayList.getState().getPlayItem();

    if (!user?.isLogin || !playItem) {
      set({ isFav: false, isThumb: false });
      return;
    }

    try {
      if (playItem.type === "mv" && playItem.bvid) {
        const res = await getWebInterfaceArchiveRelation({ bvid: playItem.bvid });

        if (res.code === 0) {
          set({ isFav: Boolean(res.data.favorite), isThumb: Boolean(res.data.like) });
        } else {
          set({ isFav: false, isThumb: false });
        }
      } else if (playItem.type === "audio" && playItem.sid) {
        const res = await getCollResourceCheck({
          rid: playItem.sid,
          type: 12,
        });

        if (res.code === 0) {
          set({ isFav: Boolean(res.data), isThumb: false });
        } else {
          set({ isFav: false, isThumb: false });
        }
      } else {
        set({ isFav: false, isThumb: false });
      }
    } catch {
      set({ isFav: false, isThumb: false });
    }
  },
  toggleThumb: async () => {
    const user = useUser.getState().user;
    const playItem = usePlayList.getState().getPlayItem();

    if (!user?.isLogin || !playItem || playItem.type !== "mv" || !playItem.bvid) return;

    const current = get().isThumb;
    try {
      const res = await postWebInterfaceArchiveLike({ bvid: playItem.bvid, like: current ? 2 : 1 });
      if (res.code === 0) {
        set({ isThumb: !current });
      }
    } catch {
      // 点赞失败不抛错，保持原状态。
    }
  },
}));
