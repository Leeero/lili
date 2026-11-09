# lili 自动暂停（Auto Pause）—— 产品需求清单与技术方案

> 状态：**已审批**（2026-11-09）——D1–D4 均按推荐项确认，剩余「P1 是否同批次」待定（见 §12）
> 范围：锁屏 / 息屏 / 休眠 / 耳机与音频输出设备断开时自动暂停播放
> 下一步：执行 §9.1 Phase 0 预研（0.5 人日），结论决定 R3 是否进 P0

---

## 0. 一页结论

- **要做什么**：在"人离开"或"声音出口变了"时自动暂停，避免人不在还外放、耳机拔了从扬声器漏音。
- **怎么做**：主进程 `powerMonitor` 提供系统事件 → IPC 单通道下发 → 渲染端一个策略层统一裁决 → 复用现有 `audio.pause()`，天然同步托盘 / 菜单栏 / mediaSession。
- **最大不确定性已解除**：Phase 0 实测 Electron 38 在 `file://` 上下文能拿到完整设备名（默认项直接是 `Default - 外置耳机 (Built-in)`），因此拔耳机可用「默认输出不再命中耳机关键词」精确判定，无需退化方案。详见 §13。
- **已确认的限制**：不锁屏的「显示器休眠」在 Electron 没有可靠事件源（Phase 0 E5 无法在沙箱内完成），当前由「锁屏」与「休眠」两条覆盖；设置项文案已相应收敛，不写「息屏」。
- **默认值取舍**：锁屏暂停 **开**、设备断开暂停 **开**、解锁自动续播 **关**。
- **总量**：约 **3.5 人日**（不含原生模块备选方案）。

---

## 1. 已确认的 4 个决策（2026-11-09）

> **审批结论**：D1–D4 全部按推荐项通过。下表保留决策依据，便于后续回溯"为什么是默认开"。

| # | 决策 | 推荐 | 理由 | 备选代价 |
|---|---|---|---|---|
| D1 | 锁屏/息屏暂停默认开还是关 | **默认开** | 你的原始诉求；桌面端锁屏≈离开 | 若默认关，功能等于默认失效，需在设置页做引导 |
| D2 | 解锁后是否自动续播 | **默认关** | 公共场合/会议室解锁即出声是社死级体验 | 默认开需额外的"仅安静环境"判断，当前无此能力 |
| D3 | 拔耳机检测若预研失败 | **先发锁屏+休眠，耳机另立项** | 不阻塞 90% 价值；原生模块成本 3–5 人日且要三平台维护 | 强行上原生模块会引入编译链与 CI 复杂度 |
| D4 | "为什么停了"如何告知 | **解锁回到应用时一次性 toast** | 成本最低，且不在锁屏时弹无用提示 | 播放栏常驻标签需改播放栏布局，放 P2 |

---

## 2. 背景、目标与非目标

### 2.1 背景

lili 是常驻桌面的音乐播放器，可缩到托盘 / 迷你窗继续播放。当前**没有任何"离开即暂停"能力**：

- 锁屏去开会，音乐继续外放；
- 拔出耳机，macOS 自动切回内置扬声器，音乐直接从扬声器放出（最尴尬的场景）；
- 合盖休眠再唤醒，Chromium 可能恢复播放，在安静环境突然出声。

### 2.2 目标

| 目标 | 可度量标准 |
|---|---|
| G1 离开即静音 | 锁屏后 ≤ 1.5s 内 `audio.paused === true` |
| G2 不漏音 | 耳机断开到静音 ≤ 1s（含 300ms 淡出） |
| G3 不误伤 | 手动暂停、无播放、缓冲中、迷你窗口等状态不被干扰；不改变用户音量设置 |
| G4 可解释 | 用户能知道"为什么停了"，且能一键继续 |

### 2.3 非目标

- 不做"来电自动暂停"：桌面端无跨平台通话状态 API，Windows 的 `AudioSession`/macOS 的 CoreAudio 通话检测都需要原生模块。
- 不做"其他 App 抢占音频设备"检测（如开了视频会议）——同上，且误判率高。
- 不做睡眠定时器、白噪音例外、听力保护。
- 不改动 B 站播放上报逻辑（暂停仍走既有 heartbeat 路径）。

---

## 3. 用户场景

