import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { filesize } from "filesize";

import { formatMillisecond } from "@/common/utils/time";
import { openBiliVideoLink } from "@/common/utils/url";
import { DownloadsView, downloadColumns } from "@/features/downloads/downloads-view";
import { useDownloadsFixtureData } from "@/features/downloads/fixture";
import {
  countDownloadStatuses,
  createDownloadTaskViews,
  getDownloadTaskCapabilities,
  type DownloadFilter,
} from "@/features/downloads/model";
import SegmentNav from "@/layout/topbar/segment-nav";
import { useRouteSegments } from "@/layout/use-route-segments";
import { useModalStore } from "@/store/modal";
import { useSettings } from "@/store/settings";
import { PageState } from "@/ui/states/page-state";

const STATUS_LABEL: Record<MediaDownloadStatus, string> = {
  waiting: "等待中",
  downloading: "下载中",
  downloadPaused: "下载暂停",
  merging: "合并分块中",
  mergePaused: "合并暂停",
  converting: "转换中",
  convertPaused: "转换暂停",
  completed: "已完成 · 可定位文件",
  failed: "任务出错 · 可重试",
};

const getProgress = (task: MediaDownloadTask) => {
  if (["completed", "failed", "waiting"].includes(task.status)) return undefined;
  if (task.status === "merging" || task.status === "mergePaused") return task.mergeProgress ?? 0;
  if (task.status === "converting" || task.status === "convertPaused") return task.convertProgress ?? 0;
  return task.downloadProgress ?? 0;
};

const getStatusLabel = (task: MediaDownloadTask) => {
  const progress = getProgress(task);
  return progress === undefined ? STATUS_LABEL[task.status] : `${STATUS_LABEL[task.status]} · ${Math.round(progress)}%`;
};

const getQuality = (task: MediaDownloadTask) => {
  if (task.outputFileType === "video") return task.videoResolution || "视频";
  if (task.audioCodecs === "flac") return "无损";
  if (task.audioCodecs?.includes("ec-3")) return "杜比";
  return "自动";
};

