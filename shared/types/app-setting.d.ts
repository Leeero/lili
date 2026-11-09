type AudioQuality = "auto" | "lossless" | "high" | "medium" | "low";
type ThemeMode = "system" | "light" | "dark";
type PageTransition = "none" | "fade" | "slide" | "scale" | "slideUp";

type ProxyType = "none" | "http" | "socks4" | "socks5";

interface ProxySettings {
  type: ProxyType;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

interface AppSettings {
  fontFamily: string;
  primaryColor: string;
  /** 自定义背景色（为空表示使用主题默认） */
  backgroundColor: string;
  borderRadius: number;
  downloadPath?: string;
  closeWindowOption: "hide" | "exit";
  autoStart: boolean;
  audioQuality: AudioQuality;
  /**
   * 「我的音乐」页里不展示的条目键（`${source}:${id}`，与 `LibraryTile.key` 同值）。
   *
   * 收藏内容未必都与音乐相关，用户可以把不想要的歌单 / 收藏夹 / 合集 / 系列
   * 从这里隐去。键的生成与分组见 `@/features/library/grouping`。
   */
  hiddenLibraryKeys: string[];
  displayMode: "card" | "list" | "compact";
  ffmpegPath?: string;
  themeMode: ThemeMode;
  pageTransition: PageTransition;
  showSearchHistory: boolean;
  proxySettings: ProxySettings;
  sideMenuCollapsed: boolean;
  sideMenuWidth: number;
  sideMenuCollectionFolded: {
    created: boolean;
    collected: boolean;
  };
  reportPlayHistory: boolean;
  /** 锁屏 / 息屏 / 休眠时自动暂停播放 */
  autoPauseOnLock: boolean;
  /** 耳机或音频输出设备断开时自动暂停播放 */
  autoPauseOnAudioDeviceLost: boolean;
  /** 解锁 / 唤醒后自动恢复播放（仅当本次暂停由系统触发且未换歌时生效） */
  autoPauseResumeOnUnlock: boolean;
  /** 本地音乐目录列表 */
  localMusicDirs: string[];
}