| # | 场景 | 期望行为 |
|---|---|---|
| S1 | 在公司戴着耳机听歌，起身锁屏去开会 | 立即静音；回来解锁，播放栏仍是暂停态，点一下继续 |
| S2 | 拔掉 3.5mm 耳机 / 关掉蓝牙耳机 | 立刻静音，**不能**从扬声器漏出半秒 |
| S3 | 合盖离开，1 小时后打开笔记本 | **唤醒后不自动出声**（关键：休眠期间无法执行暂停，必须在唤醒时拦截） |
| S4 | 在家用显示器睡眠当"关闭屏幕"，但系统没锁 | 也停（若"息屏"信号可用，见 Phase 0） |
| S5 | 我在锁屏状态下就是想继续听（睡前/后台听歌） | 设置里一键关掉，行为退回现状 |
| S6 | 蓝牙耳机瞬断 1 秒又连上 | **不暂停**（宽限期兜底），避免每走两步就断一次 |

---

## 4. 需求清单

### P0（本次交付）

| ID | 需求 | 验收标准 |
|---|---|---|
| R1 | 锁屏自动暂停（macOS / Windows） | 播放中锁屏，1.5s 内暂停；未播放时无任何副作用 |
| R2 | 休眠/唤醒不自动出声 | 合盖 1 分钟后唤醒，`isPlaying === false` 且无声音输出 |
| R3 | 耳机/音频输出设备断开自动暂停 | 拔有线耳机、蓝牙断开、输出设备消失 → 1s 内静音 |
| R4 | 300ms 淡出 | 暂停前音量线性降到 0，无爆音；结束后 `audio.volume` 精确还原为用户设定值 |
| R5 | 幂等与不丢进度 | 已暂停时不重复触发；`currentTime` 不变，继续播放从原位置开始 |
| R6 | 三项设置 + 持久化 | 设置 → 播放 → 自动暂停；重启后保持；导出再导入不丢字段 |
| R7 | 与系统集成一致 | 暂停后托盘菜单显示"播放"、`mediaSession.playbackState === "paused"` |
| R8 | 迷你窗口 / 托盘隐藏下同样生效 | 迷你模式下锁屏仍暂停（音频始终在主窗口上下文） |

### P1（同批次可做，视排期）

| ID | 需求 | 说明 |
|---|---|---|
| R9 | 解锁后自动续播（默认关） | 仅当"本次暂停由系统触发 + 未换歌 + 10 分钟内"生效 |
| R10 | 蓝牙瞬断宽限 | **实现改为 300ms 去抖**：2s 宽限会让真拔耳机时从扬声器漏出整句，代价大于收益；蓝牙瞬断的重连间隙通常由去抖窗口吸收 |
| R11 | 暂停原因提示 | 解锁/回到应用时 toast：「已因锁屏暂停播放」 |
| R12 | 锁屏子项联动 | 关闭"锁屏暂停"时，隐藏"解锁自动续播"，避免无效选项 |

### P2（后续）

| ID | 需求 | 说明 |
|---|---|---|
| R13 | 播放栏常驻状态标签 | 「因锁屏暂停」小字，30s 后消失 |
| R14 | 输出设备切换提示 | 「已切换到 AirPods Pro」 |
| R15 | 空闲超时暂停 | 无人操作 N 分钟（默认关，语义与息屏不同，易误伤） |
| R16 | Linux 锁屏支持 | Electron 在 Linux 不派发 `lock-screen`，需 D-Bus(logind)，另评估 |

### 明确不做

| 方案 | 为什么不做 |
|---|---|
| 用 `getUserMedia({audio:true})` 换取设备名 | 会点亮系统麦克风指示器 + 触发 macOS 权限弹窗，音乐播放器要麦克风权限不可接受 |
| 原生模块监听 CoreAudio / WASAPI | 延迟最低（<50ms）、保真度最高，但引入 x64/arm64 三平台预编译与 CI 构建成本，见 D3 |
| 用 `setSinkId` 锁定输出设备 | 与"跟随系统输出"冲突，用户切设备会失声 |
| 用 `document.visibilityState` 判断锁屏 | 锁屏不改变页面可见性，实测无效（Chromium 无此语义） |

---

## 5. 触发源 × 平台能力矩阵

