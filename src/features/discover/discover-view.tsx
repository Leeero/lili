import type { CSSProperties, ReactNode } from "react";

import { RiPauseLargeFill, RiPlayLargeFill } from "@remixicon/react";

import type { IconName } from "@/ui/primitives/icon";
import type { PillVariant } from "@/ui/primitives/pill";
import type { TagVariant } from "@/ui/primitives/tag";

import { DiscoverHeading } from "./discover-heading";
export interface DiscoverTag {
  key: string;
  label: string;
  variant: TagVariant;
}
export interface DiscoverFilter {
  key: string;
  label: string;
  variant: PillVariant;
  icon?: IconName;
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}
export interface DiscoverHero {
  badge: string;
  ratioNote: string;
  tag: string;
  title: string;
  meta: string;
  tags: DiscoverTag[];
  artVariant?: "heroCard" | "heroList";
  art?: string;
  artPlaceholder?: string;
  artKey?: string;
  onPlay?: () => void;
}
export interface DiscoverAlbum {
  key: string;
  badge: string;
  title: string;
  meta: string;
  tags: DiscoverTag[];
  art?: string;
  artKey?: string;
  artPlaceholder?: string;
  duration?: string;
  current?: boolean;
  onPlay?: () => void;
}
export interface DiscoverViewProps {
  title: string;
  lead: string;
  filters: DiscoverFilter[];
  /**
   * 语义筛选控件。**传了它就用它替代 `filters` 的默认渲染。**
   *
   * 真实路径用它传入 `SegmentedControl`：「音乐分区 / 新碟与新歌」是**互斥二选一**
   * 的数据源，分段控件才有这个语义 —— 激活项反色、方向键在两档间循环、
   * 读屏听到的是「已选中」而不是「又一个按钮」。用一排并列药丸表达互斥关系，
   * 用户只能靠颜色猜哪个是当前的。
   *
   * 夹具路径**不传**，走 `filters` 的静态药丸渲染（那一屏的 5 枚药丸是
   * 「全部播放 / 随机播放 / 数据源 · … / 去重后合并 27 条 / 显示模式 · 卡片」，
   * 本来就不是互斥选项，不该被强行改成分段）。
   */
  filterControl?: ReactNode;
  /**
   * 内容区。**传了它就用它替代 `hero` 与专辑网格两整段。**
   *
   * 存在的理由：切换数据源（"音乐分区 / 新碟与新歌"）时**页面框必须常驻**。
   * 若像早先那样让页面在 loading / error / empty 时整个早退成 `<PageState>`，
   * 数据源控件会连同内容一起被卸载重建 —— 每次点击都闪一下，而且刚点下去的那
   * 一档在视觉上"消失"了半秒，用户会以为自己点空了。
   *
   * 正确做法是**骨架常驻、只有数据区换状态**：调用方在 loading / error / empty
   * 时往这里传 `<PageState>`，`ready` 时**不传**（走 `hero` + `albums` 的正常渲染）。
   */
  content?: ReactNode;
  heroSectionTitle: string;
  hero: DiscoverHero | null;
  albumSectionTitle: string;
  albums: DiscoverAlbum[];
  note?: string;
  children?: ReactNode;
}
export const DISCOVER_RHYTHM = {
  leadMarginTop: 18,
  filterMarginTop: 13,
  sectionGap: 25,
  sectionHeadMarginBottom: 3,
} as const;

export const DiscoverView = (props: DiscoverViewProps) => {
  const { title, lead, filters, filterControl, content, hero, albumSectionTitle, albums, children } = props;
  return (
    <div className="discover4188">
      {/* 页头与列表分支**同一个组件**（`DiscoverHeading`）：两个展示模式的页头
          几何因此只有一处描述，不可能再漂移。 */}
      <DiscoverHeading
        title={title}
        lead={lead}
        filters={filters}
        filterControl={filterControl}
        onPillPress={filter => filter.onPress?.()}
      />
      <DiscoverBody content={content} hero={hero} sections={[{ title: albumSectionTitle, albums }]} />
      {children}
    </div>
  );
};

