# lili 2.0 · C+ 视觉重构方案

> 版本：v1.0　日期：2026-09-25输入依据：[C+ 视觉稿](../../prototypes/c-plus-2026/index.html)（定性卡 + 12 屏 + 色板，设计稿 14 页）前置文档：[lili 2.0 重构实施计划](../lili-refactor-plan.md)（阶段 0–9 已完成）、[当前能力依赖清单](../lili-current-architecture-map.md) 真值文件：[`cplus-spec-lock.json`](./cplus-spec-lock.json)　施工矩阵：[`cplus-screen-matrix.md`](./cplus-screen-matrix.md)　令牌桥接：[`cplus-token-bridge.md`](./cplus-token-bridge.md)

---

## 0. 决策记录

上一轮重构（阶段 0–9）已完成**结构与信息架构**的重构：领域模型、适配层、统一播放列表壳层、统一 Track 动作 API、Electron 安全加固。本轮是**视觉与壳层重构**，把已收敛的结构落到 C+ 视觉稿上。

设计稿与现有实现在四处存在结构性冲突，已逐项确认如下。**这四条是本方案的边界，后续不得单方面变更。**

| # | 冲突点 | 决策 | 影响面 |
| --- | --- | --- | --- |
| 1 | 设计稿是固定 1440×900 画布；现状是弹性布局 | **令牌锚定 + 弹性容器**：实测值固定为令牌，仅中间标题列伸缩 | 全部页面；`tokens` 全量重写 |
| 2 | 设计稿是深色单一皮肤；现状支持亮/暗/跟随 + 自定义主色、圆角、背景色 | **深色为唯一正式皮肤**，移除浅色主题与自定义外观入口 | 主题组件、设置页、`settings` store 读取策略 |
| 3 | 设计稿无左侧栏，导航在 71px 顶栏分段组 | **完全按设计稿**：移除侧栏，顶栏承载品牌 / 分段导航 / 搜索 / 头像，次级入口进头像菜单 | `AppShell`、`layout/`、路由、菜单常量 |
| 4 | 设计稿第 09 屏队列是整页、第 10 屏沉浸态无顶栏无播放栏 | **均改为路由页**：新增 `/queue`、`/now-playing` | 抽屉与全屏播放器组件退役，播放栏「队列」按钮改导航 |

**决策 1 的具体含义**（最容易误解，先讲清楚）：

「令牌锚定」指设计稿的骨架数值是**固定值**而非比例 —— 行高 68、缩略图 100×56、右列 220 + 152、左右留白 64、列表右缩进 40。这些值在任何窗口宽度下都不变。

「弹性容器」指只有**一列**伸缩：曲目行的标题列 `minmax(0, 1fr)`。这正是原型 `app.css` 的实现方式（`.tracklist { --cols: 56px minmax(0,1fr) var(--col4) var(--col5); }`）。

因此窗口大于 1440 时不是整体放大，而是标题列变宽；小于 1440 时标题列收缩并触发省略号，**其余骨架不动**。窗口最小宽度沿用现有 `min-w-[1200px]`。

不采用原型 `.stage` 的整体缩放：那会让 1080p 窗口下全界面缩小、文字发虚，且与 Electron 窗口自由缩放的产品形态冲突。设计画布的 1440×900 只作为**验收基准尺寸**，不作为运行期变换。

---

## 1. 目标与非目标

### 1.1 目标

1. **12 屏逐屏复刻**：在 1440×900 下与设计稿达到硬锚点零偏差、结构带 ±2px、整屏平均亮度差 ≤ 12。
2. **壳层重建**：`AppShell` 改为顶栏 + 内容区 + 播放栏三层；移除侧栏；顶栏分段导航上线。
3. **令牌单一来源**：建立三层令牌（原始色板 / 语义 / 几何），业务代码零字面色值。
4. **组件层重建**：把原型里的 20 余个类（`.tile` `.pill` `.tracklist` `.hero-card` …）落成 `src/ui` 的正式组件。
5. **形态变更落地**：队列与沉浸态从弹层提升为路由页；迷你播放器按设计稿重做。
6. **能力零损失**：所有现有功能（播放、收藏、下载、本地扫描、歌词、快捷键、托盘、更新）在重构后逐项回归通过。
7. **保真可验证**：把「照着视觉稿做」从人工判断变成自动化门禁。

### 1.2 非目标

- **不动** `src/service/`、`src/service/request/`、`electron/network/`、`electron/ffmpeg/`、`electron/updater/`、下载任务执行逻辑、B 站登录与 Cookie 刷新、音频 URL 解析、播放上报。
- **不动** `src/domain/`、`src/adapters/`、`src/features/` 的业务逻辑（只允许为视觉调整补充所需的 ViewModel 字段）。
- **不动** 持久化键名与数据格式：`app-settings`、`user-login-info`、`media-downloads`、`shortcut-settings`、`lyrics-cache`、`play-list` persist、`play-current-time`、`favorites-order`。
- **不新增** 任何后端能力、接口、推荐算法。
- **不新增** 产品能力：所有可见操作必须映射到已有实现。
- **不用** 固定舞台等比缩放。
- **不长期并存** 新旧两套 UI。

### 1.3 与上一轮重构的关系

上一轮的**阶段 10 前置条件**是「页面不再直接消费 Bilibili DTO」与「收藏夹、合集、系列使用统一页面框架」，这两项已完成。本轮在此基础上只改视觉与壳层，因此可以直接按屏切分、逐屏替换，不需要再动数据层。

唯一需要回溯的是**主题收敛**（决策 2）：它会移除用户可见能力，属于产品口径变更，需在发版说明中明确。

---

## 2. 视觉真值源与保真度定义

### 2.1 真值链