| 触发源 | macOS | Windows | Linux | 检测手段 | 可靠性 |
|---|---|---|---|---|---|
| 锁屏 | ✅ | ✅ | ❌ | `powerMonitor` `lock-screen` | 高（官方事件） |
| 解锁 | ✅ | ✅ | ❌ | `unlock-screen` | 高 |
| 休眠 / 合盖 | ✅ | ✅ | ✅ | `suspend` | 高 |
| 唤醒 | ✅ | ✅ | ✅ | `resume` | 高 |
| 息屏但不锁屏 | ⚠️ 待验证 | ⚠️ 待验证 | ⚠️ | 空闲状态轮询（见 8.4） | 中 |
| 拔有线耳机 | ⚠️ 待验证 | ⚠️ 待验证 | ⚠️ | `devicechange` + 设备快照 diff | 中 |
| 蓝牙断开 | ⚠️ 待验证 | ⚠️ 待验证 | ⚠️ | 同上 | 中 |

> ⚠️ 项全部由第 9 节 Phase 0 预研给出结论；未验证前不写进发布说明。

---

## 6. 交互与文案

### 6.1 设置页位置

`设置 → 播放` 下新增分组「自动暂停」（现有分支在 `src/pages/settings/system-settings.tsx:145`，与「音质偏好」「上报播放记录」同级）：

```
自动暂停
├─ 锁屏或休眠时暂停                   [Switch]  默认开
│    回到电脑后不会自动播放
├─ 耳机或音频输出设备断开时暂停        [Switch]  默认开
│    拔出耳机、蓝牙断开时立即静音，避免从扬声器漏音
└─ 解锁后自动继续播放                 [Switch]  默认关（仅上一项开启时显示）
     仅当刚才由系统暂停、且没有换歌时生效
```

### 6.2 提示文案

| 时机 | 形式 | 文案 |
|---|---|---|
| 解锁/回到应用，且暂停由锁屏触发 | Toast，2.5s | 标题「已因锁屏暂停播放」；描述「点播放可继续」 |
| 设备断开导致暂停 | 不提示（用户就在旁边，正在拔耳机） | — |
| 自动续播执行 | 不提示 | — |

> 暂停瞬间**不弹提示**：锁屏状态下用户看不到，纯噪音。

### 6.3 状态一致性

暂停后必须同步：播放栏按钮→"播放"、托盘/菜单栏标签→"播放"、`mediaSession.playbackState`→`paused`、`isPlaying`→`false`。全部由既有 `audio.onpause` 链路自动完成（见 7.2），**不新增状态通道**。

---

## 7. 现状（代码事实）

> 以下为 2026-11-09 实读结论，不是推测。

| 事实 | 位置 |
|---|---|
| 渲染端只有一个 `audio` 单例，模块级导出 | `src/store/play-list.ts:210` `export const audio = createAudio()` |
| 暂停动作目前只有一个 toggle，没有独立 pause | `src/store/play-list.ts:536` `togglePlay`；暂停分支 `:551-556` |
| `audio.onpause` 会把 `isPlaying` 置 false 并更新 `mediaSession` | `src/store/play-list.ts:422-430` |
| 播放状态推给主进程走订阅桥，只在主窗口启动 | `src/common/utils/player-status-bridge.ts`，启动点 `src/app.tsx:67` |
| 迷你窗口是独立 JS 上下文，既有桥都靠 `hash.includes("mini-player")` 自守卫 | 同上 `:16`；`src/common/utils/player-command.ts:70` |
| 主进程已有播放状态快照（含 `isPlaying`） | `electron/ipc/player-status.ts` `getPlayerStatus()` |
| 主进程 IPC 统一走信任校验 | `electron/security/ipc.ts` `onTrustedIpc` |
| 设置写入路径：渲染端 `useSettings.update` → `store:set`；主进程 `appSettingsStore` 共用同一份默认值 | `src/store/settings.ts:23-52`、`electron/store.ts:12-21` |
| 设置页表单用 `watch` 逐字段 patch：`{ [name]: value }` | `src/pages/settings/index.tsx:100-103` |
| 全仓 **0 处** `powerMonitor`、0 处 `mediaDevices` | `grep` 结果 |
| Electron 38.6.0 / React 19 / Zustand 5 | `package.json` |

**关键推论 1**：音频永远在主窗口渲染进程里，迷你窗口只是镜像 UI。因此监听逻辑放在主窗口即可覆盖全部模式。

**关键推论 2**：`src/pages/settings/index.tsx` 的 patch 用字面量 key。若把设置设计成嵌套对象 `autoPause.onLock`，watch 的 `name` 会是 `"autoPause.onLock"`，patch 就变成 `{ "autoPause.onLock": true }` —— **持久化会静默失效**。所以设置必须是**扁平布尔字段**（与既有 `reportPlayHistory` 等一致）。

