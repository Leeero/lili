import React, { useCallback, useEffect, useRef, useState } from "react";

import { Avatar, Button, Spinner } from "@heroui/react";
import { RiAppsLine } from "@remixicon/react";
import clx from "classnames";

import { formatUrlProtocol } from "@/common/utils/url";
import { getRelationFollowings } from "@/service/relation-followings";
import { useUser } from "@/store/user";

interface AuthorListProps {
  selectedAuthorMid: number | null;
  onSelect: (mid: number | null) => void;
}

interface AuthorItem {
  mid: number;
  face: string;
  name: string;
}

/**
 * 动态作者筛选条。原先是第二个左侧栏；改成横向头像 chip 后，
 * 动态流可以吃满整行宽度，也不用再叠一层侧栏。
 */
const AuthorList: React.FC<AuthorListProps> = ({ selectedAuthorMid, onSelect }) => {
  const user = useUser(s => s.user);
  const barRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<AuthorItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const fetchFollowings = useCallback(
    async (pageIndex: number = 1) => {
      if (!user?.mid || loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const res = await getRelationFollowings({ vmid: user.mid, pn: pageIndex, ps: 20, order_type: "attention" });
        if (res.code === 0) {
          const nextList = (res.data.list || []).map(item => ({
            mid: item.mid,
            face: item.face,
            name: item.uname,
          }));
          setList(prev => {
            const combined = pageIndex === 1 ? nextList : [...prev, ...nextList];
            setHasMore(combined.length < (res.data.total || 0));
            if (pageIndex === 1 && (res.data.total || 0) === 0) setHasMore(false);
            return combined;
          });
          setPage(pageIndex);
        } else {
          setError(res.message || "无法加载关注列表");
        }
      } catch {
        setError("无法加载关注列表");
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [user?.mid],
  );

  useEffect(() => {
    setList([]);
    setPage(1);
    setHasMore(true);
    if (user?.mid) fetchFollowings(1);
  }, [fetchFollowings, user?.mid]);

  const handleScroll = () => {
    const el = barRef.current;
    if (!el || loading || !hasMore || error) return;
    if (el.scrollWidth - el.scrollLeft - el.clientWidth < 160) {
      void fetchFollowings(page + 1);
    }
  };

  return (
    <div className="social4188-author-bar" ref={barRef} onScroll={handleScroll} role="group" aria-label="动态作者">
      <button
        type="button"
        className={clx("social4188-author-chip", selectedAuthorMid === null && "is-active")}
        aria-pressed={selectedAuthorMid === null}
        onClick={() => onSelect(null)}
      >
        <span className="social4188-author-all">
          <RiAppsLine size={14} />
        </span>
        <span>全部</span>
      </button>

      {list.map(author => (
        <button
          key={author.mid}
          type="button"
          className={clx("social4188-author-chip", selectedAuthorMid === author.mid && "is-active")}
          aria-pressed={selectedAuthorMid === author.mid}
          title={author.name}
          onClick={() => onSelect(author.mid)}
        >
          <Avatar
            src={formatUrlProtocol(author.face)}
            name={author.name}
            className="h-6 w-6 shrink-0 text-[10px]"
            classNames={{ img: "rounded-full" }}
          />
          <span className="social4188-author-name">{author.name}</span>
        </button>
      ))}

      {loading && (
        <span className="social4188-author-status">
          <Spinner size="sm" />
        </span>
      )}

      {!loading && error && (
        <Button size="sm" variant="light" className="social4188-author-retry" onPress={() => fetchFollowings(page)}>
          重试
        </Button>
      )}
    </div>
  );
};

export default AuthorList;