```text
设计稿 PDF（14 页）
   ↓ pdftoppm -png -r 110
设计稿 PNG（2200 × 1375，14 页）     ← 终极仲裁者
   ↓ 等比缩放到 1440 × 900
参考画布（1440 × 900）
   ↓ 逐像素测量 + 无头 Chrome 回环校正
prototypes/c-plus-2026/（12 屏 HTML 原型，已验证）
   ↓ 数值抽取
docs/design/cplus-spec-lock.json     ← 冻结的目标值
   ↓
src/ 实现
   ↓ tools/design-fidelity/verify.py 比对设计稿 PNG
PASS / FAIL
```

真值链的关键设计：**原型是达成手段，设计稿 PNG 才是仲裁者**。`spec-lock.json` 记录冻结值用于日常开发，`verify.py` 则直接回到设计稿 PNG 取数，避免「原型与实现一起漂移」的共模失效。

### 2.2 保真度三层判定

| 层 | 判据 | 阈值 | 失败后果 |
| --- | --- | --- | --- |
| L1 硬锚点 | 顶栏 71、播放栏 88、留白 64、行高 68、缩略图 100×56、右列 220/152、右缩进 40、筛选条 48、药丸 36 | **零偏差** | 直接 FAIL，不允许合并 |
| L2 结构带 | H1 / 导语 / 筛选条 / 列表带 / 右列 / 注解带 / 播放栏的 y 位置 | **≤ 2px** | FAIL |
| L3 整屏观感 | 整屏平均亮度差（含渐变、玻璃、光照） | **≤ 12** | FAIL（原型 12 屏实测 7.06–14.55，取 12 为回归上限） |

L3 单独列出是因为它抓的是 L1/L2 抓不到的东西：玻璃模糊强度、遮罩浓度、渐变分布、封面明度。第 10 屏沉浸态的背景就是被 L3 抓出来的（早期版本凭直觉做了「右下蓝光」，与设计稿不符）。

### 2.3 已知容差来源

- 设计稿页是白底文档页内嵌圆角画板，四角约 16 CSS px 圆角。以 H1 左缘实测 66 与画板内留白 64 对齐，**残差 ≤ 2px**，落在 L2 容差内。
- 设计稿为位图（110 dpi 渲染），文字抗锯齿会带来 1px 级抖动。因此 L2 的判据是「带的位置」而非「带的像素级一致」。
- 动态内容（真实封面、真实时长、真实用户名）无法逐像素比对。`verify.py` 使用**固定数据夹具**（fixture）渲染，夹具定义在 `tools/design-fidelity/fixtures/`，与设计稿第 01–12 屏的文案一一对应。

### 2.4 原型基线（起点，非验收线）

`bash tools/design-fidelity/run.sh --all` 对参考原型的实测结果。完整报告：[`evidence/prototype-baseline.txt`](./evidence/prototype-baseline.txt)。

**4 / 12 通过。**

| 屏                 | L3 平均亮度差 | 未通过门禁                                        |
| ------------------ | ------------: | ------------------------------------------------- |
| 01 我的音乐库      |         12.20 | L3, list, right                                   |
| 02 我的收藏 · 详情 |         12.17 | L3                                                |
| 03 稍后播放        |          9.45 | —                                                 |
| 04 本地音乐        |          7.94 | list, right                                       |
| 05 下载管理        |          8.73 | note, rowPitch                                    |
| 06 搜索结果        |          9.18 | filter, list, note, right, rowPitch               |
| 07 发现音乐 · 卡片 |         14.55 | L3, 顶栏, 播放栏, lead, filter, list, note, right |
| 08 发现音乐 · 列表 |          9.66 | —                                                 |
| 09 播放队列        |          7.87 | —                                                 |
| 10 正在播放 · 沉浸 |         11.46 | infoTitle, lyrics                                 |
| 11 设置            |          7.06 | —                                                 |
| 12 迷你播放器      |          9.73 | list, note, right                                 |

这张表的读法：

- **原型是本轮之前达成过的参考实现，不是验收线。** 比对对象始终是设计稿 PNG。原型基线的作用是给每屏一个明确的「必须超过」的起点。
- L1 硬锚点在全 12 屏均已通过（顶栏 Δ1、播放栏 Δ0、内容左留白 Δ0、行距 Δ0），说明**骨架已经被完全锁定**，剩余工作集中在内容带与整屏观感。
- 01 / 02 / 07 的 L3 超过 12，说明这三屏需要超出原型水平：01 的瓦片内部节奏、02 的封面明度、07 的整体光感。这三屏是 P3 的重点。
  - **07 的 14.55 有一大半是参考图的锅**：设计页第 8 页的参考图纵向被压缩 0.9204
    （画板高 978 被强制 resize 回 900，见 [`evidence/reference-page-08-distortion.md`](./evidence/reference-page-08-distortion.md)），
    整屏内容都错位可见，L3 与 `顶栏 / 播放栏 / lead / filter` 几项必然失败。
    **该页已于 2026-09-28 纠正**（`tools/design-fidelity/correct_reference.py`，记录见 `spec-lock.referenceIntegrity.history["8"]`）：
    壳层读数与其余 11 页一致，`screens[06]` 的锚点与节奏换到了 1440×900 口径。
    这张表里的 07 一行仍是**纠正前**的留档 —— 它的真实起点要等该屏实现落地后重测，在那之前不要把它当成能力基线。
- 05 / 06 的 `rowPitch` 未通过，主因是这两屏的列表行内还有第二行文本（下载状态、创作者行），使行距探针取到混合节距 —— 属探针口径问题，P3/P4 收敛时一并核对。

---

## 3. 壳层重建

### 3.1 目标结构

