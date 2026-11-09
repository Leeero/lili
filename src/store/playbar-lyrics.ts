import { create } from "zustand";

interface State {
  open: boolean;
}

interface Action {
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

/**
 * 播放栏迷你歌词浮层的开合状态。
 *
 * 「词」按钮（右段）与浮层（挂在播放栏内层、绝对定位于播放栏上方）分属不同子树，
 * 用一份模块级 store 共享开关，避免为一条布尔值在 PlayBar 里来回传 props。
 */
export const usePlaybarLyrics = create<State & Action>()(set => ({
  open: false,
  setOpen: open => set({ open }),
  toggle: () => set(state => ({ open: !state.open })),
}));
