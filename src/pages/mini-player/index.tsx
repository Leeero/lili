import { memo, useEffect, useMemo, useRef } from "react";

import { Button, Slider } from "@heroui/react";
import {
  RiExpandDiagonalLine,
  RiPauseCircleFill,
  RiPlayCircleFill,
  RiSkipBackFill,
  RiSkipForwardFill,
} from "@remixicon/react";
import clx from "classnames";
import { useShallow } from "zustand/react/shallow";

import { AppShell } from "@/app/shell";
import { getPlayModeList } from "@/common/constants/audio";
import { createBroadcastChannel, toggleMiniMode } from "@/common/utils/mini-player";
import { formatDuration } from "@/common/utils/time";
import Image from "@/components/image";
import { SystemIntegrationView } from "@/features/player/system-integration-view";
import PlayBar from "@/layout/playbar";
import TopBar from "@/layout/topbar";
import { usePlayProgress } from "@/store/play-progress";

import { createMiniPlayerActions } from "./actions";
import { usePlayState } from "./play-state";
import { useStyle } from "./use-style";

const PlayModeList = getPlayModeList(16);

const CoverView = memo(() => {
  const cover = usePlayState(s => s.cover);
  if (!cover) return null;
  return (
    <div className="mini4188-cover relative m-2 h-24 w-24 flex-shrink-0 overflow-hidden rounded-[var(--lili-radius-lg)]">
      <Image
        removeWrapper
        radius="lg"
        src={cover}
        width={96}
        height="100%"
        params="672w_378h_1c.avif"
        loading="eager"
        decoding="async"
        style={{ transform: "translateZ(0)", backfaceVisibility: "hidden", willChange: "transform", contain: "paint" }}
      />
      <div className="pointer-events-none absolute inset-0 z-10 rounded-[var(--lili-radius-lg)] ring-1 ring-black/5 ring-inset" />
    </div>
  );
});

const CompactMiniPlayer = () => {
  const { isSingle, isPlaying, title, artist, duration, playMode } = usePlayState(
    useShallow(state => ({
      isSingle: state.isSingle,
      isPlaying: state.isPlaying,
      title: state.title,
      artist: state.artist,
      duration: state.duration,
      playMode: state.playMode,
    })),
  );
  const currentTime = usePlayProgress(s => s.currentTime);
  const setCurrentTime = usePlayProgress(s => s.setCurrentTime);
  const updatePlayState = usePlayState(state => state.update);
  const bcRef = useRef<BroadcastChannel>(null);

  const actions = useMemo(
    () =>
      createMiniPlayerActions(message => {
        bcRef.current?.postMessage(message);
      }),
    [],
  );

  useStyle();

  const playModeIcon = useMemo(() => {
    return PlayModeList.find(item => item.value === playMode)?.icon;
  }, [playMode]);

  useEffect(() => {
    bcRef.current = createBroadcastChannel();
    actions.initialize();

    bcRef.current.onmessage = ev => {
      const { from, state } = ev.data || {};
      if (from !== "main" || !state) return;

      updatePlayState(state);
      if (typeof state.currentTime === "number") {
        setCurrentTime(state.currentTime);
      }
    };

    return () => {
      if (!bcRef.current) return;
      bcRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mini4188-window window-drag flex h-screen w-screen flex-col overflow-hidden rounded-[var(--lili-radius-lg)] bg-[rgb(var(--lili-color-surface)/0.96)] text-[rgb(var(--lili-color-text-primary))] select-none">
      <div className="flex h-full items-center">
        <CoverView />
        <div className="mini4188-content flex min-w-0 flex-1 flex-col gap-1.5 py-2 pr-2">
          <div className="flex min-w-0 flex-col pr-8">
            {title ? (
              <>
                <span className="truncate text-sm font-semibold">{title}</span>
                <span className="truncate text-xs text-[rgb(var(--lili-color-text-secondary))]">
                  {artist || "未知"}
                </span>
              </>
            ) : (
              <span className="text-sm text-[rgb(var(--lili-color-text-tertiary))]">暂无播放内容</span>
            )}
          </div>
          <div className="mini4188-progress window-no-drag flex items-center gap-2">
            <span className="min-w-7 flex-shrink-0 text-right text-[10px] whitespace-nowrap text-[rgb(var(--lili-color-text-tertiary))] tabular-nums">
              {title ? formatDuration(currentTime) : "-:--"}
            </span>
            <Slider
              aria-label="播放进度"
              minValue={0}
              maxValue={duration}
              value={currentTime}
              onChange={v => {
                actions.seek(v as number);
              }}
              isDisabled={!title}
              size="sm"
              className="min-w-0 flex-1"
              classNames={{
                trackWrapper: "group",
                track: "h-[3px] cursor-pointer",
                thumb: clx("w-3 h-3 after:h-2 after:bg-primary opacity-0", {
                  "group-hover:opacity-100": Boolean(title),
                }),
              }}
            />
            <span className="min-w-7 flex-shrink-0 text-[10px] whitespace-nowrap text-[rgb(var(--lili-color-text-tertiary))] tabular-nums">
              {title ? formatDuration(duration) : "-:--"}
            </span>
          </div>
          <div className="mini4188-controls flex items-center justify-between gap-1">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              disableAnimation
              onPress={actions.togglePlayMode}
              className="mini4188-control window-no-drag hover:text-primary h-7 w-7 min-w-7 text-[rgb(var(--lili-color-text-secondary))]"
              aria-label="播放模式"
            >
              {playModeIcon}
            </Button>
            <div className="flex items-center gap-1">
              <Button
                isDisabled={!title || isSingle}
                isIconOnly
                size="sm"
                variant="light"
                disableAnimation
                onPress={actions.previous}
                aria-label="上一首"
                className="mini4188-control window-no-drag hover:text-primary h-7 w-7 min-w-7"
              >
                <RiSkipBackFill size={18} />
              </Button>
              <Button
                isDisabled={!title}
                isIconOnly
                size="sm"
                variant="light"
                disableAnimation
                onPress={actions.togglePlay}
                aria-label={isPlaying ? "暂停" : "播放"}
                className="mini4188-control window-no-drag text-primary h-8 w-8 min-w-8 hover:scale-105"
              >
                {isPlaying ? <RiPauseCircleFill size={28} /> : <RiPlayCircleFill size={28} />}
              </Button>
              <Button
                isDisabled={!title || isSingle}
                isIconOnly
                size="sm"
                variant="light"
                disableAnimation
                onPress={actions.next}
                aria-label="下一首"
                className="mini4188-control window-no-drag hover:text-primary h-7 w-7 min-w-7"
              >
                <RiSkipForwardFill size={18} />
              </Button>
            </div>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              disableAnimation
              onPress={toggleMiniMode}
              aria-label="返回完整播放器"
              className="mini4188-control window-no-drag hover:text-primary h-7 w-7 min-w-7 text-[rgb(var(--lili-color-text-secondary))]"
            >
              <RiExpandDiagonalLine size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * `/mini-player` 同时承载两种窗口形态：主窗口中的系统集成页，以及 Electron 创建的
 * 360×140 独立播放窗。用实际视口宽度分流，避免为视觉页牺牲真正的迷你窗口能力。
 */
const MiniPlayer = () => {
  if (window.innerWidth <= 600) return <CompactMiniPlayer />;

  return (
    <AppShell topbar={<TopBar />} player={<PlayBar />}>
      <SystemIntegrationView />
    </AppShell>
  );
};

export default MiniPlayer;
