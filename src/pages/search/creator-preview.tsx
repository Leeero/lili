import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { RiArrowRightSLine } from "@remixicon/react";

import { formatNumber } from "@/common/utils/number";
import { formatUrlProtocol } from "@/common/utils/url";
import { getWebInterfaceWbiSearchType, type SearchUserItem } from "@/service/web-interface-search-type";
import { useSearchSegments } from "@/store/search-segments";
import { Artwork } from "@/ui/primitives/artwork";

interface CreatorPreviewProps {
  keyword: string;
  onSeeAll: () => void;
}

const PREVIEW_SIZE = 4;

/**
 * 「综合」里的创作者预览：只取前 4 位，负责把创作者总数写进 `useSearchSegments`
 * （所以「综合」一进来三个 tab 的数字就齐了），完整列表仍在「创作者」tab。
 *
 * 这里不发关注状态请求：预览只需要“有没有、是谁”，关注/取关留给完整列表，
 * 避免综合页为一个缩略条多打一轮 relation 接口。
 */
export const CreatorPreview = ({ keyword, onSeeAll }: CreatorPreviewProps) => {
  const navigate = useNavigate();
  const setCreatorCount = useSearchSegments(state => state.setCreatorCount);
  const creatorCount = useSearchSegments(state => state.creatorCount);
  const [creators, setCreators] = useState<SearchUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!keyword) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    setCreators([]);
    void getWebInterfaceWbiSearchType<SearchUserItem>({
      search_type: "bili_user",
      keyword,
      page: 1,
      page_size: PREVIEW_SIZE,
      order: 0,
      order_sort: 0,
    })
      .then(res => {
        if (seq !== requestSeq.current) return;
        const items = res?.data?.result ?? [];
        setCreators(items.slice(0, PREVIEW_SIZE));
        setCreatorCount(res?.data?.numResults ?? items.length);
      })
      .catch(() => {
        if (seq !== requestSeq.current) return;
        setCreators([]);
        setCreatorCount(null);
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoading(false);
      });
    return () => {
      requestSeq.current += 1;
    };
  }, [keyword, setCreatorCount]);

  if (!loading && creators.length === 0) return null;

  return (
    <section className="search4188-creators" aria-labelledby="search4188-creators-title">
      <header className="search4188-section-head">
        <h2 id="search4188-creators-title">
          创作者
          {creatorCount !== null && <span className="search4188-section-count">{creatorCount}</span>}
        </h2>
        <button type="button" className="search4188-section-more" onClick={onSeeAll}>
          查看全部
          <RiArrowRightSLine size={15} aria-hidden="true" />
        </button>
      </header>
      <div className="search4188-creator-grid">
        {loading
          ? Array.from({ length: PREVIEW_SIZE }, (_, index) => (
              <span key={index} className="search4188-creator is-skeleton" aria-hidden="true" />
            ))
          : creators.map(creator => (
              <button
                key={creator.mid}
                type="button"
                className="search4188-creator"
                onClick={() => navigate(`/user/${creator.mid}`)}
              >
                <Artwork
                  src={formatUrlProtocol(creator.upic)}
                  artKey={String(creator.mid)}
                  alt=""
                  radius="round"
                  gradient="avatar"
                  params="160w_160h_1c.avif"
                  className="search4188-creator-avatar"
                />
                <span className="search4188-creator-text">
                  <span className="search4188-creator-name">{creator.uname || "未知创作者"}</span>
                  <span className="search4188-creator-meta">
                    {typeof creator.fans === "number" ? `${formatNumber(creator.fans)} 粉丝` : "B 站创作者"}
                  </span>
                </span>
              </button>
            ))}
      </div>
    </section>
  );
};
