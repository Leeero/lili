import type { KeyboardEvent } from "react";

import clx from "classnames";

import { SearchType, SearchTypeOptions } from "./search-type";

interface SearchTabsProps {
  value: SearchType;
  counts: Record<SearchType, number | null>;
  onChange: (value: SearchType) => void;
}

const focusTab = (value: SearchType) => {
  window.requestAnimationFrame(() => document.getElementById(`search-tab-${value}`)?.focus());
};

/**
 * 结果类型 tab。数字来自 `useSearchSegments`（各结果列表写入），未知时不渲染数字。
 *
 * 键盘遵循 tabs 模式：左右方向键切换并跟着选中，Home/End 跳首尾；tablist 里只有
 * 当前项在 Tab 顺序上（roving tabindex）。
 */
export const SearchTabs = ({ value, counts, onChange }: SearchTabsProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % SearchTypeOptions.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + SearchTypeOptions.length) % SearchTypeOptions.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = SearchTypeOptions.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    const next = SearchTypeOptions[nextIndex];
    onChange(next.value);
    focusTab(next.value);
  };

  return (
    <div className="search4188-tabs" role="tablist" aria-label="搜索结果类型">
      {SearchTypeOptions.map((option, index) => {
        const active = option.value === value;
        const count = counts[option.value];
        return (
          <button
            key={option.value}
            id={`search-tab-${option.value}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`search-panel-${option.value}`}
            tabIndex={active ? 0 : -1}
            className={clx("search4188-tab", active && "is-active")}
            onClick={() => onChange(option.value)}
            onKeyDown={event => handleKeyDown(event, index)}
          >
            {option.label}
            {count !== null && <span className="search4188-tab-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
};