const DownloadList = () => {
  const fixture = useDownloadsFixtureData();
  const [params] = useSearchParams();
  const downloadPath = useSettings(state => state.downloadPath);
  const [tasks, setTasks] = useState<MediaDownloadTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const filter = (params.get("type") ?? "all") as DownloadFilter;
  const { segments, activeKey } = useRouteSegments();
  const tabs = segments.length > 0 ? <SegmentNav segments={segments} activeKey={activeKey} /> : null;

  const load = useCallback(async () => {
    if (fixture) return;
    setLoading(true);
    setFailed(false);
    try {
      setTasks(await window.electron.getMediaDownloadTaskList());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [fixture]);

  useEffect(() => {
    void load();
    if (fixture) return;
    return window.electron.syncMediaDownloadTaskList(payload => {
      if (payload?.type === "full") setTasks(payload.data as MediaDownloadTask[]);
      if (payload?.type === "update") {
        setTasks(previous => previous.map(task => payload.data.find(item => item.id === task.id) ?? task));
      }
    });
  }, [fixture, load]);

  const views = useMemo(() => createDownloadTaskViews(tasks, filter), [filter, tasks]);
  const counts = useMemo(() => countDownloadStatuses(tasks), [tasks]);
  const rows = useMemo(
    () =>
      views.map(({ source }, index) => ({
        id: source.id,
        index: index + 1,
        title: source.title,
        subtitle: `${getQuality(source)} · ${source.outputFileType === "audio" ? "音频" : "视频"} · ${source.audioCodecs?.toUpperCase() || (source.outputFileType === "video" ? "MP4" : "音频")} · ${source.createdTime ? formatMillisecond(source.createdTime) : "时间未知"}`,
        status: getStatusLabel(source),
        progress: getProgress(source),
        size: source.totalBytes ? filesize(source.totalBytes) : "—",
        art: source.cover,
        artKey: source.id,
        // 操作带门控走 model 层的能力计算，不用 status 文案反推（见视图模型注释）。
        capabilities: getDownloadTaskCapabilities(source),
      })),
    [views],
  );

  const confirmClear = useCallback(() => {
    useModalStore.getState().onOpenConfirmModal({
      title: "确认清空全部下载记录？",
      description: "进行中的任务也会被移除，该操作无法撤销",
      confirmText: "清空",
      type: "danger",
      onConfirm: async () => {
        await window.electron.clearMediaDownloadTaskList();
        return true;
      },
    });
  }, []);

  const runTaskAction = useCallback(
    async (id: string, action: string) => {
      const task = tasks.find(item => item.id === id);
      if (!task) return;
      const capability = getDownloadTaskCapabilities(task);
      if (action === "open" && capability.canOpen && task.savePath)
        await window.electron.showFileInFolder(task.savePath);
      if (action === "pause" && capability.canPause) await window.electron.pauseMediaDownloadTask(id);
      if (action === "resume" && capability.canResume) await window.electron.resumeMediaDownloadTask(id);
      if (action === "retry" && capability.canRetry) await window.electron.retryMediaDownloadTask(id);
      if (action !== "delete" || !capability.canDelete) return;
      if (!capability.confirmBeforeDelete) {
        await window.electron.cancelMediaDownloadTask(id);
        return;
      }
      useModalStore.getState().onOpenConfirmModal({
        title: "确认删除当前任务？",
        description: "当前任务尚未完成，删除后无法恢复",
        confirmText: "删除",
        type: "danger",
        onConfirm: async () => {
          await window.electron.cancelMediaDownloadTask(id);
          return true;
        },
      });
    },
    [tasks],
  );

  if (fixture) {
    return (
      <DownloadsView
        title={fixture.header.title}
        lead={fixture.header.lead}
        tabs={tabs}
        variant="table"
        pills={fixture.filterPills.map((pill, index) => ({ key: String(index), ...pill, variant: pill.kind }))}
        sectionTitle={fixture.section.title}
        columns={downloadColumns(fixture.section.head)}
        rows={fixture.tasks}
        note={params.get("preview") === "4188" ? undefined : fixture.note}
        onPillPress={() => undefined}
        onRowPress={() => undefined}
        onRowAction={() => undefined}
      />
    );
  }

  if (loading) return <PageState kind="loading" className="min-h-[420px]" />;
  if (failed) return <PageState kind="error" actionLabel="重新加载" onAction={() => void load()} />;

  const running = counts.downloading + counts.processing;

  /**
   * 主按钮的路径尾巴：完整路径常超过 300px（用户目录越深越长），会把
   * 操作组挤成两行。截成末段（`…/Downloads`），完整路径由 title 悬停揭示；
   * 路径未配置时不带尾巴（IPC 侧会回落到缺省目录）。
   */
  const dirTail = downloadPath ? ` · …/${downloadPath.split(/[\\/]/).filter(Boolean).at(-1)}` : "";
  const pills = [
    { key: "open-dir", label: `打开下载目录${dirTail}`, variant: "primary" as const, title: downloadPath },
    {
      key: "pause-all",
      label: "暂停全部",
      variant: "secondary" as const,
      disabled: !tasks.some(task => task.status === "downloading"),
    },
    {
      key: "retry-all",
      label: "重试全部失败",
      variant: "neutral" as const,
      disabled: !tasks.some(task => task.status === "failed"),
    },
    {
      key: "clear-completed",
      label: "清空已完成",
      variant: "neutral" as const,
      disabled: !tasks.some(task => task.status === "completed"),
    },
    // 按钮名不带「· 二次确认」——确认流程由点击后的弹窗承担（danger 变红已给
    // 视觉前置预警）；把交互流程写进按钮名是设计稿旧稿的习惯，1.3.38 起订正。
    { key: "clear", label: "清空记录", variant: "danger" as const, disabled: !tasks.length },
  ];

  return (
    <DownloadsView
      title="下载管理"
      lead="查看下载进度并管理正在进行或已完成的任务。"
      tabs={tabs}
      variant="card"
      pills={pills}
      // 空态区分两种：全空（从未下载过）与「当前筛选无结果」（另一 tab 下有任务）。
      // 库页对「全隐藏」与「确实没有」同样分两态—— 指错方向的空态比空白更糟。
      sectionTitle={
        tasks.length === 0
          ? "暂无下载任务 — 从任意曲目的操作菜单选择「下载音频」开始"
          : rows.length === 0
            ? "当前分类暂无任务 — 切换到「全部」查看全部记录"
            : `${tasks.length} 个任务 · ${running} 个进行中`
      }
      columns={downloadColumns(["#", "文件", "状态", "大小"])}
      rows={rows}
      onPillPress={key => {
        if (key === "open-dir") void window.electron.openDirectory(downloadPath);
        if (key === "pause-all")
          void Promise.all(
            tasks
              .filter(task => task.status === "downloading")
              .map(task => window.electron.pauseMediaDownloadTask(task.id)),
          );
        if (key === "retry-all")
          void Promise.all(
            tasks.filter(task => task.status === "failed").map(task => window.electron.retryMediaDownloadTask(task.id)),
          );
        if (key === "clear-completed")
          void Promise.all(
            tasks
              .filter(task => task.status === "completed")
              .map(task => window.electron.cancelMediaDownloadTask(task.id)),
          );
        if (key === "clear") confirmClear();
      }}
      onRowPress={id => {
        const task = tasks.find(item => item.id === id);
        if (task) openBiliVideoLink({ type: task.sid ? "audio" : "mv", bvid: task.bvid, sid: task.sid });
      }}
      onRowAction={(id, action) => void runTaskAction(id, action)}
    />
  );
};

export default DownloadList;
