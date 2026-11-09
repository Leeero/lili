import type { KeyboardEvent, ReactNode } from "react";
import { Link } from "react-router";

import { twMerge } from "tailwind-merge";

export interface SegmentItem {
  /** 稳定键。`href` 存在时通常是路由路径，否则是模式值。 */
  key: string;
  label: ReactNode;
  /**
   * 可选计数尾巴（原型 `.tab .count`）。
   *
   * 渲染为「· N」—— 分隔符属于尾巴的一部分，随数字**一起**出现或消失：
   * 调用方对未知的计数传 `undefined`（而不是空串或 0 占位），悬空的
   * 「标签 ·」因此不可能被渲染出来。数字一律用等宽数字，避免切换时宽度跳动。
   */
  count?: number | string;
  /** 有 `href` 时渲染为链接（导航形态）。 */
  href?: string;
  /**
   * 「已声明但交互尚未接线」。
   *
   * 顶栏的分段组有个真实的中间态：标签由路由契约给出来了，但对应的子视图
   * 切换还没落地（`ROUTE_SEGMENTS` 拆到各屏自己的阶段填）。此时渲染成按钮
   * 就是一个**点了没反应的假控件**，而原型里根本没有「未接线」这一态，
   * 所以也不能置灰 —— 置灰同样是发明。
   *
   * 因此渲染为不可交互元素：读屏能知道它现在不可用，视觉上仍按未激活项着色。
   * 接线之后这个标记就该消失，而不是留成长期的第三态。
   */
  pending?: boolean;
  disabled?: boolean;
}

export type SegmentedSize = "default" | "compact";

/**
 * 分段控件的两种视觉形态。
 *
 *   · `pill`   反色药丸（顶栏 / 沉浸态模式段）：激活项铺一块实心底、字反色。
 *   · `underline` 下划线 tab（页面内容区的分类导航）：无底、无圆角，激活项
 *     只在底部画一条强调色下划线，未激活项落在一条弱分隔线上 —— QQ 音乐式。
 *
 * 语义不变：导航型仍是 `<nav>` + `aria-current`，模式切换型仍是按钮组 / tablist。
 */
export type SegmentVariant = "pill" | "underline";

interface SegmentedControlProps {
  items: SegmentItem[];
  /** 无障碍名称。顶栏用「顶栏分段导航」，沉浸态模式切换用「显示模式」。 */
  label: string;
  /**
   * 当前选中项的 key。
   * 导航形态由调用方按路由计算；模式切换形态按受控值传入。
   */
  activeKey?: string;
  /** 模式切换形态的选中回调。导航形态不需要（链接自己会导航）。 */
  onSelect?: (key: string) => void;
  /**
   * 尺寸。原型两种：
   *   `default` 顶栏用：容器高 40、项高 40、左右内边距 22、字号 13、容器底白 9%。
   *   `compact` 沉浸态模式段用：项高 32、内边距 18、字号 15、容器底白 10% + 8% 描边。
   */
  size?: SegmentedSize;
  /**
   * 视觉形态：`pill`（缺省，反色药丸）或 `underline`（下划线 tab）。
   * 页面内容区的分类导航用 `underline`，壳层 / 沉浸态的模式段保持 `pill`。
   */
  variant?: SegmentVariant;
  /**
   * 关联的内容面板 id。**给了它才用 tab 语义**（`role="tablist"` + `aria-selected`
   * + `aria-controls`）；不给则退化为 `role="group"` + `aria-pressed` 的切换按钮组。
   *
   * 理由：`role="tab"` 承诺「选中项控制某个面板」，若页面上并不存在那个面板，
   * 读屏用户会找不到内容。宁可少一层语义，也不要给一个兑现不了的承诺。
   */
  panelId?: string;
  /**
   * 容器末端的弱化说明（原型 `.topbar-note`）。
   *
   * 设计稿第 8 页实测它**在容器内**：容器底从 x112 一路延到 x467，说明文字
   * （x324–443）落在其中、右侧仍留 25px 容器底；容器之外立刻回落到顶栏底。
   * 原型把 note 排在 `.tabgroup` 之外、且给的是无底裸文字 —— 两处都不符。
   * 横向内边距取与分段项相同的 22（文字左缘 305 + 22 = 327，实测 324）。
   *
   * **它不是可交互项**：渲染成 `<span>`，不进 `items`、不参与方向键与
   * 激活判定。真值见 spec-lock `globalChrome.topbarNote`。
   */
  note?: ReactNode;
  className?: string;
}

