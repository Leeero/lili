import { RiHeart3Fill, RiHeart3Line } from "@remixicon/react";

import IconButton from "@/components/icon-button";
import { useMusicFavStore } from "@/store/music-fav";

/**
 * 播放栏「点赞」按钮（网易云红心对应项）。
 *
 * 与「收藏」（加到收藏夹）是两码事：B 站视频稿件的「点赞」关系独立于收藏，
 * `music-fav` store 里 `isThumb` 就是它（`refreshIsFav` 已随收藏一起拉取）。
 * 音频区没有点赞关系，本地曲目也不适用，入口只对登录态的视频稿件有意义
 * （由左段的条件渲染保证不出现）。
 */
const MusicThumbButton = () => {
  const isThumb = useMusicFavStore(s => s.isThumb);
  const toggleThumb = useMusicFavStore(s => s.toggleThumb);

  return (
    <IconButton
      tooltip={isThumb ? "取消点赞" : "点赞"}
      aria-label={isThumb ? "取消点赞" : "点赞"}
      onPress={() => void toggleThumb()}
    >
      {isThumb ? <RiHeart3Fill size={18} className="text-primary" /> : <RiHeart3Line size={18} />}
    </IconButton>
  );
};

export default MusicThumbButton;
