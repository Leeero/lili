declare global {
  /**
   * 主进程（macOS 菜单栏 / Windows 托盘 / 任务栏缩略按钮）下发给渲染进程的统一播放命令。
   * 与 ShortcutCommand 大部分重合：ShortcutCommand 描述「快捷键设置项」，
   * PlayerCommand 描述「一条可执行的播放器动作」，两者在渲染端共用同一个分发器。
   */
  type PlayerCommand =
    | "togglePlay"
    | "prev"
    | "next"
    | "volumeUp"
    | "volumeDown"
    | "toggleMute"
    | "toggleMiniMode"
    | "favorite";

  /**
   * 主进程下发给渲染进程的系统电源事件（锁屏/解锁/休眠/唤醒）。
   * 「自动暂停」据此决定是否暂停播放；策略与开关都在渲染端，主进程只负责转发事实。
   */
  type SystemPowerEventType = "lock-screen" | "unlock-screen" | "suspend" | "resume";

  interface SystemPowerEvent {
    type: SystemPowerEventType;
    /** 事件发生时间戳（ms），用于宽限期与「最近一次系统暂停」判定 */
    at: number;
    /** 仅 resume 携带：休眠前是否正在播放（主进程侧快照） */
    wasPlaying?: boolean;
  }

  /**
   * 渲染进程推送给主进程的播放状态快照。
   * 主进程用它渲染菜单栏/托盘菜单的标签与勾选态（当前歌名、播放/暂停、静音）。
   */
  interface PlayerStatusSnapshot {
    isPlaying: boolean;
    isMuted: boolean;
    /** 0-1 */
    volume: number;
    /** 当前曲目标题（含分集标题） */
    title?: string;
    /** 当前曲目作者/UP 主 */
    artist?: string;
  }
}

export {};
