import { isAudioOutputLost, type AudioOutputDevice } from "./policy";

/** 设备变化常在数百毫秒内连发多次（蓝牙尤其如此），合并后再判断 */
const DEBOUNCE_MS = 300;
/**
 * `devicechange` 在部分平台对「只有输出设备变化」不派发，用低频轮询兜底。
 * 只在播放中轮询：暂停时轮询没有意义，也不该长期占用后台唤醒。
 */
const POLL_MS = 5000;

export interface AudioOutputWatcher {
  setActive: (active: boolean) => void;
  stop: VoidFunction;
}

const readAudioOutputs = async (): Promise<AudioOutputDevice[] | null> => {
  const mediaDevices = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;

  if (!mediaDevices?.enumerateDevices) {
    return null;
  }

  try {
    const devices = await mediaDevices.enumerateDevices();

    return devices
      .filter(device => device.kind === "audiooutput")
      .map(device => ({ deviceId: device.deviceId, label: device.label }));
  } catch {
    // 非安全上下文或权限受限：静默降级为「不检测设备」，不影响锁屏暂停
    return null;
  }
};

/**
 * 监听音频输出设备变化，在「私有出口丢失」时回调。
 *
 * 音频永远在主窗口渲染进程里播放，因此这个监听只需要主窗口启动一次；
 * 迷你窗口启动它只会产生幽灵暂停。
 */
export const watchAudioOutputs = (onLost: VoidFunction): AudioOutputWatcher => {
  const mediaDevices = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;

  if (!mediaDevices?.enumerateDevices) {
    return { setActive: () => undefined, stop: () => undefined };
  }

  let baseline: AudioOutputDevice[] | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  const compare = async () => {
    const next = await readAudioOutputs();

    if (disposed || !next) {
      return;
    }

    const previous = baseline;
    baseline = next;

    // 首次只建立基线，避免启动瞬间误判
    if (previous && isAudioOutputLost(previous, next)) {
      onLost();
    }
  };

  const scheduleCompare = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void compare();
    }, DEBOUNCE_MS);
  };

  void compare();

  mediaDevices.addEventListener("devicechange", scheduleCompare);

  return {
    setActive: active => {
      if (disposed) {
        return;
      }

      if (active && !pollTimer) {
        pollTimer = setInterval(() => void compare(), POLL_MS);
      } else if (!active && pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    },
    stop: () => {
      disposed = true;
      mediaDevices.removeEventListener("devicechange", scheduleCompare);

      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    },
  };
};
