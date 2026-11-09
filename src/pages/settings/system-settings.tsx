import React from "react";
import { Controller, useWatch } from "react-hook-form";
import type { Control, UseFormSetValue } from "react-hook-form";

import { Button, Form, Input, Radio, RadioGroup, Select, SelectItem, Switch, Tab, Tabs } from "@heroui/react";
import {
  RiArrowRightLongLine,
  RiExternalLinkLine,
  RiFileListLine,
  RiLayoutGridFill,
  RiListView,
} from "@remixicon/react";

import FontSelect from "@/components/font-select";
import UpdateCheckButton from "@/components/update-check-button";

import ImportExport from "./export-import";

type SystemSettingsTabProps = {
  appVersion: string;
  audioQuality: AudioQuality;
  control: Control<AppSettings>;
  isUpdateAvailable: boolean;
  latestVersion?: string;
  setValue: UseFormSetValue<AppSettings>;
  section: "general" | "playback" | "download" | "about";
};

export const SystemSettingsTab = ({
  appVersion,
  audioQuality,
  control,
  isUpdateAvailable,
  latestVersion,
  setValue,
  section,
}: SystemSettingsTabProps) => {
  // 「解锁后自动继续播放」只在锁屏暂停开启时才有意义，用 watch 让它跟着联动显示
  const autoPauseOnLock = useWatch({ control, name: "autoPauseOnLock" });

  return (
    <Form className="space-y-6">
      {section === "general" && (
        <>
          <h2>外观与显示</h2>
          {/* 显示模式 */}
          <div className="flex w-full items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
            <div className="mr-6 space-y-1">
              <div className="text-medium font-medium">数据显示样式</div>
              <div className="text-sm text-zinc-500">选择媒体内容的显示样式</div>
            </div>
            <Controller
              control={control}
              name="displayMode"
              render={({ field }) => (
                /* 不用 fullWidth：铺满整行会把左侧标签挤到 3 行，也与其它行的定宽控件不一致。 */
                <Tabs
                  aria-label="数据展示"
                  size="sm"
                  classNames={{
                    cursor: "rounded-medium",
                  }}
                  selectedKey={field.value}
                  onSelectionChange={key => field.onChange(key)}
                >
                  <Tab
                    key="list"
                    title={
                      <div className="flex items-center space-x-2">
                        <RiListView size={18} />
                        <span>列表</span>
                      </div>
                    }
                  />
                  <Tab
                    key="card"
                    title={
                      <div className="flex items-center space-x-2">
                        <RiLayoutGridFill size={18} />
                        <span>网格</span>
                      </div>
                    }
                  />
                  <Tab
                    key="compact"
                    title={
                      <div className="flex items-center space-x-2">
                        <RiFileListLine size={18} />
                        <span>紧凑</span>
                      </div>
                    }
                  />
                </Tabs>
              )}
            />
          </div>
          {/* 主题模式、自定义主色/背景色、全局圆角三项入口已在 P1 随主题收敛移除：
              C+ 只有深色一套皮肤、固定主色与固定圆角（决策 2）。
              对应的 AppSettings 字段（themeMode / primaryColor / backgroundColor /
              borderRadius）仍然保留并被 store 读写，旧设置文件因此可无损读取，
              只是不再产生作用。见 docs/design/lili-cplus-refactor-plan.md §13.1。 */}
          {/* 字体选择 */}
          <div className="flex w-full items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
            <div className="mr-6 space-y-1">
              <div className="text-medium font-medium">字体</div>
              <div className="text-sm text-zinc-500">选择界面显示的字体</div>
            </div>
            <div className="w-[180px] max-sm:w-full">
              <Controller
                control={control}
                name="fontFamily"
                render={({ field }) => <FontSelect value={field.value} onChange={field.onChange} />}
              />
            </div>
          </div>

          {/* 页面切换动画 FIXME:暂时移除，该功能会导致页面切换时重复渲染，数据请求double */}
          {/* <div className="flex w-full items-center justify-between">
        <div className="mr-6 space-y-1">
          <div className="text-medium font-medium">页面切换动画</div>
          <div className="text-sm text-zinc-500">选择页面切换时的过渡效果</div>
        </div>
        <div className="w-[180px]">
          <Controller
            control={control}
            name="pageTransition"
            render={({ field }) => (
              <Select
                aria-label="页面切换动画"
                selectedKeys={field.value ? new Set([field.value]) : new Set()}
                onSelectionChange={keys => {
                  const value = Array.from(keys)[0] as PageTransition;
                  field.onChange(value);
                }}
              >
                <SelectItem key="none">无动画</SelectItem>
                <SelectItem key="fade">淡入淡出</SelectItem>
                <SelectItem key="slide">滑动</SelectItem>
                <SelectItem key="scale">缩放</SelectItem>
                <SelectItem key="slideUp">上浮</SelectItem>
              </Select>
            )}
          />
        </div>
      </div> */}
        </>
      )}
      {section === "playback" && (
        <>
          <h2>播放偏好</h2>
          {/* 音质选择 */}
          <div className="flex w-full items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
            <div className="mr-6 space-y-1">
              <div className="text-medium font-medium">音质偏好</div>
              <div className="text-sm text-zinc-500">
                {audioQuality === "auto" && "自动选择最高音质"}
                {audioQuality === "lossless" && "FLAC / Hi-Res"}
                {audioQuality === "high" && "180-320 kbps"}
                {audioQuality === "medium" && "100-140 kbps"}
                {audioQuality === "low" && "60-80 kbps"}
              </div>
            </div>
            <div className="w-[180px] max-sm:w-full">
              <Controller
                control={control}
                name="audioQuality"
                render={({ field }) => (
                  <Select
                    disallowEmptySelection
                    aria-label="音质偏好"
                    selectedKeys={field.value ? new Set([field.value]) : new Set()}
                    onSelectionChange={keys => {
                      const value = Array.from(keys)[0] as AudioQuality;
                      field.onChange(value);
                    }}
                  >
                    <SelectItem key="auto">自动</SelectItem>
                    <SelectItem key="lossless">无损</SelectItem>
                    <SelectItem key="high">高品质</SelectItem>
                    <SelectItem key="medium">中等</SelectItem>
                    <SelectItem key="low">低品质</SelectItem>
                  </Select>
                )}
              />
            </div>
          </div>
          {/* 播放记录上报 */}
          <div className="flex w-full items-center justify-between gap-4">
            <div className="mr-6 space-y-1">
              <div className="text-medium font-medium">上报本机播放记录</div>
              <div className="text-sm text-zinc-500">将播放进度同步到Bilibili服务器</div>
            </div>
            <Controller
              control={control}
              name="reportPlayHistory"
              render={({ field }) => (
                <Switch disableAnimation isSelected={field.value} onValueChange={field.onChange} />
              )}
            />
          </div>

          <h2>自动暂停</h2>
          {/* 锁屏 / 息屏 / 休眠暂停 */}
          <div className="flex w-full items-center justify-between gap-4">
            <div className="mr-6 space-y-1">
              <div className="text-medium font-medium">锁屏或休眠时暂停</div>
              <div className="text-sm text-zinc-500">人离开电脑时自动静音，回来不会突然出声</div>
            </div>
            <Controller
              control={control}
              name="autoPauseOnLock"
              render={({ field }) => (
                <Switch disableAnimation isSelected={field.value} onValueChange={field.onChange} />
              )}
            />
          </div>
          {/* 耳机 / 音频输出设备断开暂停 */}
          <div className="flex w-full items-center justify-between gap-4">
            <div className="mr-6 space-y-1">
              <div className="text-medium font-medium">耳机或音频输出设备断开时暂停</div>
              <div className="text-sm text-zinc-500">拔出耳机、蓝牙断开时立即静音，避免从扬声器漏音</div>
            </div>
            <Controller
              control={control}
              name="autoPauseOnAudioDeviceLost"
              render={({ field }) => (
                <Switch disableAnimation isSelected={field.value} onValueChange={field.onChange} />
              )}
            />
          </div>
          {/* 解锁 / 唤醒后自动续播：依赖锁屏暂停，未开启时整行不渲染 */}
          {autoPauseOnLock && (
            <div className="flex w-full items-center justify-between gap-4">
              <div className="mr-6 space-y-1">
                <div className="text-medium font-medium">解锁后自动继续播放</div>
                <div className="text-sm text-zinc-500">仅当刚才由系统暂停、且没有切换歌曲时生效</div>
              </div>
              <Controller
                control={control}
                name="autoPauseResumeOnUnlock"
                render={({ field }) => (
                  <Switch disableAnimation isSelected={field.value} onValueChange={field.onChange} />
                )}
              />
            </div>
          )}
        </>
      )}
      {section === "download" && (
        <>
          <h2>下载与本地工具</h2>
          <div className="flex w-full items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
            <div className="mr-6 space-y-1">
              <div className="text-medium font-medium">下载目录</div>
              <div className="text-sm text-zinc-500">选择音视频保存的位置</div>
            </div>
            <div className="w-[360px] max-sm:w-full">
              <Controller
                control={control}
                name="downloadPath"
                render={({ field }) => (
                  <div className="flex items-center space-x-1">
                    {/* 只读而非禁用：路径由右侧「选择」修改，输入框本身不应呈现「坏了」的灰化态。 */}
                    <Input isReadOnly placeholder="选择文件夹" value={field.value} onValueChange={field.onChange} />
                    <Button
                      variant="flat"
                      onPress={async () => {
                        const path = await window.electron.selectDirectory();
                        if (path) setValue("downloadPath", path, { shouldDirty: true, shouldTouch: true });
                      }}
                    >
                      选择
                    </Button>
                  </div>
                )}
              />
            </div>
          </div>

          {/* FFmpeg 路径配置 */}
          <div className="flex w-full items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
            <div className="mr-6 space-y-1">
              <div className="text-medium font-medium">FFmpeg 路径</div>
              <div className="text-sm text-zinc-500">手动指定 FFmpeg 可执行文件路径</div>
            </div>
            <div className="w-[360px] max-sm:w-full">
              <Controller
                control={control}
                name="ffmpegPath"
                render={({ field }) => (
                  <div className="flex items-center space-x-1">
                    <Input isReadOnly placeholder="自动检测" value={field.value} onValueChange={field.onChange} />
                    <Button
                      variant="flat"
                      onPress={async () => {
                        const path = await window.electron.selectFile();
                        if (path) setValue("ffmpegPath", path, { shouldDirty: true, shouldTouch: true });
                      }}
                    >
                      选择
                    </Button>
                  </div>
                )}
              />
            </div>
          </div>
        </>
      )}
      {section === "general" && (
        <>
          <h2 className="pt-2">搜索与系统行为</h2>
          {/* 显示搜索历史 */}
          <div className="flex w-full items-center justify-between gap-4">
            <div className="mr-6 space-y-1">
              <div className="text-medium font-medium">显示搜索历史</div>
              <div className="text-sm text-zinc-500">在搜索框中显示搜索历史记录</div>
            </div>
            <Controller
              control={control}
              name="showSearchHistory"
              render={({ field }) => (
                <Switch disableAnimation isSelected={field.value} onValueChange={field.onChange} />
              )}
            />
          </div>

          {/* 窗口关闭选项 */}
          <div className="flex w-full items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
            <div className="mr-6 space-y-1">
              <div className="text-medium font-medium">窗口关闭</div>
              <div className="text-sm text-zinc-500">选择窗口关闭时的行为</div>
            </div>
            <Controller
              control={control}
              name="closeWindowOption"
              render={({ field }) => (
                <RadioGroup orientation="horizontal" value={field.value} onValueChange={field.onChange}>
                  <Radio value="hide">隐藏到托盘</Radio>
                  <Radio value="exit">直接退出</Radio>
                </RadioGroup>
              )}
            />
          </div>

          {/* 开机自启动开关 */}
          <div className="flex w-full items-center justify-between">
            <div className="mr-6 space-y-1">
              <div className="text-medium font-medium">开机自启动</div>
              <div className="text-sm text-zinc-500">系统登录后自动启动应用</div>
            </div>
            <div className="flex w-[360px] justify-end max-sm:w-full">
              <Controller
                control={control}
                name="autoStart"
                render={({ field }) => (
                  <Switch disableAnimation isSelected={field.value} onValueChange={field.onChange} />
                )}
              />
            </div>
          </div>
        </>
      )}
      {section === "about" && (
        <>
          <h2>关于 lili</h2>
          <div className="flex w-full items-center justify-between">
            <div className="mr-6 flex items-center space-x-1">
              <span>当前版本 {appVersion}</span>
              {isUpdateAvailable && Boolean(latestVersion) && (
                <>
                  <RiArrowRightLongLine size={16} />
                  <span className="text-primary">{latestVersion}</span>
                </>
              )}
            </div>
            <UpdateCheckButton />
          </div>
          <ImportExport />

          {/* 上游署名与许可。改名不改变上游许可证的 Notices 条款：
              Required Notice 行必须逐字出现在任何分发副本中，所以这里不做任何加工。 */}
          <h2>上游与授权</h2>
          <div className="flex w-full items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
            <div className="mr-6 space-y-1">
              <div className="text-medium font-medium">基于 wood3n/biu 二次开发</div>
              <div className="text-sm text-zinc-500">lili 是 Biu 音乐播放器的非官方二开版本，基础能力全部来自上游</div>
            </div>
            <Button
              size="sm"
              variant="flat"
              startContent={<RiExternalLinkLine size={18} />}
              onPress={() => window.electron.openExternal("https://github.com/wood3n/biu")}
            >
              上游仓库
            </Button>
          </div>
          <div className="space-y-2">
            <div>
              <div className="text-medium font-medium">PolyForm Noncommercial License 1.0.0</div>
              <div className="text-sm text-zinc-500">
                沿用上游许可，仅限非商业用途。任何分发副本都须随附许可证原文，并完整保留下面的署名行
              </div>
            </div>
            <code className="rounded-medium bg-default-100 block px-3 py-2 text-sm">
              Required Notice: Copyright (c) 2022–2025 wood3n
            </code>
          </div>
        </>
      )}
    </Form>
  );
};
