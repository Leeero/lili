import type { ReactNode } from "react";

import ScrollContainer from "@/components/scroll-container";
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

import type { DiscoverFilter } from "./discover-view";

import { DiscoverHeading } from "./discover-heading";

/**
 * 屏 08「发现音乐 · 列表」的**内容区**节奏。
 *
 * 本表现在只剩 `sectionGap` 一项：
 *
 * 导语与筛选条的间距已移交给共享页头 `DISCOVER_HEAD_RHYTHM`（两个展示分支共用，
 * 统一取卡片屏的 18 / 13）。**这不是把两屏的设计稿值抹平了事** —— 设计稿第 9 页
 * 实测导语 192 / 筛选条 236，第 8 页是 202 / 239，两页原本差 10 / 3px；但它们
 * 是**同一个页面的两个展示模式**，用户会在其间来回切换，页头若跟着变，一次切换
 * 会挪动标题与副标题，看着像跳去了别的页面。形式稳定优先，故统一。
 *
 * 代价与范围写清楚：列表屏的导语因此比**它的设计稿**低 10px、筛选条低 3px，
 * 但**内容带一个 y 都不动** —— 首行封面 380 由下面的 `sectionGap` 独立闭合，
 * 表头 346 / 行距 68 同理。被挪的只有页头内部。
 *
 * `sectionGap` 20 来自 spec-lock `screens[07].rhythmImplementation`，
 * 是设计稿第 9 页的实测值（与屏 02 的逐带复核见下）。
 *
 * `sectionHeadMarginBottom` / `sectionHeadHeight` **不在本表里**：本屏取缺省档（8 / 24）。
 * 屏 07 那两条 3 / 24 是被「大卡落在 900 折线以下」的补偿推出来的，本屏表头紧接段标题，
 * 缺省档（8 + 38 = 首行顶 374）自然闭合。
 */
export const DISCOVER_LIST_RHYTHM = {
  /** 段间距（筛选条 → 首段）。spec-lock `screens[07]` 实测 20，显式下发。 */
  sectionGap: 20,
} as const;

/**
 * 表头「标题」列的左内缩。
 *
 * 指向令牌而不是写死 121：设计稿第 03 / 04 / 09 / 10 / 13 页的表头第二列标签墨迹
 * 一致落在 240/241，即**行内文字列**（列起点 x120 + 封面 100 + 图文间距 21），
 * 不是列起点。121 是派生量，恒等式由 `tests/design-tokens.test.ts` 钉住。
 * 详见 `TrackTableColumn.inset` 与 spec-lock `geometry.listHead`（1.3.22）。
 */
const TITLE_INSET = "var(--lili-layout-head-title-inset)";

/** 列表行：夹具与真实路径汇成的同一视图模型。 */
export interface DiscoverListTrackRow {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  /** 统计列（播放 · 点赞 · 弹幕）。 */
  stats: string;
  /** 时长列（右对齐）。 */
  duration: string;
  /** 真实封面地址（真实路径）。夹具不用它，走 placeholder。 */
  art?: string;
  /** 稳定占位键（真实路径用领域 ID）。 */
  artKey?: string;
  /** 显式占位渐变（夹具：按行指名 placeholder-art 的档位，不做哈希挑选）。 */
  placeholder?: string;
}

export interface DiscoverListViewProps {
  title: string;
  lead: ReactNode;
  filters: DiscoverFilter[];
  /**
   * 语义筛选控件。**传了它就用它替代 `filters` 的默认渲染** —— 理由与
   * `DiscoverViewProps.filterControl` 相同：「音乐分区 / 新碟与新歌」是互斥二选一
   * 的数据源，该用分段控件表达，而不是一排并列药丸。夹具路径不传（那一屏的
   * 药丸是静态标记，不是互斥选项）。
   */
  filterControl?: ReactNode;
  /**
   * 内容区。**传了它就用它替代曲目表那一整段。**
   *
   * 存在的理由与 `DiscoverViewProps.content` 相同：切换数据源时**页面框必须常驻**。
   * 让页面在 loading / error / empty 时整个早退成 `<PageState>` 会把数据源控件一起
   * 卸载重建 —— 每次点击闪一下，且刚点下的那一档会在视觉上"消失"半秒。
   * 骨架常驻、只有数据区换状态才是对的。
   */
  content?: ReactNode;
  sectionTitle: string;
  columns: TrackTableColumn[];
  tracks: DiscoverListTrackRow[];
  /** 行内操作带的动作（播放 / 下一首 / 入队 / 收藏 / 下载音频）。五枚并列，无主操作档。 */
  rowActions: readonly TrackActionSpec[];
  /** 常驻露出操作带的行 id（夹具演示位：设计稿第 04 行）。 */
  demoActionRowIds: string[];
  onPillPress: (filter: DiscoverFilter) => void;
  onRowAction: (row: DiscoverListTrackRow, actionKey: string) => void;
}

