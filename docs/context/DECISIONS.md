# DECISIONS.md — 已确认决策

> 涉及相关选择时读；决策确认或替代时更新。**不把建议当作决定**；历史（已被替代）的决策显式标注。

## 技术栈与架构

| 决策 | 内容 | 来源 |
| --- | --- | --- |
| 技术栈保留 | Electron + React + TypeScript + Zustand + Rsbuild，不换框架、不新增后端 | [`docs/lili-refactor-plan.md`](./../lili-refactor-plan.md)、[`docs/lili-current-architecture-map.md`](./../lili-current-architecture-map.md) |
| 领域分层 | 页面/组件 → Store/Service → apiRequest → Electron 网络层 → B 站 API；重构期保留底层能力、上方加 adapter/feature，不直接重写底层 | [`docs/lili-current-architecture-map.md`](./../lili-current-architecture-map.md) |
| 领域模型边界 | 领域模型不含 `bvid/cid/sid` 之外的整块 API DTO | 同上 §6 |

## 视觉 / 设计

| 决策 | 内容 | 来源 |
| --- | --- | --- |
| 当前视觉真值 = 4188 基线 | 真值源 `prototypes/biu-discover-option2`；`docs/design/`（C+ 方案）为**历史资料**，不作 4188 视觉验收依据 | [`docs/design-4188/README.md`](./../design-4188/README.md)、[`docs/refactor-plan-4188-2026-09-30.md`](./../refactor-plan-4188-2026-09-30.md) |
| 单一深色主题 | 收敛为深色唯一正式皮肤 | [`docs/refactor-plan-4188-2026-09-30.md`](./../refactor-plan-4188-2026-09-30.md) |
| ~~移除左侧栏~~（历史） | C+ 方案曾决定「移除左侧栏、顶栏承载导航」，已被 4188 基线替代 —— 当前**保留侧栏**，一级导航唯一真源 `PRIMARY_NAV_ITEMS`、侧栏由它派生 | [`docs/design/README.md`](./../design/README.md) 决策 3（历史）；`.workbuddy/memory/MEMORY.md`（当前） |

## 信息架构 / 功能收敛

| 决策 | 内容 | 来源 |
| --- | --- | --- |
| 页面内分段下沉 | 分段导航从壳层顶栏下沉到各页内容区 | `git log` `refactor(layout): 页面内分段导航从壳层下沉到内容区` |
| 发现页数据源 | 数据源从「分区视频流」切换为「音乐中心三份数据」 | `git log` `feat(discover): …` |
| 移除稍后播放 | 移除「稍后播放」页面及配套服务与夹具 | `git log` `feat(app): 移除「稍后播放」页面…` |
| 我的音乐归属轴 | 库页两段「我创建的 / 我追的」（归属轴），类型差异只在瓦片徽标体现 | [`docs/design/cplus-spec-lock.json`](./../design/cplus-spec-lock.json) 1.3.34、`src/layout/route-shell.ts` |
| 失效条目灰显不隐藏 | 收藏夹里失效稿件（attr 9/1）打 `invalid`，灰显、不可播放、仍在列表；B 站侧仍计数，隐藏会误导「暂无内容」 | `src/domain/track.ts` 注释（未提交工作） |

## 身份 / 许可证 / 发版

| 决策 | 内容 | 来源 |
| --- | --- | --- |
| 改名 Biu → lili | appId `com.leeero.lili`、版本 2.0.0、仓库 `Leeero/lili`；git 历史从不重写（归属证据链） | [`docs/rename-to-lili-plan.md`](./../rename-to-lili-plan.md) |
| 许可证 | PolyForm Noncommercial 1.0.0；保留 `Required Notice: Copyright (c) 2022–2025 wood3n`；分发随附 LICENSE + NOTICE | [`README.md`](./../../README.md)、`.workbuddy/memory/MEMORY.md` |
| 发版路径 | 唯一发版 = 本地 `pnpm release`；`git push master` 不触发 CI；不手推 tag | `.workbuddy/memory/MEMORY.md`「许可证 / 打包 / 发版」 |

## 未决 / 建议（非决定）

- 无。新增决策先在此登记为「决定」，勿把讨论中的建议直接落为决定。