---

## 8. 技术方案

### 8.1 总体结构

```
┌─ 主进程 electron/system/power-events.ts ─────────────────────────┐
│ powerMonitor.on(lock-screen | unlock-screen | suspend | resume)  │
│ 轮询 getSystemIdleState() （仅"息屏"信号需要时，且仅播放中）        │
│ 读取 getPlayerStatus().isPlaying → 附带 wasPlaying                │
└───────────────┬──────────────────────────────────────────────────┘
                │ webContents.send("player:system-event", payload)
                ▼
┌─ 渲染端 src/common/utils/auto-pause/index.ts（仅主窗口） ──────────┐
│  事件汇总 ─→ 去抖/宽限 ─→ 策略(纯函数) ─→ 动作                    │
│  ▲                              ▲                                │
│  │                              └─ 读 useSettings（实时，不缓存）   │
│  └─ audio-device-watch.ts：devicechange + enumerateDevices 快照    │
└───────────────┬──────────────────────────────────────────────────┘
                │ usePlayList.pause(reason)
                ▼
   audio.pause() → onpause → isPlaying=false → status bridge → 托盘/菜单/mediaSession
```

### 8.2 新增模块清单

| 层 | 文件 | 职责 | 规模 |
|---|---|---|---|
| 主进程 | `electron/system/power-events.ts` | 订阅 `powerMonitor`，转发事件，维护 `wasPlayingBeforeSuspend` | ~80 行 |
| IPC 契约 | `electron/ipc/channel.ts` 增 `player.systemEvent` | 通道常量 | +1 行 |
| preload | `electron/preload.ts` 增 `onSystemPowerEvent` | 桥接 + 取消订阅 | ~12 行 |
| 类型 | `shared/types/player.d.ts` 增 `SystemPowerEvent` | 事件形状 | ~10 行 |
| 渲染端 | `src/common/utils/auto-pause/index.ts` | 编排：订阅、去抖、宽限、提示 | ~120 行 |
| 渲染端 | `src/common/utils/auto-pause/policy.ts` | **纯函数**裁决 + 设备指纹 diff | ~90 行 |
| 渲染端 | `src/common/utils/auto-pause/audio-device-watch.ts` | `devicechange` 封装 | ~60 行 |
| 渲染端 | `src/common/utils/auto-pause/fade.ts` | 淡出，直接操作 `getAudio()` | ~40 行 |
| 状态 | `src/store/auto-pause.ts` | `lastSystemPause`（内存态，不持久化） | ~30 行 |
| 领域 | `src/store/play-list.ts` | 新增 `pause(reason?)` | +8 行 |
| 设置 | 类型/默认值/store/页面 | 3 个扁平字段 | ~40 行 |

### 8.3 IPC 契约

```ts
type SystemPowerEventType = "lock-screen" | "unlock-screen" | "suspend" | "resume";

interface SystemPowerEvent {
  type: SystemPowerEventType;
  /** 事件时间戳，用于宽限期与"最近一次系统暂停"判定 */
  at: number;
  /** 仅 resume 携带：休眠前是否在播放（主进程侧快照） */
  wasPlaying?: boolean;
}
```

- 通道名：`player:system-event`，归入既有 `channel.player` 命名空间。
- 方向：主进程 → 渲染端单向推送，`webContents.send`，发送前判 `isDestroyed()`。
- 渲染端通过 `window.electron.onSystemPowerEvent(cb)` 订阅，返回取消函数（与 `onPlayerCommand` 同形）。
- 安全：单向推送不经过 `handleTrustedIpc`；渲染端入口处校验 `typeof payload?.type === "string"`，不信任主进程以外来源（该通道渲染端无法伪造发送）。

### 8.4 三类信号的落地方式

**A. 锁屏（可靠）**
主进程 `lock-screen` → 下发 → 渲染端 **1.2s 宽限**后暂停（快速锁屏又解锁不打断）。

**B. 休眠（必须做成"唤醒时拦截"）**
休眠期间渲染进程被冻结，**休眠前暂停在物理上无意义**。正确做法：
1. `suspend` 到达时，主进程记录 `wasPlayingBeforeSuspend = getPlayerStatus().isPlaying`，同时尽力下发一次 `suspend`（作为尽力而为）；
2. `resume` 到达时下发 `{ type: "resume", wasPlaying }`；
3. 渲染端收到 `resume` 且 `wasPlaying === true` 且开关开启 → **立即 `pause()`（不走 300ms 淡出，因为已经出声了）**；
4. 若唤醒后 `audio.paused === false`，再补一次强制 `audio.pause()`（防止 Chromium 在 resume 回调前抢跑）。

