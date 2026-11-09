import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { getDownloadTaskCapabilities } from "@/features/downloads/model";
import { PLACEHOLDER_GRADIENTS } from "@/ui/fixtures/placeholder-art";
import { DOWNLOADS_FIXTURE_NAME, SCREEN_05_DOWNLOADS_FIXTURE } from "@/ui/fixtures/screen-05-downloads";

export const useDownloadsFixture = () => {
  const [params] = useSearchParams();
  return params.get("fixture") === DOWNLOADS_FIXTURE_NAME;
};

export const useDownloadsFixtureData = () => {
  const enabled = useDownloadsFixture();
  return useMemo(
    () =>
      enabled
        ? {
            ...SCREEN_05_DOWNLOADS_FIXTURE,
            tasks: SCREEN_05_DOWNLOADS_FIXTURE.tasks.map(task => ({
              ...task,
              placeholder: PLACEHOLDER_GRADIENTS[task.artIndex],
              // 操作带门控与真实路径同源：由 rawStatus 经 model 层计算，
              // 不是按 status 展示文案推导（见 DownloadRowViewModel.capabilities 注释）。
              // 夹具任务没有 savePath，「定位文件」按 canOpen 的定义本就不出现——
              // 设计稿第 6 页已完成行的操作带正是「删除」独占，与之一致。
              capabilities: getDownloadTaskCapabilities({
                id: task.id,
                status: task.rawStatus,
              } as MediaDownloadTask),
            })),
          }
        : null,
    [enabled],
  );
};
