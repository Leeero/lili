import { create } from "zustand";

import type { AutoPauseReason } from "@/common/utils/auto-pause/policy";

export interface SystemPauseRecord {
  reason: AutoPauseReason;
  at: number;
  playId?: string;
}

interface AutoPauseState {
  /** 最近一次「由系统触发」的暂停；手动播放时会清空，用于解锁后提示/续播 */
  lastSystemPause: SystemPauseRecord | null;
  markSystemPause: (record: SystemPauseRecord) => void;
  clear: () => void;
}

/**
 * 只在内存里记录，不持久化：跨启动恢复播放属于另一件事，
 * 且「上次是锁屏暂停的」在重启后既不准确也没有意义。
 */
export const useAutoPauseStore = create<AutoPauseState>()(set => ({
  lastSystemPause: null,
  markSystemPause: record => set({ lastSystemPause: record }),
  clear: () => set({ lastSystemPause: null }),
}));
