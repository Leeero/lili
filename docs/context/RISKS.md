# RISKS.md — 已知问题、风险与验证缺口

> 任务涉及对应风险时读；证据或状态变化时更新。每条给证据来源，无证据的不列为「已确认风险」。

## 开发环境风险

| 风险 | 证据 | 缓解 |
| --- | --- | --- |
| 沙箱内重任务被 SIGTERM（exit 137） | `.workbuddy/memory/MEMORY.md`「验证纪律」：全量 stylelint / 全量 vitest / tsc 均验过 | 一次只跑一个；stylelint 只传改动单文件；空输出 + 137 是被杀而非通过 |
| `tsc --noEmit` 非可用门禁 | 同上：基线约百条库层面报错（tailwind-merge/JSX/Rspack） | 只看改动文件是否新增报错 |
| Node 版本不匹配 | engines 22.17.1 vs 本机 22.22.2 | pnpm 加 `--config.engine-strict=false` |
| 沙箱子进程写入不落真实磁盘 | 同上：dist 产物消失即此因 | 产物核验在真实磁盘/CI |
| 浏览器直连 B 站接口被 CORS 拦 | 同上：Network Error 是环境不是代码 bug | 真实数据只能在 Electron 里看 |

## 代码 / 依赖风险

| 风险 | 证据 | 缓解 |
| --- | --- | --- |
| HeroUI 多组件复用同一 `data-slot` | `.workbuddy/memory/MEMORY.md`「HeroUI 坑」：已两次真实事故 | 容器内样式化用直接子级选择器；契约钉在 `tests/app-shell-interactions.test.ts` |
| Stylelint 强制 overflow 简写 | 同上 | 写 `overflow: hidden auto` 等；`prototypes/` 勿跑 --fix |

## 设计真值风险

| 风险 | 证据 | 缓解 |
| --- | --- | --- |
| 设计真值双轨，易误用 | [`docs/design-4188/README.md`](./../design-4188/README.md)：`docs/design/`（C+）为历史；4188 为当前真值。但 `tests/app-shell-interactions.test.ts` 与 `tools/design-fidelity/verify.py` 仍读 `docs/design/cplus-spec-lock.json` | 改动视觉前先确认走哪套真值（**待核实**：两套的最终收口关系） |

## 发版 / 打包风险

| 风险 | 证据 | 缓解 |
| --- | --- | --- |
| 无 Apple 签名 → Gatekeeper 拦 | [`README.md`](./../../README.md)「macOS 首次打开会被系统拦下」：ad-hoc 签名，`spctl` 评估 `rejected` 属预期 | 给用户三种解锁步骤（已写 README） |
| 手推 tag 破坏自动更新 feed | `.workbuddy/memory/MEMORY.md`：Release 名与产物版本错配 | 只走本地 `pnpm release` |
| CI 复核误判（rate limit） | 同上：本机匿名 `curl` 会 `API rate limit exceeded`，误当「0 条运行」 | 复核 CI 走网页 `github.com/Leeero/lili/actions` |
| electron-builder `extraResources` 顶层与平台段合并、图标拷贝残留 | 同上 | 打包后核验 `Info.plist`/`Contents/Resources/`；`fs.cp` 前 `fs.rm` |

## 当前验证缺口（待核实）

- 发布回归（三平台安装/升级/核心功能）状态：见 [`docs/lili-stage9-release-checklist.md`](./../lili-stage9-release-checklist.md) 验证状态表，**未逐项确认**。
- 工作区未提交改动的内容边界与完成度：`git status` 列出，未审查每处（见 [`NOW.md`](./NOW.md)）。
- 设计真值（C+ spec-lock vs 4188 基线）的最终收口关系：**待核实**。
