import { useLocation } from "react-router";

import type { TopbarSegment } from "@/layout/route-shell";

import { SegmentedControl, type SegmentItem } from "@/ui/primitives/segmented-control";

interface SegmentNavProps {
  segments: TopbarSegment[];
  /** 当前激活分段的 key，由 `resolveRouteShell` 给出。 */
  activeKey: string;
  /** 分段组右侧的弱化说明（如 `/` 的「已下线: 流行 / 鬼畜」）。 */
  note?: string;
  /**
   * 视觉形态，缺省 `underline`。
   *
   * 2026 的分段组已从「顶栏反色药丸」迁到「内容区下划线 tab」（QQ 音乐式）：
   * 页面内二级导航现在落在各页标题正下方、贴着内容，不再悬浮在顶栏里。保留
   * `pill` 只为一处遗留 —— 沉浸态（`/now-playing`）的「封面 / 歌词 / 视频」
   * 模式段与既有设计系统展示页，它们走 `SegmentedControl` 而非本组件。
   */
  variant?: "pill" | "underline";
  className?: string;
}

/**
 * 分段导航 —— 路由契约（`TopbarSegment[]`）到 `SegmentedControl` 的适配层。
 *
 * 这个文件只剩下「翻译」，视觉与语义全部由 `SegmentedControl` 承担。此前的
 * 内联实现与组件层是同一份设计的两个副本，而那份副本里有三处取值是**临时收敛**：
 *
 *   位置             原型（app.css）          内联曾用        现在
 *   .tabgroup 底     白 9%    第 104 行       surface-hover   veil-9
 *   .tab:hover       白 8%    第 122 行       surface-hover   veil-8
 *   .tab 文字        顶栏标签色 第 116 行     text-secondary  text-chrome-label
 *
 * 当时收敛的理由写在旧注释里：那些一次性的白色叠层**没有登记进色板**，
 * 只能挑一个最接近的已有档位（白 10%）顶上。P2 已把 4 / 5.5 / 8 / 9 / 12 /
 * 14 / 18 / 20 / 22 / 28% 十档按实际不透明度登记进 palette.css，收敛的理由
 * 随之消失，所以这里改回原型值。
 *
 * **激活键不是 pathname。** 三段共用同一个 pathname、只靠 query 区分时
 * （`/collection/:id?type=`），拿 pathname 当激活键会让三段全灭。所以激活
 * 判定由契约层（`resolveRouteShell`）给出 `activeKey`，本层只负责传递 ——
 * 「`type` 缺省是 11」这类知识属于那个路由，不属于本组件。
 */
const SegmentNav = ({ segments, activeKey, note, variant = "underline", className }: SegmentNavProps) => {
  const location = useLocation();

  /**
   * 分段 `href` 以 `?` 开头时表示「**只改这些 query**」：路径与其余参数沿用
   * 当前地址。两个好处 —— 夹具模式（`?fixture=…`）下点击分段不会掉出夹具；
   * 用户手改过的其它参数也不会被顺手清掉。
   */
  const resolveHref = (href?: string): string | undefined => {
    if (!href) return undefined;
    if (!href.startsWith("?")) return href;

    const override = new URLSearchParams(href.slice(1));
    const merged = new URLSearchParams(location.search);
    // 先删后加，避免 URLSearchParams.set 在同一键已有多个值时留下残影。
    for (const key of new Set(override.keys())) merged.delete(key);
    for (const [key, value] of override) merged.append(key, value);

    const query = merged.toString();
    return query ? `${location.pathname}?${query}` : location.pathname;
  };

  const items: SegmentItem[] = segments.map(segment => ({
    // 有 `key` 时它是身份（query 型分段）；没有则用目标路径，再没有则用标签。
    key: segment.key ?? segment.href ?? segment.label,
    label: segment.label,
    // 模板分段（countKey）的计数由调用方组合进 `count`；计数未知时是
    // undefined —— 分隔符与数字一起消失，不渲染悬空尾巴。
    count: segment.count,
    href: resolveHref(segment.href),
    // 没有 href 表示「标签已声明、子视图切换还没接线」，如实渲染为不可交互，
    // 而不是渲染一个点了没反应的按钮。详见 SegmentItem.pending 的说明。
    pending: !segment.href,
  }));

  return (
    <SegmentedControl
      label="页面内分段导航"
      activeKey={activeKey}
      items={items}
      note={note}
      variant={variant}
      className={className}
    />
  );
};

export default SegmentNav;
