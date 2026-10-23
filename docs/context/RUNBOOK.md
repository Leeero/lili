# RUNBOOK.md — 操作与验证步骤

> 执行对应操作前读；方法变化时更新。**未执行的命令明确标注，命令配置≠执行成功。**

## 开发与构建

| 操作 | 命令 | 状态 | 说明 |
| --- | --- | --- | --- |
| 启动开发服务 | `pnpm dev` | 配置已存在 | rsbuild dev；用户 dev 服务常在 5678 端口 |
| 构建渲染进程 | `pnpm build` | 配置已存在 | rsbuild build |
| 单测 | `pnpm test` | 配置已存在 | vitest；沙箱内**全量会被 SIGTERM**，一次只跑一个/按文件跑 |

> 本机 Node 22.22.2 高于 engines 22.17.1：pnpm 需加 `--config.engine-strict=false`（见 `.workbuddy/memory/MEMORY.md`）。

## 视觉保真（设计稿对齐）

命令见 [`docs/design/README.md`](./../design/README.md) 与 `tools/design-fidelity/README.md`：

| 操作 | 命令 | 用途 |
| --- | --- | --- |
| 令牌护栏 | `pnpm verify:literals` | 三层令牌边界 |
| 参考图体检 | `pnpm verify:reference` | 不捕获渲染，先查参考图 |
| 保真度校验 | `pnpm verify:fidelity --all` / `--screen 01-library` | 12 屏比对 |
| 阶段边界 | `pnpm verify:phase-drift` | 遗留令牌相对基线只增不改 |

前置规则（`docs/design/README.md` 四条硬规则）：数值变更顺序「先改 `cplus-spec-lock.json` → 再改实现 → 再跑校验」；令牌分层不可越界。

> 注意：当前视觉真值为 4188 基线（`docs/design-4188/`），`docs/design/` 是上一版 C+ 历史资料（见 `docs/design-4188/README.md`）。两者关系如不确定，先核实再执行。

## 类型检查

`pnpm exec tsc --noEmit` —— **非可用门禁**：存在库层面基线报错（tailwind-merge / JSX / Rspack 类型等），只看「改动文件是否新增报错」。本任务（2026-10-21）实测：基线报错集中在 `node_modules` 与部分 `settings`/`tests` 文件，与改动无关。

## 代码规范

- ESLint：`pnpm exec eslint <改动文件>`（已在本任务验证）。
- Stylelint：**只传改动单文件**（`overflow` 强制简写；`prototypes/` 在 `.stylelintignore`，勿对其 --fix）。

## 发版

- **唯一发版路径** = 本地 `pnpm release`（changelogen bump → 改 package.json + CHANGELOG → commit → tag → push → tag 触发 `release.yml` 三平台构建 → `publish-release` 转正）。
- **不要手推 tag**（会造出 Release 名与产物版本错配的自动更新 feed）。
- `git push origin master` 不触发任何 workflow；`workflow_dispatch` 仅当 CI 冒烟，不发布。
- 打包坑（来自 `.workbuddy/memory/MEMORY.md`）：electron-builder 顶层与平台段 `extraResources` 是**合并**；图标拷贝 `fs.cp` 前须 `fs.rm(目标目录)`；改产品标识须核验 `Info.plist` / `Contents/Resources/`。
- 发布前回归：见 [`docs/lili-stage9-release-checklist.md`](./../lili-stage9-release-checklist.md)（三平台安装/升级/核心功能逐项记录，未验证不得视为通过）。

## macOS 首次打开被拦

构建未做 Apple 公证（ad-hoc 签名），`spctl -a -vv lili.app` 评估为 `rejected` 是**预期行为**。解法三选一（详见 [`README.md`](./../../README.md)）：访达右键「打开」→「打开」；或系统设置 → 隐私与安全性「仍要打开」；或 `xattr -dr com.apple.quarantine /Applications/lili.app`。
