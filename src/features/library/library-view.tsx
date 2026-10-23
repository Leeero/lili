import type { ReactNode } from "react";

import ScrollContainer from "@/components/scroll-container";
import { FilterBar } from "@/ui/patterns/filter-bar";
import { InfoPanel } from "@/ui/patterns/info-panel";
import { MediaGrid } from "@/ui/patterns/media-grid";
import { MediaTile } from "@/ui/patterns/media-tile";
import { PageHeader } from "@/ui/patterns/page-header";
import { Section } from "@/ui/patterns/section";
import { Button } from "@/ui/primitives/button";
import { Icon } from "@/ui/primitives/icon";

import type { LibraryTile } from "./model";

import { LIBRARY_TILE_ACTIONS } from "./fixture";

export interface LibraryViewProps {
  lead: ReactNode;
  /** 页面内分类 tab（我创建的 / 我追的），渲染在页头正下方。 */
  tabs?: ReactNode;
  overviewLines: string[];
  /** 我创建的：自建收藏夹 + 自建合集/系列（徽标区分类型）+ 本地目录。 */
  createdTiles: LibraryTile[];
  /** 我追的：收藏的收藏夹 + 收藏的合集。 */
  followedTiles: LibraryTile[];
  /** 操作带常驻露出的瓦片 key（夹具演示位；真实模式为空 —— 露出交给悬停）。 */
  demoActionKeys: string[];
  onTilePress: (tile: LibraryTile) => void;
  /** 瓦片操作带的动作。actionKey 为 LIBRARY_TILE_ACTIONS 的 key。 */
  onTileAction: (tile: LibraryTile, actionKey: string) => void;
  onPlayAll: () => void;
  onShuffleAll: () => void;
  /** 批量动作执行中（按钮 loading）。 */
  bulkPending?: boolean;
  /** 真实页面：壳层已标识页面名，去掉页头，只保留操作工具条。 */
  compact?: boolean;
  /** 当前 tab 没有内容时的页内空态（tab 与工具栏仍保留）。 */
  emptyState?: ReactNode;
}

const renderTile = (
  tile: LibraryTile,
  demo: boolean,
  onTilePress: LibraryViewProps["onTilePress"],
  onTileAction: LibraryViewProps["onTileAction"],
) => (
  <MediaTile
    key={tile.key}
    title={tile.title}
    meta={tile.meta}
    art={tile.cover}
    artGradient={tile.coverGradient}
    artKey={tile.artKey}
    badge={tile.badge}
    badgeVariant={tile.badgeVariant}
    actions={LIBRARY_TILE_ACTIONS.map(action => ({
      key: action.key,
      label: action.label,
      icon: action.icon,
      onPress: () => onTileAction(tile, action.key),
    }))}
    forceActionsVisible={demo}
    onPress={() => onTilePress(tile)}
  />
);

/**
 * 「我的音乐库」的呈现层（C+ 第 01 屏）。
 *
 * 数据装配在 `pages/library` —— 真实路径与 `?fixture=01-library` 夹具路径
 * 在这里汇成同一组 props，渲染代码只有一份。结构对齐设计稿第 2 页：
 * 两栏页头（左标题列 + 右库概览面板）→ 两个瓦片分组。
 *
 * 注解带**不在本组件里**：它 `position: absolute; top 693`，定位上下文是
 * 壳层的 `<main>`（相对内容区顶部 71 的权威值见 spec-lock noteTop），
 * 必须是滚动容器的兄弟节点 —— 放进滚动内容里它会随内容滚走，
 * 而设计稿里它是叠在内容之上的固定层（滚动时行从它下面经过）。
 */
