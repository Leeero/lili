import type { ReactNode } from "react";

import type { PillVariant } from "@/ui/primitives/pill";

import ContextMenu, { type ContextMenuItem } from "@/components/context-menu";
import ScrollContainer from "@/components/scroll-container";
import { AnnotationBand } from "@/ui/patterns/annotation-band";
import { FilterBar } from "@/ui/patterns/filter-bar";
import { InlineProgress } from "@/ui/patterns/inline-progress";
import { PageHeader } from "@/ui/patterns/page-header";
import { Section } from "@/ui/patterns/section";
import {
  TrackArt,
  TrackCell,
  TrackIndex,
  TrackTable,
  TrackTableRow,
  TrackText,
  type TrackTableColumn,
} from "@/ui/patterns/track-table";
import { Button } from "@/ui/primitives/button";
import { Icon } from "@/ui/primitives/icon";
import { PageState } from "@/ui/states/page-state";

import type { DownloadTaskCapabilities } from "./model";

export interface DownloadRowViewModel {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  status: string;
  progress?: number;
  size: string;
  art?: string;
  artKey?: string;
  placeholder?: string;
  /**
   * 该行操作带的门控真值（`getDownloadTaskCapabilities` 的计算结果）。
   *
   * **不要**用 `status` 展示文案反推可用操作 —— 早期实现是
   * `row.status.includes("完成")` 这类字符串匹配，等于把展示字符串当状态机：
   * `canOpen` 还要求 `savePath` 存在，文案匹配查不到；改文案会静默破坏门控。
   * 门控判断只有 model 层一份，视图消费它的结论。
   */
  capabilities: DownloadTaskCapabilities;
}

export interface DownloadPillViewModel {
  key: string;
  label: ReactNode;
  variant: PillVariant;
  disabled?: boolean;
  /** 原生 title 提示（如「打开下载目录」截断后的完整路径）。 */
  title?: string;
}

export const downloadColumns = (labels: readonly string[]): TrackTableColumn[] => [
  { key: "index", label: labels[0] },
  { key: "file", label: labels[1], inset: "var(--lili-layout-head-title-inset)" },
  { key: "status", label: labels[2] },
  { key: "size", label: labels[3], align: "end" },
];

interface DownloadsViewProps {
  title: ReactNode;
  lead: ReactNode;
  /** 页面内分类 tab（全部 / 音频 / 视频），渲染在页头正下方。 */
  tabs?: ReactNode;
  /**
   * 布局形态。**真实路径用 `card`（任务卡片网格），夹具 / 保真度比对用
   * `table`（TrackTable 行表）** —— 这两条路径渲染的是同一份数据视图模型。
   *
   * 此前两者靠 `note` 的有无偶然区分（「有注解带 ⇒ 表格分支」），一个渲染
   * 属性兼任布局开关，读代码时无从知道这层语义；显式 `variant` 把「哪条
   * 路径对应哪种用途」写进类型。`table` 是设计稿第 6 页的冻结形态，`card`
   * 是真实数据路径（与屏 01/04 的「真实路径偏离设计稿」同一批决策）。
   */
  variant: "card" | "table";
  pills: readonly DownloadPillViewModel[];
  sectionTitle: ReactNode;
  columns: TrackTableColumn[];
  rows: readonly DownloadRowViewModel[];
  /** 注解带（夹具路径的设计稿原文）；`variant="card"` 时不渲染。 */
  note?: ReactNode;
  onPillPress: (key: string) => void;
  onRowPress: (id: string) => void;
  onRowAction: (id: string, action: string) => void;
}

const ROW_ACTIONS = {
  open: { key: "open", label: "定位文件" },
  pause: { key: "pause", label: "暂停" },
  resume: { key: "resume", label: "继续" },
  retry: { key: "retry", label: "重试" },
  delete: { key: "delete", label: "删除任务", color: "danger" },
} as const satisfies Record<string, ContextMenuItem>;

/**
 * 行操作带的门控：只认 `capabilities`（model 层按任务真实状态计算）。
 * 「删除」对一切任务可用，不做门控 —— 删除进行中任务的二次确认在
 * `confirmBeforeDelete` 之外由调用方弹窗承担。
 */
const visibleActions = (row: DownloadRowViewModel): ContextMenuItem[] => {
  const actions: ContextMenuItem[] = [];
  const capabilityMap: Array<[boolean, ContextMenuItem]> = [
    [row.capabilities.canOpen, ROW_ACTIONS.open],
    [row.capabilities.canPause, ROW_ACTIONS.pause],
    [row.capabilities.canResume, ROW_ACTIONS.resume],
    [row.capabilities.canRetry, ROW_ACTIONS.retry],
  ];
  for (const [enabled, action] of capabilityMap) if (enabled) actions.push(action);
  actions.push(ROW_ACTIONS.delete);
  return actions;
};

