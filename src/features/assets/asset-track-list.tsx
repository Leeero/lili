import type { KeyboardEvent, ReactNode } from "react";

import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react";
import { RiPauseFill, RiPlayLargeFill } from "@remixicon/react";
import clx from "classnames";

import type { TrackActionSpec } from "@/ui/patterns/track-table";

import { Artwork } from "@/ui/primitives/artwork";
import { Icon } from "@/ui/primitives/icon";

export interface AssetTrackRow {
  id: string;
  index: number;
  title: string;
  subtitle: ReactNode;
  art?: string;
  middle: ReactNode;
  end: ReactNode;
  current?: boolean;
  /** 当前行是否正在播放；未提供时保持旧的播放按钮口径。 */
  playing?: boolean;
}

interface Props<T extends AssetTrackRow> {
  label: string;
  rows: readonly T[];
  actions: readonly TrackActionSpec[];
  onAction: (row: T, key: string) => void;
  /** 列头。默认是榜单口径；历史等页面可覆写成「序号 / 标题 / 进度 / 观看时间」。 */
  showHeader?: boolean;
  headerLabels?: {
    index?: ReactNode;
    title?: ReactNode;
    middle?: ReactNode;
    end?: ReactNode;
  };
  /** 当前行保留名次，改用封面上的均衡器标记播放态。 */
  keepRank?: boolean;
  /** 行封面使用 B 站图床缩放参数（只对 hdslb.com 有效）。 */
  artParams?: string;
  /**
   * 移动端「更多」菜单里的动作。传了才渲染菜单：桌面端仍用常驻操作带，
   * 窄屏下操作带收缩成一枚 ⋯，避免收藏 / 下载 / 入队在小屏完全不可达。
   */
  menuActions?: readonly TrackActionSpec[];
}

/**
 * 表格的上下键移动：焦点停在某个行操作按钮上时，↑/↓ 跳到相邻行的同一枚按钮。
 *
 * 不把整行做成 tab 停留点：一行里有 5 枚按钮，20 行就是 100 个 Tab 停点；让
 * 方向键在同一列里纵向移动，既符合表格语义，也不会把键盘用户困在操作带里。
 */
const handleActionKeyDown = (event: KeyboardEvent<HTMLElement>) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

  const target = event.target as HTMLElement;
  const button = target.closest<HTMLElement>("[data-asset-action]");
  const row = target.closest<HTMLElement>("[data-asset-row]");
  if (!button || !row) return;

  const nextRow = Number(row.dataset.assetRow) + (event.key === "ArrowDown" ? 1 : -1);
  const list = row.closest<HTMLElement>(".asset4188-list");
  const next = list?.querySelector<HTMLElement>(
    `[data-asset-row="${nextRow}"] [data-asset-action="${button.dataset.assetAction}"]`,
  );
  if (!next) return;

  event.preventDefault();
  next.focus();
};

export const AssetTrackList = <T extends AssetTrackRow>({
  label,
  rows,
  actions,
  onAction,
  showHeader = false,
  headerLabels,
  keepRank = false,
  artParams,
  menuActions,
}: Props<T>) => (
  <section className={clx("asset4188-list", menuActions && "has-menu", showHeader && "has-header")} aria-label={label}>
    {showHeader && (
      <div className="asset4188-list-head" aria-hidden="true">
        <span>{headerLabels?.index ?? "排名"}</span>
        <span />
        <span>{headerLabels?.title ?? "单曲"}</span>
        <span className="is-end">{headerLabels?.middle ?? "播放量"}</span>
        <span className="is-end">{headerLabels?.end ?? "时长"}</span>
        <span />
      </div>
    )}
    {rows.map((row, index) => {
      const paused = row.current && row.playing === false;
      const playing = row.current && row.playing === true;

      return (
        // 整行点击 = 播放（鼠标便捷）；键盘操作由行内操作带的按钮提供，
        // 方向键在同列按钮之间纵向移动（见 handleActionKeyDown）。
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <article
          key={row.id}
          className={clx("asset4188-row", row.current && "is-current", paused && "is-paused")}
          data-asset-row={index}
          onClick={() => onAction(row, "play")}
          onKeyDown={handleActionKeyDown}
        >
          <span className={clx("asset4188-index", row.index <= 3 && "is-top")}>
            {keepRank || !row.current ? String(row.index).padStart(2, "0") : "▶"}
          </span>
          <span className="asset4188-art">
            {row.art ? (
              <Artwork
                src={row.art}
                artKey={row.id}
                alt=""
                radius="none"
                params={artParams}
                className="asset4188-cover-art"
              />
            ) : (
              <span className="asset4188-cover" />
            )}
            {keepRank && row.current && (
              <span
                className={clx("asset4188-eq", paused && "is-paused")}
                role="img"
                aria-label={paused ? "已暂停" : "正在播放"}
              >
                <i />
                <i />
                <i />
              </span>
            )}
          </span>
          <span className="asset4188-copy">
            <strong>{row.title}</strong>
            <small>{row.subtitle}</small>
          </span>
          <span className="asset4188-middle">{row.middle}</span>
          <span className="asset4188-end">{row.end}</span>
          <span
            className={clx("asset4188-row-actions", menuActions && "is-menu")}
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              data-asset-action="play"
              aria-label={`${playing ? "暂停" : "播放"} ${row.title}`}
              onClick={() => onAction(row, "play")}
            >
              {playing ? <RiPauseFill size={16} /> : <RiPlayLargeFill size={16} />}
            </button>
            {actions
              .filter(action => action.key !== "play")
              .map(action => (
                <button
                  key={action.key}
                  type="button"
                  data-asset-action={action.key}
                  aria-label={`${action.label} ${row.title}`}
                  onClick={() => onAction(row, action.key)}
                >
                  <Icon name={action.icon} />
                </button>
              ))}
            {menuActions && (
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <button type="button" className="asset4188-more" data-asset-action="more" aria-label="更多操作">
                    <Icon name="more" />
                  </button>
                </DropdownTrigger>
                <DropdownMenu aria-label={`更多操作 ${row.title}`} onAction={key => onAction(row, String(key))}>
                  <>
                    <DropdownItem key="play" startContent={<Icon name={playing ? "pause" : "play"} size={14} />}>
                      {playing ? "暂停" : "播放"}
                    </DropdownItem>
                    {menuActions.map(action => (
                      <DropdownItem key={action.key} startContent={<Icon name={action.icon} size={14} />}>
                        {action.label}
                      </DropdownItem>
                    ))}
                  </>
                </DropdownMenu>
              </Dropdown>
            )}
          </span>
        </article>
      );
    })}
  </section>
);