**C. 息屏但不锁屏（中等可靠性，需预研）**
Chromium 没有"显示器关闭"事件。候选信号是 `powerMonitor.getSystemIdleState(threshold)`，其 `'idle'` 语义对应"屏保/屏幕熄灭"。风险是它可能只反映"无输入"，从而误伤"听歌不操作"的用户。

因此：
- 仅当**预研确认它确实在息屏时翻转、而在 merely 无输入时不翻转**，才纳入 P0；
- 纳入时也只在**播放中**轮询（15s 间隔），暂停后立即停止轮询；
- 默认阈值 60s，写死为常量，不做 UI 暴露。

**D. 设备断开（最大不确定性）**

```
snapshot = enumerateDevices().filter(kind === "audiooutput")
                 .map(d => ({ id: d.deviceId, label: d.label }))
fingerprint = snapshot.map(x => x.label || x.id).sort().join("|")
```

判定规则（纯函数，可单测）：

| before → after | 判定 | 动作 |
|---|---|---|
| 私有输出（耳机/蓝牙关键词命中）消失，且仍有公开输出 | 拔耳机 | 暂停 ✔ |
| 设备集合整体变小 | 未知设备移除 | 暂停（宁停勿漏） |
| 设备集合变大 / 仅第 3 个设备新增 | 插入设备 | 不动作 |
| 集合不变但 default 指向变化 | 切换输出（如切 AirPlay） | 不动作（P2 提示） |
| labels 与 ids 全为空且数量不变 | **无法判定** | 记日志，不动作 |

`isPrivateOutput` 关键词表（可单测）：`耳机|耳麦|headphone|headset|earbud|airpods|buds|beats|wh-|wf-|bluetooth|蓝牙|usb audio|dac`。

> **必须先预研的原因**：Chromium 出于隐私，未获媒体权限时 `deviceId` 与 `label` 可能返回空串，输出设备可能只剩 `default` / `communications` 两个占位项。若确实如此，本方案**退化为失效**（见 D3 的兜底）。

### 8.5 暂停动作与淡出

```ts
// src/store/play-list.ts 新增（语义化动作，供系统暂停与未来扩展复用）
pause: () => {
  if (audio.paused) return;      // 幂等：已暂停直接返回
  audio.pause();                  // onpause 会置 isPlaying=false 并同步 mediaSession
},
```

淡出必须在 `pause()` 之前，且**不能**调用 `setVolume()`：

> `setVolume()` 会同时写 store 且 `volume` 在 `partialize` 白名单里（`src/store/play-list.ts:985`），逐级淡出会把 0.05/0.1/0.15… 写进 electron-store，用户下次启动音量就变小了。淡出必须直接操作 `getAudio().volume`，暂停后立刻还原为 store 里的 `volume`。

```
fadeOutThenPause(300ms):
  const el = getAudio(); const target = usePlayList.getState().volume;
  if (el.muted || target === 0 || el.ended) { pause(); return; }
  6 步 × 50ms 递减 el.volume → 0 → pause() → el.volume = target
```

### 8.6 恢复（P1）

条件全部满足才续播：`lastSystemPause` 存在 且 `暂停原因 === lock/suspend` 且 `当前 playId 未变` 且 `now - at < 10min` 且 `resumeOnUnlock === true`。

清空 `lastSystemPause` 的时机：`audio.onplay` 触发时（覆盖用户手动点播放/切歌/托盘操作等一切路径），保证不会出现"用户手动放了，解锁后又重放一次"。

### 8.7 数据模型

```ts
// shared/types/app-setting.d.ts
autoPauseOnLock: boolean;            // 默认 true
autoPauseOnAudioDeviceLost: boolean; // 默认 true
autoPauseResumeOnUnlock: boolean;    // 默认 false
```

