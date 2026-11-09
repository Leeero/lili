import { addToast } from "@heroui/react";
import log from "electron-log/renderer";

import { useAutoPauseStore } from "@/store/auto-pause";
import { usePlayList } from "@/store/play-list";
import { useSettings } from "@/store/settings";

import { watchAudioOutputs } from "./audio-device-watch";
import { fadeOutAndPause } from "./fade";
import { shouldPauseForReason, type AutoPauseReason } from "./policy";

/** 快速锁屏又立刻解开时不打断播放 */
const LOCK_GRACE_MS = 1200;
/** 一次离开常连发 lock-screen + suspend，窗口内合并成一次 */
const DUPLICATE_WINDOW_MS = 300;
/** 回到应用后超过这个时间就不再提示/续播 */
const RETURN_HINT_WINDOW_MS = 5 * 60_000;

const noop = () => undefined;

const isMiniWindow = () => window.location.hash.includes("mini-player");

/**
 * 「自动暂停」编排器。
 *
 * 三层分工：主进程只报告系统事件（锁屏/休眠/设备），本模块按设置裁决，
 * 真正暂停复用 `usePlayList.pause()`，因此托盘菜单、mediaSession、播放栏
 * 都会沿既有状态链路自动同步，不需要新增状态通道。
 *
 * 只在主窗口启动：音频永远在主窗口渲染进程里，迷你窗口再挂一份只会产生幽灵暂停。
 */
export function startAutoPauseBridge(): VoidFunction {
  if (typeof window === "undefined" || isMiniWindow()) {
    return noop;
  }

  if (!window.electron?.onSystemPowerEvent) {
    return noop;
  }

  let lockTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPauseAt = 0;
  let disposed = false;

  const clearLockTimer = () => {
    if (lockTimer) {
      clearTimeout(lockTimer);
      lockTimer = null;
    }
  };

  const pauseNow = (reason: AutoPauseReason): boolean => {
    if (disposed) {
      return false;
    }

    if (!shouldPauseForReason(reason, useSettings.getState())) {
      return false;
    }

    if (Date.now() - lastPauseAt < DUPLICATE_WINDOW_MS) {
      return false;
    }

    const { isPlaying, playId } = usePlayList.getState();

    // 已暂停 / 本来就没在播：什么都不做，也不要留下「系统暂停」记录去打扰用户
    if (!isPlaying) {
      return false;
    }

    lastPauseAt = Date.now();
    useAutoPauseStore.getState().markSystemPause({ reason, at: lastPauseAt, playId });
    log.info(`[auto-pause] pause by ${reason}`);

    void fadeOutAndPause(() => usePlayList.getState().pause());

    return true;
  };

  const resumeIfPaused = () => {
    const { getAudio, togglePlay } = usePlayList.getState();

    if (getAudio().paused) {
      void togglePlay();
    }
  };

  const handleReturn = () => {
    const last = useAutoPauseStore.getState().lastSystemPause;

    if (!last) {
      return;
    }

    useAutoPauseStore.getState().clear();

    if (last.reason !== "lock-screen") {
      return;
    }

    if (Date.now() - last.at > RETURN_HINT_WINDOW_MS) {
      return;
    }

    // 离开期间用户已经切歌（例如用媒体键），不去干扰当前播放
    if (usePlayList.getState().playId !== last.playId) {
      return;
    }

    if (useSettings.getState().autoPauseResumeOnUnlock) {
      resumeIfPaused();

      return;
    }

    addToast({ title: "已因锁屏暂停播放", description: "点播放可继续" });
  };

  /**
   * 休眠只能做成「唤醒时拦截」：休眠期间渲染进程被冻结，暂停指令执行不了。
   * 主进程把休眠前是否在播放在 resume 事件里带回来，这里负责不让它出声。
   */
  const handleResume = (wasPlaying: boolean) => {
    if (!wasPlaying) {
      return;
    }

    const settings = useSettings.getState();

    if (!settings.autoPauseOnLock) {
      return;
    }

    if (settings.autoPauseResumeOnUnlock) {
      useAutoPauseStore.getState().clear();
      resumeIfPaused();

      return;
    }

    const { isPlaying, getAudio, pause } = usePlayList.getState();

    // 系统可能已经恢复出声，这里必须硬暂停，来不及做淡出
    if (!isPlaying && getAudio().paused) {
      return;
    }

    pause();
    lastPauseAt = Date.now();
    useAutoPauseStore.getState().clear();
    log.info("[auto-pause] pause on resume");
    addToast({ title: "已因睡眠暂停播放", description: "点播放可继续" });
  };

  const handleSystemEvent = (event: SystemPowerEvent) => {
    if (disposed || !event) {
      return;
    }

    switch (event.type) {
      case "lock-screen": {
        clearLockTimer();
        lockTimer = setTimeout(() => {
          lockTimer = null;
          pauseNow("lock-screen");
        }, LOCK_GRACE_MS);
        break;
      }
      case "unlock-screen": {
        clearLockTimer();
        handleReturn();
        break;
      }
      case "suspend": {
        // 尽力而为：冻结前能执行就执行，真正的拦截在 resume
        pauseNow("suspend");
        break;
      }
      case "resume": {
        handleResume(event.wasPlaying === true);
        break;
      }
      default: {
        break;
      }
    }
  };

  const watcher = watchAudioOutputs(() => {
    pauseNow("audio-device-lost");
  });

  const unsubscribePlayList = usePlayList.subscribe((state, prevState) => {
    if (state.isPlaying === prevState.isPlaying) {
      return;
    }

    watcher.setActive(state.isPlaying);

    // 任何一次「开始播放」（用户手动或自动续播）都说明系统暂停的上下文结束了
    if (!prevState.isPlaying && state.isPlaying) {
      useAutoPauseStore.getState().clear();
    }
  });

  watcher.setActive(usePlayList.getState().isPlaying);

  const removePowerListener = window.electron.onSystemPowerEvent(handleSystemEvent);

  return () => {
    disposed = true;
    removePowerListener();
    clearLockTimer();
    unsubscribePlayList();
    watcher.stop();
  };
}
