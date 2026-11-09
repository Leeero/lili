import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { addToast } = vi.hoisted(() => ({ addToast: vi.fn() }));

vi.mock("@heroui/react", async () => {
  const actual: any = await vi.importActual("@heroui/react");

  return { ...actual, addToast };
});

const pause = vi.fn();
const togglePlay = vi.fn();
const audio = { paused: false };
const playListState = {
  isPlaying: true,
  playId: "track-1",
  volume: 1,
  pause,
  togglePlay,
  getAudio: () => audio,
};

vi.mock("@/store/play-list", () => ({
  usePlayList: {
    getState: () => playListState,
    subscribe: () => () => undefined,
  },
}));

const settings = {
  autoPauseOnLock: true,
  autoPauseOnAudioDeviceLost: true,
  autoPauseResumeOnUnlock: false,
};

vi.mock("@/store/settings", () => ({
  useSettings: { getState: () => settings },
}));

vi.mock("@/common/utils/auto-pause/fade", () => ({
  fadeOutAndPause: async (callback: VoidFunction) => callback(),
}));

let triggerDeviceChange: () => void = () => undefined;

vi.mock("@/common/utils/auto-pause/audio-device-watch", () => ({
  watchAudioOutputs: (onLost: () => void) => {
    triggerDeviceChange = onLost;

    return { setActive: vi.fn(), stop: vi.fn() };
  },
}));

import { startAutoPauseBridge } from "@/common/utils/auto-pause";
import { useAutoPauseStore } from "@/store/auto-pause";

type Listener = (event: SystemPowerEvent) => void;

let listeners: Listener[] = [];
let stopBridge: VoidFunction = () => undefined;

const emit = (event: SystemPowerEvent) => listeners.forEach(listener => listener(event));

describe("自动暂停 · 编排", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    listeners = [];
    playListState.isPlaying = true;
    playListState.playId = "track-1";
    audio.paused = false;
    settings.autoPauseOnLock = true;
    settings.autoPauseOnAudioDeviceLost = true;
    settings.autoPauseResumeOnUnlock = false;
    useAutoPauseStore.getState().clear();

    (window as any).electron = {
      onSystemPowerEvent: (listener: Listener) => {
        listeners.push(listener);

        return () => {
          listeners = listeners.filter(item => item !== listener);
        };
      },
    };

    stopBridge = startAutoPauseBridge();
  });

  afterEach(() => {
    stopBridge();
    vi.useRealTimers();
    (window as any).electron = undefined;
  });

  test("锁屏后经过宽限期才暂停，避免快速锁屏又解开被打断", () => {
    emit({ type: "lock-screen", at: Date.now() });
    vi.advanceTimersByTime(500);
    expect(pause).not.toHaveBeenCalled();

    vi.advanceTimersByTime(800);
    expect(pause).toHaveBeenCalledTimes(1);
  });

  test("宽限期内解锁则不暂停", () => {
    emit({ type: "lock-screen", at: Date.now() });
    vi.advanceTimersByTime(300);
    emit({ type: "unlock-screen", at: Date.now() });
    vi.advanceTimersByTime(2000);

    expect(pause).not.toHaveBeenCalled();
  });

  test("关闭锁屏开关后不再暂停", () => {
    settings.autoPauseOnLock = false;
    emit({ type: "lock-screen", at: Date.now() });
    vi.advanceTimersByTime(2000);

    expect(pause).not.toHaveBeenCalled();
  });

  test("本来就没在播放时不做任何事", () => {
    playListState.isPlaying = false;
    emit({ type: "suspend", at: Date.now() });

    expect(pause).not.toHaveBeenCalled();
    expect(useAutoPauseStore.getState().lastSystemPause).toBeNull();
  });

  test("锁屏与休眠连发只暂停一次", () => {
    emit({ type: "lock-screen", at: Date.now() });
    vi.advanceTimersByTime(1200);
    emit({ type: "suspend", at: Date.now() });

    expect(pause).toHaveBeenCalledTimes(1);
  });

  test("休眠唤醒且休眠前在播放 → 立刻硬暂停并提示", () => {
    emit({ type: "resume", at: Date.now(), wasPlaying: true });

    expect(pause).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ title: "已因睡眠暂停播放" }));
  });

  test("休眠前没在播放的唤醒不打断", () => {
    emit({ type: "resume", at: Date.now(), wasPlaying: false });

    expect(pause).not.toHaveBeenCalled();
  });

  test("开启「解锁后继续播放」时唤醒直接续播而不是暂停", () => {
    settings.autoPauseResumeOnUnlock = true;
    audio.paused = true;
    emit({ type: "resume", at: Date.now(), wasPlaying: true });

    expect(pause).not.toHaveBeenCalled();
    expect(togglePlay).toHaveBeenCalledTimes(1);
  });

  test("解锁回到应用时提示本次暂停原因", () => {
    emit({ type: "lock-screen", at: Date.now() });
    vi.advanceTimersByTime(1200);
    emit({ type: "unlock-screen", at: Date.now() });

    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ title: "已因锁屏暂停播放" }));
  });

  test("设备断开命中独立开关", () => {
    triggerDeviceChange();
    expect(pause).toHaveBeenCalledTimes(1);

    pause.mockClear();
    settings.autoPauseOnAudioDeviceLost = false;
    triggerDeviceChange();
    expect(pause).not.toHaveBeenCalled();
  });
});
