import { app, BrowserWindow } from "electron";
import isDev from "electron-is-dev";
import log from "electron-log";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { applyProxySettings } from "./ipc/app";
import { channel } from "./ipc/channel";
import { quitAndSaveTasks } from "./ipc/download";
import { registerIpcHandlers } from "./ipc/index";
import { destroyMiniPlayer } from "./mini-player";
import { injectAuthCookie } from "./network/cookie";
import { installWebRequestInterceptors } from "./network/interceptor";
import { isTrustedAppNavigation } from "./security/validation";
import { registerAllShortcuts, unregisterAllShortcuts } from "./shortcut";
import { appSettingsStore } from "./store";
import { disposePowerEvents } from "./system/power-events";
import { autoUpdater, setupAutoUpdater, stopCheckForUpdates } from "./updater";
import { getWindowIcon } from "./utils";
import { setupWindowsThumbar } from "./windows/thumbar";
import { createTray, destroyTray } from "./windows/tray"; // 菜单栏/托盘功能

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

log.initialize();

if (isDev) {
  // 为 chrome-devtools-mcp 开启远程调试端口
  app.commandLine.appendSwitch("remote-debugging-port", "");
  // 开发环境暴露完整可访问性树，便于键盘与辅助技术回归测试。
  app.commandLine.appendSwitch("force-renderer-accessibility");
  // 开发环境数据隔离
  app.setPath("userData", path.join(app.getPath("appData"), `lili-dev`));
}

let mainWindow: BrowserWindow | null = null;
let unsubscribeThumbarStatus: (() => void) | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: isDev ? "lili-dev" : "lili",
    icon: getWindowIcon(),
    show: true,
    hasShadow: true,
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    resizable: true,
    // 跟随 web 页面大小
    useContentSize: true,
    // 窗口居中
    center: true,
    // 无边框
    frame: false,
    transparent: false,
    titleBarStyle: "hidden",
    titleBarOverlay: false,
    trafficLightPosition: { x: 8, y: 8 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      webSecurity: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev,
    },
  });

  const indexPath = path.resolve(__dirname, "../dist/web/index.html");

  // 禁止通过中键/target=_blank/window.open 等方式在 Electron 中打开新窗口
  // 不影响当前窗口内的左键导航与其他鼠标按键行为
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedAppNavigation(url, indexPath)) event.preventDefault();
  });

  // 禁止 Ctrl+R / Cmd+R 刷新页面
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if ((input.control || input.meta) && input.key.toLowerCase() === "r") {
      event.preventDefault();
    }
  });

  mainWindow.loadFile(indexPath);

  // 初始化 Windows 任务栏缩略按钮，并订阅播放状态更新
  if (process.platform === "win32") {
    unsubscribeThumbarStatus = setupWindowsThumbar(mainWindow);

    // 拦截 WM_INITMENU (0x0116) 消息，阻止系统菜单
    mainWindow.hookWindowMessage(0x0116, () => {
      mainWindow?.setEnabled(false);
      setTimeout(() => {
        mainWindow?.setEnabled(true);
      }, 100);
      return true;
    });
  }

  mainWindow.on("maximize", () => {
    mainWindow?.webContents.send(channel.window.maximize);
  });

  mainWindow.on("unmaximize", () => {
    mainWindow?.webContents.send(channel.window.unmaximize);
  });

  mainWindow.on("enter-full-screen", () => {
    mainWindow?.webContents.send(channel.window.enterFullScreen);
  });

  mainWindow.on("leave-full-screen", () => {
    mainWindow?.webContents.send(channel.window.leaveFullScreen);
  });

  // 从store获取配置，判断是否关闭窗口时隐藏还是退出程序
  mainWindow.on("close", event => {
    const closeWindowOption = appSettingsStore.get("appSettings").closeWindowOption;

    if ((app as any).quitting) {
      return;
    }

    if (closeWindowOption === "hide") {
      event.preventDefault();
      mainWindow?.hide();
    } else if (closeWindowOption === "exit") {
      if ((app as any).quitting) {
        mainWindow = null;
      }
    }
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    try {
      const settings = appSettingsStore.get("appSettings");
      applyProxySettings(settings?.proxySettings).catch(error => {
        log.error("[main] Failed to apply proxy settings on startup:", error);
      });
    } catch (error) {
      log.error("[main] Failed to read proxy settings from store:", error);
    }

    createWindow();
    injectAuthCookie();

    installWebRequestInterceptors();

    registerIpcHandlers({
      getMainWindow: () => mainWindow,
      indexPath: path.resolve(__dirname, "../dist/web/index.html"),
    });

    setupAutoUpdater({
      getMainWindow: () => mainWindow,
    });

    registerAllShortcuts(() => mainWindow);

    // macOS 菜单栏图标 + Windows/Linux 托盘
    createTray({
      getMainWindow: () => mainWindow,
      onExit: () => {
        (app as any).quitting = true;
        app.quit();
      },
    });
  });

  app.on("activate", () => mainWindow?.show());

  app.on("before-quit", () => {
    (app as any).quitting = true;
  });

  app.on("will-quit", () => {
    try {
      quitAndSaveTasks();
    } catch (err) {
      log.error("[main] quitAndSaveTasks failed:", err);
    }

    try {
      destroyTray();
    } catch (err) {
      log.warn("[main] destroyTray failed:", err);
    }

    destroyMiniPlayer();

    if (unsubscribeThumbarStatus) {
      unsubscribeThumbarStatus();
      unsubscribeThumbarStatus = null;
    }

    stopCheckForUpdates();
    autoUpdater.removeAllListeners();

    disposePowerEvents();

    unregisterAllShortcuts();

    if (isDev) {
      process.exit(0);
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }

      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// 全局异常处理，避免未捕获异常导致进程异常驻留
process.on("uncaughtException", err => {
  log.error("[uncaughtException]", err);
  (app as any).quitting = true;
  app.quit();
});

process.on("unhandledRejection", reason => {
  log.error("[unhandledRejection]", reason);
});
