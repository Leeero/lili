import React from "react";
import { type Control, Controller } from "react-hook-form";

import type { LibraryTile } from "@/features/library/model";

import SelectAllCheckboxGroup from "@/components/select-all-checkbox-group";
import { buildLibraryTileGroups } from "@/features/library/grouping";
import { useFavoritesStore } from "@/store/favorite";
import { useSettings } from "@/store/settings";
import { useUser } from "@/store/user";

interface LibrarySettingsProps {
  control: Control<AppSettings>;
}

/**
 * 「我的音乐」页的显隐编辑器。
 *
 * 分组真源是 `features/library/grouping` —— 与我的音乐页共用同一份拆分逻辑，
 * 因此这里列出的条目必然就是页面上可能出现的瓦片。取消勾选的条目会被写进
 * `hiddenLibraryKeys`，我的音乐页据此过滤展示与统计。
 *
 * 本地目录**不在**可配置范围：目录的增删在「本地音乐」页，这里再给一份开关
 * 只会让同一件事有两个入口。
 */
const LibrarySettings: React.FC<LibrarySettingsProps> = ({ control }) => {
  const user = useUser(state => state.user);
  const createdFavorites = useFavoritesStore(state => state.createdFavorites);
  const collectedFavorites = useFavoritesStore(state => state.collectedFavorites);
  const seasonSeries = useFavoritesStore(state => state.seasonSeries);
  const localMusicDirs = useSettings(state => state.localMusicDirs);

  const groups = buildLibraryTileGroups(createdFavorites, collectedFavorites, seasonSeries, localMusicDirs);
  const itemCount = groups.created.length + groups.followed.length;

  const renderGroup = (groupName: string, tiles: LibraryTile[], withBadge = false) => (
    <div key={groupName} className="flex w-full items-start gap-6 max-sm:flex-col">
      <div className="text-medium w-36 shrink-0 font-medium">{groupName}</div>
      <div className="max-w-[480px]">
        <Controller
          control={control}
          name="hiddenLibraryKeys"
          render={({ field }) => {
            const hiddenKeys = field.value ?? [];
            const groupKeys = tiles.map(tile => tile.key);
            const selectedKeys = groupKeys.filter(key => !hiddenKeys.includes(key));

            const handleSelectionChange = (newSelectedKeys: string[]) => {
              const outsideHidden = hiddenKeys.filter(key => !groupKeys.includes(key));
              const hiddenInGroup = groupKeys.filter(key => !newSelectedKeys.includes(key));
              field.onChange(Array.from(new Set([...outsideHidden, ...hiddenInGroup])));
            };

            return (
              <SelectAllCheckboxGroup
                groupName={groupName}
                groupKeys={groupKeys}
                selectedKeys={selectedKeys}
                onSelectionChange={handleSelectionChange}
                disabled={!groupKeys.length}
                items={tiles.map(tile => ({
                  value: tile.key,
                  // 徽标后缀只在类型需要区分时加（合集/系列/本地目录）；
                  // 收藏夹是默认态，保持纯标题。
                  label: withBadge && tile.badge !== "收藏夹" ? `${tile.title}（${tile.badge}）` : tile.title,
                }))}
              />
            );
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2>我的音乐显示</h2>
        <p className="text-default-500 mt-1 text-sm">
          选择在「我的音乐」页展示的播放列表与收藏内容；取消勾选的条目不再出现在该页，也不参与全部播放
        </p>
      </div>
      <div className="w-full space-y-8">
        {itemCount === 0 ? (
          <p className="text-default-500 text-sm">
            {user?.isLogin ? "暂无歌单、收藏或合集可以配置。" : "登录后同步 B 站收藏，即可在此选择展示内容。"}
          </p>
        ) : (
          <>
            {renderGroup("我创建的", groups.created, true)}
            {renderGroup("我追的", groups.followed, true)}
            {groups.local.length > 0 && (
              <p className="text-default-500 text-sm">本地音乐目录不在此配置，请在「本地音乐」页添加或移除。</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LibrarySettings;
