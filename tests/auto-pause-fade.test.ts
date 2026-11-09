import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const audio = {
  paused: false,
  muted: false,
  ended: false,
  volume: 1,
};

const storeState = { volume: 0.8, getAudio: () => audio };

vi.mock("@/store/play-list", () => ({
  usePlayList: { getState: () => storeState },
}));

import { fadeOutAndPause } from "@/common/utils/auto-pause/fade";

describe("自动暂停 · 淡出", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    audio.paused = false;
    audio.muted = false;
    audio.ended = false;
    audio.volume = 1;
    storeState.volume = 0.8;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("逐级降到 0 后暂停，并把音量还原成用户设定值", async () => {
    const pause = vi.fn();
    const done = fadeOutAndPause(pause);

    await vi.advanceTimersByTimeAsync(400);
    await done;

    expect(pause).toHaveBeenCalledTimes(1);
    expect(audio.volume).toBe(0.8);
  });

  test("已暂停时不做淡出，直接调用暂停（幂等）", async () => {
    audio.paused = true;
    const pause = vi.fn();

    await fadeOutAndPause(pause);

    expect(pause).toHaveBeenCalledTimes(1);
    expect(audio.volume).toBe(1);
  });

  test("静音时不做淡出", async () => {
    audio.muted = true;
    const pause = vi.fn();

    await fadeOutAndPause(pause);

    expect(pause).toHaveBeenCalledTimes(1);
  });

  test("淡出期间用户改了音量，结束后按新音量还原而不是旧值", async () => {
    const pause = vi.fn();
    const done = fadeOutAndPause(pause);

    await vi.advanceTimersByTimeAsync(100);
    storeState.volume = 0.35;
    await vi.advanceTimersByTimeAsync(400);

    expect(audio.volume).toBe(0.35);
    await done;
  });
});