/**
 * 两档尺寸。**`item` 的字号都取 `--lili-type-chrome`(14)** —— 分段控件在设计稿里
 * 只出现在顶栏（导航分段组与沉浸态「封面 / 歌词 / 视频」），它的字是 chrome 文字、不是
 * 列表正文（`body` 15）也不是标签徽标（`label` 13）。spec-lock 1.3.25 立档，理由与
 * 取证见 `src/ui/tokens/geometry.css` 的 `--lili-type-chrome` 与
 * `docs/design/evidence/type-scale-audit.md`。`compact` 目前无业务消费方，
 * 一并跟到 chrome，免得留下一个没量过的孤档。
 */
const SIZES: Record<SegmentedSize, { container: string; item: string }> = {
  default: {
    container: "h-10 gap-0.5 bg-[var(--lili-veil-9)] px-2",
    item: "h-10 px-[22px] text-[length:var(--lili-type-chrome-size)]",
  },
  compact: {
    container: "h-10 gap-0.5 border border-[var(--lili-veil-8)] bg-[var(--lili-surface-hover)] px-2",
    item: "h-8 px-[18px] text-[length:var(--lili-type-chrome-size)]",
  },
};

/**
 * 分段控件（原型 `.tabgroup` / `.tab` 与 `.np-mode-seg` 的合流）。
 *
 * 同一个视觉原型在设计稿里承担两件事，所以这里用 `mode` 区分语义而不是拆成两个组件：
 *   · **导航**：项带 `href`，渲染 `<nav>` + 链接，激活态由 `aria-current="page"` 表达。
 *   · **模式切换**：项不带 `href`，渲染按钮组，激活态由 `aria-selected`
 *     （配 `panelId` 时）或 `aria-pressed`（否则）表达。
 *
 * 组合键行为按 WAI-ARIA 的 tabs 惯例：左右方向键移动，Home / End 跳首尾。
 * 焦点跟着选项走（roving tabindex），这样连续按方向键能一路切换过去。
 *
 * 几何与配色：
 *   激活项是**反色药丸** —— `--lili-inverse-surface` 底 + `--lili-inverse-ink` 字；
 *   未激活项的字色是 `--lili-text-chrome-label`（顶栏标签专用档），
 *   悬停铺 `--lili-veil-8`（与原型 `.tab:hover` 的 8% 完全一致）。
 */
