import type { BrowserWindow } from "electron";

import { powerMonitor } from "electron";
import log from "electron-log";

import { channel } from "../ipc/channel";
import { getPlayerStatus } from "../ipc/player-status";

type GetMainWindow = () => BrowserWindow | null;

interface PowerEventsOptions {
  getMainWindow: GetMainWindow;
}

/**
 * 系统电源事件转发。
 *
 * 主进程只负责「报告事实」，是否暂停由渲染端结合设置项决定 ——
 * 这样开关切换立即生效，不必把用户偏好再同步一份到主进程。
 *
 * 关键点：休眠场景**不能**指望休眠前暂停。休眠期间渲染进程会被冻结，
 * 暂停指令执行不了；所以 suspend 时只记录「休眠前是否在播放」，
 * 由 resume 事件把它带回渲染端，让渲染端在唤醒后拦截，避免合盖再打开就突然出声。
 */

let wasPlayingBeforeSuspend = false;
let registered = false;
/** 保存自己的监听引用：退出时只摘自己，不用 removeAllListeners 误伤 Electron 内部监听 */
let detach: VoidFunction | null = null;

const sendSystemEvent = (getMainWindow: GetMainWindow, payload: SystemPowerEvent) => {
  const win = getMainWindow();

  if (!win || win.isDestroyed() || win.webContents.isDestroyed()) {
    return;
  }

  try {
    win.webContents.send(channel.player.systemEvent, payload);
  } catch (error) {
    log.error("[power-events] 转发系统电源事件失败:", error);
  }
};

export const registerPowerEvents = ({ getMainWindow }: PowerEventsOptions) => {
  // app ready 后才能使用 powerMonitor；重复注册会把同一事件派发两次
  if (registered) {
    return;
  }
  registered = true;

  const onLockScreen = () => {
    sendSystemEvent(getMainWindow, { type: "lock-screen", at: Date.now() });
  };

  const onUnlockScreen = () => {
    sendSystemEvent(getMainWindow, { type: "unlock-screen", at: Date.now() });
  };

  const onSuspend = () => {
    wasPlayingBeforeSuspend = getPlayerStatus().isPlaying;
    sendSystemEvent(getMainWindow, { type: "suspend", at: Date.now() });
  };

  const onResume = () => {
    const wasPlaying = wasPlayingBeforeSuspend;
    wasPlayingBeforeSuspend = false;
    sendSystemEvent(getMainWindow, { type: "resume", at: Date.now(), wasPlaying });
  };

  powerMonitor.on("lock-screen", onLockScreen);
  powerMonitor.on("unlock-screen", onUnlockScreen);
  powerMonitor.on("suspend", onSuspend);
  powerMonitor.on("resume", onResume);

  detach = () => {
    powerMonitor.removeListener("lock-screen", onLockScreen);
    powerMonitor.removeListener("unlock-screen", onUnlockScreen);
    powerMonitor.removeListener("suspend", onSuspend);
    powerMonitor.removeListener("resume", onResume);
  };
};

/** 退出时摘掉监听，避免热重载或重复初始化后事件被派发多次 */
export const disposePowerEvents = () => {
  if (!registered) {
    return;
  }

  detach?.();
  detach = null;
  wasPlayingBeforeSuspend = false;
  registered = false;
};
