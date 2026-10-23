import React from "react";

import MusicPlayControl from "@/components/music-play-control";

/**
 * 播放栏中段：仅传输控件（上一首 / 播放 / 下一首）。
 *
 * 进度条已移到播放栏顶部（见 `playbar/index.tsx` 的 `shell4188-player-progress`），
 * 中段不再承载进度，只居中传输控件。
 */
const Control = () => (
  <div className="flex w-full min-w-0 items-center justify-center">
    <MusicPlayControl />
  </div>
);

export default Control;
