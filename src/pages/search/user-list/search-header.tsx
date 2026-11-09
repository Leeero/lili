import { useSearchSegments } from "@/store/search-segments";

import type { UserSortKey } from "./utils";

import { SortDropdown } from "../sort-dropdown";

interface SearchHeaderProps {
  sortKey: UserSortKey;
  onSortChange: (key: UserSortKey) => void;
}

const SORT_OPTIONS: { label: string; value: UserSortKey }[] = [
  { label: "默认排序", value: "default" },
  { label: "粉丝最多", value: "fans_desc" },
  { label: "粉丝最少", value: "fans_asc" },
  { label: "等级最高", value: "level_desc" },
  { label: "等级最低", value: "level_asc" },
];

/** 创作者工具条：与音乐视频同一套吸顶工具条和排序下拉，只换标题与排序项。 */
export default function SearchHeader({ sortKey, onSortChange }: SearchHeaderProps) {
  const creatorCount = useSearchSegments(state => state.creatorCount);

  return (
    <div className="search4188-toolbar">
      <div className="search4188-toolbar-title">
        <h2>创作者</h2>
        {creatorCount !== null && <span className="search4188-section-count">{creatorCount}</span>}
      </div>
      <div className="search4188-toolbar-controls">
        <SortDropdown value={sortKey} options={SORT_OPTIONS} onChange={onSortChange} label="创作者排序" />
      </div>
    </div>
  );
}
