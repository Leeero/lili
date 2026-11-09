import type { ReactNode } from "react";

import ScrollContainer from "@/components/scroll-container";
import { AssetTrackList } from "@/features/assets/asset-track-list";
import { FilterBar } from "@/ui/patterns/filter-bar";
import { PageHeader } from "@/ui/patterns/page-header";
import { Section } from "@/ui/patterns/section";
import {
  TrackArt,
  TrackCell,
  TrackIndex,
  TrackMain,
  TrackTable,
  TrackTableActions,
  TrackTableRow,
  TrackText,
  type TrackActionSpec,
  type TrackTableColumn,
} from "@/ui/patterns/track-table";
import { Button } from "@/ui/primitives/button";
import { Pill } from "@/ui/primitives/pill";

/** 药丸种类：夹具与真实路径共用的展示形状。 */
export type DetailPillKind = "primary" | "secondary" | "neutral" | "accent";

export interface DetailPill {
  kind: DetailPillKind;
  label: string;
}

/** 曲目行：夹具与真实路径汇成的同一视图模型。 */
export interface DetailTrackRow {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  /** 第三列「收藏于 · 分P」。 */
  cell: string;
  /** 时长列（右对齐）。 */
  duration: string;
  /** 真实封面地址（真实路径）。夹具不用它，走 placeholder。 */
  art?: string;
  /** 稳定占位键（真实路径用领域 ID）。 */
  artKey?: string;
  /** 显式占位渐变（夹具：artIndex 指向 placeholder-art 的 gradients）。 */
  placeholder?: string;
  current?: boolean;
}

export interface PlaylistDetailViewProps {
  title: string;
  lead: ReactNode;
  /** 页面内分类 tab（收藏夹 / 合集 / 系列），渲染在页头正下方。 */
  tabs?: ReactNode;
  pills: DetailPill[];
  sectionTitle: string;
  columns: TrackTableColumn[];
  tracks: DetailTrackRow[];
  /** 行内操作带的动作（播放 / 下一首 / 入队 / 收藏 / 下载）。五枚并列，无主操作档。 */
  rowActions: readonly TrackActionSpec[];
  /** 常驻露出操作带的行 id（夹具演示位：设计稿第 04 行）。 */
  demoActionRowIds: string[];
  onPillPress: (pill: DetailPill) => void;
  onRowAction: (row: DetailTrackRow, actionKey: string) => void;
}

/**
 * 「我的收藏 · 详情」的呈现层（C+ 第 02 屏）。
 *
 * 数据装配在 `pages/video-collection` —— 真实路径（getFavFolderInfo /
 * getFavResourceList 三条数据通路）与 `?fixture=02-playlist-detail` 夹具路径
 * 在这里汇成同一组 props，渲染代码只有一份。结构对齐设计稿第 3 页：
 *
 *   单栏页头（标题 + 导语 + 筛选条 5 药丸）→ 分组（标题 + 曲目表 4 行）。
 *
 * 与施工矩阵 02 的「页头两栏 + 右 InfoPanel」描述**不符**：像素取证确认设计稿
 * 第 3 页页头是单栏（右栏 x960–1380 在 y<296 区域为纯底板，无玻璃面板），
 * 矩阵文档的描述有误。真值优先：实现按设计稿，页头**不渲染**右栏 InfoPanel。
 *
 * 注解带与下载弹层**不在本组件里**：注解带 `position: absolute; top 653`，
 * 定位上下文是壳层的 `<main>`，必须是滚动容器的兄弟节点（见屏 01 LibraryView
 * 的同款说明）；下载弹层是交互触发才弹出的浮层，夹具模式恒 `isOpen=false`，
 * 不进入比对探针（spec-lock dialog.rule 明确 left/top 是静态展示位，不进组件几何）。
 * 两者都由页面在 `<PlaylistDetailView>` 的兄弟位置渲染。
 */
export const PlaylistDetailView = ({
  title,
  lead,
  tabs,
  pills,
  sectionTitle,
  columns,
  tracks,
  rowActions,
  demoActionRowIds,
  onPillPress,
  onRowAction,
}: PlaylistDetailViewProps) =>
  demoActionRowIds.length === 0 ? (
    <ScrollContainer enableBackToTop className="h-full w-full">
      <div className="asset4188-page">
        <header className="asset4188-head">
          <div>
            <span className="asset4188-eyebrow">播放列表</span>
            <h1>{title}</h1>
            <p>{lead}</p>
          </div>
          <div className="asset4188-actions">
            {pills.map(pill => (
              <button
                key={pill.label}
                type="button"
                className={pill.kind === "primary" ? "is-primary" : ""}
                onClick={() => onPillPress(pill)}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </header>
        {tabs}
        <div className="asset4188-section-head">
          <h2>{sectionTitle}</h2>
        </div>
        <AssetTrackList
          label={sectionTitle}
          rows={tracks.map(row => ({ ...row, middle: row.cell, end: row.duration }))}
          actions={rowActions}
          onAction={onRowAction}
        />
      </div>
    </ScrollContainer>
  ) : (
    <ScrollContainer enableBackToTop className="h-full w-full">
      <div className="w-full">
        <PageHeader title={title} lead={lead}>
          <FilterBar label="播放列表操作" gap="base">
            {pills.map(pill =>
              pill.kind === "primary" || pill.kind === "secondary" ? (
                <Button key={pill.label} variant={pill.kind} onClick={() => onPillPress(pill)}>
                  {pill.label}
                </Button>
              ) : (
                <Pill key={pill.label} variant={pill.kind}>
                  {pill.label}
                </Pill>
              ),
            )}
          </FilterBar>
        </PageHeader>

        {tabs}

        <Section title={sectionTitle}>
          <TrackTable columns={columns} currentId={tracks.find(row => row.current)?.id}>
            {tracks.map(row => (
              <TrackTableRow key={row.id} trackId={row.id}>
                <TrackIndex value={row.index} />
                <TrackMain>
                  <TrackArt src={row.art} artKey={row.artKey} placeholder={row.placeholder} />
                  <TrackText title={row.title} subtitle={row.subtitle} />
                </TrackMain>
                <TrackCell>{row.cell}</TrackCell>
                <TrackCell align="end">{row.duration}</TrackCell>
                {demoActionRowIds.includes(row.id) && (
                  <TrackTableActions
                    actions={rowActions.map(action => ({
                      ...action,
                      onPress: () => onRowAction(row, action.key),
                    }))}
                  />
                )}
              </TrackTableRow>
            ))}
          </TrackTable>
        </Section>
      </div>
    </ScrollContainer>
  );
