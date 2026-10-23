import React, { useRef } from "react";
import { useSearchParams } from "react-router";

import { getSocialTab, type SocialTab } from "@/features/social/model";
import DynamicFeed from "@/pages/dynamic-feed";
import FollowList from "@/pages/follow-list";
import { openLoginModal } from "@/store/login-modal";
import { useUser } from "@/store/user";
import { PageState } from "@/ui/states/page-state";

const SOCIAL_TABS: { key: SocialTab; label: string }[] = [
  { key: "following", label: "创作者" },
  { key: "updates", label: "最新动态" },
];

const SocialPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useUser(state => state.user);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const selectedTab = getSocialTab(searchParams.get("tab"));

  const selectTab = (tab: SocialTab) => {
    setSearchParams({ tab });
  };

  const onTabKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = SOCIAL_TABS.findIndex(t => t.key === selectedTab);
    let nextIndex = -1;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % SOCIAL_TABS.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + SOCIAL_TABS.length) % SOCIAL_TABS.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = SOCIAL_TABS.length - 1;
    }

    if (nextIndex >= 0) {
      e.preventDefault();
      const next = SOCIAL_TABS[nextIndex];
      selectTab(next.key);
      tabRefs.current[next.key]?.focus();
    }
  };

  if (!user?.isLogin) {
    return (
      <PageState
        kind="empty"
        title="登录后查看关注内容"
        description="关注列表与动态同步自当前 B 站账号"
        actionLabel="去登录"
        onAction={openLoginModal}
      />
    );
  }

  return (
    <main className="social4188-page social4188-page--fixed">
      <h1 className="sr-only">关注与动态</h1>
      <div className="social4188-toolbar">
        <nav className="social4188-tabs" aria-label="关注内容类型">
          {SOCIAL_TABS.map(tab => {
            const isActive = selectedTab === tab.key;
            return (
              <button
                key={tab.key}
                ref={el => {
                  tabRefs.current[tab.key] = el;
                }}
                type="button"
                role="tab"
                id={`social-tab-${tab.key}`}
                aria-selected={isActive}
                aria-controls={`social-tabpanel-${tab.key}`}
                tabIndex={isActive ? 0 : -1}
                className={isActive ? "is-active" : undefined}
                onClick={() => selectTab(tab.key)}
                onKeyDown={onTabKeyDown}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div
        className="social4188-body"
        role="tabpanel"
        id={`social-tabpanel-${selectedTab}`}
        aria-labelledby={`social-tab-${selectedTab}`}
        tabIndex={-1}
      >
        {selectedTab === "updates" ? <DynamicFeed /> : <FollowList />}
      </div>
    </main>
  );
};

export default SocialPage;
