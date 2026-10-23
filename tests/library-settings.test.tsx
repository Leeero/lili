import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useForm } from "react-hook-form";

import { afterEach, describe, expect, test, vi } from "vitest";

import type { FavoriteItem } from "@/store/favorite";

import { CollectionType } from "@/common/constants/collection";
import LibrarySettings from "@/pages/settings/library-settings";
import { defaultAppSettings } from "@shared/settings/app-settings";

/**
 * 设置页「我的音乐显示」编辑器的接线测试。
 *
 * 分组与过滤本身在 `tests/library-grouping.test.ts` 里测；这里只钉住最容易坏的一环：
 * 三组复选框共用同一个 `hiddenLibraryKeys` 字段，勾掉一组不得把另一组已勾掉的
 * 条目顺手清掉。store 用 mock 提供固定数据，避免真实 favorites store 的持久化。
 */

/** 组件读到的三份 store 数据。用 hoisted 定义，mock 工厂里可以安全引用。 */
const storeState = vi.hoisted(() => ({
  createdFavorites: [] as Array<{ id: number; title: string; type?: number; source: FavoriteItem["source"] }>,
  collectedFavorites: [] as Array<{ id: number; title: string; type?: number; source: FavoriteItem["source"] }>,
  seasonSeries: [] as Array<{ id: number; title: string; type?: number; source: FavoriteItem["source"] }>,
  user: undefined as unknown,
}));

/* mock 工厂必须沿用被替换的 hook 名字，函数体里当然没有真实的 Hook 调用。 */
/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix */
vi.mock("@/store/favorite", () => ({
  useFavoritesStore: (selector: (state: unknown) => unknown) =>
    selector({
      createdFavorites: storeState.createdFavorites,
      collectedFavorites: storeState.collectedFavorites,
      seasonSeries: storeState.seasonSeries,
    }),
}));

vi.mock("@/store/user", () => ({
  useUser: (selector: (state: unknown) => unknown) => selector({ user: storeState.user }),
}));

vi.mock("@/store/settings", () => ({
  useSettings: (selector: (state: unknown) => unknown) => selector({ localMusicDirs: [] }),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const render = async (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  await act(async () => root.render(node));
  return container;
};

afterEach(async () => {
  for (const item of mounted.splice(0)) {
    await act(async () => item.root.unmount());
    item.container.remove();
  }
});

/** 表单当前值。Harness 把最新值写进这个盒子。 */
const formValues: { current?: AppSettings } = {};

const onValues = (values: AppSettings) => {
  formValues.current = values;
};

const Harness = () => {
  const { control, watch } = useForm<AppSettings>({
    defaultValues: { ...defaultAppSettings, hiddenLibraryKeys: [] },
  });

  useEffect(() => {
    const subscription = watch(values => onValues(values as AppSettings));
    return () => subscription.unsubscribe();
  }, [watch]);

  return <LibrarySettings control={control} />;
};

/** 找到「标题」对应复选框的 input；HeroUI 的 Checkbox 把 input 包在 label 里。 */
const checkboxOf = (container: HTMLElement, title: string) => {
  const label = Array.from(container.querySelectorAll("label")).find(item => item.textContent?.trim() === title);
  return label?.querySelector("input") as HTMLInputElement | undefined;
};

/**
 * 读表单当前值。
 *
 * 走函数读而不是直接写 `formValues.current?.…`：测试里先把它置为 `undefined`
 * 之后，TS 会把该属性一路收窄成 `undefined`，再读就报「属性不存在于 never」。
 */
const currentHiddenKeys = () => formValues.current?.hiddenLibraryKeys;

describe("library settings", () => {
  test("按两组列出条目（我创建的含自建合集/系列），取消勾选写进 hiddenLibraryKeys 且不覆盖另一组", async () => {
    storeState.user = { isLogin: true };
    storeState.createdFavorites = [{ id: 1, title: "通勤", source: "favorite-folder" }];
    storeState.collectedFavorites = [{ id: 2, title: "古典", source: "favorite-folder" }];
    storeState.seasonSeries = [{ id: 3, title: "纪录片", type: CollectionType.VideoCollections, source: "season" }];
    formValues.current = undefined;

    const container = await render(<Harness />);

    expect(container.textContent).toContain("我创建的");
    expect(container.textContent).toContain("我追的");
    // 自建合集/系列并进「我创建的」，徽标后缀区分类型。
    expect(container.textContent).toContain("纪录片（合集）");

    const first = checkboxOf(container, "通勤");
    const second = checkboxOf(container, "古典");
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first!.checked).toBe(true);

    await act(async () => first!.click());
    expect(currentHiddenKeys()).toEqual(["favorite-folder:1"]);

    await act(async () => second!.click());
    expect(currentHiddenKeys()).toEqual(["favorite-folder:1", "favorite-folder:2"]);

    // 再勾回来只移除自己，另一个仍在隐藏列表里。
    await act(async () => first!.click());
    expect(currentHiddenKeys()).toEqual(["favorite-folder:2"]);
  });

  test("没有任何条目时给未登录提示，不渲染空复选框组", async () => {
    storeState.user = undefined;
    storeState.createdFavorites = [];
    storeState.collectedFavorites = [];
    storeState.seasonSeries = [];

    const container = await render(<Harness />);

    expect(container.textContent).toContain("登录后同步 B 站收藏");
    expect(container.querySelectorAll("input[type='checkbox']")).toHaveLength(0);
  });
});
