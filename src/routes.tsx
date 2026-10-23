import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router";

import Layout from "./layout";
import EmptyPage from "./pages/empty";
import MusicRecommend from "./pages/music-recommend";
import NotFound from "./pages/not-found";

const DesignSystemPage = lazy(() => import("./pages/design-system"));
const DownloadList = lazy(() => import("./pages/download-list"));
const Chart = lazy(() => import("./pages/chart"));
const History = lazy(() => import("./pages/history"));
const Library = lazy(() => import("./pages/library"));
const LocalMusicPage = lazy(() => import("./pages/local-music"));
const MiniPlayer = lazy(() => import("./pages/mini-player"));
const NowPlaying = lazy(() => import("./pages/now-playing"));
const Queue = lazy(() => import("./pages/queue"));
const Search = lazy(() => import("./pages/search"));
const Settings = lazy(() => import("./pages/settings"));
const SocialPage = lazy(() => import("./pages/social"));
const TrackDetail = lazy(() => import("./pages/track-detail"));
const UserProfile = lazy(() => import("./pages/user-profile"));
const Folder = lazy(() => import("./pages/video-collection"));

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <MusicRecommend />,
      },
      {
        path: "chart",
        element: <Chart />,
      },
      {
        path: "library",
        element: <Library />,
      },
      {
        path: "history",
        element: <History />,
      },
      {
        path: "follow",
        element: <SocialPage />,
      },
      {
        path: "collection/:id",
        element: <Folder />,
      },
      {
        path: "track/:bvid",
        element: <TrackDetail />,
      },
      {
        path: "user/:id",
        element: <UserProfile />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "download-list",
        element: <DownloadList />,
      },
      {
        path: "dynamic-feed",
        element: <Navigate to="/follow?tab=updates" replace />,
      },
      {
        path: "local-music",
        element: <LocalMusicPage />,
      },
      {
        path: "search",
        element: <Search />,
      },
      {
        // 09 播放队列。壳层状态 default —— 队列页仍要能看进度、能操作播放。
        // 页面正文随 P5 落地，此处先保证路由可达且入口（播放栏「队列 · N」）有效。
        path: "queue",
        element: <Queue />,
      },
      {
        // 10 正在播放。壳层状态 immersive（隐藏顶栏与播放栏）由
        // layout/route-shell.ts 的路由契约决定，不写在这里——路由表只声明「哪个页面」，
        // 壳层契约集中在 route-shell.ts，便于与真值文件对照。
        path: "now-playing",
        element: <NowPlaying />,
      },
      {
        path: "empty",
        element: <EmptyPage />,
      },
      ...(import.meta.env.DEV
        ? [
            {
              path: "design-system",
              element: <DesignSystemPage />,
            },
          ]
        : []),
      {
        // 404 落在**壳层内**：侧栏与播放栏仍然可用，用户有出口可走。
        // 放到 Layout 之外会得到一张裸页面，连导航都没有。
        path: "*",
        element: <NotFound />,
      },
    ],
  },
  {
    path: "mini-player",
    element: <MiniPlayer />,
  },
];

export default routes;
