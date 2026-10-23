import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react";
import { RiArrowDownSLine, RiCheckLine } from "@remixicon/react";

interface SortDropdownProps<T extends string> {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
  label: string;
  /** 触发器上只显示当前项，不显示「排序：」前缀（音乐视频工具条更紧凑）。 */
  compact?: boolean;
}

/**
 * 排序下拉。搜索页有两套排序（视频 / 创作者），但样式与键盘语义只该有一份：
 * 触发器是 4188 描边胶囊，菜单沿用 HeroUI 的 Menu（方向键 / Esc 开箱即用）。
 */
export const SortDropdown = <T extends string>({
  value,
  options,
  onChange,
  label,
  compact = false,
}: SortDropdownProps<T>) => {
  const current = options.find(option => option.value === value)?.label ?? options[0]?.label;

  return (
    <Dropdown placement="bottom-start">
      <DropdownTrigger>
        <button type="button" className="search4188-sort-trigger" aria-label={label}>
          {!compact && <span className="search4188-sort-prefix">排序</span>}
          {current}
          <RiArrowDownSLine size={14} aria-hidden="true" />
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label={label}
        selectionMode="single"
        selectedKeys={new Set([value])}
        onAction={key => onChange(String(key) as T)}
      >
        {options.map(option => (
          <DropdownItem
            key={option.value}
            startContent={<span className="w-4">{option.value === value && <RiCheckLine size={14} />}</span>}
          >
            {option.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};
