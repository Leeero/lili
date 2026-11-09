# NOW.md — 当前状态

> 接续任务时读；状态实质变化时更新。事实与推断分开，缺失标「待核实」。

## 当前目标

**待核实**：未找到一份明确的「当前里程碑」声明。基于已有证据推断处于 **4188 视觉重构收尾 + 发布准备期**。

证据：
- 最近提交 `7f54f28`（2026-10-16）起连续为 4188 重构收尾（下载门控、本地音乐、音乐库统计卡、关注页、播放器、发现页）。
- [`docs/design-4188/`](./../design-4188/README.md) 已推进到 phase9（含 `release-checklist.md`）；[`docs/lili-stage9-release-checklist.md`](./../lili-stage9-release-checklist.md) 为发布回归清单。
- 工作区存在未提交改动（涉及 `src/adapters/track/favorite.ts`、`src/domain/track.ts` 等，见 `git status`）。

## 进展

- 壳层重建、通用组件、主流程屏、库内子页、播放核心、设置与延展屏均已收口（见 [`docs/design/README.md`](./../design/README.md)「阶段进度」P0–P7）。
- 4188 基线按 phase0–9 推进，阶段产物见 [`docs/design-4188/`](./../design-4188/)。

## 阻塞 / 待核实

- 发布回归（三平台安装/升级）状态：见 [`docs/lili-stage9-release-checklist.md`](./../lili-stage9-release-checklist.md) 的验证状态表（**未逐项确认**）。
- 工作区未提交改动的内容边界与完成度：**待核实**（`git status` 列出，未审查每处）。

## 下一步

**待核实**。候选方向（非决定）：完成工作区未提交改动并提交 → 执行阶段 9 发布回归 → 发版（唯一发版路径为本地 `pnpm release`，见 RUNBOOK）。

## 证据入口

- 提交历史：`git log`
- 工作区改动：`git status`
- 发布回归清单：[`docs/lili-stage9-release-checklist.md`](./../lili-stage9-release-checklist.md)
- 发版路径：`.workbuddy/memory/MEMORY.md`「许可证 / 打包 / 发版」
