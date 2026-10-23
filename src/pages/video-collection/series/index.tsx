import { useMemo, useRef } from "react";
import { useParams } from "react-router";

import type { Media } from "@/service/user-video-archives-list";

import { CollectionType } from "@/common/constants/collection";
import { adaptCollectionMediaToTrack } from "@/features/playlist/tracks";
import { getSeriesArchives } from "@/service/series-archives";
import { getSeriesInfo, type SeriesMeta } from "@/service/series-info";
import { useUser } from "@/store/user";

import type { CollectionDetailConfig } from "../detail/types";

import { getContextMenus } from "../collections/menu";
import { CollectionDetail } from "../detail/collection-detail";

/** 系列详情。先拉 meta，再按 ps=30 增量追加稿件；客户端过滤排序；无收藏切换。 */
const Series = () => {
  const { id } = useParams();
  const userMid = useUser(state => state.user?.mid);

  // 增量分页的页码游标，挂组件实例上，重渲染不丢。
  const pageNumRef = useRef(1);

  const config: CollectionDetailConfig<Media, SeriesMeta> = useMemo(
    () => ({
      collectionType: CollectionType.VideoSeries,

      fetchInfo: async seriesId => {
        pageNumRef.current = 1;
        const res = await getSeriesInfo({ series_id: Number(seriesId) });
        return res?.data?.meta;
      },

      listStrategy: {
        kind: "client",
        append: true,
        fetchAll: async (seriesId, meta) => {
          if (!meta?.mid) return null;
          const res = await getSeriesArchives({
            mid: Number(meta.mid),
            series_id: Number(seriesId),
            sort: "desc",
            pn: pageNumRef.current,
            ps: 30,
          });
          const archives = res?.data?.archives ?? [];
          if (archives.length) pageNumRef.current += 1;
          return archives.map(a => ({
            id: a.aid,
            title: a.title,
            cover: a.pic,
            duration: a.duration,
            pubtime: a.pubdate,
            bvid: a.bvid,
            upper: { mid: Number(meta.mid), name: "" },
            cnt_info: { collect: 0, play: a.stat?.view ?? 0, danmaku: 0, vt: a.stat?.vt ?? 0 },
            enable_vt: Number(a.enable_vt ?? 0),
            vt_display: a.vt_display,
            is_self_view: false,
          }));
        },
        hasMore: (medias, meta) => medias.length < (meta?.total ?? 0),
      },

      adaptToTrack: adaptCollectionMediaToTrack,
      entryKey: media => `bilibili-video:${media.bvid}`,
      entryTimestamp: media => media.pubtime,

      orderOptions: [
        { key: "pubtime", label: "最近投稿" },
        { key: "play", label: "最多播放" },
      ],

      sortMedias: (medias, order) => {
        switch (order) {
          case "play":
            return medias.sort((a, b) => (b.cnt_info?.play || 0) - (a.cnt_info?.play || 0));
          case "pubtime":
            return medias.sort((a, b) => (b.pubtime || 0) - (a.pubtime || 0));
          default:
            return medias;
        }
      },

      // 系列 meta 没有 cover，沿用改动前行为：取第一篇稿件封面。
      header: (info, medias) => ({
        cover: medias[0]?.cover,
        title: info?.name,
        desc: info?.description,
        upMid: info?.mid,
        mediaCount: info?.total,
      }),

      isCreatedBySelf: info => Boolean(info?.mid) && Boolean(userMid) && info?.mid === userMid,

      menuItems: () => getContextMenus(),
    }),
    [userMid],
  );

  return <CollectionDetail id={id} config={config} />;
};

export default Series;
