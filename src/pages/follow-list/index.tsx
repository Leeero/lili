import React, { useEffect, useRef, useState } from "react";

import {
  addToast,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Spinner,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import { RiAddLine, RiDeleteBinLine, RiEditLine, RiMore2Fill, RiSearchLine } from "@remixicon/react";
import clx from "classnames";

import ScrollContainer, { type ScrollRefObject } from "@/components/scroll-container";
import VirtualGridPageList from "@/components/virtual-grid-page-list";
import { getRelationFollowings, type RelationListItem } from "@/service/relation-followings";
import {
  deleteRelationTag,
  getRelationTag,
  getRelationTags,
  searchFollowings,
  type RelationTag,
  type RelationTagUser,
} from "@/service/relation-tag";
import { useModalStore } from "@/store/modal";
import { useUser } from "@/store/user";
import { PageState } from "@/ui/states/page-state";

import GroupModal from "./group-modal";
import SetGroupModal from "./set-group-modal";
import UserCard from "./user-card";

const PAGE_SIZE = 20;
const SKELETON_CARDS = 8;

const FollowSkeleton = () => (
  <div className="social4188-follow-skeleton" role="status" aria-label="正在加载关注">
    {Array.from({ length: SKELETON_CARDS }, (_, index) => (
      <span key={index} className="social4188-follow-skeleton-card" />
    ))}
  </div>
);

const FollowList = () => {
  const user = useUser(s => s.user);
  const onOpenConfirmModal = useModalStore(s => s.onOpenConfirmModal);
  const scrollRef = useRef<ScrollRefObject>(null);
  const loadingMoreRef = useRef(false);

  const [list, setList] = useState<(RelationListItem | RelationTagUser)[]>([]);
  const [tags, setTags] = useState<RelationTag[]>([]);
  const [allCount, setAllCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [loadMoreError, setLoadMoreError] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [inputValue, setInputValue] = useState("");

  const onSearchChange = (val: string) => {
    setInputValue(val);
  };

  const onSearchSubmit = () => {
    setSearchKeyword(inputValue);
  };

  const onClear = () => {
    setInputValue("");
    setSearchKeyword("");
  };

  // Modal State for Create/Rename
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [modalMode, setModalMode] = useState<"create" | "rename">("create");
  const [currentTag, setCurrentTag] = useState<RelationTag | null>(null);

  // Modal State for Set Group
  const setGroupModalDisclosure = useDisclosure();
  const [currentOperatingUser, setCurrentOperatingUser] = useState<RelationListItem | RelationTagUser | null>(null);

  // Derived state for current active tag
  const activeTagId = Number(activeTab);
  const activeTag = tags.find(t => t.tagid === activeTagId);

  const fetchTags = async () => {
    const res = await getRelationTags();
    if (res.code === 0) {
      setTags(res.data);
    }
  };

  useEffect(() => {
    if (user?.mid) {
      fetchTags();
    }
  }, [user?.mid]);

  const fetchData = async (pn: number = 1) => {
    if (!user?.mid) return;

    let newList: (RelationListItem | RelationTagUser)[] = [];
    let total = 0;
    let failed = false;

    if (activeTab === "all") {
      const res = searchKeyword
        ? await searchFollowings({ vmid: user.mid, pn, ps: PAGE_SIZE, name: searchKeyword })
        : await getRelationFollowings({ vmid: user.mid, pn, ps: PAGE_SIZE });

      if (res.code === 0) {
        // 搜索结果的 total 是命中数，不是关注总数；不要把 chip 上的总数改掉。
        if (!searchKeyword) setAllCount(res.data.total);
        total = res.data.total ?? 0;
        newList = res.data.list ?? [];
      } else {
        failed = true;
      }
    } else {
      const tagId = Number(activeTab);
      const res = await getRelationTag({ tagid: tagId, pn, ps: PAGE_SIZE });
      if (res.code === 0) {
        newList = res.data ?? [];
        total = tags.find(t => t.tagid === tagId)?.count ?? 0;
      } else {
        failed = true;
      }
    }

    if (failed) {
      // 请求失败：仅首页失败时展示错误态；加载更多失败留在列表底部重试。
      if (pn === 1) {
        setList([]);
        setLoadError(true);
      } else {
        setLoadMoreError(true);
      }
      setHasMore(pn > 1);
      return;
    }

    setLoadError(false);
    setLoadMoreError(false);
    if (newList.length > 0) {
      setList(prev => {
        const combined = pn === 1 ? newList : [...prev, ...newList];
        setHasMore(combined.length < total);
        return combined;
      });
      setPage(pn);
    } else {
      if (pn === 1) setList([]);
      setHasMore(false);
    }
  };

  const init = async () => {
    try {
      setLoading(true);
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.mid) {
      // 切分组 / 改搜索词时先清空旧列表：否则新 chip 已高亮，
      // 下面还短暂挂着上一组的人，看起来像筛选没生效。
      setList([]);
      setPage(1);
      setHasMore(true);
      setLoadError(false);
      setLoadMoreError(false);
      init();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.mid, activeTab, searchKeyword]);

  const reload = async () => {
    setList([]);
    setHasMore(true);
    setLoadMoreError(false);
    await init();
  };

  const loadMore = async () => {
    if (loading || loadingMoreRef.current || !hasMore || loadMoreError) return;
    loadingMoreRef.current = true;
    setLoading(true);
    try {
      await fetchData(page + 1);
    } finally {
      loadingMoreRef.current = false;
      setLoading(false);
    }
  };

  const retryLoadMore = () => {
    setLoadMoreError(false);
    void loadMore();
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode("create");
    setCurrentTag(null);
    onOpen();
  };

  // Open Rename Modal
  const handleOpenRename = (tag: RelationTag) => {
    setModalMode("rename");
    setCurrentTag(tag);
    onOpen();
  };

  // Open Delete Modal
  const handleOpenDelete = (tag: RelationTag) => {
    onOpenConfirmModal({
      title: `删除分组${tag.name}`,
      type: "danger",
      confirmText: "删除",
      onConfirm: async () => {
        try {
          const res = await deleteRelationTag({ tagid: tag.tagid });
          if (res.code === 0) {
            addToast({ title: "删除分组成功", color: "success" });
            if (activeTab === String(tag.tagid)) {
              setActiveTab("all");
            }
            fetchTags();
            return true;
          } else {
            addToast({ title: res.message || "删除分组失败", color: "danger" });
            return false;
          }
        } catch {
          addToast({ title: "删除分组失败", color: "danger" });
          return false;
        }
      },
    });
  };

  const handleOpenSetGroup = (u: RelationListItem | RelationTagUser) => {
    setCurrentOperatingUser(u);
    setGroupModalDisclosure.onOpen();
  };

  const renderTagMenu = (tag: RelationTag) => (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <button type="button" className="social4188-group-more" aria-label={`分组操作：${tag.name}`}>
          <RiMore2Fill size={14} />
        </button>
      </DropdownTrigger>
      <DropdownMenu aria-label={`分组操作：${tag.name}`} variant="flat">
        <DropdownItem key="rename" startContent={<RiEditLine size={18} />} onPress={() => handleOpenRename(tag)}>
          修改分组名称
        </DropdownItem>
        <DropdownItem
          key="delete"
          className="text-danger"
          color="danger"
          startContent={<RiDeleteBinLine size={18} />}
          onPress={() => handleOpenDelete(tag)}
        >
          删除分组
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );

  const groupLabel = (item: RelationListItem | RelationTagUser) => {
    const ids = Array.isArray(item.tag) ? item.tag : [];
    const names = ids.map(id => tags.find(tag => tag.tagid === id)?.name).filter(Boolean);
    if (names.length) return names.join(" · ");
    if (activeTag) return activeTag.name;
    return "已关注";
  };

  const emptyTitle = searchKeyword
    ? "没有找到相关关注"
    : activeTab !== "all"
      ? "这个分组还没有成员"
      : "还没有关注任何人";
  const emptyDescription = searchKeyword
    ? "换个关键词，或切回全部关注再试"
    : activeTab !== "all"
      ? "在关注的人里设置分组后，成员会出现在这里"
      : "在 B 站关注创作者后，会同步到这里";

  return (
    <>
      <div className="social4188-follow h-full w-full">
        <div className="social4188-follow-toolbar">
          <div className="social4188-group-row">
            <div className="social4188-group-bar" role="group" aria-label="关注分组">
              <button
                type="button"
                className={clx("social4188-group-chip", activeTab === "all" && "is-active")}
                aria-pressed={activeTab === "all"}
                onClick={() => setActiveTab("all")}
              >
                全部关注
                {allCount > 0 && <span className="social4188-group-count">{allCount}</span>}
              </button>

              {tags.map(tag => {
                const key = String(tag.tagid);
                const isActive = activeTab === key;
                return (
                  <div key={key} className={clx("social4188-group-item", isActive && "is-active")}>
                    <button
                      type="button"
                      className="social4188-group-chip"
                      aria-pressed={isActive}
                      onClick={() => setActiveTab(key)}
                    >
                      {tag.name}
                      {tag.count > 0 && <span className="social4188-group-count">{tag.count}</span>}
                    </button>
                    {tag.tagid > 0 && renderTagMenu(tag)}
                  </div>
                );
              })}
            </div>

            <Tooltip content="创建分组" closeDelay={0}>
              <button type="button" className="social4188-group-add" aria-label="创建分组" onClick={handleOpenCreate}>
                <RiAddLine size={16} />
              </button>
            </Tooltip>
          </div>

          <div className="social4188-follow-actions">
            <Tooltip
              content={activeTab === "all" ? "" : "分组内暂不支持搜索，切回全部关注可搜索"}
              closeDelay={0}
              isDisabled={activeTab === "all"}
            >
              <div className="social4188-follow-search">
                <Input
                  aria-label="搜索关注"
                  placeholder="搜索关注"
                  size="sm"
                  radius="md"
                  classNames={{ inputWrapper: "h-9" }}
                  startContent={<RiSearchLine size={16} />}
                  value={inputValue}
                  onValueChange={onSearchChange}
                  isClearable
                  isDisabled={activeTab !== "all"}
                  onClear={onClear}
                  onKeyDown={event => {
                    if (event.key === "Enter") onSearchSubmit();
                  }}
                />
              </div>
            </Tooltip>
          </div>
        </div>

        <ScrollContainer
          ref={scrollRef}
          enableBackToTop
          className="social4188-follow-scroll"
          resetOnChange={`${activeTab}|${searchKeyword}`}
        >
          <div className="social4188-follow-content">
            {loading && !list.length ? (
              <FollowSkeleton />
            ) : loadError ? (
              <PageState
                kind="error"
                title="关注列表加载失败"
                description="可能是网络波动或接口限流，稍后重试看看"
                actionLabel="重新加载"
                onAction={reload}
              />
            ) : !loading && list.length === 0 ? (
              <PageState kind="empty" title={emptyTitle} description={emptyDescription} />
            ) : (
              <VirtualGridPageList
                items={list}
                itemKey="mid"
                renderItem={item => (
                  <UserCard u={item} groupLabel={groupLabel(item)} refresh={reload} onSetGroup={handleOpenSetGroup} />
                )}
                getScrollElement={() => scrollRef.current?.osInstance()?.elements().viewport || null}
                onLoadMore={loadMore}
                rowHeight={128}
                hasMore={hasMore}
                loading={loading}
                className="social4188-follow-grid"
              />
            )}

            {loadMoreError && (
              <div className="social4188-follow-more-error" role="alert">
                <span>加载更多失败</span>
                <button type="button" onClick={retryLoadMore}>
                  重试
                </button>
              </div>
            )}
            {loading && list.length > 0 && (
              <div className="social4188-follow-loading">
                <Spinner size="sm" />
              </div>
            )}
          </div>
        </ScrollContainer>
      </div>

      <GroupModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onClose={onClose}
        mode={modalMode}
        tag={currentTag}
        onSuccess={fetchTags}
      />

      <SetGroupModal
        isOpen={setGroupModalDisclosure.isOpen}
        onOpenChange={setGroupModalDisclosure.onOpenChange}
        onClose={setGroupModalDisclosure.onClose}
        user={currentOperatingUser}
        tags={tags}
        onSuccess={reload}
      />
    </>
  );
};

export default FollowList;
