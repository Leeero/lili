import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { addToast } from "@heroui/react";

import { getPlayModeList } from "@/common/constants/audio";
import { buildQueueViewModel } from "@/features/player/queue";
import { useQueueFixtureData } from "@/features/player/queue-fixture";
import { QueueView, queueColumns, type QueueRow } from "@/features/player/queue-view";
import SegmentNav from "@/layout/topbar/segment-nav";
import { useRouteSegments } from "@/layout/use-route-segments";
import { useModalStore } from "@/store/modal";
import { usePlayList } from "@/store/play-list";

const MODE_LABEL = new Map(getPlayModeList().map(mode => [mode.value, mode.desc]));

const QueuePage = () => {
  const fixture = useQueueFixtureData();
  const [params] = useSearchParams();
  const list = usePlayList(state => state.list);
  const playId = usePlayList(state => state.playId);
  const nextId = usePlayList(state => state.nextId);
  const playMode = usePlayList(state => state.playMode);
  const keepPages = usePlayList(state => state.shouldKeepPagesOrderInRandomPlayMode);
  const queue = useMemo(() => buildQueueViewModel(list, playId, nextId), [list, nextId, playId]);
  const { segments, activeKey } = useRouteSegments();
  const tabs = segments.length > 0 ? <SegmentNav segments={segments} activeKey={activeKey} /> : null;
  const filter = params.get("source") ?? "all";
  const filtered = useMemo(
    () =>
      queue.filter(row =>
        filter === "all" ? true : filter === "local" ? row.item.source === "local" : row.item.source !== "local",
      ),
    [filter, queue],
  );
  const rows = useMemo<QueueRow[]>(
    () =>
      filtered.map((row, index) => ({
        id: row.id,
        index: index + 1,
        title: row.title,
        subtitle: `${row.artist} · ${row.isCurrent ? "正在播放" : row.isNext ? "下一首播放" : "队列"}${row.partLabel ? ` · ${row.partLabel}` : ""}`,
        status: row.isCurrent ? `正在播放 · ${MODE_LABEL.get(playMode)}` : `队列 · ${row.sourceLabel}`,
        duration: row.duration,
        art: row.cover,
        artKey: row.id,
      })),
    [filtered, playMode],
  );

  const confirmClear = () =>
    useModalStore.getState().onOpenConfirmModal({
      title: "确认清空播放队列？",
      description: "正在播放的内容也会停止，该操作无法撤销",
      confirmText: "清空",
      type: "danger",
      onConfirm: async () => {
        usePlayList.getState().clear();
        return true;
      },
    });

  const handleAction = async (row: QueueRow, key: string) => {
    const item = list.find(candidate => candidate.id === row.id);
    if (!item) return;
    if (key === "play") await usePlayList.getState().playListItem(item.id);
    if (key === "play-next") usePlayList.getState().addToNext(item);
    if (key === "top") usePlayList.getState().reorder(list.indexOf(item), 0);
    if (key === "remove") usePlayList.getState().delPage(item.id);
    if (key === "favorite" && item.source !== "local") {
      useModalStore.getState().onOpenFavSelectModal({
        rid: item.id,
        type: item.type === "mv" ? 2 : 12,
        title: item.title,
      });
    }
  };

  if (fixture) {
    return (
      <QueueView
        title={fixture.header.title}
        lead={fixture.header.lead}
        tabs={tabs}
        pills={fixture.filterPills.map((pill, index) => ({ key: String(index), ...pill, action: index < 4 }))}
        sectionTitle={fixture.section.title}
        columns={queueColumns(fixture.section.head)}
        rows={fixture.tracks}
        currentId={fixture.tracks[0].id}
        note={fixture.note}
        onPillPress={() => undefined}
        onRowAction={() => undefined}
        onReorder={() => undefined}
      />
    );
  }

  const pills = [
    { key: "play-all", label: "播放全部", kind: "primary" as const, action: true },
    { key: "mode", label: `${MODE_LABEL.get(playMode)} ▾`, kind: "secondary" as const, action: true },
    { key: "keep", label: `随机时保持分P顺序 · ${keepPages ? "开" : "关"}`, kind: "neutral" as const, action: true },
    { key: "clear", label: "清空队列", kind: "neutral" as const, action: true },
    { key: "count", label: `共 ${queue.length} 首`, kind: "accent" as const },
  ];

  return (
    <QueueView
      title="播放队列"
      lead="管理当前播放顺序，支持拖拽排序和分集展开。"
      tabs={tabs}
      pills={pills}
      sectionTitle={`队列 · ${queue.length} 首`}
      columns={queueColumns(["#", "标题", "来源 · 状态", "时长"])}
      rows={rows}
      currentId={playId}
      compact
      onPillPress={key => {
        if (key === "play-all") {
          const first = filtered[0];
          if (first) void usePlayList.getState().playListItem(first.id);
          else addToast({ title: "队列为空", color: "warning" });
        }
        if (key === "mode") usePlayList.getState().togglePlayMode();
        if (key === "keep") usePlayList.getState().setShouldKeepPagesOrderInRandomPlayMode(!keepPages);
        if (key === "clear" && list.length) confirmClear();
      }}
      onRowAction={(row, key) => void handleAction(row, key)}
      onReorder={(from, to) => {
        const source = filtered[from]?.item;
        const target = filtered[to]?.item;
        if (source && target) usePlayList.getState().reorder(list.indexOf(source), list.indexOf(target));
      }}
    />
  );
};

export default QueuePage;