export const SegmentedControl = ({
  items,
  label,
  activeKey,
  onSelect,
  size = "default",
  variant = "pill",
  panelId,
  note,
  className,
}: SegmentedControlProps) => {
  const isNavigation = items.some(item => item.href);
  const sizing = SIZES[size];
  const isUnderline = variant === "underline";
  const useTabs = !isNavigation && Boolean(panelId);

  const itemClass = (isActive: boolean, isDisabled: boolean) => {
    const base =
      "flex flex-none cursor-pointer items-center gap-1.5 whitespace-nowrap transition-colors duration-[var(--lili-duration-fast)] ease-[var(--lili-ease-standard)]";

    if (isUnderline) {
      return twMerge(
        base,
        sizing.item,
        // `-mb-px` 让下划线槽位叠到容器的 1px 分隔线上；激活项用强调色把
        // 这一段「顶」成自己的下划线，未激活项透明，视觉上仍是同一条分隔线。
        "-mb-px border-b-2 border-transparent px-3",
        isActive
          ? "border-[rgb(var(--lili-accent))] font-semibold text-[rgb(var(--lili-text-primary))]"
          : "text-[rgb(var(--lili-text-secondary))] hover:text-[rgb(var(--lili-text-primary))]",
        isActive
          ? "lili-theme-4188:border-[var(--lili-4188-action)] lili-theme-4188:text-[var(--lili-4188-text-primary)]"
          : "lili-theme-4188:text-[var(--lili-4188-text-secondary)] lili-theme-4188:hover:text-[var(--lili-4188-text-primary)]",
        isDisabled && "cursor-not-allowed opacity-40 hover:text-current",
      );
    }

    return twMerge(
      base,
      "rounded-[var(--lili-radius-pill)]",
      sizing.item,
      isActive
        ? "bg-[rgb(var(--lili-inverse-surface))] font-semibold text-[rgb(var(--lili-inverse-ink))]"
        : "text-[rgb(var(--lili-text-chrome-label))] hover:bg-[var(--lili-veil-8)]",
      isActive
        ? "lili-theme-4188:bg-[var(--lili-4188-action)] lili-theme-4188:text-[var(--lili-4188-text-primary)]"
        : "lili-theme-4188:text-[var(--lili-4188-text-secondary)] lili-theme-4188:hover:bg-[var(--lili-4188-surface-hover)]",
      isDisabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
    );
  };

  const countClass = (isActive: boolean) =>
    twMerge(
      "tabular-nums",
      isActive ? "text-[rgb(var(--lili-text-disabled))]" : "text-[rgb(var(--lili-text-quaternary))]",
    );

  /** 计数尾巴：「· N」。分隔符与数字是一个整体，一起出现、一起消失。 */
  const renderCount = (item: SegmentItem, isActive: boolean) =>
    item.count !== undefined ? <span className={countClass(isActive)}>· {item.count}</span> : null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isNavigation || !onSelect) return;
    const enabled = items.filter(item => !item.disabled);
    if (!enabled.length) return;
    const currentIndex = enabled.findIndex(item => item.key === activeKey);

    const step = (delta: number) => {
      event.preventDefault();
      const next = enabled[(Math.max(currentIndex, 0) + delta + enabled.length) % enabled.length];
      if (next) onSelect(next.key);
    };

    if (event.key === "ArrowRight") step(1);
    else if (event.key === "ArrowLeft") step(-1);
    else if (event.key === "Home") {
      event.preventDefault();
      if (enabled[0]) onSelect(enabled[0].key);
    } else if (event.key === "End") {
      event.preventDefault();
      const last = enabled[enabled.length - 1];
      if (last) onSelect(last.key);
    }
  };

  const body = items.map(item => {
    const isActive = item.key === activeKey;

    if (item.href) {
      return (
        <Link
          key={item.key}
          to={item.href}
          aria-current={isActive ? "page" : undefined}
          className={itemClass(isActive, false)}
        >
          {item.label}
          {renderCount(item, isActive)}
        </Link>
      );
    }

    const tabProps = useTabs
      ? { role: "tab" as const, "aria-selected": isActive, "aria-controls": panelId, id: `${panelId}-tab-${item.key}` }
      : { "aria-pressed": isActive };

    if (item.pending) {
      return (
        <span key={item.key} aria-disabled="true" className={itemClass(useTabs ? false : isActive, false)}>
          {item.label}
          {renderCount(item, isActive)}
        </span>
      );
    }

    return (
      <button
        key={item.key}
        type="button"
        disabled={item.disabled}
        // roving tabindex 只用于 tab 语义：一组 tab 整体只占一个 Tab 停留点，
        // 组内靠方向键移动。若是切换按钮组，每个按钮都应能被 Tab 逐个到达。
        tabIndex={useTabs && !isActive ? -1 : undefined}
        onClick={() => onSelect?.(item.key)}
        className={itemClass(isActive, Boolean(item.disabled))}
        {...tabProps}
      >
        {item.label}
        {renderCount(item, isActive)}
      </button>
    );
  });

  /**
   * `w-fit` 不是冗余的：分段控件的底是**贴着两三个分段的药丸**，不是整行底条。
   * `flex-none` 只在父级是 flex 行时挡得住拉伸，另外两种常见父级都挡不住 ——
   * 块级父级下这个块级盒本来就占满整行；flex 列里交叉轴的 `stretch` 也会把它
   * 拉到容器宽（设计系统展示页就是这种）。发现音乐页的「音乐分区 / 新碟与新歌」
   * 落在 `PageHeader` 的标题列（块级）里，曾把背景拉到 1136px —— 与 H1 同宽，
   * 而两段标签只要 ~200px。
   *
   * 调用方仍可用 `className` 显式覆写宽度：twMerge 里后手者胜。
   */
  const containerClass = twMerge(
    "flex w-fit flex-none",
    isUnderline
      ? "mb-5 gap-2 border-b border-[var(--lili-border-weak)] lili-theme-4188:border-[var(--lili-4188-border)]"
      : `items-center rounded-[var(--lili-radius-pill)] ${sizing.container}`,
    className,
  );

  /**
   * 末端说明。左内边距与分段项一致（22），这样它与未选中分段落在同一条
   * 字线上；字色也取未选中分段那一档（`--lili-text-chrome-label`），
   * 因为它与它们同处容器底、属于同一层信息。
   *
   * 字号跟分段项同档（`--lili-type-chrome`）：设计稿里二者就在同一行、同一容器内，
   * 实测也是同一个值（分段标签 13.96 / 末端说明 13.75）。
   */
  const noteBody = note ? (
    <span className="flex-none px-[22px] text-[length:var(--lili-type-chrome-size)] text-[rgb(var(--lili-text-chrome-label))]">
      {note}
    </span>
  ) : null;

  if (isNavigation) {
    return (
      <nav aria-label={label} className={containerClass}>
        {body}
        {noteBody}
      </nav>
    );
  }

  return (
    <div role={useTabs ? "tablist" : "group"} aria-label={label} onKeyDown={handleKeyDown} className={containerClass}>
      {body}
      {noteBody}
    </div>
  );
};
