import { describe, expect, test } from "vitest";

import {
  getDefaultOutputLabel,
  isAudioOutputLost,
  isPrivateAudioOutput,
  shouldPauseForReason,
} from "@/common/utils/auto-pause/policy";

const headphones = { deviceId: "default", label: "Default - 外置耳机 (Built-in)" };
const airpods = { deviceId: "default", label: "Default - AirPods Pro" };
const speakers = { deviceId: "default", label: "Default - MacBook Pro扬声器 (Built-in)" };
const monitor = { deviceId: "default", label: "Default - PHL 278B1 (DisplayPort)" };

describe("自动暂停 · 设备判定", () => {
  test("识别私有听觉出口", () => {
    expect(isPrivateAudioOutput("外置耳机 (Built-in)")).toBe(true);
    expect(isPrivateAudioOutput("AirPods Pro")).toBe(true);
    expect(isPrivateAudioOutput("WH-1000XM5")).toBe(true);
    expect(isPrivateAudioOutput("Bluetooth Audio")).toBe(true);
    expect(isPrivateAudioOutput("MacBook Pro扬声器 (Built-in)")).toBe(false);
    expect(isPrivateAudioOutput("PHL 278B1 (DisplayPort)")).toBe(false);
  });

  test("优先取 default 项的名字", () => {
    expect(
      getDefaultOutputLabel([
        { deviceId: "abc", label: "外置耳机 (Built-in)" },
        { deviceId: "default", label: "Default - 外置耳机 (Built-in)" },
      ]),
    ).toBe("Default - 外置耳机 (Built-in)");
    expect(getDefaultOutputLabel([])).toBe("");
  });

  test("拔出耳机：默认输出回落到扬声器 → 暂停", () => {
    expect(isAudioOutputLost([headphones], [speakers])).toBe(true);
  });

  test("蓝牙断开：默认输出回落到扬声器 → 暂停", () => {
    expect(isAudioOutputLost([airpods], [speakers])).toBe(true);
  });

  test("设备列表整体消失 → 暂停", () => {
    expect(isAudioOutputLost([headphones], [])).toBe(true);
  });

  test("插入耳机不暂停", () => {
    expect(isAudioOutputLost([speakers], [headphones])).toBe(false);
  });

  test("从扬声器切到显示器不暂停（默认输出本来就不是私有设备）", () => {
    expect(isAudioOutputLost([speakers], [monitor])).toBe(false);
  });

  test("默认输出没变不暂停", () => {
    expect(isAudioOutputLost([headphones], [headphones])).toBe(false);
  });

  test("连着但没在用的耳机被拔掉不暂停（只看默认输出）", () => {
    const before = [speakers, { deviceId: "bt1", label: "AirPods Pro" }];
    const after = [speakers];

    expect(isAudioOutputLost(before, after)).toBe(false);
  });
});

describe("自动暂停 · 开关裁决", () => {
  const settings = { autoPauseOnLock: true, autoPauseOnAudioDeviceLost: false };

  test("锁屏与休眠共用锁屏开关", () => {
    expect(shouldPauseForReason("lock-screen", settings)).toBe(true);
    expect(shouldPauseForReason("suspend", settings)).toBe(true);
  });

  test("设备断开走独立开关", () => {
    expect(shouldPauseForReason("audio-device-lost", settings)).toBe(false);
    expect(shouldPauseForReason("audio-device-lost", { ...settings, autoPauseOnAudioDeviceLost: true })).toBe(true);
  });
});
