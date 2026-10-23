import type { ReactNode } from "react";

import ContextMenu, { type ContextMenuItem } from "@/components/context-menu";
import ScrollContainer from "@/components/scroll-container";
import { AssetTrackList } from "@/features/assets/asset-track-list";
import { AnnotationBand } from "@/ui/patterns/annotation-band";
import { FilterBar } from "@/ui/patterns/filter-bar";
import { FormatCard, FormatGrid, type AudioFormat } from "@/ui/patterns/format-card";
import { PageHeader } from "@/ui/patterns/page-header";
import { Button } from "@/ui/primitives/button";

export interface LocalMusicCardViewModel {
  id: string;
  format: AudioFormat;
  title: string;
  meta: ReactNode;
  badge: ReactNode;
}

interface LocalMusicViewProps {
  title: ReactNode;
  lead: ReactNode;
  /** 页面内分类 tab（全部目录 / 各真实目录），渲染在页头正下方。 */
  tabs?: ReactNode;
  cards: readonly LocalMusicCardViewModel[];
  note?: ReactNode;
  busy?: boolean;
  selectedId?: string;
  onPlayAll: () => void;
  onShuffle: () => void;
  onRescan: () => void;
  onDelete: () => void;
  onCardPress: (id: string) => void;
  onCardAction: (id: string, action: string) => void;
  /** 真实页面：壳层已标识页面名，去掉页头，只保留操作工具条。 */
  compact?: boolean;
  /** 当前目录/筛选没有曲目时的页内空态（tab 与工具栏仍保留）。 */
  emptyState?: ReactNode;
}

const CARD_ACTIONS: ContextMenuItem[] = [
  { key: "play", label: "立即播放" },
  { key: "play-next", label: "下一首播放" },
  { key: "add-to-playlist", label: "添加到播放列表" },
  { key: "open-file", label: "在文件夹中显示" },
  { key: "delete", label: "从应用删除文件", color: "danger" },
];

const ROW_ACTIONS = [
  { key: "play", label: "立即播放", icon: "play" },
  { key: "play-next", label: "下一首播放", icon: "next" },
  { key: "add-to-playlist", label: "添加到播放列表", icon: "queue-add" },
  { key: "open-file", label: "在文件夹中显示", icon: "folder-open" },
  { key: "delete", label: "从应用删除文件", icon: "trash" },
] as const;

export const LocalMusicView = ({
  title,
  lead,
  tabs,
  cards,
  note,
  busy,
  selectedId,
  onPlayAll,
  onShuffle,
  onRescan,
  onDelete,
  onCardPress,
  onCardAction,
  compact = false,
  emptyState,
}: LocalMusicViewProps) =>
  !note ? (
    <ScrollContainer enableBackToTop className="h-full w-full">
      <div className="asset4188-page">
        {compact ? (
          <>
            <h1 className="sr-only">{title}</h1>
            <div className="asset4188-page-bar">
              <div className="asset4188-page-bar-tabs">{tabs}</div>
              <div className="asset4188-actions">
                <button type="button" className="is-primary" disabled={busy} onClick={onPlayAll}>
                  全部播放
                </button>
                <button type="button" disabled={busy} onClick={onShuffle}>
                  随机播放
                </button>
                <button type="button" disabled={busy} onClick={onRescan}>
                  重新扫描
                </button>
                <button type="button" className="is-danger" disabled={!selectedId || busy} onClick={onDelete}>
                  删除文件
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <header className="asset4188-head">
              <div>
                <span className="asset4188-eyebrow">设备上的音乐</span>
                <h1>{title}</h1>
                <p>{lead}</p>
              </div>
              <div className="asset4188-actions">
                <button type="button" className="is-primary" disabled={busy} onClick={onPlayAll}>
                  全部播放
                </button>
                <button type="button" disabled={busy} onClick={onShuffle}>
                  随机播放
                </button>
                <button type="button" disabled={busy} onClick={onRescan}>
                  重新扫描
                </button>
                <button type="button" className="is-danger" disabled={!selectedId || busy} onClick={onDelete}>
                  删除文件
                </button>
              </div>
            </header>
            {tabs}
          </>
        )}
        {emptyState ?? (
          <section className="asset4188-section">
            <div className="asset4188-section-head">
              <h2>本地曲目 · {cards.length}</h2>
            </div>
            <AssetTrackList
              label="本地曲目"
              rows={cards.map((card, index) => ({
                ...card,
                index: index + 1,
                subtitle: card.meta,
                middle: card.badge,
                end: card.format,
                current: card.id === selectedId,
              }))}
              actions={ROW_ACTIONS}
              onAction={(card, action) => {
                if (action === "play") onCardPress(card.id);
                else onCardAction(card.id, action);
              }}
            />
          </section>
        )}
      </div>
    </ScrollContainer>
  ) : (
    <>
      <ScrollContainer enableBackToTop className="h-full w-full">
        <PageHeader title={title} lead={lead} leadOffset="low">
          <FilterBar label="本地音乐操作" gap="loose">
            <Button variant="primary" loading={busy} onClick={onPlayAll}>
              全部播放
            </Button>
            <Button variant="secondary" disabled={busy} onClick={onShuffle}>
              随机播放
            </Button>
            <Button variant="neutral" disabled={busy} onClick={onRescan}>
              重新扫描
            </Button>
            {/* 按钮名不带「· 二次确认」：确认流程由点击后的弹窗承担（同下载页 1.3.38 的订正）。 */}
            <Button variant="danger" disabled={!selectedId || busy} onClick={onDelete}>
              从应用删除文件
            </Button>
          </FilterBar>
        </PageHeader>
        {tabs}
        <FormatGrid>
          {cards.map(card => (
            <ContextMenu key={card.id} items={CARD_ACTIONS} onAction={action => onCardAction(card.id, action)}>
              <FormatCard
                format={card.format}
                title={card.title}
                meta={card.meta}
                badge={card.badge}
                onPress={() => onCardPress(card.id)}
              />
            </ContextMenu>
          ))}
        </FormatGrid>
      </ScrollContainer>
      {note ? <AnnotationBand anchor="lower">{note}</AnnotationBand> : null}
    </>
  );
