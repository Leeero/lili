# lili 当前能力依赖清单

> 日期：2026-09-22  
> 目的：冻结重构前的真实技术边界。阶段 1 新增的领域模型和适配器必须建立在这些能力之上，不新增后端接口。

## 1. 总体调用路径

```text
React 页面 / 组件
├── Zustand Store ── Service ── apiRequest ── Electron 网络层 ── Bilibili API
├── Service ───────── apiRequest ── Electron 网络层 ── Bilibili API
└── window.electron ── preload ── IPC ── Electron 主进程 / 本地文件 / FFmpeg
```

当前页面直接依赖 Store、Service 和 `window.electron`，这是视觉与业务耦合的主要来源。重构期保留底层能力，在其上新增 adapter 和 feature action，不直接重写底层。

## 2. 核心 Store 与消费者

| Store | 持有能力 | 主要消费者 | 重构策略 |
| --- | --- | --- | --- |
| `play-list` | Audio 实例、队列、播放模式、媒体会话、在线播放地址刷新 | 播放栏、全屏播放、迷你播放器、列表项、播放队列 | 保留公开接口；由 player feature 包装 |
| `play-progress` | 当前播放进度及 localStorage 恢复 | `play-list`、进度条 | 保留；后续补版本化持久化 |
| `settings` | 主题、音质、下载、代理、布局和本地目录设置 | App、主题、侧栏、设置页、播放与下载工具 | 保留 Electron Store 格式；UI 只通过 settings feature 访问 |
| `user` / `token` | 登录用户、Cookie/Token 相关状态 | 导航、收藏、请求拦截器、用户页 | 保留持久化结构；由 account feature 包装 |
| `favorite` | 创建/收藏的收藏夹及用户自定义顺序 | 侧栏、收藏夹页面与编辑弹窗 | 保留数据兼容；由 playlist adapter 输出统一模型 |
| `music-fav` | 当前播放项的点赞/收藏状态 | 播放详情与收藏按钮 | 合并到统一 TrackCapabilities/TrackActions |
| `fav-folder-items` | 当前收藏夹内容的局部缓存 | 收藏夹列表和操作菜单 | 迁移为 playlist feature 页面状态 |
| `shortcuts` | 桌面快捷键设置 | 设置页、主应用初始化 | 保留 IPC 与数据格式 |
| `app-update` | 应用更新状态 | 导航更新入口 | 外围能力，阶段 8 再迁移 |
| `modal` | 收藏、下载、确认、全屏播放器等弹层状态 | 多个页面与组件 | 随 feature 迁移拆分，避免继续扩大全局 Modal Store |

## 3. Service 能力分组

| 领域 | 现有 Service | 主要调用方 | 阶段 1 适配目标 |
| --- | --- | --- | --- |
| 推荐 | `web-interface-new-music*`、`web-interface-region-feed-rcmd`、`music-comprehensive-web-rank` | 音乐推荐页 | `Track[]` / 推荐区块 |
| 搜索 | `main-suggest`、`web-interface-search-type`、`web-interface-history-search` | 顶栏搜索、搜索结果页 | `SearchResult<Track/Creator>` |
| 播放 | `web-interface-view`、`player-pagelist`、`player-playurl`、`audio-song-info`、`audio-web-url` | 播放 Store、列表组件 | `Track`、`TrackPart`、播放源 |
| 收藏夹 | `fav-folder-*`、`fav-resource-*` | 侧栏、收藏夹页面、编辑弹窗 | `Playlist`、分页内容、PlaylistActions |
| 音频收藏 | `medialist-gateway-*` | 当前播放收藏按钮、收藏选择弹窗 | Track 收藏状态与文件夹变更 Action |
| 合集/系列 | `space-seasons-series-list`、`series-*`、`fav-season-*` | 用户页、视频合集页 | 统一为只读/可收藏 Playlist |
| 用户/创作者 | `space-*`、`relation-*`、`user-*` | 用户主页、关注列表、导航 | `Creator` 与关注 Capability |
| 动态 | `web-dynamic*` | 动态页、用户动态 | 阶段 8 保持原 DTO，最后适配 |
| 历史/稍后看 | `history-*`、`history-toview-*` | 历史与稍后看页面 | 辅助音乐来源列表 |
| 登录 | `passport-login-*` | 二维码、短信、密码登录 | 保持流程与 Cookie 语义不变 |
| 歌词 | `ai-lyrics` 加 Electron 歌词 IPC | 歌词组件与搜索弹窗 | `LyricsDocument` |
| 播放上报 | `click-interface-*` | 播放 Store | 保持调用时机，不暴露给 UI |