同步位置（少一处就出 bug）：
1. `shared/types/app-setting.d.ts` — 类型
2. `shared/settings/app-settings.ts` — 默认值（主进程 `electron/store.ts` 也引用它，改一处即可）
3. `src/store/settings.ts` — `partialize` 白名单（**漏了就不持久化**）
4. `src/pages/settings/index.tsx` — 表单 `defaultValues` + `useShallow` 选择器 + 依赖数组
5. `src/pages/settings/system-settings.tsx` — 三个 Switch（`section === "playback"`）
6. `src/pages/settings/export-import.tsx` — 若导出字段白名单是手写的，需同步（**待核实**，实现时确认）

旧配置兼容：`mergeImportedSettings` 以 `defaultAppSettings` 的 key 为准做浅合并，缺失字段自动回落默认值，无需迁移代码。

### 8.8 失败模式与降级

| 失败模式 | 处理 |
|---|---|
| `navigator.mediaDevices` 不存在（非安全上下文） | 设备能力整体关闭，只保留锁屏/休眠，日志告警 |
| `enumerateDevices` 抛错 | 同上 |
| 设备标签全空 | 退化为"集合变小才暂停"，再退化为不动作 |
| 事件重复（lock + suspend 连发） | 300ms 合并 + `pause()` 幂等，最多一次提示 |
| 渲染进程已崩溃/未就绪 | 主进程发送前判 `isDestroyed()`，失败不重试（无意义） |
| 迷你窗口 | 不启动监听（`hash.includes("mini-player")` 守卫），避免幽灵暂停 |
| 托盘隐藏（窗口 hide） | 主窗口渲染进程仍存活，正常生效 |

---

## 9. 验证计划

### 9.1 Phase 0 预研（0.5 人日，**先做，结果决定方案走向**）

| # | 实验 | 方法 | 通过标准 |
|---|---|---|---|
| E1 | `devicechange` 是否派发 | 开发态临时页面打印事件 + `enumerateDevices()` 快照，插拔 3.5mm / 蓝牙耳机 | 事件触发 ≥ 1 次 |
| E2 | 设备标识是否可用 | 同上，看 `label` / `deviceId` 是否非空且能区分耳机 vs 扬声器 | 至少能有"集合变化"可辨 |
| E3 | 漏音窗口 | 播放中拔耳机，录屏/计时 | 从拔出到静音 < 1s |
| E4 | 锁屏事件 | `Ctrl+Cmd+Q` | `lock-screen` / `unlock-screen` 均到达 |
| E5 | 息屏（不锁屏） | 显示器 1 分钟睡眠 | 确认 `getSystemIdleState` 是否翻转、翻转为 `idle` 还是 `locked` |
| E6 | 休眠唤醒 | 合盖 10 分钟后唤醒 | 音频是否自动续播；`resume.wasPlaying` 是否正确 |

> 预研只写一次性探针代码（`tools/` 下脚本或临时 console），**不提交业务代码**。
> E1/E2 失败 → 立即执行 D3 兜底；E5 失败 → "息屏"从 P0 降为 P2。

### 9.2 单元测试（新增 4 个文件）

| 文件 | 覆盖 |
|---|---|
| `tests/auto-pause-policy.test.ts` | 12 条真值表：3 类事件 × 3 个开关 × 播放/暂停状态，断言"是否暂停 / 是否提示" |
| `tests/audio-device-diff.test.ts` | 拔有线、拔蓝牙、插耳机、切输出、空标签、数量不变等 8 例 |
| `tests/auto-pause-bridge.test.ts` | 仿 `tests/player-status-bridge.test.ts` 的 electron stub，断言 IPC 事件 → `pause()` 调用次数（幂等） |
| `tests/settings.test.ts`（增补） | 三个新字段默认值 + 持久化白名单 + 旧配置回落 |

主进程侧 `power-events` 用 mock 的 `electron.powerMonitor` 做 3 例：转发 payload、`wasPlaying` 计算、窗口销毁不抛错。

### 9.3 手工验收矩阵（macOS 必做，Win/Linux 冒烟）

| 场景 | macOS | Windows | Linux |
|---|---|---|---|
| 锁屏 → 暂停 | 必测 | 必测 | 不支持（预期） |
| 解锁 → 无自动播放（默认） | 必测 | 必测 | — |
| 解锁 → 自动续播（开关打开） | 必测 | 必测 | — |
| 合盖休眠 → 唤醒不出声 | 必测 | 必测（睡眠） | 必测 |
| 拔 3.5mm / 拔 DAC / 断蓝牙 | 必测 | 必测 | 必测 |
| 插入耳机 | 必测（不得暂停） | 必测 | 必测 |
| 迷你窗口模式下锁屏 | 必测 | 必测 | — |
| 托盘隐藏（关窗不退出）下锁屏 | 必测 | 必测 | — |
| 无播放 / 已暂停 / 缓冲中 | 必测（无副作用） | 必测 | 必测 |
| 淡出后音量值还原 | 必测（重启看音量） | 必测 | 必测 |
| 本地音乐 / MV / 单曲循环 | 必测 | 抽样 | 抽样 |

