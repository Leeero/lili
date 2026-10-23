import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";

import { Card, CardBody } from "@heroui/react";
import {
  RiDownloadCloud2Line,
  RiInformationLine,
  RiKeyboardLine,
  RiMusic2Line,
  RiSettings3Line,
  RiToolsLine,
} from "@remixicon/react";
import { useShallow } from "zustand/react/shallow";

import ScrollContainer from "@/components/scroll-container";
import { useAppUpdateStore } from "@/store/app-update";
import { useSettings } from "@/store/settings";

import LibrarySettings from "./library-settings";
import ProxySettings from "./proxy-settings";
import ShortcutSettingsPage from "./shortcut-settings";
import { SystemSettingsTab } from "./system-settings";

const useSystemSettingsForm = () => {
  const [appVersion, setAppVersion] = useState<string>("");
  const {
    fontFamily,
    primaryColor,
    backgroundColor,
    borderRadius,
    downloadPath,
    closeWindowOption,
    autoStart,
    audioQuality,
    hiddenLibraryKeys,
    displayMode,
    ffmpegPath,
    themeMode,
    pageTransition,
    showSearchHistory,
    proxySettings,
    reportPlayHistory,
  } = useSettings(
    useShallow(s => ({
      fontFamily: s.fontFamily,
      primaryColor: s.primaryColor,
      backgroundColor: s.backgroundColor,
      borderRadius: s.borderRadius,
      downloadPath: s.downloadPath,
      closeWindowOption: s.closeWindowOption,
      autoStart: s.autoStart,
      audioQuality: s.audioQuality,
      hiddenLibraryKeys: s.hiddenLibraryKeys,
      displayMode: s.displayMode,
      ffmpegPath: s.ffmpegPath,
      themeMode: s.themeMode,
      pageTransition: s.pageTransition,
      showSearchHistory: s.showSearchHistory,
      proxySettings: s.proxySettings,
      reportPlayHistory: s.reportPlayHistory,
    })),
  );
  const updateSettings = useSettings(s => s.update);
  const { isUpdateAvailable, latestVersion } = useAppUpdateStore(
    useShallow(s => ({
      isUpdateAvailable: s.isUpdateAvailable ?? false,
      latestVersion: s.latestVersion,
    })),
  );

  const { control, watch, setValue, reset } = useForm<AppSettings>({
    defaultValues: {
      fontFamily,
      primaryColor,
      backgroundColor,
      borderRadius,
      downloadPath,
      closeWindowOption,
      autoStart,
      audioQuality,
      hiddenLibraryKeys,
      displayMode,
      ffmpegPath,
      themeMode,
      pageTransition,
      showSearchHistory,
      proxySettings: proxySettings ?? {
        type: "none",
        host: "",
        port: undefined,
        username: "",
        password: "",
      },
      reportPlayHistory,
    },
  });

  useEffect(() => {
    const subscription = watch((values, { name }) => {
      if (!name) return;
      const patch = { [name]: (values as any)[name] } as Partial<AppSettings>;
      updateSettings(patch);
      if (name === "proxySettings" && values.proxySettings && window.electron?.setProxySettings) {
        window.electron.setProxySettings(values.proxySettings as ProxySettings);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, updateSettings]);

  // 导入配置或其它页面修改设置后，同步表单，而不是依赖整页刷新。
  useEffect(() => {
    reset({
      ...useSettings.getState().getSettings(),
      proxySettings: useSettings.getState().proxySettings ?? {
        type: "none",
        host: "",
        port: undefined,
        username: "",
        password: "",
      },
    });
  }, [
    audioQuality,
    autoStart,
    backgroundColor,
    borderRadius,
    closeWindowOption,
    displayMode,
    downloadPath,
    ffmpegPath,
    fontFamily,
    hiddenLibraryKeys,
    pageTransition,
    primaryColor,
    proxySettings,
    reportPlayHistory,
    reset,
    showSearchHistory,
    themeMode,
  ]);

  useEffect(() => {
    window.electron.getAppVersion().then(v => setAppVersion(v));
  }, []);

  return {
    appVersion,
    audioQuality,
    control,
    isUpdateAvailable,
    latestVersion,
    setValue,
  };
};

const SETTINGS_TABS = ["general", "playback", "download", "shortcut", "advanced", "about"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

const SETTINGS_NAV_ITEMS = [
  { key: "general", label: "常规", icon: RiSettings3Line },
  { key: "playback", label: "播放", icon: RiMusic2Line },
  { key: "download", label: "下载与本地", icon: RiDownloadCloud2Line },
  { key: "shortcut", label: "快捷键", icon: RiKeyboardLine },
  { key: "advanced", label: "高级", icon: RiToolsLine },
  { key: "about", label: "关于", icon: RiInformationLine },
] as const satisfies ReadonlyArray<{ key: SettingsTab; label: string; icon: React.ComponentType<{ size?: number }> }>;

const SettingsDetails = ({ selectedTab }: { selectedTab: SettingsTab }) => {
  const system = useSystemSettingsForm();
  const navigate = useNavigate();

  const renderContent = () => {
    switch (selectedTab) {
      case "general":
        return (
          <Card shadow="none" className="settings4188-card border-divider bg-content1/70 border">
            <CardBody className="gap-8 p-6">
              <SystemSettingsTab {...system} section="general" />
              <div className="border-divider border-t pt-6">
                <LibrarySettings control={system.control} />
              </div>
            </CardBody>
          </Card>
        );
      case "playback":
        return (
          <Card shadow="none" className="settings4188-card border-divider bg-content1/70 border">
            <CardBody className="p-6">
              <SystemSettingsTab {...system} section="playback" />
            </CardBody>
          </Card>
        );
      case "download":
        return (
          <Card shadow="none" className="settings4188-card border-divider bg-content1/70 border">
            <CardBody className="p-6">
              <SystemSettingsTab {...system} section="download" />
              <p className="text-default-500 border-divider mt-6 border-t pt-5 text-sm">
                本地音乐目录仍在“本地音乐”页面中管理，已有目录配置保持不变。
              </p>
            </CardBody>
          </Card>
        );
      case "shortcut":
        return (
          <Card shadow="none" className="settings4188-card border-divider bg-content1/70 border">
            <CardBody className="p-6">
              <ShortcutSettingsPage />
            </CardBody>
          </Card>
        );
      case "advanced":
        return (
          <Card shadow="none" className="settings4188-card border-divider bg-content1/70 border">
            <CardBody className="gap-5 p-6">
              <div>
                <h2>网络代理</h2>
                <p className="text-default-500 mt-1 text-sm">为应用访问在线服务配置代理连接</p>
              </div>
              <ProxySettings control={system.control} />
            </CardBody>
          </Card>
        );
      case "about":
        return (
          <Card shadow="none" className="settings4188-card border-divider bg-content1/70 border">
            <CardBody className="p-6">
              <SystemSettingsTab {...system} section="about" />
            </CardBody>
          </Card>
        );
    }
  };

  return (
    <ScrollContainer enableBackToTop className="h-full w-full">
      <div className="settings4188-page">
        <h1 className="sr-only">设置</h1>
        <div className="flex w-full items-start max-md:flex-col">
          <nav
            aria-label="设置分类"
            className="settings4188-nav sticky top-4 flex w-44 shrink-0 flex-col gap-1 max-md:static max-md:w-full max-md:flex-row max-md:overflow-x-auto max-md:pb-2"
          >
            {SETTINGS_NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isSelected = selectedTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-current={isSelected ? "page" : undefined}
                  className={`settings4188-nav-item flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors max-md:w-auto max-md:min-w-fit ${
                    isSelected
                      ? "bg-default-200 text-foreground font-medium"
                      : "text-default-500 hover:bg-default-100 hover:text-foreground"
                  }`}
                  onClick={() => navigate(`/settings?tab=${item.key}`)}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <main
            key={selectedTab}
            className="settings4188-content min-w-0 flex-1 px-7 max-md:w-full max-md:px-0 max-md:pt-5"
          >
            {renderContent()}
          </main>
        </div>
      </div>
    </ScrollContainer>
  );
};

const SettingsPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tabParam = params.get("tab");
  const selectedTab = SETTINGS_TABS.includes(tabParam as SettingsTab) ? (tabParam as SettingsTab) : "general";

  useEffect(() => {
    if (tabParam !== selectedTab) navigate(`/settings?tab=${selectedTab}`, { replace: true });
  }, [navigate, selectedTab, tabParam]);

  return <SettingsDetails selectedTab={selectedTab} />;
};

export default SettingsPage;