## 4. Electron IPC 能力与渲染层消费者

| IPC 领域 | preload 暴露能力 | 当前消费者 | 重构约束 |
| --- | --- | --- | --- |
| 下载 | 获取、订阅、添加、暂停、恢复、取消、重试、清空任务 | 下载页、音乐/视频下载弹窗 | 下载状态机继续留在主进程 |
| 本地音乐 | 选择/扫描目录、读取本地文件 | 本地音乐页、URL 工具 | 不把文件系统权限移入渲染层 |
| 歌词 | LRCLIB、网易云查询及缓存 | 歌词、歌词搜索弹窗 | feature 只消费统一歌词模型 |
| Store | 获取、写入、清理设置/用户/快捷键/歌词缓存 | Zustand 持久化 Store | 存储名称与已有结构保持兼容 |
| 窗口 | 最小化、最大化、关闭、全屏、迷你播放器 | 窗口按钮、导航、播放器 | 通过 app-shell/player action 统一调用 |
| 对话框/系统 | 选择目录、打开文件/目录、字体列表 | 设置、下载、本地音乐 | 保持显式用户操作触发 |
| 快捷键 | 注册和更新全局快捷键 | shortcut Store、设置页 | 播放 action 作为最终执行入口 |
| 更新 | 检查、下载、安装与进度订阅 | 更新按钮、更新弹窗 | 阶段 8 迁移，不进入音乐主链路 |
| 网络桥接 | Cookie、WBI、播放地址及请求转发 | request 层和音频工具 | 视为基础设施，不由页面直接访问 |

## 5. 必须保持兼容的数据

| 数据     | 当前载体                           | 兼容要求                                   |
| -------- | ---------------------------------- | ------------------------------------------ |
| 应用设置 | Electron Store `app-settings`      | 字段不删除；旧默认值继续迁移               |
| 登录信息 | Electron Store `user-login-info`   | Cookie、Token 和用户信息不能因 UI 迁移丢失 |
| 下载任务 | Electron Store `media-downloads`   | 运行中状态退出时转换为对应暂停状态         |
| 快捷键   | Electron Store `shortcut-settings` | 已有绑定可恢复                             |
| 歌词缓存 | Electron Store `lyrics-cache`      | 可继续读取旧缓存                           |
| 播放队列 | Zustand persist                    | `PlayData` 与当前 `playId/nextId` 可恢复   |
| 播放进度 | localStorage `play-current-time`   | 新播放器首次启动仍能读取                   |
| 收藏排序 | localStorage `favorites-order`     | 创建和收藏列表顺序保持                     |
| 搜索历史 | localStorage                       | 遵循“显示搜索历史”设置                     |

## 6. 阶段 1 禁止事项

- 不让新页面直接新增 `window.electron` 调用。
- 不让领域模型包含 `bvid/cid/sid` 之外的整块 API DTO。
- 不改变下载状态字符串和 Electron Store 键名。
- 不合并语义不同的“视频收藏夹”“音频收藏夹”“合集”请求，只在 UI 层统一呈现。
- 不把登录、播放地址解析、CSRF、WBI 签名逻辑搬入 feature 或组件。
- 不增加当前 Service、preload 或本地能力无法完成的交互入口。