```text
<AppShell>                                    1440 × 900 基准
├── <TopBar>            71px   常驻
│   ├── 品牌 lili         → 导航到 /
│   ├── <SegmentNav>     由当前路由决定的分段组（见 spec-lock.topbarSegments）
│   ├── <SearchField>    占位「搜索音乐视频或创作者」+ Ctrl K
│   └── <AvatarMenu>     我的音乐库 / 发现音乐 / B站历史 / 我的关注 / 设置 / 检查更新 / 关于 / 退出
├── <main>              弹性，min-h-0 overflow-hidden
│   └── 路由内容       左右留白 64px
└── <PlayBar>           88px   常驻（沉浸态路由除外）
```

### 3.2 三个壳层状态

| 状态        | 适用路由                            | 顶栏     | 播放栏   | 容器类              |
| ----------- | ----------------------------------- | -------- | -------- | ------------------- |
| `default`   | 除下列两者外全部                    | 显示     | 显示     | `.stage`            |
| `immersive` | `/now-playing`                      | **隐藏** | **隐藏** | `.stage--immersive` |
| `bare`      | `/mini-player`（Electron 迷你窗口） | 隐藏     | 隐藏     | 独立窗口布局        |

`AppShell` 新增 `chrome?: "default" | "immersive" | "bare"` 受控属性，由路由配置决定，不由组件内部推断。

### 3.3 顶栏分段导航的语义

设计稿 12 屏的顶栏分段组**各不相同**，因此它不是全局导航，而是**上下文分段控件**：

- 内容页：是该页的子视图切换（我的音乐库 → 我的歌单 / 我收藏的 / 发现音乐；设置 → 常规 / 播放 / 高级）。
- 列表页：是该页的筛选维度（稍后播放 → 时间范围；下载管理 → 类型；本地音乐 → 目录；搜索结果 → 结果类型）。
- 详情页：是同级集合类型（收藏夹 · 11 / 合集 · 21 / 系列 · 31）。

落地方式：路由配置声明 `segments`，`TopBar` 渲染。**默认值**取一级导航，保证任何未声明的路由不会没有导航出口。

全局导航出口：品牌 → `/`；头像菜单 → 其余一级入口。这是决策 3 的直接后果，需要在首屏可用性测试中重点验证「能否两次点击内到达任一一级页面」。

### 3.4 路由表

| 路径                             | 页面                               | 变更                 |
| -------------------------------- | ---------------------------------- | -------------------- |
| `/`                              | 发现音乐（默认卡片态，可切列表态） | 默认视图变更         |
| `/library`                       | 我的音乐库                         | 视觉重写             |
| `/collection/:id`                | 播放列表详情                       | 视觉重写             |
| `/later`                         | 稍后播放                           | 视觉重写             |
| `/local-music`                   | 本地音乐                           | 视觉重写             |
| `/download-list`                 | 下载管理                           | 视觉重写             |
| `/search`                        | 搜索结果                           | 视觉重写             |
| `/queue`                         | 播放队列                           | **新增**             |
| `/now-playing`                   | 正在播放（沉浸态）                 | **新增**             |
| `/settings`                      | 设置                               | 视觉重写             |
| `/mini-player`                   | 迷你播放器                         | 视觉重写（独立窗口） |
| `/history` `/follow` `/user/:id` | 延展屏                             | 组件替换，见施工矩阵 |
| `/design-system`                 | 设计系统展示页                     | 升级为活文档         |

### 3.5 侧栏的处置

`src/layout/side/` 整个目录（含 `collection/`、`default-menu/`、`logo/`）随决策 3 **删除**。其中承载的能力重新分配：

| 原侧栏能力 | 新位置 |
| --- | --- |
| 一级导航（发现音乐 / 我的收藏 / 稍后播放 / 本地音乐 / 下载管理） | 头像菜单 + 顶栏分段组 |
| 播放列表列表（含拖拽排序、编辑、新建） | 我的音乐库页（`/library`）的瓦片网格 |
| 侧栏折叠 / 拖拽调宽 | **删除**（设计稿无此交互，`sideMenuCollapsed` / `sideMenuWidth` 字段保留但不再暴露） |
| Logo | 顶栏品牌位 |

`src/common/constants/menus.tsx` 的 `DefaultMenuList` 原计划从「侧栏菜单项」重构为「头像菜单项」并保留 `hiddenMenuKeys` 过滤能力；C+ 落地时侧栏改为从 `layout/route-shell.ts` 的 `PRIMARY_NAV_ITEMS` 派生、过滤接线始终没有发生。该文件已在移除「侧边栏显示」设置时一并删除，`hiddenMenuKeys` 字段不再存在。菜单显隐的替代能力是「我的音乐显示」（`hiddenLibraryKeys`），只作用于 `/library`：见 `src/features/library/grouping.ts`。

---

## 4. 令牌与样式架构

### 4.1 三层令牌

完整映射见 [`cplus-token-bridge.md`](./cplus-token-bridge.md)。结构：

```text
src/ui/tokens/
├── index.css        聚合 @import + 减少动效
├── palette.css      --c-*    原始色板，唯一允许字面色值
├── semantic.css     --lili-*  语义令牌，唯一允许被业务代码引用
└── geometry.css     --lili-layout-* / --lili-text-* / --lili-radius-* / --lili-z-* / --lili-duration-*
```

### 4.2 与现有令牌的兼容处置

| 现有令牌 | 处置 | 原因 |
| --- | --- | --- |
| `--lili-color-canvas/surface/...` | 值替换为 C+ 实测值，语义名保留 | 减少改动面 |
| `--lili-color-brand` | `hsl(var(--heroui-primary))` → `var(--lili-accent)` | 决策 2 移除自定义主色 |
| `--lili-radius-sm/md/lg/xl` | `calc(var(--heroui-radius-medium) ± n)` → 固定 8/12/20/999 | 决策 2 移除自定义圆角 |
| `--lili-topbar-height` 64 | → **71** | 设计稿实测 |
| `--lili-player-height` 84 | → **88** | 设计稿实测 |
| `--lili-sidebar-width` 220 | **删除** | 侧栏移除 |
| `--lili-content-max-width` 1440 | → `none` | 满幅剧场，内容不居中收窄 |
| `--lili-space-*` | 补齐 48 / 64 | 对齐原型 `--sp-12` / `--sp-16` |
| `--lili-duration-*` / `--lili-ease-*` | 缓动改为 `cubic-bezier(0.32, 0.72, 0, 1)` | 以原型为准 |