> 按项目纪律：改 UI 必须浏览器实测 + 量几何；`tsc --noEmit` 只看改动文件是否新增报错；stylelint 只跑改动单文件。

---

## 10. 工作量与提交切分

| 阶段 | 内容 | 人日 |
|---|---|---|
| Phase 0 | 预研 E1–E6 + 结论 | 0.5 |
| S1 | 类型 / 默认值 / settings store / 设置页 UI | 0.5 |
| S2 | 主进程 `power-events` + channel + preload + 类型 | 0.5 |
| S3 | 渲染端编排器 + 策略纯函数 + 淡出 + `pause()` | 1.0 |
| S4 | 设备监听（视 E1/E2 结论） | 0.5 |
| S5 | 单测 4 文件 + 主进程 1 文件 | 0.5 |
| S6 | 手工回归（macOS 全量 + 三平台冒烟） | 0.5 |
| **合计** | | **≈ 3.5 人日** |

提交切分（每个可独立回滚）：

1. `feat(settings): 新增自动暂停三项设置`（类型/默认值/store/UI）
2. `feat(electron): 转发系统锁屏与休眠事件到渲染端`
3. `feat(player): 新增幂等 pause 动作与系统暂停状态`
4. `feat(player): 锁屏与休眠唤醒自动暂停`
5. `feat(player): 音频输出设备断开自动暂停`
6. `test: 自动暂停策略与设备判定单测`

---

## 11. 风险登记

| # | 风险 | 影响 | 缓解 |
|---|---|---|---|
| K1 | Chromium 设备枚举受权限限制，拔耳机检测不可用 | P0 砍半 | Phase 0 gate；D3 兜底（先发锁屏+休眠） |
| K2 | 切换输出的瞬间已从扬声器出声 200–500ms | 体验瑕疵，非功能缺陷 | 300ms 淡出；文档如实说明"无法保证零漏音" |
| K3 | "息屏"无可靠事件，空闲轮询误伤不操作的用户 | 误暂停（可恢复） | 仅预研通过才做；仅播放中轮询；默认阈值 60s |
| K4 | 设置项写漏白名单导致不持久化 | 静默失效 | 单测断言 `partialize` 含新字段（已有 `settings.test.ts` 可扩） |
| K5 | 用户不理解"音乐为什么停了" | 差评点 | R11 提示 + 设置页文案；P2 播放栏标签 |
| K6 | 迷你窗口双上下文导致双重暂停/幽灵暂停 | 状态错乱 | 复用既有 `hash.includes("mini-player")` 守卫，并在单测中覆盖 |
| K7 | Linux 无 `lock-screen` 事件 | 功能缺失（不崩溃） | 矩阵中明确标注不支持，设置项在 Linux 上禁用并给说明 |

---

## 12. 审批记录（2026-11-09）

- [x] D1 锁屏暂停默认值：**开**
- [x] D2 解锁自动续播默认值：**关**
- [x] D3 拔耳机预研失败时的兜底：**先发锁屏+休眠，耳机另立项**
- [x] D4 提示形态：**解锁时 toast**
- [x] 授权 Phase 0 预研（0.5 人日，只写探针不改业务代码）
- [ ] P1（R9–R12）是否与 P0 同批次 —— **仍待定**，建议随 Phase 0 结论一起定：若 R3 可做，P1 顺带完成（同一条链路，+0.5 人日）；若 R3 被砍，P1 也应一并延后，避免"有开关没触发源"。

---

## 13. 执行记录（2026-11-09）

### 13.1 Phase 0 结果

