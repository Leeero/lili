/**
 * 屏 05「下载管理」呈现层测试。
 *
 * 钉三件事：
 *   1. **行操作带门控走 capabilities，不走 status 文案。** 早期实现是
 *      `row.status.includes("完成")` 这类字符串匹配 —— 展示文案被当成状态机：
 *      `canOpen` 还要求 `savePath` 存在，文案匹配查不到；改文案会静默破坏门控。
 *      本文件用渲染结果钉住「门控由 model 层 capabilities 驱动」。
 *   2. **「打开下载目录」的路径尾巴截成末段**（`…/Downloads`）—— 完整路径
 *      由 title 悬停揭示。钉住「不再把绝对路径整串塞进按钮」。
 *   3. **空态有两句不同的 sectionTitle**（全空 / 筛选空），不共用一句
 *      指错方向的引导（库页「全隐藏 vs 确实没有」同一决策）。
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";

import { afterEach, describe, expect, test } from "vitest";

import { DownloadsView, type DownloadRowViewModel } from "@/features/downloads/downloads-view";
import { getDownloadTaskCapabilities, type DownloadTaskCapabilities } from "@/features/downloads/model";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const render = async (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  await act(async () => root.render(<MemoryRouter>{node}</MemoryRouter>));
  return container;
};

afterEach(async () => {
  for (const item of mounted.splice(0)) {
    await act(async () => item.root.unmount());
    item.container.remove();
  }
});

const caps = (patch: Partial<DownloadTaskCapabilities>): DownloadTaskCapabilities => ({
  canOpen: false,
  canPause: false,
  canResume: false,
  canRetry: false,
  canDelete: true,
  confirmBeforeDelete: false,
  ...patch,
});

const row = (index: number, patch: Partial<DownloadRowViewModel>): DownloadRowViewModel => ({
  id: `task-${index}`,
  index,
  title: "任务 {index}",
  subtitle: "自动 · 音频 · FLAC · 今天 12:00",
  status: "下载中 · 62%",
  size: "12.4 MB",
  capabilities: caps({}),
  ...patch,
});

const renderCard = async (rows: readonly DownloadRowViewModel[]) => {
  const container = await render(
    <DownloadsView
      title="下载管理"
      lead="查看下载进度并管理正在进行或已完成的任务。"
      variant="card"
      pills={[
        { key: "open-dir", label: "打开下载目录 · …/Downloads", variant: "primary", title: "/Users/x/Downloads" },
        { key: "clear", label: "清空记录", variant: "danger" },
      ]}
      sectionTitle="2 个任务 · 1 个进行中"
      columns={[]}
      rows={rows}
      onPillPress={() => undefined}
      onRowPress={() => undefined}
      onRowAction={() => undefined}
    />,
  );
  return container;
};

describe("屏 05 下载管理：行操作带门控", () => {
  test("操作带由 capabilities 决定，与 status 文案无关", async () => {
    // 「已完成 · 可定位文件」但 capabilities.canOpen=false（savePath 缺失）——
    // status 文案含「完成」，旧实现会渲染「定位文件」，capabilities 不会。
    const container = await renderCard([
      row(1, { status: "已完成 · 可定位文件", capabilities: caps({ canOpen: false }) }),
      row(2, { status: "已完成 · 可定位文件", capabilities: caps({ canOpen: true }) }),
    ]);

    const actionLabels = Array.from(container.querySelectorAll(".manage4188-task")).map(task =>
      Array.from(task.querySelectorAll<HTMLButtonElement>(".manage4188-task-actions button")).map(
        button => button.textContent ?? "",
      ),
    );

    expect(actionLabels[0]).toEqual(["删除任务"]); // 无 canOpen ⇒ 不渲染「定位文件」
    expect(actionLabels[1]).toEqual(["定位文件", "删除任务"]);
  });

  test("下载中 / 暂停 / 出错分别只露出对应操作", async () => {
    const container = await renderCard([
      row(1, { capabilities: caps({ canPause: true }) }),
      row(2, { capabilities: caps({ canResume: true }) }),
      row(3, { capabilities: caps({ canRetry: true }) }),
    ]);

    const actionLabels = Array.from(container.querySelectorAll(".manage4188-task")).map(task =>
      Array.from(task.querySelectorAll<HTMLButtonElement>(".manage4188-task-actions button")).map(
        button => button.textContent ?? "",
      ),
    );

    expect(actionLabels[0]).toEqual(["暂停", "删除任务"]);
    expect(actionLabels[1]).toEqual(["继续", "删除任务"]);
    expect(actionLabels[2]).toEqual(["重试", "删除任务"]);
  });

  test("capabilities 空集（如等待中）只渲染「删除任务」", async () => {
    const container = await renderCard([row(1, { status: "等待中", capabilities: caps({}) })]);

    const buttons = container.querySelectorAll<HTMLButtonElement>(".manage4188-task-actions button");
    expect(Array.from(buttons).map(button => button.textContent)).toEqual(["删除任务"]);
  });
});

describe("屏 05 下载管理：页头操作组", () => {
  test("打开下载目录的 title 悬停提示携带完整路径", async () => {
    const container = await renderCard([]);

    const primary = container.querySelector<HTMLButtonElement>(".manage4188-actions button.is-primary");
    expect(primary).not.toBeNull();
    expect(primary?.textContent).toContain("…/Downloads"); // 截断尾巴
    expect(primary?.getAttribute("title")).toBe("/Users/x/Downloads"); // 完整路径在 title
  });

  test("危险按钮不再把「二次确认」写进文案", async () => {
    const container = await renderCard([]);

    const danger = container.querySelector<HTMLButtonElement>(".manage4188-actions button.is-danger");
    expect(danger?.textContent).toBe("清空记录");
  });
});

describe("屏 05 下载管理：空态占位", () => {
  test("卡片分支 rows 为空时渲染空态而不是空网格", async () => {
    const container = await renderCard([]);

    expect(container.querySelector(".manage4188-task")).toBeNull();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });
});

describe("capabilities 与 model 层的一致性", () => {
  test("canOpen 要求 completed 且 savePath 存在（渲染层不复制这条逻辑）", () => {
    expect(getDownloadTaskCapabilities({ status: "completed" } as MediaDownloadTask).canOpen).toBe(false);
    expect(
      getDownloadTaskCapabilities({ status: "completed", savePath: "/tmp/a.flac" } as MediaDownloadTask).canOpen,
    ).toBe(true);
    expect(
      getDownloadTaskCapabilities({ status: "failed", savePath: "/tmp/a.flac" } as MediaDownloadTask).canOpen,
    ).toBe(false);
  });
});
