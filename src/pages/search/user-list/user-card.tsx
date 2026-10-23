import React, { useState } from "react";
import { useNavigate } from "react-router";

import { addToast } from "@heroui/react";
import { RiAddLine, RiFlashlightFill, RiUserFollowLine } from "@remixicon/react";
import clx from "classnames";

import { formatNumber } from "@/common/utils/number";
import { formatUrlProtocol } from "@/common/utils/url";
import { postRelationModify, UserRelationAction } from "@/service/relation-modify";
import { Artwork } from "@/ui/primitives/artwork";

import { type SearchUserItemWithRelation } from "./utils";

interface UserCardProps {
  u: SearchUserItemWithRelation;
}

/**
 * 创作者卡：点上半区进主页，关注按钮独立，不会连带触发导航。
 * 视觉令牌全部走 4188；等级徽标取 `--lili-4188-favorite`，不再写 B 站粉的字面色。
 */
const UserCard: React.FC<UserCardProps> = ({ u }) => {
  const navigate = useNavigate();
  const [isFollowed, setIsFollowed] = useState(u.is_followed);
  const [pending, setPending] = useState(false);

  const openProfile = () => navigate(`/user/${u.mid}`);

  const handleFollow = async () => {
    if (pending) return;
    setPending(true);
    try {
      const act = isFollowed ? UserRelationAction.Unfollow : UserRelationAction.Follow;
      const res = await postRelationModify({
        fid: u.mid,
        act,
        re_src: 11, // 搜索来源
      });
      if (res.code === 0) {
        setIsFollowed(!isFollowed);
        addToast({ title: isFollowed ? "已取消关注" : "已关注", color: "success" });
      } else {
        addToast({ title: res.message || "操作失败", color: "danger" });
      }
    } catch {
      addToast({ title: "操作失败", color: "danger" });
    } finally {
      setPending(false);
    }
  };

  return (
    <article className="search4188-user-card">
      <div
        className="search4188-user-open"
        role="button"
        tabIndex={0}
        aria-label={`打开创作者 ${u.uname}`}
        onClick={openProfile}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProfile();
          }
        }}
      >
        <span className="search4188-user-avatar-wrap">
          <Artwork
            src={formatUrlProtocol(u.upic)}
            artKey={String(u.mid)}
            alt=""
            radius="round"
            gradient="avatar"
            params="160w_160h_1c.avif"
            className="search4188-user-avatar"
          />
          {u.official_verify?.type !== undefined && u.official_verify.type >= 0 && (
            <span className="search4188-user-verify" aria-label={u.official_verify.desc || "认证"}>
              <RiFlashlightFill size={10} aria-hidden="true" />
            </span>
          )}
          {u.level !== undefined && <span className="search4188-user-level">LV{u.level}</span>}
        </span>
        <span className="search4188-user-name" title={u.uname}>
          {u.uname || "未知创作者"}
        </span>
        <span className="search4188-user-fans">
          {typeof u.fans === "number" ? `${formatNumber(u.fans)} 粉丝` : "B 站创作者"}
        </span>
        <span className="search4188-user-sign">{u.usign || "这个人很神秘，什么都没有写。"}</span>
      </div>
      <button
        type="button"
        className={clx("search4188-follow", isFollowed && "is-followed")}
        aria-pressed={isFollowed}
        disabled={pending}
        onClick={() => void handleFollow()}
      >
        {isFollowed ? <RiUserFollowLine size={14} aria-hidden="true" /> : <RiAddLine size={14} aria-hidden="true" />}
        {pending ? "处理中…" : isFollowed ? "已关注" : "关注"}
      </button>
    </article>
  );
};

export default UserCard;
