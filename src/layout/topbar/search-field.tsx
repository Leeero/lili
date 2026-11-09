import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { Chip, Listbox, ListboxItem } from "@heroui/react";
import { useClickAway, useRequest } from "ahooks";
import classNames from "classnames";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

import { resolveSearchPlaceholder } from "@/layout/route-shell";
import { getSearchSuggestMain } from "@/service/main-suggest";
import { useSearchHistory } from "@/store/search-history";
import { useSettings } from "@/store/settings";
import { useUser } from "@/store/user";
import { TopBarSearch } from "@/ui/primitives/topbar-search";

import { isSearchShortcut, isTypingTarget, normalizeSearchKeyword, shouldSubmitSearch } from "./search-model";

interface SearchFieldProps {
  onFocusChange?: (focused: boolean) => void;
  className?: string;
}

/**
 * 顶栏搜索位。
 *
 * **外形全部交给 `TopBarSearch`**，本文件只剩业务：搜索建议、历史、快捷键、
 * 提交与跳转。这样 `/search` 页也能复用同一个外壳。
 *
 * 两件事必须留在这里，因为它们需要路由与用户态：
 *   1. `Ctrl/⌘ + K` 聚焦。设计稿里画了 `Ctrl K` 提示 —— **提示可见就必须可用**，
 *      所以同时注册全局快捷键，失焦与输入中不抢焦点。
 *   2. 点击搜索位之外关掉建议浮层。为此用到 `TopBarSearch` 的 `rootRef`：
 *      判断「点在不在里面」需要整个搜索位的边界，光有 input 不够。
 *
 * HeroUI 的 `Input` 仍是交互与无障碍底座（方案 §4.3）：键盘、焦点环、
 * clearable 都由它保证，不自己重写。
 */
