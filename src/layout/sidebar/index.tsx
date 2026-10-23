import { useNavigate } from "react-router";

import {
  RiAlbumLine,
  RiDownload2Line,
  RiFolderMusicLine,
  RiHeart3Line,
  RiListCheck2,
  RiMusic2Line,
  RiSettings3Line,
  RiTrophyLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import clx from "classnames";

import { PRIMARY_NAV_ITEMS, resolvePrimaryNavHref } from "@/layout/route-shell";
import { useSettings } from "@/store/settings";

import ProfileMenu from "./profile-menu";

interface SidebarProps {
  pathname: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: RemixiconComponentType;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

/**
 * 一级入口的图标。一级入口本身（标签与地址）的唯一真源是
 * `route-shell.ts` 的 `PRIMARY_NAV_ITEMS`，这里只补呈现层需要的图标。
 * `tests/app-shell-interactions.test.ts` 会断言两者同源、且每个入口都有图标。
 */
const NAV_ICONS: Record<string, RemixiconComponentType> = {
  "/": RiMusic2Line,
  "/chart": RiTrophyLine,
  "/library": RiHeart3Line,
  "/local-music": RiFolderMusicLine,
  "/download-list": RiDownload2Line,
};

const PRIMARY: NavItem[] = PRIMARY_NAV_ITEMS.map(item => ({
  ...item,
  icon: NAV_ICONS[item.href] ?? RiMusic2Line,
}));

/**
 * 侧栏分组：发现 / 我的音乐 / 更多。
 *
 * 此前「内容与应用」把播放队列、观看历史、关注与动态、设置硬塞进同一个兜底
 * 标签，语义含糊；这里按「浏览发现 / 我的库 / 个人记录」重新分区。设置不再
 * 混进内容分组，单独固定在账户卡上方（见 `SETTINGS`）。
 */
const SECTIONS: NavSection[] = [
  {
    label: "发现",
    items: PRIMARY.filter(item => item.href === "/" || item.href === "/chart"),
  },
  {
    label: "我的音乐",
    items: PRIMARY.filter(item => ["/library", "/local-music", "/download-list"].includes(item.href)),
  },
  {
    label: "更多",
    items: [
      { label: "播放队列", href: "/queue", icon: RiListCheck2 },
      { label: "观看历史", href: "/history", icon: RiAlbumLine },
      { label: "关注与动态", href: "/follow", icon: RiHeart3Line },
    ],
  },
];

/** 应用级入口：不随内容分组，固定在侧栏底部账户卡上方。 */
const SETTINGS: NavItem = { label: "设置", href: "/settings", icon: RiSettings3Line };

const isActive = (pathname: string, href: string) => {
  if (href === "/") return pathname === "/" || pathname === "/search";
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  // 二级页（/collection/:id、/user/:id）保持父级一级入口高亮。
  return resolvePrimaryNavHref(pathname) === href;
};

const Sidebar = ({ pathname }: SidebarProps) => {
  const navigate = useNavigate();
  const collapsed = useSettings(state => state.sideMenuCollapsed);
  const updateSettings = useSettings(state => state.update);

  const renderItem = ({ label, href, icon: Icon }: NavItem) => (
    <button
      key={href}
      type="button"
      className={clx("shell4188-nav-item", isActive(pathname, href) && "is-active")}
      aria-current={isActive(pathname, href) ? "page" : undefined}
      title={collapsed ? label : undefined}
      onClick={() => navigate(href)}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <aside className={clx("shell4188-sidebar", collapsed && "is-collapsed")} aria-label="主导航">
      <button
        type="button"
        className="shell4188-brand"
        aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
        onClick={() => updateSettings({ sideMenuCollapsed: !collapsed })}
      >
        LiLi
      </button>
      <div className="shell4188-sidebar-scroll">
        {SECTIONS.map(section => (
          <div key={section.label} className="shell4188-nav-section">
            {section.label && <div className="shell4188-sidebar-label">{section.label}</div>}
            <nav className="shell4188-nav-list">{section.items.map(renderItem)}</nav>
          </div>
        ))}
      </div>
      <div className="shell4188-nav-settings">
        <div className="shell4188-sidebar-rule" />
        {renderItem(SETTINGS)}
      </div>
      <ProfileMenu />
    </aside>
  );
};

export default Sidebar;
