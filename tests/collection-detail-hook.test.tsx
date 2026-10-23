import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";

import { afterEach, describe, expect, it } from "vitest";

import type { Track } from "@/domain/track";
import type { CollectionDetailConfig } from "@/pages/video-collection/detail/types";

import { CollectionType } from "@/common/constants/collection";
import { useCollectionDetail } from "@/pages/video-collection/detail/use-collection-detail";

/**
 * 调查用：复现「详情页有 info 但列表空」。
 *
 * 收藏夹走 paged-server：mount 拉第一页 → medias → entries。
 * 若 entries 在数据到达后仍为空，根因在 hook 状态机或条目映射，不在 UI。
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

interface Media {
  id: number;
  type: number;
  title: string;
  attr: number;
  bvid: string;
}

const media = (id: number): Media => ({ id, type: 2, title: `稿件${id}`, attr: 0, bvid: `BV${id}` });

const adapt = (m: Media): Track => ({
  id: `bilibili-video:${m.bvid}`,
  source: "bilibili-video",
  title: m.title,
  sourceRef: { bvid: m.bvid },
});

const config: CollectionDetailConfig<Media, { media_count: number }> = {
  collectionType: CollectionType.Favorite,
  fetchInfo: async () => ({ media_count: 3 }),
  listStrategy: {
    kind: "paged-server",
    fetchPage: async page => ({ medias: page === 1 ? [media(1), media(2), media(3)] : [], hasMore: false }),
  },
  adaptToTrack: adapt,
  entryKey: m => `bilibili-video:${m.bvid}`,
  orderOptions: [{ key: "mtime", label: "最近收藏" }],
  header: info => ({ title: "默认收藏夹", mediaCount: info?.media_count }),
  menuItems: () => [],
};

const mounted: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];
afterEach(() => {
  for (const item of mounted.splice(0)) {
    act(() => item.root.unmount());
    item.container.remove();
  }
});

interface ProbeState {
  entries: number;
  loading: boolean;
  hasMore: boolean;
}

const HookProbe = ({ onUpdate }: { onUpdate: (s: ProbeState) => void }) => {
  const { entries, listLoading, hasMore } = useCollectionDetail("123", config);
  useEffect(() => {
    onUpdate({ entries: entries.length, loading: listLoading, hasMore });
  }, [entries, listLoading, hasMore, onUpdate]);
  return null;
};

const ConfigProbe = <TInfo,>({
  config: probeConfig,
  onUpdate,
}: {
  config: CollectionDetailConfig<Media, TInfo>;
  onUpdate: (s: ProbeState) => void;
}) => {
  const { entries, listLoading, hasMore } = useCollectionDetail("123", probeConfig);
  useEffect(() => {
    onUpdate({ entries: entries.length, loading: listLoading, hasMore });
  }, [entries, listLoading, hasMore, onUpdate]);
  return null;
};

describe("useCollectionDetail paged-server", () => {
  it("mount 拉第一页后 entries 有内容、loading 归位、hasMore 落 false", async () => {
    const snapshots: ProbeState[] = [];
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    mounted.push({ root, container });

    await act(async () => root.render(<HookProbe onUpdate={s => snapshots.push(s)} />));
    // flush 异步 fetchPage（useRequest + fetchPage 各一个 microtask 环）
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const last = snapshots.at(-1);
    expect(last?.entries).toBe(3);
    expect(last?.loading).toBe(false);
    expect(last?.hasMore).toBe(false);
  });
});

/**
 * 合集走 client 全量：medias 挂在 fetchInfo 期间填充的 ref 上。
 * 回归：列表拉取必须等 info（fetchInfo）到位后再执行，否则读空列表 ——
 * 表现为「详情页有 info 但列表空」。
 */
describe("useCollectionDetail client 全量（合集）", () => {
  it("info 到位后拉列表，entries 有内容", async () => {
    const mediasRef: Media[] = [];
    const clientConfig: CollectionDetailConfig<Media, { media_count: number }> = {
      collectionType: CollectionType.VideoCollections,
      fetchInfo: async () => {
        mediasRef.length = 0;
        mediasRef.push(media(1), media(2), media(3));
        return { media_count: 3 };
      },
      listStrategy: {
        kind: "client",
        fetchAll: async () => [...mediasRef],
      },
      adaptToTrack: adapt,
      entryKey: m => `bilibili-video:${m.bvid}`,
      orderOptions: [{ key: "pubtime", label: "最近投稿" }],
      header: info => ({ title: "合集", mediaCount: info?.media_count }),
      menuItems: () => [],
    };

    const snapshots: ProbeState[] = [];
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    mounted.push({ root, container });

    await act(async () => root.render(<ConfigProbe config={clientConfig} onUpdate={s => snapshots.push(s)} />));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const last = snapshots.at(-1);
    expect(last?.entries).toBe(3);
    expect(last?.loading).toBe(false);
  });
});
