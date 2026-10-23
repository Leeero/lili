import { memo } from "react";
import { useNavigate } from "react-router";

import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react";
import {
  RiMore2Line,
  RiPauseFill,
  RiPlayFill,
  RiPlayListAddLine,
  RiSkipForwardLine,
  RiStarLine,
  RiYoutubeLine,
} from "@remixicon/react";
import clx from "classnames";

import type { Track } from "@/domain/track";

import { formatNumber } from "@/common/utils/number";
import { formatDuration, formatSecondsToDate } from "@/common/utils/time";
import ContextMenu, { type ContextMenuItem } from "@/components/context-menu";
import { Artwork } from "@/ui/primitives/artwork";

interface SearchVideoCardProps {
  item: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  menus: ContextMenuItem[];
  onOpen: () => void;
  onPlay: () => void;
  onAction: (key: string) => void;
}

/**
 * 搜索结果视频卡。
 *
 * 和旧的 `MusicCard` 不同，这里把三个目标分开：**点封面播放、点标题进详情、
 * 右下角悬浮条做快捷操作**；卡片本身不再是“整块都进详情”的一个大按钮。
 * 「正在播放」的卡用青色描边 + 角标，避免用户不知道队列里正在放哪一条。
 */
const SearchVideoCard = memo(
  ({ item, isCurrent, isPlaying, menus, onOpen, onPlay, onAction }: SearchVideoCardProps) => {
    const navigate = useNavigate();
    const playCount = typeof item.playCount === "number" ? item.playCount : undefined;
    const duration = typeof item.duration === "number" ? item.duration : undefined;
    const publishedAt = item.publishedAt ? Date.parse(item.publishedAt) / 1000 : undefined;
    const creator = item.creator;
    const pause = isCurrent && isPlaying;
    const playLabel = pause ? "暂停" : isCurrent ? "继续播放" : "播放";

    return (
      <ContextMenu items={menus} onAction={onAction} className="search4188-card-shell">
        <article className={clx("search4188-card", isCurrent && "is-current")}>
          <div className="search4188-card-cover">
            <button
              type="button"
              className="search4188-cover-hit"
              aria-label={`${playLabel}：${item.title}`}
              onClick={onPlay}
            >
              <Artwork
                src={item.cover}
                artKey={item.id}
                alt=""
                radius="none"
                params="672w_378h_1c.avif"
                className="search4188-cover-art"
              />
            </button>
            <span className="search4188-cover-shade" aria-hidden="true" />
            <span className="search4188-cover-badges">
              {playCount !== undefined && playCount > 0 && (
                <span>
                  <RiYoutubeLine size={13} aria-hidden="true" />
                  {formatNumber(playCount)}
                </span>
              )}
              {duration !== undefined && <span className="search4188-duration">{formatDuration(duration)}</span>}
            </span>
            {isCurrent && <span className="search4188-playing">{isPlaying ? "正在播放" : "已暂停"}</span>}
            <div className="search4188-quick" aria-label="快捷操作">
              <button type="button" className="search4188-quick-button" onClick={onPlay} aria-label={playLabel}>
                {pause ? <RiPauseFill size={15} /> : <RiPlayFill size={15} />}
              </button>
              <button
                type="button"
                className="search4188-quick-button"
                onClick={() => onAction("play-next")}
                aria-label="下一首播放"
              >
                <RiSkipForwardLine size={15} />
              </button>
              <button
                type="button"
                className="search4188-quick-button"
                onClick={() => onAction("add-to-playlist")}
                aria-label="添加到播放列表"
              >
                <RiPlayListAddLine size={15} />
              </button>
              <button
                type="button"
                className="search4188-quick-button"
                onClick={() => onAction("favorite")}
                aria-label="收藏"
              >
                <RiStarLine size={15} />
              </button>
            </div>
          </div>

          <button type="button" className="search4188-card-title" onClick={onOpen} title={item.title}>
            {item.title}
          </button>

          <div className="search4188-card-meta">
            {creator && (
              <button
                type="button"
                className="search4188-card-creator"
                onClick={() => navigate(`/user/${creator.id}`)}
                title={creator.name}
              >
                {creator.avatar ? (
                  <Artwork
                    src={creator.avatar}
                    artKey={creator.id}
                    alt=""
                    radius="round"
                    gradient="avatar"
                    params="160w_160h_1c.avif"
                    className="search4188-card-avatar"
                  />
                ) : (
                  <span className="search4188-card-avatar-fallback" aria-hidden="true">
                    {creator.name.slice(0, 1)}
                  </span>
                )}
                <span>{creator.name}</span>
              </button>
            )}
            {publishedAt !== undefined && (
              <span className="search4188-card-date">{formatSecondsToDate(publishedAt)}</span>
            )}
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <button type="button" className="search4188-kebab" aria-label="更多操作">
                  <RiMore2Line size={16} />
                </button>
              </DropdownTrigger>
              <DropdownMenu aria-label="视频更多操作" onAction={key => onAction(String(key))}>
                {menus
                  .filter(menu => !menu.hidden)
                  .map(menu => (
                    <DropdownItem key={menu.key} startContent={menu.icon}>
                      {menu.label}
                    </DropdownItem>
                  ))}
              </DropdownMenu>
            </Dropdown>
          </div>
        </article>
      </ContextMenu>
    );
  },
);

SearchVideoCard.displayName = "SearchVideoCard";

export default SearchVideoCard;
