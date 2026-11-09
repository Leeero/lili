import React from "react";
import { useNavigate } from "react-router";

import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, addToast } from "@heroui/react";
import { RiGroupLine, RiMore2Fill, RiStarFill, RiUserUnfollowLine, RiVipCrownFill, RiVipFill } from "@remixicon/react";

import type { RelationListItem } from "@/service/relation-followings";
import type { RelationTagUser } from "@/service/relation-tag";

import { formatUrlProtocol } from "@/common/utils/url";
import { UserRelationAction, postRelationModify } from "@/service/relation-modify";
import { useModalStore } from "@/store/modal";
import { Artwork } from "@/ui/primitives/artwork";

interface Props {
  u: RelationListItem | RelationTagUser;
  groupLabel?: string;
  refresh: () => void;
  onSetGroup: (u: RelationListItem | RelationTagUser) => void;
}

/** 头像 CDN 参数：face 可能带查询参数，直接拼接会产出非法 URL，这里统一收敛。 */
const getAvatarUrl = (face?: string) => {
  const url = formatUrlProtocol(face);
  if (!url) return undefined;
  return url.includes("@") || !url.includes("/bfs/") ? url : `${url}@160w_160h_1c_1s.webp`;
};

/**
 * 关注卡片：横向紧凑布局，头像 + 名字 + 签名 + 分组标签。
 *
 * 分组页和关注页共用；卡片整块进主页，右上角「更多」是独立按钮，
 * hover / 键盘 focus 时出现，触屏上保持可见。
 */
const UserCard = ({ u, groupLabel, refresh, onSetGroup }: Props) => {
  const navigate = useNavigate();
  const onOpenConfirmModal = useModalStore(s => s.onOpenConfirmModal);

  const handleUnfollow = async () => {
    onOpenConfirmModal({
      title: `取消关注 ${u.uname}`,
      type: "danger",
      confirmText: "取消关注",
      onConfirm: async () => {
        try {
          const res = await postRelationModify({ fid: u.mid, act: UserRelationAction.Unfollow });
          if (res?.code !== 0) {
            addToast({
              title: "取消关注失败",
              color: "danger",
            });
            return false;
          }
          addToast({
            title: "取消关注成功",
            color: "success",
          });
          refresh();
          return true;
        } catch {
          addToast({
            title: "取消关注失败",
            color: "danger",
          });
          return false;
        }
      },
    });
  };

  const officialType = u.official_verify?.type;
  const openProfile = () => navigate(`/user/${u.mid}`);

  return (
    <article className="social4188-follow-card">
      <button
        type="button"
        className="social4188-follow-main"
        aria-label={`打开 ${u.uname} 的主页`}
        onClick={openProfile}
      >
        <span className="social4188-follow-avatar-wrap">
          <Artwork
            src={getAvatarUrl(u.face)}
            artKey={String(u.mid)}
            alt=""
            radius="round"
            gradient="avatar"
            className="social4188-follow-avatar"
          />
          {u.special === 1 && (
            <span className="social4188-follow-special" aria-label="特别关注" title="特别关注">
              <RiStarFill size={10} />
            </span>
          )}
        </span>

        <span className="social4188-follow-copy">
          <span className="social4188-follow-name">
            <strong>{u.uname}</strong>
            {officialType === 0 && (
              <span className="social4188-follow-verify" aria-label="个人认证" title="个人认证">
                <RiVipFill size={11} />
              </span>
            )}
            {officialType === 1 && (
              <span className="social4188-follow-verify is-org" aria-label="机构认证" title="机构认证">
                <RiVipCrownFill size={11} />
              </span>
            )}
          </span>
          <span className="social4188-follow-sign">{u.sign || "这个人很神秘，什么都没写"}</span>
          <span className="social4188-follow-meta">{groupLabel ?? "已关注"}</span>
        </span>
      </button>

      <span className="social4188-follow-more">
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <button type="button" className="social4188-follow-more-btn" aria-label={`更多操作：${u.uname}`}>
              <RiMore2Fill size={16} />
            </button>
          </DropdownTrigger>
          <DropdownMenu aria-label={`更多操作：${u.uname}`} variant="flat">
            <DropdownItem key="set-group" startContent={<RiGroupLine size={18} />} onPress={() => onSetGroup(u)}>
              设置分组
            </DropdownItem>
            <DropdownItem
              key="unfollow"
              className="text-danger"
              color="danger"
              startContent={<RiUserUnfollowLine size={18} />}
              onPress={handleUnfollow}
            >
              取消关注
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </span>
    </article>
  );
};

export default UserCard;