export const LibraryView = ({
  lead,
  tabs,
  overviewLines,
  createdTiles,
  followedTiles,
  demoActionKeys,
  onTilePress,
  onTileAction,
  onPlayAll,
  onShuffleAll,
  bulkPending = false,
  compact = false,
  emptyState,
}: LibraryViewProps) =>
  demoActionKeys.length === 0 ? (
    // asset4188-scroll：给瓦片悬停底板让出左右各 12px 的外扩画布（见
    // features/assets/assets-4188.css 顶部）。页面内边距会把内容落点补回去。
    <ScrollContainer enableBackToTop className="asset4188-scroll h-full">
      <div className="asset4188-page">
        {compact ? (
          <>
            <h1 className="sr-only">我的音乐库</h1>
            <div className="asset4188-page-bar">
              <div className="asset4188-page-bar-tabs">{tabs}</div>
              <div className="asset4188-actions">
                <button type="button" className="is-primary" disabled={bulkPending} onClick={onPlayAll}>
                  全部播放
                </button>
                <button type="button" disabled={bulkPending} onClick={onShuffleAll}>
                  随机播放
                </button>
              </div>
            </div>
            {emptyState}
          </>
        ) : (
          <>
            <header className="asset4188-head">
              <div>
                <span className="asset4188-eyebrow">音乐库</span>
                <h1>我的音乐</h1>
                <p>{lead}</p>
              </div>
              <div className="asset4188-actions">
                <button type="button" className="is-primary" disabled={bulkPending} onClick={onPlayAll}>
                  全部播放
                </button>
                <button type="button" disabled={bulkPending} onClick={onShuffleAll}>
                  随机播放
                </button>
              </div>
            </header>
            {tabs}
            {emptyState}
          </>
        )}
        {createdTiles.length > 0 && (
          <LibrarySection
            title={`我创建的 · ${createdTiles.length}`}
            tiles={createdTiles}
            onTilePress={onTilePress}
            onTileAction={onTileAction}
          />
        )}
        {followedTiles.length > 0 && (
          <LibrarySection
            title={`我追的 · ${followedTiles.length}`}
            tiles={followedTiles}
            onTilePress={onTilePress}
            onTileAction={onTileAction}
          />
        )}
      </div>
    </ScrollContainer>
  ) : (
    // 壳层的 <main> 已是地标，这里用 div，不再嵌套第二个 main。
    <ScrollContainer enableBackToTop className="h-full w-full">
      <div className="w-full">
        <PageHeader
          title="我的音乐库"
          lead={lead}
          leadOffset="low"
          aside={<InfoPanel eyebrow="库概览" items={overviewLines} />}
        >
          <FilterBar label="音乐库操作" gap="tight">
            <Button variant="primary" loading={bulkPending} onClick={onPlayAll}>
              全部播放
            </Button>
            <Button variant="secondary" disabled={bulkPending} onClick={onShuffleAll}>
              随机播放
            </Button>
          </FilterBar>
        </PageHeader>

        {tabs}

        {createdTiles.length > 0 && (
          <Section title={`我创建的 · ${createdTiles.length} 个播放列表`}>
            <MediaGrid columns={4}>
              {createdTiles.map(tile => renderTile(tile, demoActionKeys.includes(tile.key), onTilePress, onTileAction))}
            </MediaGrid>
          </Section>
        )}

        {followedTiles.length > 0 && (
          <Section title={`我追的 · ${followedTiles.length} 个播放列表`}>
            <MediaGrid columns={4}>
              {followedTiles.map(tile =>
                renderTile(tile, demoActionKeys.includes(tile.key), onTilePress, onTileAction),
              )}
            </MediaGrid>
          </Section>
        )}
      </div>
    </ScrollContainer>
  );

const LibrarySection = ({
  title,
  tiles,
  onTilePress,
  onTileAction,
}: {
  title: string;
  tiles: LibraryTile[];
  onTilePress: LibraryViewProps["onTilePress"];
  onTileAction: LibraryViewProps["onTileAction"];
}) => (
  <section className="asset4188-section">
    <div className="asset4188-section-head">
      <h2>{title}</h2>
    </div>
    <div className="asset4188-grid">
      {tiles.map(tile => (
        <article key={tile.key} className="asset4188-card">
          <div
            className="asset4188-card-art"
            style={tile.coverGradient ? { backgroundImage: tile.coverGradient } : undefined}
          >
            {tile.cover && <img src={tile.cover} alt="" />}
            {/* 封面整块可点进入详情。操作带按钮在其上（更高层），
                stopPropagation 后不触发跳转 —— 与 MediaTile 的透明按钮同模式。 */}
            <button
              type="button"
              aria-label={`查看 ${tile.title}`}
              className="asset4188-card-art-hitbox"
              onClick={() => onTilePress(tile)}
            />
            <span className="asset4188-card-badge">{tile.badge}</span>
            <span className="asset4188-card-actions">
              {LIBRARY_TILE_ACTIONS.map(action => (
                <button
                  key={action.key}
                  type="button"
                  aria-label={`${action.label} ${tile.title}`}
                  onClick={event => {
                    event.stopPropagation();
                    onTileAction(tile, action.key);
                  }}
                >
                  {/* 完整动作名在 aria-label；视觉用词汇表图标。曾渲染
                      `label.slice(0, 1)` 只露首字 —— 「下一首」与「下载音频」
                      同显一个「下」，用户无法分辨悬浮按钮是什么。 */}
                  <Icon name={action.icon} size={16} />
                </button>
              ))}
            </span>
          </div>
          <button type="button" className="asset4188-card-link" onClick={() => onTilePress(tile)}>
            <strong>{tile.title}</strong>
            <small>{tile.meta ?? tile.badge}</small>
          </button>
        </article>
      ))}
    </div>
  </section>
);
