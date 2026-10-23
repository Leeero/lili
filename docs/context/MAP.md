# MAP.md — 目录、版本、配置与部署

> 定位修改/运行对象时读；映射变化时更新。不虚构环境；未核实的标「待核实」。

## 版本与身份

| 项 | 值 | 来源 |
| --- | --- | --- |
| 应用名 / 产品名 | `lili` | `package.json` `productName` |
| 版本 | `2.0.0`（重构代次标签，**非**语义化发行版号） | `package.json` |
| appId | `com.leeero.lili`（上游为 `com.biu.wood3n`） | 改名方案 `docs/rename-to-lili-plan.md` |
| 仓库 | `github.com/Leeero/lili`（fork 自 `wood3n/biu`） | `README.md` |
| 许可证 | PolyForm Noncommercial 1.0.0 | `LICENSE` |
| 运行时 | Node 22.17.1（engines）；本机 22.22.2 需 `--config.engine-strict=false` | `package.json`、`.workbuddy/memory/MEMORY.md` |
| 包管理器 | pnpm 10.24.0 | `package.json` `packageManager` |

## 目录关系

| 目录 | 职责 | 何时看 |
| --- | --- | --- |
| `src/` | 渲染进程：页面 / 领域 / 适配器 / 服务 / store / UI | 改前端逻辑 |
| `src/layout/` | 壳层（侧栏 / 顶栏 / 播放栏 / 路由契约） | 改导航与壳层 |
| `electron/` | 主进程 / preload / 窗口 / 菜单 / 托盘 | 改原生能力 |
| `shared/` | 主进程与渲染进程共享类型/常量 | 跨进程契约 |
| `plugins/` | 构建插件（含 electron-builder 配置 `plugins/electron-build.ts`） | 改打包/发版 |
| `tests/` | vitest 单测 | 改行为后回归 |
| `tools/design-fidelity/` | 视觉保真校验工具（verify.py） | 视觉验收 |
| `docs/` | 产品/设计/QA/发版文档 | 查上下文 |
| `docs/context/` | 本套接续上下文（NOW/MAP/RUNBOOK/DECISIONS/RISKS/history） | 接续任务 |
| `prototypes/` | 设计原型（`biu-discover-option2` 为 4188 视觉真值源；勿对其跑 --fix） | 视觉溯源 |
| `.workbuddy/memory/` | 长期备忘（MEMORY.md）与按日记录 | 踩坑与契约 |

## 配置

| 文件 | 作用 |
| --- | --- |
| `package.json` | scripts / 依赖 / 版本 / productName |
| `rsbuild.config.ts` | 渲染进程构建（HashRouter + `assetPrefix: "./"`） |
| `tsconfig.json` | TS 配置 |
| `eslint.config.mjs` / `.prettierrc` / `stylelint.config.mjs` | 代码与样式规范 |
| `vitest.config.ts` | 单测（jsdom、`@` → `src` 别名） |
| `plugins/electron-build.ts` | electron-builder 打包配置（含 LICENSE + NOTICE 随包） |
| `.nvmrc` / `.npmrc` / `.browserslistrc` | 运行时 / 包管理 / 目标浏览器 |

## 部署位置

- 产物：electron-builder 产出安装包（dmg/zip/AppImage/deb/rpm/win-setup/win-portable），见 [`README.md`](./../../README.md)「下载和使用」。
- 用户数据目录：由 `productName` 推导（`lili`），各平台位置见 [`README.md`](./../../README.md)「从上游 Biu 迁移」。
- CI：`.github/workflows/`；`pull_request → master` 与 `push: tags v*` / `workflow_dispatch` 触发（`git push master` **不**触发）。唯一发版路径 = 本地 `pnpm release`（见 `.workbuddy/memory/MEMORY.md`「许可证 / 打包 / 发版」与 [`RUNBOOK.md`](./RUNBOOK.md)）。
