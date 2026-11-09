import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { RiArrowUpSLine } from "@remixicon/react";
import clsx from "classnames";

import MusicFavButton from "@/components/music-fav-button";
import MusicMoreMenu from "@/components/music-more-menu";
import MusicThumbButton from "@/components/music-thumb-button";
import { useNowPlaying } from "@/features/player/now-playing";
import { usePlayerActions } from "@/features/player/use-player-actions";
import { useUser } from "@/store/user";
import { PLACEHOLDER_RADIALS } from "@/ui/fixtures/placeholder-art";
import { Artwork } from "@/ui/primitives/artwork";
import { Tag } from "@/ui/primitives/tag";

import PageListDrawer from "./page-list";

/**
 * 播放栏左段：封面 + 文案块 + 质量徽标。
 *
 * 几何全部取自 spec-lock `geometry.playbar.left`（1.3.9 起进真值）。三处与原型
 * `assets/app.css` 的 `.pb-*` 分歧**一律取设计稿**：
 *   · 封面 **100 × 56**（原型 `.pb-cover` 是 56 × 56）—— 与已登记的 L1 硬锚点
 *     「缩略图 100×56」同比例（16:9），不是正方形；
 *   · 封面左缘 **32**（原型 36）、封面 → 文案块 **21**（原型 gap 16）；
 *   · 副行 → 徽标间距取原型成文值 **10**（设计稿两页实测 72 / 24 不等，读不出常量）。
 *
 * 标题 17px/600、单行省略；副行 13px `--lili-text-quaternary`；徽标同 `.tag`
 * （高 22 / 内距 8 / 圆角 6 / 字号 12 / 字重 500 / `quality` 变体）。
 *
 * 封面**不用 `Image`** 而用 `Artwork`：后者在无地址或加载失败时回落到占位底图，
 * 而设计稿的播放栏封面本来就是占位（见 `placeholder-art.ts` 的 `playbarCover`）。
 *
 * 右端的分集 / 收藏 / 更多三枚控件**在设计稿里没有**（设计稿该处是空白），
 * 本轮保留（方案 §5.4「保留能力」），去留与右段控件一并在 P5 处置。
 */
const LeftControl = () => {
  const navigate = useNavigate();
  const user = useUser(state => state.user);
  const { openNowPlaying } = usePlayerActions();
  const { title, sub, ownerClickable, ownerMid, hasMultiPart, isVideo, sourceIsLocal, cover, badgeText } =
    useNowPlaying();

  // 标题跑马灯：仅当单行标题超出容器宽度时才滚动，短标题保持静态省略。
  const titleContainerRef = useRef<HTMLSpanElement>(null);
  const titleTextRef = useRef<HTMLSpanElement>(null);
  const [titleOverflow, setTitleOverflow] = useState(false);

  useEffect(() => {
    const container = titleContainerRef.current;
    const text = titleTextRef.current;
    if (!container || !text) return;

    const measure = () => setTitleOverflow(text.scrollWidth > container.clientWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [title]);

  return (
    <div className="flex h-full min-w-0 items-center gap-[var(--lili-playbar-meta-gap)] overflow-hidden">
      <button
        type="button"
        aria-label="打开全屏播放器"
        data-id="full-screen-player-open"
        className="group relative flex-none cursor-pointer overflow-hidden rounded-[var(--lili-playbar-cover-radius)]"
        onClick={openNowPlaying}
      >
        <Artwork
          src={cover}
          radius="none"
          alt=""
          placeholder={PLACEHOLDER_RADIALS.playbarCover}
          className="rounded-[var(--lili-playbar-cover-radius)]"
          style={{ width: "var(--lili-playbar-cover-w)", height: "var(--lili-playbar-cover-h)" }}
        />
        <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/55 text-white opacity-0 transition-opacity duration-[var(--lili-duration-fast)] group-hover:opacity-100 group-focus-visible:opacity-100">
          <RiArrowUpSLine size={32} />
        </span>
      </button>

      <div className="flex min-w-0 flex-1 flex-col items-start gap-[var(--lili-playbar-title-gap)] overflow-hidden">
        <span
          ref={titleContainerRef}
          title={title}
          data-overflow={titleOverflow || undefined}
          className="shell4188-title-marquee block w-full max-w-full text-[length:var(--lili-type-list-title-size)] font-semibold text-[rgb(var(--lili-text-primary))]"
        >
          <span className="shell4188-title-marquee-track">
            <span ref={titleTextRef}>{title}</span>
            {titleOverflow && <span aria-hidden="true">{title}</span>}
          </span>
        </span>
        <span className="flex w-full min-w-0 items-center gap-[var(--lili-playbar-sub-gap)]">
          <span
            className={clsx(
              "min-w-0 truncate text-[length:var(--lili-type-label-size)] whitespace-nowrap text-[rgb(var(--lili-text-quaternary))]",
              { "cursor-pointer hover:underline": ownerClickable },
            )}
            onClick={event => {
              if (!ownerClickable || ownerMid === undefined) return;
              event.stopPropagation();
              navigate(`/user/${ownerMid}`);
            }}
          >
            {sub}
          </span>
          {badgeText && <Tag variant="quality">{badgeText}</Tag>}
          {title && <Tag variant="plain">{sourceIsLocal ? "本地" : "B站"}</Tag>}
        </span>
      </div>

      {/*
        三枚控件（分集 / 收藏 / 更多）在设计稿里没有（设计稿该处是空白），本轮保留
        （方案 §5.4「保留能力」），去留与过渡控件簇一并在 P5 处置。

        注意：本组三个条件全不成立时，外层 `gap: 21px` 仍会生效 ⇒ 左段实测 394.2
        （= 100 + 21 + 252.2 + 21 + 0）而内容止于 405.3。试过「空组不渲染」，**无效**：
        `!sourceIsLocal` 为真时 `<MusicMoreMenu />` 仍被创建，而 React 元素即使最终
        渲染 `null` 也是真值，父级无从预知。要修得先让 `MusicMoreMenu` 暴露
        「是否会渲染」的判据，属独立改动；该 21px 无视觉后果（见 spec-lock
        `geometry.playbar.left.rule`），本轮不改。
      */}
      <div className="hidden flex-none items-center gap-0.5 min-[1600px]:flex">
        {hasMultiPart && <PageListDrawer />}
        {Boolean(user?.isLogin) && !sourceIsLocal && isVideo && <MusicThumbButton />}
        {Boolean(user?.isLogin) && !sourceIsLocal && <MusicFavButton />}
        {!sourceIsLocal && <MusicMoreMenu />}
      </div>
    </div>
  );
};

export default LeftControl;
