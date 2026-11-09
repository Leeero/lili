import MusicPlayProgress from "@/components/music-play-progress";
import { LyricsButton, MiniLyricsPanel } from "@/components/playbar-lyrics";
import { useNowPlaying } from "@/features/player/now-playing";

import Center from "./center";
import Deferred from "./deferred";
import Left from "./left";
import Right from "./right";

/** 4188 底部播放器：块顶上边框进度条 + 曲目信息 / 居中传输 / 保留能力 / 队列入口。 */
function PlayBar() {
  const { title, controlsDisabled } = useNowPlaying();

  return (
    <>
      {/* 进度线贴播放栏顶边全宽铺开，本身就是这个块的上边框（见 MusicPlayProgress）。 */}
      <div className="shell4188-player-progress">
        <MusicPlayProgress isDisabled={controlsDisabled} />
      </div>
      <div className="shell4188-player-inner">
        <MiniLyricsPanel />
        <div className="shell4188-player-track">{Boolean(title) && <Left />}</div>
        <div className="shell4188-player-center">
          <Center />
        </div>
        <div className="shell4188-player-tools">
          <Deferred />
          <LyricsButton />
          <Right />
        </div>
      </div>
    </>
  );
}

export default PlayBar;