const SearchField: React.FC<SearchFieldProps> = ({ onFocusChange, className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser(s => s.user);

  const searchHistoryItems = useSearchHistory(s => s.items);
  const addSearchHistory = useSearchHistory(s => s.add);
  const deleteSearchHistory = useSearchHistory(s => s.delete);
  const clearSearchHistory = useSearchHistory(s => s.clear);
  const showSearchHistory = useSettings(s => s.showSearchHistory);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  /**
   * 输入框初值**恒为空**，不取 store 里的 `keyword`（当前查询词）。
   *
   * 此前的写法是把 store 的 `keyword` 直接当 useState 的初值，而 `keyword` 又落了盘
   * —— 两者一叠加，等于「每次启动，搜索框里躺着上一次搜的词」。用户看到的现象像
   * 浏览器自动填充，其实是应用自己回填的（2026-10-09 修）。本次会话里提交过搜索后，
   * 输入框仍会保留刚搜的词（那是下面的 `setValue` 写的）；只有冷启动是空的。
   */
  const [value, setValue] = useState("");

  useClickAway(() => {
    setOpen(false);
  }, containerRef);

  // Ctrl/⌘ + K 聚焦：与设计稿里的 kbd 提示成对出现，不允许只画提示不接功能。
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event) || isTypingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const { data: suggestionsData } = useRequest(
    async () => {
      if (!shouldSubmitSearch(value)) {
        return [];
      }

      const res = await getSearchSuggestMain({ term: normalizeSearchKeyword(value), userid: user?.mid });
      return res?.result?.tag || [];
    },
    { debounceWait: 300, refreshDeps: [value] },
  );

  const submitSearch = (rawKeyword: string) => {
    if (!shouldSubmitSearch(rawKeyword)) {
      return;
    }
    const normalizedKeyword = normalizeSearchKeyword(rawKeyword);
    addSearchHistory(normalizedKeyword);
    if (location.pathname === "/local-music") {
      const params = new URLSearchParams(location.search);
      params.set("key", normalizedKeyword);
      navigate(`${location.pathname}?${params.toString()}`);
      setOpen(false);
      return;
    }
    if (location.pathname !== "/search") {
      navigate("/search");
    }
    setOpen(false);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const next = e.relatedTarget as HTMLElement | null;
    if (next && containerRef.current?.contains(next)) {
      return;
    }
    setOpen(false);
    onFocusChange?.(false);
  };

  return (
    <TopBarSearch
      rootRef={containerRef}
      className={className}
      inputRef={inputRef}
      value={value}
      // 占位**逐页不同**（设计稿第 03 / 04 页与其余页不同）：真值在 spec-lock
      // 的 `globalChrome.search.placeholderByRoute`，契约在 `route-shell`。
      placeholder={resolveSearchPlaceholder(location.pathname)}
      onValueChange={setValue}
      onKeyDown={e => {
        if (e.key === "Enter") {
          submitSearch(e.currentTarget.value);
          inputRef.current?.blur();
          setOpen(false);
        }
      }}
      onBlur={handleBlur}
      onFocus={() => {
        setOpen(true);
        onFocusChange?.(true);
      }}
      onClick={() => setOpen(true)}
    >
      <div
        data-testid="topbar-search-dropdown"
        className={classNames(
          // 下拉层不能使用半透明的 surface-sunken：搜索结果卡片和播放栏会透过来，
          // 看起来像是层级失效。这里使用不透明的 raised 表面，并把最大高度限制在
          // 顶栏与播放栏之间；overscroll-contain 也避免滚动到边界后带动页面内容。
          "absolute top-full right-0 isolate z-100 mt-2 h-auto max-h-[calc(100dvh-var(--lili-layout-topbar-h)-var(--lili-layout-player-h)-0.5rem)] w-full min-w-[360px] overflow-hidden overscroll-contain rounded-[var(--lili-radius-lg)] border border-[var(--lili-border)] bg-[rgb(var(--lili-color-surface-raised))] shadow-[var(--lili-shadow-floating)]",
          {
            hidden: !open,
            "flex min-h-0 flex-col": open,
          },
        )}
      >
        <OverlayScrollbarsComponent
          className="h-full min-h-0 flex-1 p-2"
          options={{ scrollbars: { autoHide: "leave", autoHideDelay: 600, theme: "os-theme-lili" } }}
        >
          <Listbox
            aria-label="搜索建议"
            selectionMode="none"
            items={
              suggestionsData?.map(item => ({
                key: item.value,
                value: item.value,
                name: item.name,
              })) || []
            }
            emptyContent={<div className="flex items-center justify-center py-6">暂无搜索建议</div>}
            topContent={
              showSearchHistory &&
              searchHistoryItems.length > 0 && (
                <>
                  <div className="mb-1 flex items-center justify-between px-1">
                    <span className="text-sm font-medium">搜索历史</span>
                    <button
                      type="button"
                      className="cursor-pointer text-xs text-[rgb(var(--lili-text-quaternary))] hover:text-[rgb(var(--lili-text-primary))]"
                      onMouseDown={e => e.preventDefault()}
                      onClick={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        clearSearchHistory();
                        inputRef.current?.focus();
                      }}
                    >
                      清除全部
                    </button>
                  </div>
                  <div className="mb-1 flex flex-wrap gap-2">
                    {searchHistoryItems.slice(0, 10).map(item => (
                      <Chip
                        key={item.time}
                        isCloseable
                        size="sm"
                        radius="md"
                        onClose={() => {
                          deleteSearchHistory(item);
                          inputRef.current?.focus();
                        }}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setOpen(false);
                          setValue(item.value);
                          submitSearch(item.value);
                          inputRef.current?.blur();
                        }}
                        className="min-w-0 cursor-pointer"
                        classNames={{
                          content: "truncate",
                        }}
                      >
                        {item.value}
                      </Chip>
                    ))}
                  </div>
                </>
              )
            }
          >
            {item => (
              <ListboxItem
                key={item.key}
                onPress={() => {
                  setOpen(false);
                  setValue(item.value);
                  submitSearch(item.value);
                }}
                className="rounded-medium"
              >
                <span dangerouslySetInnerHTML={{ __html: item.name }} />
              </ListboxItem>
            )}
          </Listbox>
        </OverlayScrollbarsComponent>
      </div>
    </TopBarSearch>
  );
};

export default SearchField;
