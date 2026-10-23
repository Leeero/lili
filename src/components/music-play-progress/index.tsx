import { memo, useRef, useState, type MouseEvent } from "react";

import { twMerge } from "tailwind-merge";

import { formatDuration } from "@/common/utils/time";
import { useNowPlaying } from "@/features/player/now-playing";
import { usePlayerActions } from "@/features/player/use-player-actions";

interface Props {
  isDisabled?: boolean;
  className?: string;
}

/**
 * 播放栏顶部进度条：**进度线本身就是播放栏块的上边框**。
 *
 * 与旧版「块内一条左右留 24px 内距、上下各 8px 外边距的 4px 槽」不同，这一版把
 * 进度线贴到块的顶边、横向铺满（x=0 → 100%）：未播放段沿用描边色
 * `--lili-4188-border`，空进度时它就是原来的边框，有进度时同一根线从左往右变成
 * 播放色。它不再占用块内一行高度，因此封面不会被挤到贴底。
 *
 * 命中区高 12px（视觉线 3px）：顶部细线不好点，透明 `input[type=range]` 覆盖整条
 * 带，原生提供点击/拖拽/方向键与 slider 语义；指针移动时在条上方浮出「当前 /
 * 总时长」。进度值仍以 store 的 `currentTime` 为准，不在这里另存一份播放状态。
 */
const MusicPlayProgress = memo(({ isDisabled, className }: Props) => {
  const [hovered, setHovered] = useState(false);
  const [cursorX, setCursorX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentTime, duration } = useNowPlaying();
  const { seek } = usePlayerActions();

  const percent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const showTime = !isDisabled && hovered && duration > 0;

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // 时间浮层约 80px 宽，中心至少距两端 40px，避免浮层溢出播放栏左右边缘。
    const half = 40;
    const x = event.clientX - rect.left;
    setCursorX(Math.max(half, Math.min(rect.width - half, x)));
  };

  return (
    <div
      ref={containerRef}
      className={twMerge("group relative h-3 w-full", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 block h-[var(--lili-4188-player-progress-h)] overflow-hidden bg-[var(--lili-4188-border)]"
      >
        <span
          className="block h-full bg-[rgb(var(--lili-accent))] transition-[width] duration-150 ease-linear"
          style={{ width: `${percent}%` }}
        />
      </span>
      <input
        type="range"
        aria-label="播放进度"
        aria-valuetext={`${formatDuration(currentTime)} / ${formatDuration(duration)}`}
        min={0}
        max={Math.max(duration, 1)}
        step={1}
        value={currentTime}
        disabled={isDisabled || duration <= 0}
        onChange={event => seek(Number(event.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
      />
      {showTime && (
        <div
          className="pointer-events-none absolute bottom-full z-20 mb-2 -translate-x-1/2 rounded-md bg-[var(--lili-4188-surface-elevated)] px-2 py-0.5 text-[length:var(--lili-type-label-size)] whitespace-nowrap text-[rgb(var(--lili-text-primary))]"
          style={{ left: cursorX }}
        >
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </div>
      )}
    </div>
  );
});

export default MusicPlayProgress;