### 4.3 HeroUI 的保留边界

HeroUI 继续作为**交互与无障碍基础**（焦点管理、键盘导航、Popover/Dialog 定位），但：

- 业务页面不得直接使用 `hsl(var(--heroui-primary))` 等主题变量。
- 业务页面不得直接堆叠 HeroUI 的 `color` / `radius` 属性来表达 C+ 视觉，须经由 `src/ui` 包装层。
- HeroUI 的 `Toast` / `Modal` / `Popover` 保留，外观由 C+ 令牌覆盖。

### 4.4 样式表达方式

现有代码用 Tailwind arbitrary value 引用令牌（`bg-[rgb(var(--lili-color-surface))]`）。这个方式**保留**，因为它在类型安全、tree-shaking 与 IDE 提示上都优于 CSS Modules，且迁移面最小。

新增约束：任意值里只能出现 `var(--lili-*)`，不得出现字面色值。这条由 §7 的护栏强制。

---

## 5. 组件重建清单

原型类 → 目标组件。这是本轮工作量最大的部分，也是「后续所有页面都能按视觉稿做」的前提 —— 组件层建好之后，页面就只是组合。

### 5.1 基础件（`src/ui/primitives/`）

| 原型类 | 组件 | 说明 |
| --- | --- | --- |
| `.pill` `.pill--primary/secondary/neutral/accent` | `Pill` / `Button`（`variant` 受控） | 36px 高，999 圆角，6px 内边距容器内间距 4 |
| `.round` `.round--lead` | `GlassButton` | 玻璃圆片，白 16% + 描边白 + 模糊 20；`lead` 为 56px |
| `.search` | `TopBarSearch` | 顶栏搜索，`Ctrl K` 提示 |
| `.searchfield` | `SearchField` | 70px 高，30px 查询字 |
| `.badge` `.badge--dir` | `Badge` | 来源徽标 |
| `.tag` `.tag--quality` | `Tag` | 音质 / 属性标签 |
| `.kbdrow` | `KbdRow` | 快捷键行，含 `.is-conflict` 冲突态 |
| `.i`（图标） | `Icon` | 基于现有 `@remixicon/react`；不存在时补内联 SVG |

### 5.2 页面模式件（`src/ui/patterns/`）

| 原型类 | 组件 | 关键属性 |
| --- | --- | --- |
| `.topbar` `.tabgroup` `.tab` `.avatar` `.topbar-note` | `TopBar` / `SegmentNav` / `AvatarMenu` | `segments`、`note` |
| `.page-head` `.head-main` | `PageHeader` | `leadOffset`、`baseline`、`aside`、`asideWidth` |
| `.panel` `.panel-eyebrow` `.panel-list` | `InfoPanel` | `eyebrow`、`items` |
| `.filterbar` | `FilterBar` | `gap: tight \| base \| loose` |
| `.section` `.section-head` `.section-title` `.section-note` | `Section` | `gap: tight \| base \| push` |
| `.tracklist` `.track-head` `.track-row` `.track-index` `.track-art` `.track-main` `.track-cell` `.track-actions` | `TrackTable` | `columns`、`variant: download \| settings \| mini \| search`、`currentId`、`onReorder` |
| `.grid` `.tile` `.tile-art` `.tile-copy` `.actionband` | `MediaTile` / `MediaGrid` | `badge`、`actions`、`state: default \| hover \| current` |
| `.hero-card` `.hero-art` `.hero-tag` `.hero-play` | `HeroCard` | `tag`、`onPlay` |
| `.album-grid` `.album-card` `.album-body` | `AlbumCard` / `AlbumGrid` | — |
| `.format-grid` `.format-card` | `FormatCard` / `FormatGrid` | `format`、`count`、`size`、`playable` |
| `.creator-row` `.creator-face` `.follow` | `CreatorRow` | `followed`、`onFollow` |
| `.dl-status` `.dl-label` `.dl-bar` | `InlineProgress` | `label`、`percent`、`state` |
| `.lyrics` `.lyrics-head` `.lyrics-line` | `LyricsPanel` | `lines`、`currentIndex`、`onSeek` |
| `.modal` `.modal--download` `.btn-accent` | `Dialog`（包装 HeroUI Modal） | 固定几何 560 × 153 |
| `.note` | `AnnotationBand` | `anchor: low \| lower \| lowest \| high \| footer \| inline` |
| `.np-*` | `NowPlaying*` 系列（在 `features/player/now-playing/`） | `mode: 封面 \| 歌词 \| 视频` |
| `.mini-*` | `MiniPlayer*` 系列 | — |

### 5.3 组件状态规范

每个组件必须覆盖并可在 `/design-system` 演示：

`default` · `hover` · `pressed` · `focus-visible` · `disabled` · `loading`

`MediaTile` 额外需要 `current`（选中/播放中）与 `actions-visible`（玻璃操作带露出）两态。 `TrackTable` 行额外需要 `is-current` 与 `actions-visible`。

### 5.4 现有组件处置

