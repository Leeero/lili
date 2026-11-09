import type { WebSearchTypeVideoParams } from "@/service/web-interface-search-type";

export type SortOrder = NonNullable<WebSearchTypeVideoParams["order"]>;

export const VIDEO_SORT_OPTIONS: { label: string; value: SortOrder }[] = [
  { label: "综合排序", value: "totalrank" },
  { label: "最多播放", value: "click" },
  { label: "最新发布", value: "pubdate" },
  { label: "最多弹幕", value: "dm" },
  { label: "最多收藏", value: "stow" },
];

export const DEFAULT_SORT_ORDER: SortOrder = "totalrank";

export const isSortOrder = (value: string | null): value is SortOrder =>
  value !== null && VIDEO_SORT_OPTIONS.some(option => option.value === value);

export const sortOrderLabel = (value: SortOrder) =>
  VIDEO_SORT_OPTIONS.find(option => option.value === value)?.label ?? "综合排序";

export type SearchViewMode = "card" | "list";
