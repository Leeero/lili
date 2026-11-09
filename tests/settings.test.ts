import { beforeEach, describe, expect, test, vi } from "vitest";

import { mergeImportedSettings } from "@/pages/settings/import-settings";
import { defaultAppSettings } from "@shared/settings/app-settings";
import { StoreNameMap } from "@shared/store";

const createElectronStore = (appSettings?: Partial<AppSettings>) => ({
  getStore: vi.fn(async () => (appSettings ? { appSettings } : undefined)),
  setStore: vi.fn(async () => undefined),
  clearStore: vi.fn(async () => undefined),
});

const loadSettingsStore = async (appSettings?: Partial<AppSettings>) => {
  vi.resetModules();
  const electron = createElectronStore(appSettings);
  window.electron = electron as any;
  const { useSettings } = await import("@/store/settings");
  await useSettings.persist.rehydrate();
  return { electron, useSettings };
};

describe("settings store", () => {
  beforeEach(() => {
    window.electron = undefined as any;
  });

  test("uses defaults when no persisted settings exist", async () => {
    const { useSettings } = await loadSettingsStore();
    expect(useSettings.getState().getSettings()).toEqual(defaultAppSettings);
  });

  test("rehydrates persisted settings and migrates the legacy font value", async () => {
    const { useSettings } = await loadSettingsStore({
      ...defaultAppSettings,
      fontFamily: "system-default",
      themeMode: "dark",
    });
    expect(useSettings.getState().fontFamily).toBe("system-ui");
    expect(useSettings.getState().themeMode).toBe("dark");
  });

  test("无损读取旧浅色主题、自定义主色与自定义圆角配置", async () => {
    const { useSettings } = await loadSettingsStore({
      ...defaultAppSettings,
      themeMode: "light",
      primaryColor: "#2477ff",
      backgroundColor: "#f6f7fb",
      borderRadius: 24,
    });

    expect(useSettings.getState().getSettings()).toMatchObject({
      themeMode: "light",
      primaryColor: "#2477ff",
      backgroundColor: "#f6f7fb",
      borderRadius: 24,
    });
  });

  test("persists updates through the Electron settings store", async () => {
    const { electron, useSettings } = await loadSettingsStore(defaultAppSettings);
    useSettings.getState().update({ themeMode: "dark", sideMenuWidth: 240 });
    await vi.waitFor(() => expect(electron.setStore).toHaveBeenCalled());
    expect(electron.setStore).toHaveBeenLastCalledWith(
      StoreNameMap.AppSettings,
      expect.objectContaining({
        appSettings: expect.objectContaining({ themeMode: "dark", sideMenuWidth: 240 }),
      }),
    );
  });

  test("auto-pause defaults match the approved product decision", () => {
    expect(defaultAppSettings.autoPauseOnLock).toBe(true);
    expect(defaultAppSettings.autoPauseOnAudioDeviceLost).toBe(true);
    expect(defaultAppSettings.autoPauseResumeOnUnlock).toBe(false);
  });

  test("auto-pause switches are part of the persisted payload", async () => {
    const { electron, useSettings } = await loadSettingsStore(defaultAppSettings);
    useSettings.getState().update({ autoPauseOnLock: false, autoPauseResumeOnUnlock: true });
    await vi.waitFor(() => expect(electron.setStore).toHaveBeenCalled());
    expect(electron.setStore).toHaveBeenLastCalledWith(
      StoreNameMap.AppSettings,
      expect.objectContaining({
        appSettings: expect.objectContaining({
          autoPauseOnLock: false,
          autoPauseOnAudioDeviceLost: true,
          autoPauseResumeOnUnlock: true,
        }),
      }),
    );
  });

  test("reset restores and persists every default setting", async () => {
    const { electron, useSettings } = await loadSettingsStore({
      ...defaultAppSettings,
      primaryColor: "#ff0000",
      sideMenuCollapsed: true,
    });
    useSettings.getState().reset();
    expect(useSettings.getState().getSettings()).toEqual(defaultAppSettings);
    await vi.waitFor(() =>
      expect(electron.setStore).toHaveBeenLastCalledWith(StoreNameMap.AppSettings, {
        appSettings: defaultAppSettings,
      }),
    );
  });
});

describe("settings import", () => {
  test("keeps current values when an older export omits newer fields", () => {
    const current = {
      ...defaultAppSettings,
      localMusicDirs: ["/music"],
      reportPlayHistory: false,
    };

    expect(mergeImportedSettings(current, { themeMode: "dark" })).toMatchObject({
      themeMode: "dark",
      localMusicDirs: ["/music"],
      reportPlayHistory: false,
    });
  });

  test("ignores unknown fields and rejects non-object imports", () => {
    const merged = mergeImportedSettings(defaultAppSettings, { unknownSetting: true });
    expect(merged).toEqual(defaultAppSettings);
    expect(merged).not.toHaveProperty("unknownSetting");
    expect(() => mergeImportedSettings(defaultAppSettings, null)).toThrow();
  });
});
