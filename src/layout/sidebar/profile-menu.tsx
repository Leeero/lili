import { useNavigate } from "react-router";

import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, addToast, type DropdownItemProps } from "@heroui/react";
import {
  RiArrowRightSLine,
  RiExternalLinkLine,
  RiFeedbackLine,
  RiLoginCircleLine,
  RiLogoutCircleLine,
  RiProfileLine,
  RiRefreshLine,
} from "@remixicon/react";
import { twMerge } from "tailwind-merge";

import { postPassportLoginExit } from "@/service/passport-login-exit";
import { useFavoritesStore } from "@/store/favorite";
import { openLoginModal } from "@/store/login-modal";
import { useModalStore } from "@/store/modal";
import { usePlayList } from "@/store/play-list";
import { usePlayProgress } from "@/store/play-progress";
import { useSettings } from "@/store/settings";
import { useToken } from "@/store/token";
import { useUser } from "@/store/user";

/**
 * 侧栏账户区（4188 设计稿的账户入口）。
 *
 * 4188 设计稿中账户区只在侧栏底部，顶栏不设头像。这里把原顶栏头像菜单的
 * 账户与应用操作（登录、个人资料、刷新数据、问题反馈、退出登录）并入侧栏
 * 账户卡的弹出菜单；关注与动态、观看历史、设置等导航入口仍由侧栏导航项
 * 承接，不在菜单中重复。
 *
 * 登录弹窗**不在这里**：它挂在 `Layout`，由 `useLoginModal` 开关，这样各页
 * 登录门禁的「去登录」按钮和这里的「登录」项走的是同一个弹窗。
 */
const ProfileMenu = () => {
  const user = useUser(s => s.user);
  const clearUser = useUser(s => s.clear);
  const clearToken = useToken(s => s.clear);
  const navigate = useNavigate();
  const updateSettings = useSettings(s => s.update);

  const onOpenConfirmModal = useModalStore(s => s.onOpenConfirmModal);

  const logout = async () => {
    const csrfToken = await window.electron.getCookie("bili_jct");
    if (!csrfToken) {
      addToast({
        title: "CSRF Token 不存在",
        color: "danger",
      });
      return false;
    }

    const res = await postPassportLoginExit({
      biliCSRF: csrfToken,
    });
    if (res?.code === 0) {
      clearToken();
      clearUser();
      // 显隐配置记的是账号自己的收藏条目 id；退出后不清掉，换账号登录时
      // 同 id 的陌生条目会被误伤。与旧的菜单显隐设置同一处置。
      updateSettings({
        hiddenLibraryKeys: [],
      });
      usePlayList.getState().clear();
      useFavoritesStore.setState({
        createdFavorites: [],
        collectedFavorites: [],
      });
      usePlayProgress.setState({
        currentTime: 0,
      });
      navigate("/");
      return true;
    } else {
      addToast({
        title: res?.message || "退出登录失败",
        color: "danger",
      });
      return false;
    }
  };

  const items: (DropdownItemProps & { label: string; hidden?: boolean })[] = [
    {
      key: "login",
      label: "登录",
      startContent: <RiLoginCircleLine size={18} />,
      hidden: user?.isLogin,
      onPress: openLoginModal,
    },
    {
      key: "profile",
      label: "个人资料",
      startContent: <RiProfileLine size={18} />,
      hidden: !user?.isLogin,
      onPress: () => navigate(`/user/${user?.mid}`),
    },
    {
      key: "refresh",
      label: "刷新数据",
      startContent: <RiRefreshLine size={18} />,
      hidden: !user?.isLogin,
      onPress: async () => {
        try {
          await useUser.getState().updateUser();
          const mid = useUser.getState().user?.mid;
          if (mid) {
            await useFavoritesStore.getState().updateCreatedFavorites(mid);
            await useFavoritesStore.getState().updateCollectedFavorites(mid);
            await useFavoritesStore.getState().updateSeasonSeries(mid);
          }
          addToast({
            title: "数据刷新成功",
            color: "success",
          });
        } catch {
          addToast({
            title: "刷新数据失败",
            color: "danger",
          });
        }
      },
    },
    {
      key: "feedback",
      label: "问题反馈",
      startContent: <RiFeedbackLine size={18} />,
      endContent: <RiExternalLinkLine size={18} />,
      onPress: () => window.electron.openExternal("https://github.com/Leeero/lili/issues"),
    },
    {
      key: "logout",
      label: "退出登录",
      startContent: <RiLogoutCircleLine size={18} />,
      color: "danger" as const,
      className: "text-danger",
      hidden: !user?.isLogin,
      onPress: () => {
        onOpenConfirmModal({
          title: "确认退出登录？",
          type: "danger",
          onConfirm: async () => {
            await logout();
            return true;
          },
        });
      },
    },
  ].filter(item => !item.hidden);

  return (
    <>
      <Dropdown
        shouldBlockScroll={false}
        triggerScaleOnOpen={false}
        radius="md"
        placement="top-start"
        classNames={{
          content: "min-w-[180px]",
        }}
      >
        <DropdownTrigger>
          <button type="button" className="shell4188-profile" aria-label="账户菜单">
            {user?.face ? <img src={user.face} alt="" /> : <span className="shell4188-avatar-fallback">B</span>}
            <span className="shell4188-profile-copy">
              <strong>{user?.isLogin ? user.uname : "未登录"}</strong>
              <small>{user?.isLogin ? "Bilibili 账户" : "登录后同步内容"}</small>
            </span>
            <RiArrowRightSLine size={20} />
          </button>
        </DropdownTrigger>
        <DropdownMenu aria-label="账户操作" variant="flat" items={items}>
          {({ key, label, className, ...rest }) => (
            <DropdownItem className={twMerge("rounded-medium", className)} key={key} {...rest}>
              {label}
            </DropdownItem>
          )}
        </DropdownMenu>
      </Dropdown>
    </>
  );
};

export default ProfileMenu;