/**
 * 「发现音乐」的呈现层（C+ 第 08 屏，列表分支）。
 *
 * 结构对齐设计稿第 9 页：单列页头（H1 + 导语 + 筛选条 5 药丸）→ 分组（段标题 +
 * 曲目表 5 行）→ 注解带（**不在本组件里**，见下）。
 *
 * 为什么与 `DiscoverView`（卡片分支）分成两个组件，而不是一个组件两种模式：
 * 两屏的**注解带落法不同**。屏 07 的注解带按页流排在内容之后（`anchor="inline"`，
 * 该页画板高 978，注解在 900 折线以下）；屏 08 的注解带是 900 视口内的真实内容
 * （墨迹 728–760），必须用**缺省锚点**（`top: 653`，绝对定位），而缺省锚点的定位
 * 上下文是**壳层的 `<main>`** —— `ScrollContainer` 自己的根是 `position: relative`
 * （overlayscrollbars 的 `[data-overlayscrollbars]` 规则），把注解带排在
 * `<ScrollContainer>` 内部只会让它相对滚动容器定位（起于 y=104，落到 757，低 33px）。
 * 所以注解带必须是 `<ScrollContainer>` 的**兄弟**，即由页面渲染 —— 与本屏同构的
 * `PlaylistDetailView`（屏 02）采用的是同一处置。
 */
export const DiscoverListView = ({
  title,
  lead,
  filters,
  filterControl,
  content,
  sectionTitle,
  columns,
  tracks,
  rowActions,
  demoActionRowIds,
  onPillPress,
  onRowAction,
}: DiscoverListViewProps) => (
  <ScrollContainer enableBackToTop className="h-full w-full">
    {/* 右侧留 14 给滚动条 —— 理由同 `.discover4188`：滚动条是覆盖式的、不占布局
        宽度，最右列（本屏是右对齐的时长列）会被压掉 10px。 */}
    <div className="w-full pr-[14px]">
      {/* 页头与卡片分支**同一个组件**（`DiscoverHeading`）。 */}
      <DiscoverHeading
        title={title}
        lead={lead}
        filters={filters}
        filterControl={filterControl}
        onPillPress={onPillPress}
      />

      {/*
        页头之后是内容区。**给了 `content` 就整段替换**（曲目表不渲染），这样加载 /
        失败 / 空态只换这一块，页头与两个分段控件始终挂载 —— 切换数据源时不会闪。
        详见 `DiscoverListViewProps.content`。
      */}
      {content ?? (
        <Section title={sectionTitle} gapPx={DISCOVER_LIST_RHYTHM.sectionGap}>
          {/*
            **不传 `currentId`**：设计稿本屏第 04 行只有操作带常驻露出，**没有**整行高亮。
            取证：该行与相邻行在操作带之外（x850–1300）逐行比较，列中位差 = 0.0；
            行 3 / 4 / 5 的列中位同为 7.00（同一条底板垂直渐变）。而原型的
            `.track-row.is-current::before`（7% 白）会让同行中位变成 26.0。
            详见 spec-lock `screens[07].rowStateRule` 与 `geometry.list.currentStateNote`。
          */}
          <TrackTable columns={columns}>
            {tracks.map(row => (
              <TrackTableRow key={row.id} trackId={row.id}>
                <TrackIndex value={row.index} />
                <TrackMain>
                  <TrackArt src={row.art} artKey={row.artKey} placeholder={row.placeholder} />
                  <TrackText title={row.title} subtitle={row.subtitle} />
                </TrackMain>
                <TrackCell>{row.stats}</TrackCell>
                <TrackCell align="end">{row.duration}</TrackCell>
                {/*
                  操作带走 `TrackTableActions` 的**缺省右偏移公式**：设计稿本屏带子右缘
                  画布 x812，与屏 02 同（屏 06 右缘 x1152 才需要 `right-[224px]` 覆写）。
                */}
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
      )}
    </div>
  </ScrollContainer>
);

/**
 * 表头列定义（屏 08）。**四个标签由夹具给出（那是数据），列位与内缩在这里
 * （那是几何）** —— 夹具不该知道「第二列要内缩 121px」。
 *
 * 只有第二列带 `inset`：它是行内「缩略图 + 标题/副标题」那一列的标签，设计稿把
 * 它对齐到文字列（x241）而不是列起点（x120）。其余三列都在列起点 / 列尾对齐，
 * 与行内单元格一致。
 *
 * 四个 `key` 与 `TrackTable` 的 `base` 变体模板（`56px minmax(0,1fr) col-4
 * col-5`）逐列对应；列宽是表与行的共享几何，不在这里重复。
 */
export const discoverListColumns = (labels: readonly string[]): TrackTableColumn[] => [
  { key: "index", label: labels[0] },
  { key: "content", label: labels[1], inset: TITLE_INSET },
  { key: "stats", label: labels[2] },
  { key: "duration", label: labels[3], align: "end" },
];