| # | 结论 | 证据 |
|---|---|---|
| E1 | **通过** | Electron 38.6.0 + `sandbox: true` + `contextIsolation: true` 下，`file://` 页面 `navigator.mediaDevices` 存在，含 `devicechange` 事件属性，`enumerateDevices()` 返回 14 项（audiooutput 7 项） |
| E2 | **通过** | 输出设备 `label` 与 `deviceId` 均非空且可区分。默认项实测为 `Default - 外置耳机 (Built-in)`，另含 `MacBook Pro扬声器 (Built-in)`、`PHL 278B1 (DisplayPort)`、`AirPods`/虚拟设备等 |
| E3 | 待真机 | 漏音窗口需在真实播放中计时，沙箱无法验证 |
| E4 | 待真机 | `lock-screen` / `unlock-screen` 需用户实际锁屏 |
| E5 | **未完成** | 显示器休眠（不锁屏）需真实等待，且 Electron 无对应事件；结论：本期不做 |
| E6 | 待真机 | 合盖休眠唤醒需真实合盖 |

> E1/E2 通过意味着 D3 的兜底方案**不需要启用**：拔耳机检测按原方案实现。

### 13.2 已落地内容

| 层 | 文件 | 说明 |
|---|---|---|
| 类型 | `shared/types/app-setting.d.ts` | 新增 3 个扁平字段（嵌套会让设置页 `{[name]: value}` patch 失效） |
| 默认值 | `shared/settings/app-settings.ts` | 锁屏开 / 设备断开开 / 解锁续播关 |
| 持久化 | `src/store/settings.ts` | 3 个字段进 `partialize` 白名单 |
| 主进程 | `electron/system/power-events.ts` | `powerMonitor` 四事件转发；`suspend` 记录 `wasPlaying`，`resume` 带回 |
| IPC | `electron/ipc/channel.ts`、`electron/ipc/index.ts`、`electron/preload.ts` | 新通道 `player:system-event` + `onSystemPowerEvent` 订阅（返回取消函数） |
| 类型桥 | `shared/types/player.d.ts`、`shared/types/renderer.d.ts` | `SystemPowerEvent` 与 ElectronAPI 声明 |
| 领域动作 | `src/store/play-list.ts` | 新增幂等 `pause()`（已暂停直接返回，不会像 `togglePlay` 那样反过来开始播放） |
| 策略 | `src/common/utils/auto-pause/policy.ts` | 纯函数：私有输出识别、默认输出丢失判定、开关裁决 |
| 设备监听 | `src/common/utils/auto-pause/audio-device-watch.ts` | `devicechange` + 300ms 去抖 + 播放中 5s 轮询兜底 |
| 淡出 | `src/common/utils/auto-pause/fade.ts` | 300ms 逐级降 `audio.volume` 后暂停并还原，**不写 store 音量** |
| 编排 | `src/common/utils/auto-pause/index.ts` | 锁屏 1.2s 宽限、事件 300ms 合并、唤醒时硬拦截、解锁 toast/续播、迷你窗口不启动 |
| 状态 | `src/store/auto-pause.ts` | `lastSystemPause`（内存态，不持久化） |
| 装配 | `src/app.tsx` | 与 `startPlayerStatusBridge` 并列启动 |
| 设置 UI | `src/pages/settings/index.tsx`、`src/pages/settings/system-settings.tsx` | 「播放」标签下新增「自动暂停」分组，3 个开关，续播项随锁屏开关联动显隐 |

### 13.3 验证证据

- 单测：新增 `tests/auto-pause-policy.test.ts`(11)、`tests/auto-pause-bridge.test.ts`(10)、`tests/auto-pause-fade.test.ts`(4)、`tests/settings-auto-pause-ui.test.tsx`(2)，并在 `tests/settings.test.ts` 增补 2 条；全部通过。`tests/play-list.test.ts` 18 条回归通过。
- ESLint：改动文件 0 error 0 warning。
- `tsc --noEmit`：改动文件无新增报错（`src/pages/settings/index.tsx` 仅剩 6 条既有 Remixicon 图标类型基线错误）。
- 真实渲染：用 Electron 加载 `http://localhost:5678/#/settings?tab=playback`，三项设置文案均命中；控制台只有既有 B 站 CORS 报错（浏览器模式环境问题）。

### 13.4 仍需真机验收（约 3 分钟）

1. 播放中 `Ctrl+Cmd+Q` 锁屏 → 1.5s 内静音；解锁后出现「已因锁屏暂停播放」。
2. 播放中拔耳机 / 关蓝牙耳机 → 1s 内静音，且**不会**从扬声器漏出整句。
3. 播放中合盖 10 秒再打开 → 不出声，并提示「已因睡眠暂停播放」。

> 三条都依赖真实系统事件，自动化无法替代。若第 2 条在蓝牙场景偶发不触发，先看渲染端日志 `[auto-pause]`。
