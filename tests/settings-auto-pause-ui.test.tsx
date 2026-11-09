import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useForm } from "react-hook-form";

import { afterEach, describe, expect, test } from "vitest";

import { SystemSettingsTab } from "@/pages/settings/system-settings";
import { defaultAppSettings } from "@shared/settings/app-settings";

/**
 * 「自动暂停」设置分组的接线测试。
 *
 * 判定策略与编排在 `auto-pause-policy` / `auto-pause-bridge` 里测；这里只钉住
 * 三件事：三行都存在、开关绑定到正确字段、「解锁后继续播放」跟着锁屏开关联动显示。
 * 无头浏览器截图在本机沙箱里会被资源守卫杀掉，用渲染断言替代目视。
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const noop = () => undefined;

const renderSection = async () => {
  let setLock: (value: boolean) => void = noop;

  const Harness = () => {
    const { control, setValue } = useForm<AppSettings>({ defaultValues: defaultAppSettings });

    useEffect(() => {
      setLock = (value: boolean) => setValue("autoPauseOnLock", value);
    }, [setValue]);

    return (
      <SystemSettingsTab
        appVersion="2.0.0"
        audioQuality="auto"
        control={control}
        isUpdateAvailable={false}
        section="playback"
        setValue={setValue}
      />
    );
  };

  const container = document.createElement("div");

  document.body.append(container);

  const root = createRoot(container);

  mounted.push({ root, container });

  await act(async () => root.render(<Harness />));

  return { container, setLock: (value: boolean) => setLock(value) };
};

afterEach(async () => {
  await act(async () => {
    mounted.splice(0).forEach(({ root, container }) => {
      root.unmount();
      container.remove();
    });
  });
});

describe("设置页 · 自动暂停分组", () => {
  test("播放标签下渲染三行自动暂停设置", async () => {
    const { container } = await renderSection();
    const text = container.textContent ?? "";

    expect(text).toContain("锁屏或休眠时暂停");
    expect(text).toContain("耳机或音频输出设备断开时暂停");
    expect(text).toContain("解锁后自动继续播放");
  });

  test("关闭锁屏暂停后，解锁续播这一行不再渲染", async () => {
    const { container, setLock } = await renderSection();

    await act(async () => setLock(false));

    expect(container.textContent ?? "").not.toContain("解锁后自动继续播放");
    expect(container.textContent ?? "").toContain("耳机或音频输出设备断开时暂停");
  });
});
