import type { ReactNode } from "react";

import { twMerge } from "tailwind-merge";

import { PageLead, type LeadOffset } from "./lead";

/**
 * 标题列的对齐方式。
 *   `aligned` 标题列比右侧玻璃面板低 11px —— 设计稿里的错位基线，是常态。
 *   `flat`    去掉这 11px（第 07 屏发现音乐：整组上提，实测 H1 111-158）
 */
export type HeadBaseline = "aligned" | "flat";

interface PageHeaderProps {
  title: ReactNode;
  /** 导语（原型 `.page-lead`）。 */
  lead?: ReactNode;
  leadOffset?: LeadOffset;
  /** 屏级导语上边距覆写（像素），压过 `leadOffset`。见 `PageLead.offsetPx`。 */
  leadOffsetPx?: number;
  baseline?: HeadBaseline;
  /**
   * 右列。标准内容是 `<InfoPanel />`。
   * 不传时左列占满整行 —— 第 05 屏下载管理就是这种（没有右栏）。
   */
  aside?: ReactNode;
  /**
   * 右列宽。默认 360（原型 `.page-head` 的第二列）。
   */
  asideWidth?: number;
  /**
   * 标题列内、导语之后的补充内容。
   * **筛选条就是放在这里**：原型 12 屏里的 `.filterbar` 全部位于 `.head-main` 内部，
   * 而不是横跨整行 —— 否则它会跑到右侧玻璃面板下面去。
   */
  children?: ReactNode;
  /** @deprecated 迁移用别名，等价于 `lead`。P3–P6 逐屏重写时移除。 */
  description?: ReactNode;
  /**
   * @deprecated 迁移用的动作位，渲染在导语之后（与 `children` 同一位置）。
   *
   * C+ 里页面级操作（暂停全部 / 清空记录…）是作为**药丸放进筛选条**的
   * （见第 05 屏），并不存在「页头右侧一组按钮」这种位置。
   * 保留本属性只是为了 9 个尚未重写的页面能继续运行，
   * 它们会随 P3–P6 的逐屏重写改成 `<FilterBar>`。
   */
  actions?: ReactNode;
  className?: string;
}

/**
 * 页头（原型 `.page-head` / `.head-main`）。
 *
 * 两列网格：`minmax(0, 1fr) <asideWidth>`，列间距 24，顶部对齐。
 * 第一列用 `minmax(0, 1fr)` 而不是 `1fr`：前者才允许内容被压缩，
 * 后者在长标题下会把网格撑出容器 —— 这是网格布局最常见的溢出原因。
 *
 * 标题列默认带 11px 上内边距，与右侧玻璃面板构成设计稿里那条**错位基线**；
 * 它不是对齐失误，`baseline="flat"` 才是例外。
 *
 * 标题用 `<h1>`，每屏有且只有一个，用于读屏的页面大纲。
 */
export const PageHeader = ({
  title,
  lead,
  leadOffset = "base",
  leadOffsetPx,
  baseline = "aligned",
  aside,
  asideWidth = 360,
  children,
  description,
  actions,
  className,
}: PageHeaderProps) => {
  const leadContent = lead ?? description;
  const effectiveOffset: LeadOffset = baseline === "flat" ? "flat" : leadOffset;

  return (
    <div
      className={twMerge("grid items-start gap-6", className)}
      style={aside ? { gridTemplateColumns: `minmax(0, 1fr) ${asideWidth}px` } : undefined}
    >
      <div className={twMerge("min-w-0", baseline === "aligned" && "pt-[11px]")}>
        <h1 className="m-0 text-[length:var(--lili-type-page-title-size)] leading-[var(--lili-type-page-title-leading)] font-semibold tracking-[var(--lili-type-page-title-tracking)] text-[rgb(var(--lili-text-primary))]">
          {title}
        </h1>
        {leadContent && (
          <PageLead offset={effectiveOffset} offsetPx={leadOffsetPx}>
            {leadContent}
          </PageLead>
        )}
        {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
        {children}
      </div>
      {aside}
    </div>
  );
};

export { PageLead, type LeadOffset };
