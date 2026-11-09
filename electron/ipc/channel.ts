export const channel = {
  store: {
    get: "store:get",
    set: "store:set",
    clear: "store:clear",
  },
  dialog: {
    selectDirectory: "dialog:select-directory",
    showFileInFolder: "dialog:show-file-in-folder",
    selectFile: "dialog:select-file",
    openDirectory: "dialog:open-directory",
    openExternal: "dialog:open-external",
  },
  font: {
    getFonts: "font:get-fonts",
  },
  download: {
    getList: "download:get-list",
    add: "download:add",
    addList: "download:add-list",
    pause: "download:pause",
    resume: "download:resume",
    cancel: "download:cancel",
    retry: "download:retry",
    sync: "download:sync",
    clear: "download:clear",
  },
  lyrics: {
    searchNeteaseSongs: "lyrics:netease-search",
    getNeteaseLyrics: "lyrics:netease-lyrics",
    searchLrclib: "lyrics:lrclib-search",
  },
  router: {
    navigate: "router:navigate",
  },
  player: {
    // 渲染端 -> 主进程：播放状态快照（PlayerStatusSnapshot），供菜单栏/托盘/任务栏展示
    state: "player:state",
    // 主进程 -> 渲染端：统一播放命令（PlayerCommand）
    command: "player:command",
    // 主进程 -> 渲染端：系统电源事件（SystemPowerEvent），驱动自动暂停
    systemEvent: "player:system-event",
  },
  shortcut: {
    triggered: "shortcut:triggered",
    register: "shortcut:register",
    unregister: "shortcut:unregister",
    registerAll: "shortcut:register-all",
    unregisterAll: "shortcut:unregister-all",
  },
  app: {
    getVersion: "app:get-version",
    checkUpdate: "app:check-update",
    onUpdateAvailable: "app:on-update-available",
    downloadUpdate: "app:download-update",
    updateMessage: "app:update-message",
    quitAndInstall: "app:quit-and-install",
    isDev: "app:is-dev",
    setProxySettings: "app:set-proxy-settings",
  },
  cookie: {
    get: "cookie:get",
    set: "cookie:set",
  },
  localMusic: {
    scan: "local-music:scan",
    deleteFile: "local-music:delete-file",
  },
  window: {
    toggleMini: "window:toggle-mini",
    minimize: "window:minimize",
    toggleMaximize: "window:toggle-maximize",
    close: "window:close",
    maximize: "window:maximize",
    unmaximize: "window:unmaximize",
    isMaximized: "window:is-maximized",
    enterFullScreen: "window:enter-full-screen",
    leaveFullScreen: "window:leave-full-screen",
    isFullScreen: "window:is-full-screen",
    toggleDevTools: "window:toggle-dev-tools",
  },
};