| 现有组件 | 处置 |
| --- | --- |
| `src/ui/patterns/{page-header,playlist-card,track-row,action-menu}` | 重写（`playlist-card` → `MediaTile`，`track-row` → `TrackTable`） |
| `src/ui/primitives/icon-button` | 保留，接入 C+ 玻璃态变体 |
| `src/ui/states/page-state` | 保留，值替换为 C+ 令牌 |
| `src/components/music-list-item`、`music-page-list`、`virtual-page-list`、`virtual-grid-page-list`、`music-card` | 收敛进 `TrackTable` / `MediaGrid` 后删除 |
| `src/components/music-playlist-drawer` | 提升为 `/queue` 路由页后删除 |
| `src/components/full-screen-player` | 提升为 `/now-playing` 沉浸态路由后删除 |
| `src/components/music-play-progress`、`music-volume`、`music-play-control`、`music-play-mode`、`music-rate` | 保留能力，外观按播放栏 / 沉浸态令牌重绘 |
| `src/components/lyrics`、`lyrics-search-modal` | 保留能力，外观按 `LyricsPanel` 重绘 |
| 其余编辑/选择类弹窗 | 保留，外观统一走 `Dialog` |

**原则**：能力组件（涉及 store / IPC / 音频）保留逻辑、只改外观；纯展示组件（列表、卡片、行）整体替换。

---

## 6. 分阶段执行计划

每个阶段有独立的**出口标准**，未达标不进入下一阶段。阶段内部按屏切分，每屏一个 PR。

### P0 · 冻结与桥接

**交付**：`docs/design/` 四件套（本方案、spec-lock、施工矩阵、令牌桥接）；`tools/design-fidelity/` 三个工具；三层令牌骨架落地；护栏接入 CI。

**出口标准**

- `node tools/design-fidelity/check-literals.mjs` 在现有代码上通过（存量违规已列白名单并标注清理阶段）。
- `tests/design-tokens.test.ts` 扩展为对照 `cplus-spec-lock.json` 逐项断言，通过。
- `pnpm test --run` 通过。
- 「保真度判定流程」在 `/design-system` 上跑通一次（哪怕结果 FAIL，只要报告能生成即可）。

### P1 · 壳层重建

**范围**：`src/app/shell/`、`src/layout/`、`src/routes.tsx`、菜单常量。

**内容**

1. `AppShell` 重写为三层 + `chrome` 受控属性。
2. `TopBar` 上线：品牌 / `SegmentNav` / 搜索 / 头像菜单。
3. `PlayBar` 按 88px 重绘；「队列 · N」按钮改为导航 `/queue`。
4. 新增 `/queue`、`/now-playing` 路由（内容先用占位组件）。
5. `src/layout/side/` 删除；一级导航迁入头像菜单。
6. 主题收敛：`themeMode` 固定深色；移除自定义主色 / 圆角 / 背景色入口。
7. 旧页面在新壳层中可运行（业务逻辑不动）。

**出口标准**

- 12 个目标路由全部可达，不白屏。
- 顶栏 71 / 播放栏 88 / 留白 64 与设计稿一致（L1 硬锚点）。
- 播放器在路由切换时不中断（回归项）。
- 旧设置文件（含浅色主题、自定义主色、自定义圆角）可无损读取。
- `pnpm test --run` 通过，含 `app-shell-interactions.test.ts` 更新。

### P2 · 通用组件层

**范围**：`src/ui/primitives/`、`src/ui/patterns/`、`src/pages/design-system/`。

**出口标准**

- §5 清单中所有组件建成，`/design-system` 每组件有独立展位，标注对应原型类与设计页。
- 每组件覆盖 §5.3 的状态矩阵。
- `ui-components.test.tsx` 覆盖新增组件的可访问名称与键盘路径。
- 组件本身不含任何字面色值。

### P3 · 主流程 4 屏

**范围**：01 我的音乐库（`/library`）、07+08 发现音乐（`/`）、02 播放列表详情（`/collection/:id`）、06 搜索结果（`/search`）。

**出口标准**：四屏各出保真报告 PASS + 能力对齐表完整。

### P4 · 库内子页 3 屏

**范围**：03 稍后播放、04 本地音乐、05 下载管理。

**出口标准**：同上。额外要求下载管理页四态演示与真实任务状态一致。

### P5 · 播放核心 2 屏 + 迷你播放器

**范围**：09 播放队列（`/queue`）、10 正在播放（`/now-playing`）、12 迷你播放器。

**出口标准**

- 队列：拖拽排序、去重规则、清空确认全部回归通过。
- 沉浸态：歌词滚动、频谱、封面背景、多分 P、系统媒体控制、全局快捷键、Mini 切换全部回归通过。
- 抽屉与全屏播放器组件已删除。
- 迷你播放器：托盘菜单、快捷键冲突检测回归通过。

### P6 · 设置 + 延展屏

**范围**：11 设置、`/history`、`/follow`、`/user/:id`、`/collection/:id` 的合集/系列分支。

**出口标准**：设置页保留全部字段与导入导出；延展屏复用 P2 组件，无新增令牌。

### P7 · 清理与发布

**内容**：删除旧组件与死代码、`knip` 清理未使用依赖、README 与截图更新、三平台回归、发版说明（含主题能力移除的明示）。

**出口标准**

- `pnpm test --run`、`pnpm build`、ESLint、Stylelint、Knip 全绿。
- `run.sh --all` 12 屏全 PASS。
- 相比上一正式版本，启动时间 / 空闲内存 / 播放时 CPU 无超过 10% 的非预期退化。
- 从上一正式版本升级后用户数据可正常读取。
- Windows / macOS / Linux 完成 §8.4 回归矩阵。

---

## 7. 保真度保证机制

这一节回答「如何保证接下来的重构从始至终都按视觉稿」。保障由**四道闸门**组成，缺一不可。

### 闸门 1 · 冻结的真值（防「记错了」）

`docs/design/cplus-spec-lock.json` 是唯一视觉真值，包含画布、色板、材质、排版、几何、容差、12 屏路由与锚点、顶栏分段文案、文案红线。

