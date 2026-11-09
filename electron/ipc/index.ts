import type { IpcHandlerProps } from "./types";

import { configureTrustedIpc } from "../security/ipc";
import { registerPowerEvents } from "../system/power-events";
import { registerAppHandlers } from "./app";
import { registerCookieIpcHandlers } from "./cookie";
import { registerDialogHandlers } from "./dialog";
import { registerDownloadHandlers } from "./download";
import { registerFontHandlers } from "./font";
import { registerLocalMusicHandlers } from "./local-music";
import { registerLyricsHandlers } from "./lyrics";
import { registerPlayerStatusIpc } from "./player-status";
import { registerShortcutHandlers } from "./shortcut";
import { registerStoreHandlers } from "./store";
import { registerWindowHandlers } from "./window";

export function registerIpcHandlers(props: IpcHandlerProps) {
  configureTrustedIpc(props.indexPath);
  registerStoreHandlers();
  registerDialogHandlers();
  registerFontHandlers();
  registerDownloadHandlers(props);
  registerAppHandlers();
  registerCookieIpcHandlers();
  registerWindowHandlers(props);
  registerShortcutHandlers(props);
  registerLyricsHandlers();
  registerLocalMusicHandlers();
  registerPlayerStatusIpc();
  registerPowerEvents(props);
}
