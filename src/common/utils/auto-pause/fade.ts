import { usePlayList } from "@/store/play-list";

const FADE_STEPS = 6;
const FADE_STEP_MS = 50;

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * 淡出后暂停，避免直接切断造成的爆音（蓝牙耳机尤其明显）。
 *
 * 注意：**不要**用 store 的 `setVolume` 做淡出。`volume` 在 play-list 的
 * `partialize` 白名单里，逐级淡出会把 0.05 / 0.1 … 写进 electron-store，
 * 用户下次启动会发现音量被压低了。这里直接改 `audio.volume`，暂停后还原。
 */
export const fadeOutAndPause = async (pause: VoidFunction, steps = FADE_STEPS) => {
  const el = usePlayList.getState().getAudio();

  if (!el || el.paused || el.muted || el.volume === 0 || el.ended) {
    pause();

    return;
  }

  const from = el.volume;

  try {
    for (let step = 1; step <= steps; step += 1) {
      el.volume = Math.max(0, from * (1 - step / steps));
      await wait(FADE_STEP_MS);
    }
  } finally {
    pause();
    // 用「当前」音量还原而不是 from：用户可能在 300ms 内自己调过音量
    el.volume = usePlayList.getState().volume;
  }
};
