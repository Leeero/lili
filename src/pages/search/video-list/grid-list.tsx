import React, { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";

import type { Track } from "@/domain/track";

import { toPlayItem } from "@/adapters/track/actions";
import VirtualGridPageList from "@/components/virtual-grid-page-list";
import { usePlayList } from "@/store/play-list";

import { getContextMenus } from "./menu";
import SearchVideoCard from "./search-video-card";

interface GridListProps {
  items: Track[];
  getScrollElement: () => HTMLElement | null;
  onMenuAction: (key: string, item: Track) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

const CARD_ROW_HEIGHT = 280;

const GridList: React.FC<GridListProps> = ({ items, getScrollElement, onMenuAction, loading, hasMore, onLoadMore }) => {
  const navigate = useNavigate();
  const currentBvid = usePlayList(state => state.list.find(item => item.id === state.playId)?.bvid);
  const isPlaying = usePlayList(state => state.isPlaying);
  const menus = useMemo(() => getContextMenus(), []);

  const handlePlay = useCallback(
    (item: Track) => {
      if (item.sourceRef.bvid && currentBvid === item.sourceRef.bvid) {
        usePlayList.getState().togglePlay();
        return;
      }
      void usePlayList.getState().play(toPlayItem(item));
    },
    [currentBvid],
  );

  const renderGridItem = useCallback(
    (item: Track) => {
      const isCurrent = Boolean(item.sourceRef.bvid) && item.sourceRef.bvid === currentBvid;
      return (
        <SearchVideoCard
          key={item.id}
          item={item}
          isCurrent={isCurrent}
          isPlaying={isCurrent && isPlaying}
          menus={menus}
          onOpen={() => {
            if (item.sourceRef.bvid) navigate(`/track/${item.sourceRef.bvid}`);
          }}
          onPlay={() => handlePlay(item)}
          onAction={key => onMenuAction(key, item)}
        />
      );
    },
    [currentBvid, handlePlay, isPlaying, menus, navigate, onMenuAction],
  );

  return (
    <VirtualGridPageList
      items={items}
      itemKey="id"
      renderItem={renderGridItem}
      getScrollElement={getScrollElement}
      loading={loading}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      rowHeight={CARD_ROW_HEIGHT}
    />
  );
};

export default GridList;
