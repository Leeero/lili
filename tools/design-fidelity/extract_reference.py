"""从设计稿 PNG 提取逐屏结构基准，产出 cplus-spec-lock.json 的 screens 段。

原始设计稿：2200 × 1375 px；基准画布：1440 × 900（S = 1440/2200）。
所有坐标均为 1440 × 900 画布下的 CSS px。
"""
from __future__ import annotations

import json
import pathlib
import sys

import numpy as np
from PIL import Image

DESIGN_DIR = pathlib.Path("/tmp/lili-design")
CANVAS = (1440, 900)

# 原型屏名 → 设计稿页码
SCREENS = [
    ("01-library", 2, "我的音乐库"),
    ("02-playlist-detail", 3, "我的收藏 · 详情"),
    ("04-local-music", 5, "本地音乐"),
    ("05-downloads", 6, "下载管理"),
    ("06-search", 7, "搜索结果"),
    ("07-discover-card", 8, "发现音乐 · 卡片"),
    ("08-discover-list", 9, "发现音乐 · 列表"),
    ("09-queue", 10, "播放队列"),
    ("10-now-playing", 11, "正在播放 · 沉浸"),
    ("11-settings", 12, "设置"),
    ("12-mini-player", 13, "迷你播放器与系统集成"),
]

APP_BG = 8.67      # --c-app-bg #08080a 的亮度
CHROME_BG = 15.0   # 顶栏/播放栏底与底板的分界阈值


def load(page: int) -> np.ndarray:
    im = Image.open(DESIGN_DIR / f"page-{page:02d}.png").convert("RGB")
    return np.asarray(im.resize(CANVAS, Image.LANCZOS)).astype(int)


def bands(L, x0, x1, y0, y1, thr, gap=3, minh=3):
    sub = L[y0:y1, x0:x1]
    on = (sub > thr).sum(axis=1) > 0
    out, i = [], 0
    while i < len(on):
        if on[i]:
            j, b, k = i, 0, i
            while k < len(on) and b <= gap:
                if on[k]:
                    j, b = k, 0
                else:
                    b += 1
                k += 1
            if j - i >= minh:
                out.append([int(y0 + i), int(y0 + j)])
            i = k
        else:
            i += 1
    return out


def hspan(L, y0, y1, thr):
    """给定 y 区间内的墨迹水平范围。"""
    seg = L[y0:y1]
    cols = np.where((seg > thr).any(axis=0))[0]
    return [int(cols.min()), int(cols.max())] if len(cols) else None


def chrome_band(L, x, y0, y1):
    """沿单列找与底板不同的常驻层（顶栏/播放栏）的 y 范围。"""
    col = L[:, x]
    on = col[y0:y1] > CHROME_BG
    out, i = [], 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and on[j]:
                j += 1
            if j - i >= 6:
                out.append([int(y0 + i), int(y0 + j)])
            i = j
        else:
            i += 1
    return out


def marker_y(a: np.ndarray, x0=56, x1=84):
    """注解带蓝色方块的 y 范围（强调色 #2997ff）。"""
    b = a[:, :, 2] - a[:, :, 0]
    m = (b > 90) & (a[:, :, 2] > 120)
    ys = np.where(m[:, x0:x1].any(axis=1))[0]
    if not len(ys):
        return None
    groups, s, p = [], ys[0], ys[0]
    for y in ys[1:]:
        if y - p > 6:
            groups.append([int(s), int(p)])
            s = y
        p = y
    groups.append([int(s), int(p)])
    return groups


def art_rows(L, x0=64, x1=172, y0=290, y1=790, thr=16):
    """列表行缩略图（100×56）的 y 范围序列 —— 用于反推行高与行数。"""
    return bands(L, x0, x1, y0, y1, thr, gap=4, minh=8)


def probe(page: int) -> dict:
    a = load(page)
    L = a.mean(axis=2)
    immersive = page == 11

    top = chrome_band(L, 1432, 0, 140)
    bottom = chrome_band(L, 1432, 800, 900)

    h1 = bands(L, 56, 960, 96, 190, 190, minh=4)
    lead = bands(L, 56, 1100, 184, 236, 100, minh=4)
    filt = bands(L, 56, 1100, 222, 300, 24, minh=4)

    h1_span = hspan(L, h1[0][0], h1[0][1], 190) if h1 else None
    rows = art_rows(L)

    out = {
        "page": page,
        "canvas": list(CANVAS),
        "immersive": immersive,
        "topbar": top[0] if top else None,
        "playbar": bottom[-1] if bottom else None,
        "h1": h1[0] if h1 else None,
        "h1_span": h1_span,
        "lead": lead,
        "filter": filt[0] if filt else None,
        "art_rows": rows,
        "art_pitch": None,
        "note_marker": marker_y(a),
        "note_text": bands(L, 56, 1400, 620, 800, 55, minh=3),
    }
    if len(rows) >= 2:
        out["art_pitch"] = round((rows[1][0] - rows[0][0]) / 1.0, 1)
    if h1_span:
        out["gutter"] = h1_span[0]
    return out


if __name__ == "__main__":
    result = {}
    for name, page, title in SCREENS:
        p = probe(page)
        p["name"] = name
        p["title"] = title
        result[name] = p
        print(f"--- {name} (p{page}) ---")
        print(json.dumps(p, ensure_ascii=False, indent=1)[:1200])
    pathlib.Path("/tmp/lili-render/reference-raw.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("\nwrote /tmp/lili-render/reference-raw.json")
