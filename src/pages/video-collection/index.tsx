import React, { useMemo } from "react";
import { useSearchParams } from "react-router";

import { CollectionType } from "@/common/constants/collection";
import { usePlaylistDetailFixtureData } from "@/features/playlist/fixture";
import { PlaylistDetailView } from "@/features/playlist/playlist-detail-view";
import { PLAYLIST_DETAIL_TRACK_ACTIONS } from "@/features/playlist/track-actions";
import SegmentNav from "@/layout/topbar/segment-nav";
import { useRouteSegments } from "@/layout/use-route-segments";
import { AnnotationBand } from "@/ui/patterns/annotation-band";
import { DialogAction, DialogStatic } from "@/ui/patterns/dialog";

import VideoCollections from "./collections";
import Favorites from "./favorites";
import Series from "./series";

/**
 * 下载弹层的静态位。
 *
 * `cplus-spec-lock.json` 的 `geometry.dialog.rule` 给的是**原型**坐标
 * left 752 / top 225 —— 相对内容区（顶栏之下、左 gutter 之右）。换算到
 * 1440×900 画布即 (752+64, 225+71) = (816, 296)，与设计稿第 3 页像素取证
 * 的弹层面板 bbox（x816..1375 × y296..447，≈560×153）逐像素吻合。
 *
 * 绝对定位基准是壳层 `<main>`（顶边 = 顶栏下沿、左边 = 画布 x0），
 * 故 left 直接用画布值 816，top 减去顶栏高度。
 */
const DIALOG_STATIC_LEFT = 816;
const SHELL_MAIN_TOP = 71;
const DIALOG_STATIC_TOP = 296 - SHELL_MAIN_TOP;

/**
 * 屏 02 的夹具渲染（`?fixture=02-playlist-detail`）。
 *
 * 注解带与下载弹层放在 `<PlaylistDetailView>` 的**兄弟**位置：注解带
 * `position: absolute; top 653` 定位到壳层 `<main>`，必须落在滚动容器之外；
 * 下载弹层用 `DialogStatic` 按设计稿静态位（画布 left 752 / top 225）摆在同一
 * 定位上下文里 —— 设计稿把它**画**在页面上，夹具要复现画面就得静态渲染它。
 */
const FixturePlaylistDetail = ({ preview4188 = false }: { preview4188?: boolean }) => {
  const fixture = usePlaylistDetailFixtureData();
  const { segments, activeKey } = useRouteSegments();
  const tabs = segments.length > 0 ? <SegmentNav segments={segments} activeKey={activeKey} /> : null;

  if (!fixture) return null;

  const columns = [
    { key: "index", label: fixture.head[0] },
    { key: "content", label: fixture.head[1] },
    { key: "faved", label: fixture.head[2] },
    { key: "duration", label: fixture.head[3], align: "end" as const },
  ];

  return (
    <>
      <PlaylistDetailView
        title={fixture.title}
        lead={fixture.lead}
        tabs={tabs}
        pills={fixture.pills}
        sectionTitle={fixture.sectionTitle}
        columns={columns}
        tracks={fixture.tracks}
        rowActions={PLAYLIST_DETAIL_TRACK_ACTIONS}
        demoActionRowIds={preview4188 ? [] : fixture.demoActionRowIds}
        onPillPress={() => {
          /* 夹具模式不触网、不跳转：比对需要画面稳定。 */
        }}
        onRowAction={() => {
          /* 夹具模式不触网。 */
        }}
      />
      {!preview4188 && <AnnotationBand>{fixture.note}</AnnotationBand>}
      {!preview4188 && (
        <DialogStatic
          style={{ left: DIALOG_STATIC_LEFT, top: DIALOG_STATIC_TOP }}
          title={fixture.modal.title}
          sub={fixture.modal.sub}
          lines={fixture.modal.lines}
          footer={<DialogAction onPress={() => undefined}>{fixture.modal.action}</DialogAction>}
        />
      )}
    </>
  );
};

const Folder = () => {
  const [searchParams] = useSearchParams();

  const fixtureEnabled = searchParams.get("fixture") === "02-playlist-detail";

  // type 不在 21/31 内（缺省、0、历史脏链接）一律按收藏夹渲染 —— 三个分支
  // 全不命中时页面只剩壳层、内容区整片空白，比报错更难排查。
  const collectionType = useMemo(() => {
    const raw = Number(searchParams.get("type"));
    return raw === CollectionType.VideoCollections || raw === CollectionType.VideoSeries
      ? (raw as CollectionType)
      : CollectionType.Favorite;
  }, [searchParams]);

  if (fixtureEnabled) {
    return <FixturePlaylistDetail preview4188={searchParams.get("preview") === "4188"} />;
  }

  return (
    <>
      {collectionType === CollectionType.Favorite && <Favorites />}
      {collectionType === CollectionType.VideoCollections && <VideoCollections />}
      {collectionType === CollectionType.VideoSeries && <Series />}
    </>
  );
};

export default Folder;