规则：**任何数值变更必须先改本文件，再改实现，并重跑校验**。实现与 spec-lock 冲突时以 spec-lock 为准；认为 spec-lock 有误时，先在 `docs/design/` 记录证据（设计稿页码 + 实测坐标），再改。

`tests/design-tokens.test.ts` 扩展为逐项对照断言，使 spec-lock 与 CSS 令牌无法静默分叉。

### 闸门 2 · 自动化比对（防「我觉得像了」）

`tools/design-fidelity/verify.py`（用 `run.sh` 调用）：

1. 以 `--target=app` 启动开发服务器，`--target=prototype` 直接读原型。
2. 固定 1440×900、`deviceScaleFactor=1`、隐藏滚动条，逐屏截图。
3. 注入固定数据夹具，使真实数据不干扰比对。
4. 对渲染图与设计稿 PNG 做同一套探针：顶栏墨迹、H1/导语/筛选条带、列表带、右列带、注解带、播放栏带、整屏平均亮度差。
5. 按 L1/L2/L3 三层判定输出 `PASS` / `FAIL`，并生成并排对照图。

用法：

```bash
bash tools/design-fidelity/run.sh --all
bash tools/design-fidelity/run.sh --screen 01-library
bash tools/design-fidelity/run.sh --screen 10-now-playing --verbose
bash tools/design-fidelity/run.sh --all --target app --base-url http://localhost:5678
```

**关键设计**：比对对象是**设计稿 PNG**，不是原型。原型只是曾经达成过的一次实现；若原型与设计稿有出入，以设计稿为准。这避免了「实现与原型一起漂移」。

### 闸门 3 · 代码层护栏（防「顺手写死一个颜色」）

| 检查 | 工具 | 规则 |
| --- | --- | --- |
| 字面色值 | `tools/design-fidelity/check-literals.mjs` | `src/**` 除 `palette.css` 外禁止 `#hex` / `rgb(` / `hsl(` / `oklch(` |
| 原始色板泄漏 | 同上 | 业务代码禁止 `var(--c-` |
| HeroUI 主题色回退 | 同上 | 业务代码禁止 `var(--heroui-primary)` |
| 令牌与 spec-lock 一致 | `tests/design-tokens.test.ts` | 逐项断言 |
| 未使用导出 | `pnpm knip` | 每阶段收尾运行 |
| 样式规范 | `stylelint` | 保留现有配置 |

### 闸门 4 · 流程约束（防「先合并再说」）

**每屏 PR 必须包含**

1. 该屏 `run.sh` 保真报告（PASS）。
2. 能力对齐表：该屏所有可见操作 → 现有 store / service / IPC 的映射。
3. 旧实现的删除（同一 PR 内，不允许「下个 PR 再删」）。
4. 该屏涉及的组件测试与回归说明。

**PR 不允许同时做**：修改 service 请求语义 + 页面视觉。

**DoD（完成定义）**：一屏只有在「保真 PASS + 能力对齐完整 + 旧实现已删」三项同时满足时才算完成。

---

## 8. 测试策略

### 8.1 单元测试（保留 + 增量）

现有 24 个测试文件覆盖 adapter、capability、队列、播放模式、设置迁移、下载状态机、动作参数转换。**本轮不得使其退化**，其中：

- `design-tokens.test.ts` —— 扩展为 spec-lock 对照。
- `settings.test.ts` —— 增加「浅色主题 + 自定义主色 + 自定义圆角」旧配置的升级路径。
- `app-shell-interactions.test.ts` —— 更新为顶栏分段导航 + 头像菜单的键盘路径。

### 8.2 组件测试（新增）

每个 `ui/patterns` 组件：状态矩阵完备性、可访问名称、键盘路径、`aria` 语义。重点：`TrackTable` 的 `is-current` 与操作带显隐、`MediaTile` 的 5 项操作落点、`SegmentNav` 的当前项与路由同步。

### 8.3 集成测试

沿用上一轮清单，并补：

- `/queue` 路由：从播放栏进入 → 拖拽排序 → 清空确认。
- `/now-playing`：进入 / 退出沉浸态时顶栏与播放栏的显隐、播放不中断。
- 主题收敛：旧配置启动后外观为 C+ 深色，设置页不出现已移除入口。

### 8.4 桌面人工回归

| 范围                             | macOS    | Windows | Linux      |
| -------------------------------- | -------- | ------- | ---------- |
| 窗口控制与拖动（顶栏已改，重点） | 必测     | 必测    | 必测       |
| 系统托盘                         | 平台策略 | 必测    | 必测       |
| 全局快捷键                       | 必测     | 必测    | 必测       |
| 任务栏缩略控制                   | 不适用   | 必测    | 不适用     |
| 自动更新                         | 必测     | 必测    | 按分发方式 |
| FFmpeg 下载                      | 必测     | 必测    | 必测       |
| Mini 播放器（已重做）            | 必测     | 必测    | 必测       |
| 沉浸态路由全屏表现               | 必测     | 必测    | 必测       |

> 顶栏从 64px 改为 71px 会影响窗口拖动区（`window-drag`）。所有平台的窗口控制与拖动必须重新验证。

---

## 9. 数据兼容策略

**不变更**任何持久化键名与结构。以下为逐项处置：

| 数据 | 载体 | 处置 |
| --- | --- | --- |
| 应用设置 | Electron Store `app-settings` | 字段全部保留。`themeMode` 读取后固定为深色；`primaryColor` / `borderRadius` / `backgroundColor` 读取后忽略；`sideMenuCollapsed` / `sideMenuWidth` 保留但不再暴露 |
| 登录信息 | `user-login-info` | 不动 |
| 下载任务 | `media-downloads` | 不动，状态字符串不变 |
| 快捷键 | `shortcut-settings` | 不动，`toggleMiniMode` 等绑定保留 |
| 歌词缓存 | `lyrics-cache` | 不动 |
| 播放队列 | Zustand persist（`play-list`） | 不动，`PlayData` 与 `playId/nextId` 可恢复 |
| 播放进度 | localStorage `play-current-time` | 不动 |
| 收藏排序 | localStorage `favorites-order` | 不动 |
| 搜索历史 | localStorage | 不动，遵循「显示搜索历史」设置 |