export interface DiscoverBodyProps {
  /**
   * 传了它就整段替换 hero 与各专辑段（加载 / 失败 / 空态）。
   *
   * 存在的理由：数据源从「视频流」收敛成「新碟 banner + 新歌 + 综合推荐」三份
   * 音乐中心数据后，加载 / 失败 / 空态要**只换内容区、不换页面框**。若让页面在
   * 这些态整个早退成 `<PageState>`，每次切换/重试都会闪一下。调用方在
   * loading / error / empty 时传 `<PageState>`，`ready` 时不传（走正常渲染）。
   */
  content?: ReactNode;
  hero: DiscoverHero | null;
  /** 一个或多个专辑段，按序渲染在 hero 之后。 */
  sections: DiscoverSection[];
}

export interface DiscoverSection {
  /** 段标题，如「新歌」「综合推荐」。 */
  title: string;
  albums: DiscoverAlbum[];
}

/**
 * 发现音乐的**内容区**（hero + 若干专辑段），不含页头。
 *
 * 拆出来的理由：真实路径（`pages/music-recommend`）按产品要求**不要页头**
 * —— 首屏直接铺内容，改为「新碟 hero + 新歌 + 综合推荐」多段。夹具路径仍走
 * `DiscoverView`（页头 + 本组件的单段形态），屏 07 的保真比对因此不受影响，
 * 而内容区的装配两处只有这一份。
 */
export const DiscoverBody = ({ content, hero, sections }: DiscoverBodyProps) => (
  <>
    {content ?? (
      <>
        {hero && (
          <section className="discover4188-hero">
            <div
              className="discover4188-hero-art"
              style={hero.artPlaceholder ? ({ "--discover-art": hero.artPlaceholder } as CSSProperties) : undefined}
            >
              {hero.art && <img src={hero.art} alt={`${hero.title}封面`} />}
              <span className="discover4188-hero-badge">{hero.badge}</span>
              <span className="discover4188-hero-ratio">{hero.ratioNote}</span>
            </div>
            <div className="discover4188-hero-body">
              <span className="discover4188-hero-tag">{hero.tag}</span>
              <h2>{hero.title}</h2>
              <h3>{hero.meta}</h3>
              {hero.tags.length > 0 && (
                <div className="discover4188-hero-tags">
                  {hero.tags.map(tag => (
                    <small key={tag.key}>{tag.label}</small>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className="discover4188-hero-play"
              aria-label={`播放 ${hero.title}`}
              onClick={hero.onPlay}
            >
              <RiPlayLargeFill size={24} />
            </button>
          </section>
        )}
        {sections
          .filter(section => section.albums.length > 0)
          .map(section => (
            <section key={section.title} className="discover4188-section">
              <div className="discover4188-section-head">
                <h2>{section.title}</h2>
              </div>
              <div className="discover4188-grid">
                {section.albums.map(album => (
                  <article
                    key={album.key}
                    className={album.current ? "discover4188-card is-playing" : "discover4188-card"}
                    aria-current={album.current || undefined}
                  >
                    <div className="discover4188-art">
                      {album.art ? (
                        <img src={album.art} alt={`${album.title}封面`} />
                      ) : (
                        <span
                          className="discover4188-art-fallback"
                          style={
                            album.artPlaceholder
                              ? ({ "--discover-art": album.artPlaceholder } as CSSProperties)
                              : undefined
                          }
                        />
                      )}
                      {album.current && <span className="discover4188-playing">播放中</span>}
                      <button
                        type="button"
                        aria-label={`${album.current ? "暂停" : "播放"} ${album.title}`}
                        onClick={album.onPlay}
                      >
                        {album.current ? <RiPauseLargeFill size={22} /> : <RiPlayLargeFill size={22} />}
                      </button>
                      {album.duration && <time>{album.duration}</time>}
                    </div>
                    <strong>{album.title}</strong>
                    <span>{album.meta}</span>
                    <small>{album.badge}</small>
                  </article>
                ))}
              </div>
            </section>
          ))}
      </>
    )}
  </>
);
