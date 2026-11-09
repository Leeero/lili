import { Suspense, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useHref, useNavigate, useRoutes } from "react-router";

import { HeroUIProvider, ToastProvider } from "@heroui/react";
import log from "electron-log/renderer";
import moment from "moment";

import { startAutoPauseBridge } from "./common/utils/auto-pause";
import { getCookitFromBSite } from "./common/utils/cookie";
import { isPlayerCommand, runPlayerCommand } from "./common/utils/player-command";
import { startPlayerStatusBridge } from "./common/utils/player-status-bridge";
import { mapKeyToElectronAccelerator } from "./common/utils/shortcut";
import Fallback from "./components/error-fallback";
import Theme from "./components/theme";
import routes from "./routes";
import { useAppUpdateStore } from "./store/app-update";
import { usePlayProgress } from "./store/play-progress";
import { useShortcutSettings } from "./store/shortcuts";

import "moment/locale/zh-cn";

import "overlayscrollbars/overlayscrollbars.css";
import "./app.css";

moment.locale("zh-cn");

/** 快捷键命令里混有非播放器动作（如 toggleLyrics），先收敛再分发 */
const dispatchCommand = (command: ShortcutCommand | PlayerCommand) => {
  if (isPlayerCommand(command)) {
    runPlayerCommand(command);
  }
};

export function App() {
  const routeElement = useRoutes(routes);
  const navigate = useNavigate();
  const setUpdate = useAppUpdateStore(s => s.setUpdate);

  useEffect(() => {
    getCookitFromBSite();
  }, []);

  useEffect(() => {
    if (window.electron && window.electron.navigate) {
      const removeListener = window.electron.navigate(path => navigate(path));
      return removeListener;
    }
  }, [navigate]);

  // 订阅来自主进程的播放器命令（macOS 菜单栏 / Windows 托盘 / 任务栏缩略按钮触发）
  useEffect(() => {
    if (window.electron && window.electron.onPlayerCommand) {
      const removeListener = window.electron.onPlayerCommand(cmd => dispatchCommand(cmd));
      return removeListener;
    }
  }, []);

  // 订阅来自主进程的全局快捷键命令（与播放器命令共用同一分发器）
  useEffect(() => {
    if (window.electron && window.electron.onShortcutCommand) {
      return window.electron.onShortcutCommand(cmd => dispatchCommand(cmd));
    }
  }, []);

  // 把播放状态快照推送给主进程，驱动菜单栏/托盘菜单与任务栏按钮
  useEffect(() => {
    return startPlayerStatusBridge();
  }, []);

  // 锁屏 / 休眠 / 耳机断开时自动暂停
  useEffect(() => {
    return startAutoPauseBridge();
  }, []);

  // 监听应用内快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略在输入框中的按键
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const shortcut = mapKeyToElectronAccelerator(e);
      if (!shortcut) return;

      const { shortcuts } = useShortcutSettings.getState();
      const matched = shortcuts.find(s => s.shortcut === shortcut);

      if (matched) {
        e.preventDefault();
        dispatchCommand(matched.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const removeListener = window.electron.onUpdateAvailable(updateInfo => {
      setUpdate({
        isUpdateAvailable: true,
        latestVersion: updateInfo.latestVersion,
        releaseNotes: updateInfo.releaseNotes,
      });
    });

    return () => {
      removeListener();
    };
  }, [setUpdate]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (usePlayProgress.getState().currentTime) {
        usePlayProgress.getState().saveCurrentTime();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // 清理函数
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <HeroUIProvider navigate={navigate} useHref={useHref} locale="zh-CN">
      <ToastProvider
        placement="bottom-right"
        toastOffset={90}
        maxVisibleToasts={3}
        toastProps={{ timeout: 2000, color: "primary" }}
        regionProps={{
          classNames: {
            base: "z-[99999]",
          },
        }}
      />
      <Theme>
        {/*
          应用级错误边界：壳层自己崩了才落到这里，兜底是**整页**的错误说明
          （`反馈` / `回到首页`）。页面级的错误由 `layout` 里那个只包住
          `<Outlet />` 的边界接住，两者不要合并 —— 合并就会把侧栏、播放栏与
          登录弹窗宿主一起卸载掉（2026-10-10 的事故形态）。
          这里的 `resetErrorBoundary` 只在用户点「回到首页」时触发。
        */}
        <ErrorBoundary
          FallbackComponent={Fallback}
          onError={(error, info) => {
            log.error("[ErrorBoundary:app]", error, info);
          }}
        >
          <Suspense
            fallback={
              <div className="flex h-full min-h-40 items-center justify-center" role="status" aria-label="页面加载中">
                <span className="text-default-500 text-sm">正在加载…</span>
              </div>
            }
          >
            {routeElement}
          </Suspense>
        </ErrorBoundary>
      </Theme>
    </HeroUIProvider>
  );
}