**规则**：不删除、不改名字段；新字段提供默认值；字段语义变化走带版本号的 migration 且必须幂等 + 有测试；升级失败保留旧数据并回退安全默认值。

---

## 10. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 移除侧栏后一级导航可达性下降 | 高 | P1 完成后立即做可达性测试：任一非首页要在两次点击内到达；若不达标，在顶栏品牌位左侧补一个「库」入口 |
| 顶栏 64 → 71 破坏各平台窗口拖动 | 中 | P1 出口标准中列为必测；`window-drag` 实用性单独验证 |
| 主题收敛引起用户反弹 | 中 | 发版说明明确列出移除项与原因（设计稿为深色单一皮肤）；保留字段便于后续回滚 |
| 沉浸态从弹层改路由导致播放中断 | 高 | 播放状态在 store，不在组件；P5 以「路由切换播放不中断」为出口标准 |
| 队列从抽屉改路由后拖拽排序失效 | 中 | 复用 `@dnd-kit/sortable` 逻辑，仅换容器；P5 单独回归 |
| 玻璃 + 模糊在长列表上造成渲染压力 | 中 | 玻璃只用于操作带与面板，不用于每行；长列表用虚拟滚动；P7 做性能对比 |
| L3 整屏亮度差难以收敛 | 中 | 以「渐变参数数值拟合」而非目测（第 10 屏已用此法从 22.45 降到 11.46）；拟合脚本纳入 `tools/design-fidelity/` |
| 组件层建完后页面仍各自发挥 | 中 | 闸门 3 的字面色检查 + 闸门 4 的能力对齐表；再加一条：页面对 `ui/patterns` 之外的直接样式引用需在 PR 中说明理由 |
| 工期拉长导致新旧长期并存 | 高 | 每屏 PR 内含旧实现删除；不允许阶段性遗留 |

---

## 11. 里程碑

| 里程碑      | 阶段  | 可交付结果                              |
| ----------- | ----- | --------------------------------------- |
| M0 冻结     | P0    | 真值文件、校验工具、令牌骨架、CI 护栏   |
| M1 骨架     | P1    | 新壳层、12 路由可达、主题收敛           |
| M2 组件     | P2    | `ui/patterns` 全量组件 + 设计系统活文档 |
| M3 主流程   | P3    | 库 / 发现 / 详情 / 搜索 四屏保真达标    |
| M4 子页     | P4    | 稍后播放 / 本地音乐 / 下载管理 三屏达标 |
| M5 播放核心 | P5    | 队列 / 沉浸态 / 迷你播放器 三屏达标     |
| M6 收口     | P6–P7 | 设置 + 延展屏、清理、三平台发布         |

阶段间串行，阶段内按屏并行。P2 可与 P1 后半段并行（组件不依赖新壳层）。

---

## 12. 完成定义

只有同时满足以下条件，本轮 C+ 视觉重构才算完成：

1. `run.sh --all` 12 屏全 PASS（L1 零偏差、L2 结构带 ≤ 2px 且内容带覆盖率 ≥ 75%、L3 ≤ 12）。
2. 12 屏路由全部上线，顶栏分段与头像菜单承载全部一级入口。
3. `/queue` 与 `/now-playing` 为路由页，抽屉与全屏播放器组件已删除。
4. `src/layout/side/` 已删除，`src/common/constants/menus.tsx` 已重构为头像菜单。
5. 业务代码零字面色值、零 `var(--c-`、零 `var(--heroui-primary)`。
6. `docs/design/cplus-spec-lock.json` 与 `src/ui/tokens/` 逐项一致（单测保证）。
7. 现有 24 个测试文件全绿，且 `app-shell-interactions` / `design-tokens` / `settings` 三个已按本轮变更更新。
8. 播放、收藏、下载、本地扫描、歌词、快捷键、托盘、更新无功能回归。
9. 用户数据从上一正式版本无损升级。
10. 三平台通过 §8.4 回归矩阵。
11. README 与截图更新，发版说明列明主题能力移除。

---

## 13. 首个迭代

第一个迭代只做 P0，产出已在本目录：

1. [`cplus-spec-lock.json`](./cplus-spec-lock.json) —— 冻结的真值。
2. [`cplus-screen-matrix.md`](./cplus-screen-matrix.md) —— 12 屏施工契约。
3. [`cplus-token-bridge.md`](./cplus-token-bridge.md) —— 三层令牌映射。
4. 本方案。
5. `tools/design-fidelity/` —— 比对与护栏工具。

**该迭代不修改任何业务代码**。它的目的不是展示新界面，而是让「按视觉稿重构」这件事在后续每一屏都**可执行、可验证、不可绕过**。

### 13.1 P0 与 P1 的边界（P0 落地时明确）

P0 的原则是**「新增令牌语言 + 上护栏」**，不是改渲染。因此不是 §4.2 表里的每一条都在 P0 生效，划分依据是「是否移除用户可见能力 / 是否属于壳层几何」：

