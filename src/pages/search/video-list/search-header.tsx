import { RiArrowRightSLine, RiCheckLine, RiGridLine, RiListCheck2, RiPlayFill } from "@remixicon/react";
import clx from "classnames";

import { VIDEO_SORT_OPTIONS, type SearchViewMode, type SortOrder } from "../search-sort";
import { SortDropdown } from "../sort-dropdown";

interface SearchHeaderProps {
  order: SortOrder;
  onOrderChange: (order: SortOrder) => void;
  musicOnly: boolean;
  onMusicOnlyChange: (value: boolean) => void;
  mode: SearchViewMode;
  onModeChange: (mode: SearchViewMode) => void;
  onPlayAll: () => void;
  playAllDisabled?: boolean;
  loadedCount: number;
  resultCount: number | null;
  /** 「综合」预览段的出口；有值时标题旁渲染「查看全部」。 */
  onSeeAll?: () => void;
}

/**
 * 音乐视频工具条：吸顶。左侧是分组标题 + 结果数，右侧是排序 / 分区 / 视图 / 播放全部。
 *
 * 排序从五个常驻 tab 收成一个下拉：它们不是导航，占一整行会把结果挤下去；
 * 选中项仍是文字 + 勾选，键盘可走 HeroUI 的 Menu 语义。「仅音乐分区」用可切换 chip，
 * 不再用 HeroUI 的蓝色 Switch 抢走主按钮的注意力。
 */
export default function SearchHeader({
  order,
  onOrderChange,
  musicOnly,
  onMusicOnlyChange,
  mode,
  onModeChange,
  onPlayAll,
  playAllDisabled,
  loadedCount,
  resultCount,
  onSeeAll,
}: SearchHeaderProps) {
  const showSeeAll = Boolean(onSeeAll) && resultCount !== null && loadedCount < resultCount;

  return (
    <div className="search4188-toolbar">
      <div className="search4188-toolbar-title">
        <h2>音乐视频</h2>
        {resultCount !== null && <span className="search4188-section-count">{resultCount}</span>}
        {showSeeAll && (
          <button type="button" className="search4188-section-more" onClick={onSeeAll}>
            查看全部
            <RiArrowRightSLine size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="search4188-toolbar-controls">
        <SortDropdown
          value={order}
          options={VIDEO_SORT_OPTIONS}
          onChange={onOrderChange}
          label="音乐视频排序"
          compact
        />

        <button
          type="button"
          className={clx("search4188-chip", musicOnly && "is-on")}
          aria-pressed={musicOnly}
          onClick={() => onMusicOnlyChange(!musicOnly)}
        >
          {musicOnly && <RiCheckLine size={13} aria-hidden="true" />}
          {musicOnly ? "仅音乐分区" : "全部分区"}
        </button>

        <div className="search4188-mode" role="group" aria-label="结果视图">
          <button
            type="button"
            className={clx("search4188-mode-button", mode === "card" && "is-active")}
            aria-label="卡片视图"
            aria-pressed={mode === "card"}
            onClick={() => onModeChange("card")}
          >
            <RiGridLine size={16} />
          </button>
          <button
            type="button"
            className={clx("search4188-mode-button", mode === "list" && "is-active")}
            aria-label="列表视图"
            aria-pressed={mode === "list"}
            onClick={() => onModeChange("list")}
          >
            <RiListCheck2 size={16} />
          </button>
        </div>

        <button
          type="button"
          className="search4188-playall"
          disabled={playAllDisabled}
          title={`播放已载入的 ${loadedCount} 个结果`}
          onClick={onPlayAll}
        >
          <RiPlayFill size={16} aria-hidden="true" />
          播放全部
          {loadedCount > 0 && <span className="search4188-playall-count">{loadedCount}</span>}
        </button>
      </div>
    </div>
  );
}
