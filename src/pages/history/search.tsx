import { useState, type ReactNode } from "react";

import { DateRangePicker as HeroDateRangePicker, Input, type DateValue, type RangeValue } from "@heroui/react";
import { getLocalTimeZone } from "@internationalized/date";
import { RiSearchLine } from "@remixicon/react";
import { useDebounceFn } from "ahooks";
import moment from "moment";

interface Props {
  onSearch?: (keyword: string) => void;
  onDateRangeChange?: (range: { start?: number; end?: number } | null) => void;
  /** 与搜索框同一行右侧的页面级操作（清空历史）。 */
  actions?: ReactNode;
}

type PresetKey = "all" | "today" | "yesterday" | "week" | "month" | "custom";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "all", label: "全部时间" },
  { key: "today", label: "今天" },
  { key: "yesterday", label: "昨天" },
  { key: "week", label: "近一周" },
  { key: "month", label: "近 30 天" },
  { key: "custom", label: "自定义" },
];

/**
 * 观看历史的筛选条。
 *
 * 默认只露出时间预设 + 搜索 + 页面操作；日期选择器收进「自定义」，
 * 避免一个空的范围输入框长期占掉半行。预设选中态用下划线，和搜索页 tab 同语言。
 */
const HistorySearch = ({ onSearch, onDateRangeChange, actions }: Props) => {
  const [keyword, setKeyword] = useState("");
  const [preset, setPreset] = useState<PresetKey>("all");
  const [customOpen, setCustomOpen] = useState(false);
  const [dateRange, setDateRange] = useState<RangeValue<DateValue> | null>(null);

  const { run: runSearch } = useDebounceFn(
    (value: string) => {
      onSearch?.(value);
    },
    { wait: 500 },
  );

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    runSearch(value);
  };

  const applyPreset = (key: PresetKey) => {
    setPreset(key);

    if (key === "custom") {
      setCustomOpen(true);
      // 打开范围选择器之前先回到「全部时间」，避免 tab 显示自定义、
      // 列表却还停留在上一次预设的结果上。
      if (!dateRange) onDateRangeChange?.(null);
      return;
    }

    setCustomOpen(false);
    setDateRange(null);

    if (key === "all") {
      onDateRangeChange?.(null);
      return;
    }

    const start =
      key === "today"
        ? moment().startOf("day")
        : key === "yesterday"
          ? moment().subtract(1, "days").startOf("day")
          : key === "week"
            ? moment().subtract(7, "days").startOf("day")
            : moment().subtract(30, "days").startOf("day");
    const end = key === "yesterday" ? moment().subtract(1, "days").endOf("day") : moment().endOf("day");

    onDateRangeChange?.({ start: start.valueOf(), end: end.valueOf() });
  };

  const handleDateRangeChange = (value: RangeValue<DateValue> | null) => {
    setDateRange(value);

    if (value?.start && value?.end) {
      setPreset("custom");
      setCustomOpen(true);
      onDateRangeChange?.({
        start: value.start.toDate(getLocalTimeZone()).getTime(),
        end: value.end.toDate(getLocalTimeZone()).getTime(),
      });
      return;
    }

    setPreset("all");
    setCustomOpen(false);
    onDateRangeChange?.(null);
  };

  return (
    <>
      <div className="history4188-filter">
        <div className="history4188-presets" role="group" aria-label="时间范围">
          {PRESETS.map(item => (
            <button
              key={item.key}
              type="button"
              className={item.key === preset ? "history4188-preset is-active" : "history4188-preset"}
              aria-pressed={item.key === preset}
              onClick={() => applyPreset(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="history4188-filter-right">
          <Input
            aria-label="搜索标题或 UP 主"
            placeholder="搜索标题/UP 主"
            startContent={<RiSearchLine size={16} />}
            value={keyword}
            onValueChange={handleKeywordChange}
            isClearable
            onClear={() => handleKeywordChange("")}
            radius="md"
            className="history4188-search"
          />
          {actions}
        </div>
      </div>

      {customOpen && (
        <div className="history4188-custom">
          <span className="history4188-custom-label">自定义日期</span>
          <div className="history4188-date-range">
            <HeroDateRangePicker
              aria-label="选择日期范围"
              // @ts-ignore HeroUI 的 DateRangePicker 类型声明与实际 props 不一致。
              value={dateRange}
              onChange={handleDateRangeChange}
              visibleMonths={2}
            />
          </div>
          <button type="button" className="history4188-reset-range" onClick={() => applyPreset("all")}>
            清除日期
          </button>
        </div>
      )}
    </>
  );
};

export default HistorySearch;
