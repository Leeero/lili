# PROJECT_INDEX.md — lili 项目定位与「任务 → 文件」路由

> 简短定位 + 路由表。需要定位时读；入口或职责变化时更新。专题正文不复制到这里，只给链接。

lili：基于 B 站公开接口的跨平台桌面音乐播放器（Electron + React + TypeScript + Zustand + Rsbuild），fork 自 `wood3n/biu`，许可证 PolyForm Noncommercial 1.0.0。当前处于「4188 视觉重构」收尾期（详见 [`docs/context/NOW.md`](./docs/context/NOW.md)）。

## 文档导航

| 想做什么 | 读这里 |
| --- | --- |
| 了解项目用途、下载/使用 | [`README.md`](./README.md) |
| 接手任务、读写规则 | [`AGENTS.md`](./AGENTS.md) |
| 接续当前工作 | [`docs/context/NOW.md`](./docs/context/NOW.md) |
| 定位目录/版本/配置/部署 | [`docs/context/MAP.md`](./docs/context/MAP.md) |
| 执行构建/测试/发版操作 | [`docs/context/RUNBOOK.md`](./docs/context/RUNBOOK.md) |
| 查阅已确认决策 | [`docs/context/DECISIONS.md`](./docs/context/DECISIONS.md) |
| 查阅已知风险/验证缺口 | [`docs/context/RISKS.md`](./docs/context/RISKS.md) |
| 追溯历史记录 | [`docs/context/history/README.md`](./docs/context/history/README.md) |
| 长期踩坑/本机环境/壳层契约 | `.workbuddy/memory/MEMORY.md` |
| 能力依赖/重构约束 | [`docs/lili-current-architecture-map.md`](./docs/lili-current-architecture-map.md) |
| 视觉/设计真值 | [`docs/design-4188/README.md`](./docs/design-4188/README.md)、[`docs/refactor-plan-4188-2026-09-30.md`](./docs/refactor-plan-4188-2026-09-30.md) |
| 产品范围 PRD | [`docs/lili-music-player-prd.md`](./docs/lili-music-player-prd.md) |

## 代码路由

| 任务 | 落点 |
| --- | --- |
| 壳层（顶栏/侧栏/播放栏）、路由契约、一级导航真源 | `src/layout/`，重点 `src/layout/route-shell.ts`（`PRIMARY_NAV_ITEMS`、`ROUTE_SEGMENTS`、`SHELL_CHROME_BY_ROUTE`） |
| 壳层状态 → 槽位渲染 | `src/app/shell/` |
| 页面 | `src/pages/<page>/`；路由表 `src/routes.tsx` |
| 领域能力（播放/收藏/搜索/下载/本地音乐/关注等） | `src/features/<domain>/` |
| 领域模型类型 | `src/domain/<name>.ts`（如 `track.ts`、`playlist.ts`） |
| DTO → 领域模型适配 | `src/adapters/<domain>/` |
| B 站 API 服务 | `src/service/<name>.ts`；请求层 `src/service/request.ts` |
| 全局状态 | `src/store/<name>.ts`（Zustand） |
| 通用 UI（primitives / patterns / tokens） | `src/ui/` |
| Electron 主进程 / preload / 窗口 / 菜单 | `electron/`；菜单唯一真源 `electron/windows/shell-menu.ts` |
| 测试 | `tests/*.test.{ts,tsx}` |

## 验证路由

| 想验证什么 | 命令/入口 |
| --- | --- |
| 单测 | `pnpm test`（vitest） |
| 视觉保真（设计稿对齐） | `pnpm verify:fidelity` 系列，见 [`docs/design/README.md`](./docs/design/README.md) 与 `tools/design-fidelity/README.md` |
| 令牌/阶段护栏 | `pnpm verify:literals`、`pnpm verify:phase-drift` |
| 类型（仅看改动文件新增报错） | `pnpm exec tsc --noEmit` |
| 构建 | `pnpm build`（rsbuild） |

> 命令细节与前置条件见 [`docs/context/RUNBOOK.md`](./docs/context/RUNBOOK.md)。
