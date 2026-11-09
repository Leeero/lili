/**
 * 自动暂停的纯策略层：只做判断，不做副作用，便于单测。
 *
 * 设计原则：**宁可漏判，也不要在用户不想停的时候停**。
 * 因此「设备断开」只认一个信号——默认输出从私有设备（耳机/蓝牙）变回公开设备（扬声器），
 * 而不是「设备列表少了点什么」：连着但没用的耳机被拔掉，不该打断播放。
 */

export type AutoPauseReason = "lock-screen" | "suspend" | "audio-device-lost";

export interface AudioOutputDevice {
  deviceId: string;
  label: string;
}

export type AutoPauseSettings = Pick<AppSettings, "autoPauseOnLock" | "autoPauseOnAudioDeviceLost">;

/** 私有听觉出口：命中即认为「声音只给用户一个人听」，断开就有漏音风险 */
const PRIVATE_OUTPUT_KEYWORDS = [
  "耳机",
  "耳麦",
  "headphone",
  "headset",
  "earbud",
  "airpods",
  "buds",
  "beats",
  "wh-",
  "wf-",
  "bluetooth",
  "蓝牙",
  "usb audio",
  "dac",
];

const PRIVATE_OUTPUT_PATTERN = new RegExp(PRIVATE_OUTPUT_KEYWORDS.join("|"), "i");

export const isPrivateAudioOutput = (label: string) => PRIVATE_OUTPUT_PATTERN.test(label);

/**
 * 取默认输出设备的可读名。
 *
 * Chromium 保证有 `deviceId === "default"` 这一项，且它的 label 形如
 * `Default - 外置耳机 (Built-in)`，直接带上底层设备名 —— 实测 Electron 38 可见。
 */
export const getDefaultOutputLabel = (devices: readonly AudioOutputDevice[]): string => {
  const entry = devices.find(device => device.deviceId === "default") ?? devices[0];

  return entry?.label ?? "";
};

/**
 * 默认输出是否从「私有设备」掉到了「公开设备」（拔耳机 / 蓝牙断开）。
 * 默认输出为空（设备列表整体消失）也按断开处理。
 */
export const isAudioOutputLost = (
  before: readonly AudioOutputDevice[],
  after: readonly AudioOutputDevice[],
): boolean => {
  if (!isPrivateAudioOutput(getDefaultOutputLabel(before))) {
    return false;
  }

  const afterLabel = getDefaultOutputLabel(after);

  return afterLabel === "" || !isPrivateAudioOutput(afterLabel);
};

/** 开关裁决：锁屏与休眠共用同一个开关（用户心智都是「人离开了」） */
export const shouldPauseForReason = (reason: AutoPauseReason, settings: AutoPauseSettings): boolean =>
  reason === "audio-device-lost" ? settings.autoPauseOnAudioDeviceLost : settings.autoPauseOnLock;