export const DownloadsView = ({
  title,
  lead,
  tabs,
  variant,
  pills,
  sectionTitle,
  columns,
  rows,
  note,
  onPillPress,
  onRowPress,
  onRowAction,
}: DownloadsViewProps) => (
  <>
    <ScrollContainer enableBackToTop className="h-full w-full">
      {variant === "card" ? (
        <div className="manage4188-page">
          <h1 className="sr-only">{title}</h1>
          <div className="manage4188-bar">
            <div className="manage4188-bar-tabs">{tabs}</div>
            <div className="manage4188-actions">
              {pills.map(pill => (
                <button
                  key={pill.key}
                  type="button"
                  disabled={pill.disabled}
                  title={pill.title}
                  className={
                    pill.variant === "primary" ? "is-primary" : pill.variant === "danger" ? "is-danger" : undefined
                  }
                  onClick={() => onPillPress(pill.key)}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
          <section className="manage4188-downloads">
            <h2>{sectionTitle}</h2>
            {rows.length === 0 ? (
              // 空态文案由调用方通过 sectionTitle 给出（全空 / 筛选空两态），
              // 这里只负责占位与视觉，不重复描述原因。
              <PageState kind="empty" className="min-h-[240px]" />
            ) : (
              <div className="manage4188-task-grid">
                {rows.map(row => (
                  <ContextMenu
                    key={row.id}
                    items={visibleActions(row)}
                    onAction={action => onRowAction(row.id, action)}
                  >
                    <article className="manage4188-task">
                      <button type="button" className="manage4188-task-main" onClick={() => onRowPress(row.id)}>
                        {row.art ? <img src={row.art} alt="" /> : <span className="manage4188-task-cover" />}
                        <span>
                          <strong>{row.title}</strong>
                          <small>{row.subtitle}</small>
                        </span>
                      </button>
                      <div className="manage4188-task-status">
                        <span>
                          <b>{row.status}</b>
                          <small>{row.size}</small>
                        </span>
                        {row.progress !== undefined && (
                          <progress max="100" value={row.progress}>
                            {row.progress}%
                          </progress>
                        )}
                      </div>
                      <div className="manage4188-task-actions">
                        {visibleActions(row).map(action => (
                          <button
                            key={action.key}
                            type="button"
                            aria-label={`${action.label} ${row.title}`}
                            onClick={() => onRowAction(row.id, action.key)}
                          >
                            <Icon
                              name={
                                action.key === "delete"
                                  ? "trash"
                                  : action.key === "open"
                                    ? "folder-open"
                                    : action.key === "retry"
                                      ? "refresh"
                                      : action.key === "pause"
                                        ? "pause"
                                        : "play"
                              }
                            />
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </article>
                  </ContextMenu>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <>
          <PageHeader title={title} lead={lead}>
            <FilterBar label="下载管理操作" gap="base">
              {pills.map(pill => (
                <Button
                  key={pill.key}
                  variant={pill.variant}
                  disabled={pill.disabled}
                  title={pill.title}
                  onClick={() => onPillPress(pill.key)}
                >
                  {pill.label}
                </Button>
              ))}
            </FilterBar>
          </PageHeader>
          {tabs}
          <Section title={sectionTitle}>
            <TrackTable variant="download" columns={columns}>
              {rows.map(row => (
                <ContextMenu key={row.id} items={visibleActions(row)} onAction={action => onRowAction(row.id, action)}>
                  <TrackTableRow trackId={row.id}>
                    <TrackIndex value={row.index} />
                    <button
                      type="button"
                      className="relative z-[1] flex min-w-0 items-center gap-[var(--lili-layout-track-gap)] text-left"
                      onClick={() => onRowPress(row.id)}
                    >
                      <TrackArt src={row.art} artKey={row.artKey} placeholder={row.placeholder} />
                      <TrackText title={row.title} subtitle={row.subtitle} />
                    </button>
                    <TrackCell>
                      <InlineProgress
                        label={row.status}
                        percent={row.progress}
                        className={row.progress === undefined ? undefined : "translate-y-1"}
                      />
                    </TrackCell>
                    <TrackCell align="end">{row.size}</TrackCell>
                  </TrackTableRow>
                </ContextMenu>
              ))}
            </TrackTable>
          </Section>
        </>
      )}
    </ScrollContainer>
    {note ? <AnnotationBand>{note}</AnnotationBand> : null}
  </>
);
