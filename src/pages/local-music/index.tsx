import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { useLocalMusicFixtureData } from "@/features/local-music/fixture";
import { LocalMusicView } from "@/features/local-music/local-music-view";
import { adaptLocalMusicCard, createLocalTrackEntries, filterLocalMusic } from "@/features/local-music/model";
import { executePlaylistBulkAction } from "@/features/playlist/bulk-actions";
import { executeTrackAction } from "@/features/track/actions";
import SegmentNav from "@/layout/topbar/segment-nav";
import { useRouteSegments } from "@/layout/use-route-segments";
import { useModalStore } from "@/store/modal";
import { useSettings } from "@/store/settings";
import { PageState } from "@/ui/states/page-state";

const LocalMusicPage = () => {
  const fixture = useLocalMusicFixtureData();
  const [searchParams] = useSearchParams();
  const localDirs = useSettings(state => state.localMusicDirs);
  const updateSettings = useSettings(state => state.update);
  const [items, setItems] = useState<LocalMusicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();

  const directoryIndex = searchParams.get("dir") ?? "all";
  const selectedDir = directoryIndex === "all" ? "all" : localDirs[Number(directoryIndex)] || "all";
  const keyword = searchParams.get("key") ?? "";
  const { segments, activeKey } = useRouteSegments();
  const tabs = segments.length > 0 ? <SegmentNav segments={segments} activeKey={activeKey} /> : null;

  const scan = useCallback(async () => {
    if (fixture) return;
    if (!localDirs.length) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      setItems(await window.electron.scanLocalMusic(localDirs));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [fixture, localDirs]);

  useEffect(() => {
    void scan();
  }, [scan]);

  const filtered = useMemo(() => filterLocalMusic(items, selectedDir, keyword), [items, keyword, selectedDir]);
  const entries = useMemo(() => createLocalTrackEntries(filtered), [filtered]);
  const cards = useMemo(() => filtered.map(adaptLocalMusicCard), [filtered]);

  const addDirectory = useCallback(async () => {
    const directory = await window.electron.selectDirectory("选择本地音乐目录");
    if (!directory) return;
    updateSettings({ localMusicDirs: Array.from(new Set([...localDirs, directory])) });
  }, [localDirs, updateSettings]);

  const playAll = useCallback(
    (shuffle: boolean) => {
      const tracks = entries.map(entry => entry.track);
      void executePlaylistBulkAction("play-all", shuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks);
    },
    [entries],
  );

  const deleteEntry = useCallback(
    (id?: string) => {
      const entry = entries.find(candidate => candidate.id === id);
      if (!entry) return;
      useModalStore.getState().onOpenConfirmModal({
        title: `删除“${entry.track.title}”`,
        description: "该操作会删除本地文件且不可恢复，请谨慎操作",
        confirmText: "删除",
        type: "danger",
        onConfirm: async () => {
          const deleted = await window.electron.deleteLocalMusicFile(entry.source.path);
          if (deleted) {
            setItems(previous => previous.filter(item => item.path !== entry.source.path));
            setSelectedId(undefined);
          }
          return deleted;
        },
      });
    },
    [entries],
  );

  const handleCardAction = useCallback(
    (id: string, action: string) => {
      const entry = entries.find(candidate => candidate.id === id);
      if (!entry) return;
      setSelectedId(id);
      if (action === "delete") {
        deleteEntry(id);
      } else if (action === "open-file") {
        void window.electron.showFileInFolder(entry.source.path);
      } else if (action === "play" || action === "play-next" || action === "add-to-playlist") {
        void executeTrackAction(action, entry.track);
      }
    },
    [deleteEntry, entries],
  );

  if (fixture) {
    return (
      <LocalMusicView
        title={fixture.header.title}
        lead={fixture.header.lead}
        tabs={tabs}
        cards={fixture.cards}
        note={searchParams.get("preview") === "4188" ? undefined : fixture.note}
        selectedId={fixture.cards[0].id}
        onPlayAll={() => undefined}
        onShuffle={() => undefined}
        onRescan={() => undefined}
        onDelete={() => undefined}
        onCardPress={() => undefined}
        onCardAction={() => undefined}
      />
    );
  }

  if (loading) return <PageState kind="loading" className="min-h-[420px]" />;
  if (loadError) return <PageState kind="error" actionLabel="重新扫描" onAction={() => void scan()} />;
  if (!localDirs.length) {
    return (
      <PageState
        kind="empty"
        title="尚未添加本地音乐目录"
        description="选择目录后即可扫描并播放本地音乐"
        actionLabel="添加目录"
        onAction={() => void addDirectory()}
      />
    );
  }
  const emptyState =
    cards.length === 0 ? (
      <PageState
        kind="empty"
        title="当前筛选下没有本地音乐"
        description="可以切换目录、修改搜索词或重新扫描"
        actionLabel="重新扫描"
        onAction={() => void scan()}
      />
    ) : undefined;

  return (
    <LocalMusicView
      title="本地音乐"
      lead={`${localDirs.length} 个目录 · ${items.length} 个文件 · 支持常见音频格式`}
      tabs={tabs}
      cards={cards}
      selectedId={selectedId}
      onPlayAll={() => playAll(false)}
      onShuffle={() => playAll(true)}
      onRescan={() => void scan()}
      onDelete={() => deleteEntry(selectedId)}
      onCardPress={id => {
        setSelectedId(id);
        const entry = entries.find(candidate => candidate.id === id);
        if (entry) void executeTrackAction("play", entry.track);
      }}
      onCardAction={handleCardAction}
      emptyState={emptyState}
      compact
    />
  );
};

export default LocalMusicPage;