| 项目 | 落在 | 依据 |
| --- | --- | --- |
| 三层令牌文件与全部新增命名空间（`--lili-surface-*` / `--lili-text-*` / `--lili-type-*` / `--lili-layout-*` / `--lili-radius-*` / `--lili-z-*` / `--lili-duration-*` / `--lili-space-12,16`） | **P0** | 纯新增，不改变任何现有渲染 |
| 圆角收敛为固定值（不再由 `--heroui-radius-medium` 派生） | **P0** | 属令牌语言本身；设计稿明确「界面里没有直角卡片」，圆角不是可调项。渲染上只有 `--lili-radius-lg` 由 16 → 20 一处变化 |
| 缓动改为 `cubic-bezier(0.32, 0.72, 0, 1)`、`slow` 280 → 240ms | **P0** | 同上，属令牌语言 |
| `--lili-color-brand` / `-focus` 收敛到 C+ 强调色；删除浅色主题；移除自定义主色 / 圆角 / 背景色入口 | **P1** | 这三项都是**移除用户可见能力**，必须与设置页改造、迁移提示同批发布 |
| `--lili-topbar-height` 64 → 71、`--lili-player-height` 84 → 88、`--lili-content-max-width` 1440 → none、删除 `--lili-sidebar-width` | **P1** | 属**壳层几何**，其验收就在 P1 出口标准里（顶栏 71 / 播放栏 88 的 L1 硬锚点）。P0 目标是值已在 `--lili-layout-*` 冻结，别名在 P1 重指 |

> 这样切分的结果是：**P0 结束时应用的外观与行为与 P0 之前一致**（除圆角 4px 的差异），而目标值、护栏与真值已全部就位。P1 才开始真正动壳层。

### 13.2 P0 完成情况（2026-09-25）

- [x] 建立 `src/ui/tokens/{palette,semantic,geometry}.css`，`index.css` 降为纯聚合器（`@import` 三层 + 减少动效覆盖）。
- [x] `tests/design-tokens.test.ts` 扩展为 spec-lock 对照断言：**97 项断言**，覆盖色板、本地格式色、复合背景、排版原子令牌、`tokenMap` 几何、圆角逐角色取值、玻璃材质、遮罩、WCAG 对比度、令牌引用完整性，以及**「登记即断言」完备性**。
- [x] `check-literals.mjs` 收紧为「字面色值仅限 `palette.css`、`--c-` 引用仅限 `semantic.css`」，并接入 CI 独立 job `Token Guardrails`（`pr-test-build.yml`）。
- [x] 新增 `check-phase-drift.mjs` + `phase-boundary.json`：把「本阶段只增不改」变成可执行闸门，并接入 CI。
- [x] `verify.py` 跑通完整报告（原型基线 4/12，见 `docs/design/evidence/prototype-baseline.txt`）。
- [x] 设计稿参考图已纳入仓库（`tools/design-fidelity/reference/`，12 页 2.9 MB）。
- [x] 夹具目录已建立，`placeholder-art.json` 就绪（`tools/design-fidelity/fixtures/`）；逐屏夹具待 P2 与组件一同落地。
- [x] `pnpm test --run` 全绿：24 个测试文件 / **193 项**（P0 前为 103 项）。
- [x] 生产构建跑通浏览器侧产物（`dist/web/static/css/index.*.css` 285.1 kB，四层令牌全部内联）。`electron-builder` 之后的打包步骤因本机只装了 Command Line Tools、缺 Xcode 26 的 `actool` 而失败，与令牌改造无关。
- [ ] `--target app` 的端到端比对——待 P1 上线新壳层与路由后，用真实路由跑一次；当前 12 个目标路由尚不存在。

#### 渲染未变的实测依据

`pnpm verify:phase-drift` 逐个解析遗留令牌的有效值，结论是 **P0 只引入一处可视变更**：

| 令牌 | 变化 | 被业务代码消费 | 结论 |
| --- | --- | --- | --- |
| `--lili-radius-lg` | 16px → 20px | ✅ 8 个组件 | **可视变更，已显式确认** |
| `--lili-radius-md` | `var(--heroui-radius-medium)` → `12px` | ✅ 6 个组件 | 有效值相同（`--heroui-radius-medium` = 12px） |
| `--lili-radius-xl` | `calc(12px + 8px)` → `20px` | ✅ 2 个组件 | 有效值相同 |
| `--lili-radius-sm` | `max(4px, 12px - 4px)` → `8px` | ❌ | 同值改写 |
| `--lili-ease-standard` / `-emphasized` | 改为 C+ 缓动 | ❌ | 无消费方，无可视影响 |

另外 32 个遗留令牌的有效值逐字未变。这个工具在 P0 收尾时首次运行就报出 6 处偏差 —— 若不求值、不补主题变量，`--lili-radius-md/xl` 会被误报为违规；若只比文本就收工，真实的 `--lili-radius-lg` 变更又会被掩盖在噪声里。

**P0 落地时发现并修正的真值分叉**：

1. 沉浸态背景渐变在桥接表里记的是**拟合前的中间参数**，与原型实现不符 —— 已按原型现值校正。
2. 文字色阶对比度记的是照上一轮暗底 `#121214` 算的值，C+ 底板改为 `#08080A` 后应整体提升 —— 已重算（20.01 / 12.46 / 7.78 / 6.14 / 3.95）并改为由单测校验。
3. 原型实际使用的合成色（反色对 `#F2F2F2`/`#0A0A0C`、强调药丸文字 `#7CBCFF`、占位符、底板环境光、顶栏渐变停止点）此前未登记 —— 已补录，否则 P2 建组件时必然就地写死。
4. **登记了却没有断言的令牌**：`--lili-radius-image` / `--lili-radius-window` / `--lili-scrim` / `--lili-scrim-veil` 四条在真值里存在，但没有任何用例断言它们，漂移不会报警。其中 `--lili-scrim-veil` 的四个停止点只写在自由文本 `rule` 里，无法被断言。已补齐取值断言与 `stops` 字段，并新增「登记即断言」完备性校验，使这类缺口在结构上无法再生。

这四条都不是笔误，而是**「文档与实现各写一份」的必然结果**。护栏与对照单测的价值即在于此：它们不会让第一份文档变对，但会让第二份无法存在。
