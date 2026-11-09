import type { ReactNode, RefObject } from "react";

import ScrollContainer, { type ScrollRefObject } from "@/components/scroll-container";

interface PlaylistDetailProps {
  scrollRef: RefObject<ScrollRefObject | null>;
  resetKey?: string;
  header: ReactNode;
  /** 页面内分类 tab（收藏夹 / 合集 / 系列），渲染在页头正下方。 */
  tabs?: ReactNode;
  actions: ReactNode;
  children: ReactNode;
}

export const PlaylistDetail = ({ scrollRef, resetKey, header, tabs, actions, children }: PlaylistDetailProps) => (
  <ScrollContainer enableBackToTop ref={scrollRef} resetOnChange={resetKey} className="h-full w-full">
    <main className="mx-auto flex min-h-full w-full max-w-[1440px] flex-col px-6 pt-5 pb-8">
      {header}
      {tabs}
      <section aria-label="播放列表内容" className="flex min-h-0 flex-1 flex-col">
        {actions}
        {children}
      </section>
    </main>
  </ScrollContainer>
);
