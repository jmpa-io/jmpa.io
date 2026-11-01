#!/usr/bin/env python
"""Draws the pixel-art sprites for the hero into static/img/ (Pillow only, no anti-aliasing).

    python tools/gen_sprites.py                  # writes person.png, budgie-green.png, budgie-blue.png, props.png
    python tools/gen_sprites.py --preview FILE   # also writes a 1x / 2x / 8x contact sheet to FILE

Sprites are drawn on a tiny grid; the page scales them by an integer factor with image-rendering: pixelated.
Frame layout (left to right) is mirrored in static/css/scene.css.
"""
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jordan_art  # noqa: E402  (hand-drawn rows for the person)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "static", "img")


def rgba(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.im.putpixel((x, y), rgba(c))

    def get(self, x, y):
        return self.im.getpixel((x, y)) if 0 <= x < self.w and 0 <= y < self.h else (0, 0, 0, 0)

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.px(x, y, c)

    def ell(self, cx, cy, rx, ry, c, where=None):
        for y in range(self.h):
            for x in range(self.w):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 and (where is None or where(x, y)):
                    self.px(x, y, c)

    def poly(self, pts, c):
        ImageDraw.Draw(self.im).polygon(pts, fill=rgba(c))

    def solid(self, x, y):
        return self.get(x, y)[3] > 0

    def is_(self, x, y, c):
        return self.get(x, y) == rgba(c)

    def outline(self, c):
        add = [(x, y) for y in range(self.h) for x in range(self.w)
               if not self.solid(x, y) and any(self.solid(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
        for x, y in add:
            self.px(x, y, c)


# ── Jordan: hand-drawn in jordan_art.py (candidate "e-40-wavy-long", 40x40). Frame 0 eyes open, frame 1 blink. ──
PERSON = "C"  # 56x64, see jordan_art.py (candidate C: furrowed brows, deeper copper)


def person(blink):
    return jordan_art.frame(PERSON, blink)


# ── budgies: 20x16 frames. 0 idle, 1 blink, 2 hop, 3 wings up, 4 wings level, 5 wings down. ──
GREEN = dict(body="#3fbf55", belly="#8fe28f", shade="#2a8f45", wing="#2fa24b", bars="#14231c", face="#ffe45c", face_d="#e7b92a",
             cheek="#6a6cff", tail="#1f8a9b", tail_d="#17606e", out="#0d2a1b")
BLUE = dict(body="#4f95ef", belly="#b0d5ff", shade="#2f67c6", wing="#3d7ad8", bars="#0f1a2e", face="#f6f9ff", face_d="#c7d3ea",
            cheek="#7a6cff", tail="#2a4fb8", tail_d="#1b3584", out="#0b1a3a")
BEAK, BEAK_D, LEG, EYE_W, EYE = "#ffa23d", "#d97a1c", "#e39a6b", "#ffffff", "#10141c"


def budgie(p, frame):
    c = Canvas(20, 16)
    perched = frame in ("idle", "blink", "hop")
    dy = -3 if frame == "hop" else (-1 if frame == "down" else 0)

    def at(x, y):
        return (x, y + dy)
    if perched:
        c.poly([at(8, 8), at(11, 9), at(5, 15), at(1, 14)], p["tail"])
        c.poly([at(6, 9), at(8, 9), at(3, 14), at(1, 14)], p["tail_d"])
    else:
        c.poly([at(8, 9), at(9, 12), at(0, 13), at(0, 10)], p["tail"])
        c.poly([at(7, 11), at(9, 12), at(1, 13), at(0, 12)], p["tail_d"])
    c.ell(11, 10 + dy, 5.6, 4.4, p["body"])
    c.ell(13, 12 + dy, 3.6, 2.6, p["belly"], where=lambda x, y: x >= 11 and y >= 10 + dy)
    shade = [(x, y) for y in range(c.h) for x in range(c.w)
             if c.is_(x, y, p["body"]) and not c.solid(x, y + 1) and x < 11 and y > 11 + dy]
    for x, y in shade:
        c.px(x, y, p["shade"])
    # head: yellow/white face, barred crown, cheek patch
    c.ell(14, 5 + dy, 4.7, 4.3, p["face"])
    low = [(x, y) for y in range(c.h) for x in range(c.w) if c.is_(x, y, p["face"]) and y >= 8 + dy]
    for x, y in low:
        c.px(x, y, p["face_d"])
    for x, y in ((10, 2), (12, 1), (11, 4), (13, 2), (10, 6), (12, 3), (9, 5), (11, 6)):
        c.px(x, y + dy, p["bars"])
    c.px(14, 7 + dy, p["cheek"])
    c.px(15, 7 + dy, p["cheek"])
    c.px(16, 8 + dy, p["bars"])
    c.px(14, 9 + dy, p["bars"])
    c.px(18, 4 + dy, "#a6c8ff")
    c.rect(18, 5 + dy, 19, 6 + dy, BEAK)
    c.px(19, 6 + dy, BEAK_D)

    def wing(pts):
        col = p["wing"] if perched else p["shade"]
        c.poly([at(*q) for q in pts], col)
        flecks = [(x, y) for y in range(c.h) for x in range(c.w) if c.is_(x, y, col) and y % 2 == 0 and (x + y) % 4 in (0, 1)]
        for x, y in flecks:
            c.px(x, y, p["bars"])
    if perched:
        wing([(5, 8), (9, 7), (13, 9), (10, 13), (5, 12)])
    elif frame == "up":
        wing([(6, 9), (13, 8), (12, 0), (8, 0), (4, 4)])
    elif frame == "level":
        wing([(5, 9), (13, 8), (14, 6), (4, 6), (1, 8)])
    else:
        wing([(5, 9), (13, 9), (13, 15), (7, 15), (3, 13)])
    if frame == "blink":
        c.px(14, 4 + dy, p["face_d"])
        c.px(15, 4 + dy, p["face_d"])
    else:
        c.px(14, 4 + dy, EYE_W)
        c.px(15, 4 + dy, EYE)
    if frame in ("idle", "blink"):
        for x, y in ((10, 14), (13, 14), (9, 15), (10, 15), (13, 15), (14, 15)):
            c.px(x, y, LEG)
    elif frame == "hop":
        for x, y in ((10, 12), (13, 12)):
            c.px(x, y, LEG)
    c.outline(p["out"])
    return c.im


# ── props: 12x16 frames. 0 mug (steam a), 1 mug (steam b), 2 plant. ──
def mug(steam):
    c = Canvas(12, 16)
    c.rect(2, 8, 8, 14, "#ece6da")
    c.rect(2, 8, 8, 9, "#3a2418")
    c.rect(9, 10, 10, 12, "#ece6da")
    c.rect(8, 10, 8, 10, "#ece6da")
    c.rect(8, 12, 8, 12, "#ece6da")
    c.rect(2, 13, 8, 14, "#c9c2b4")
    c.rect(4, 11, 5, 11, "#c0392b")
    pts = ((4, 6), (5, 5), (4, 4), (5, 3), (4, 2)) if steam == 0 else ((5, 6), (4, 5), (5, 4), (4, 3), (5, 2))
    for x, y in pts:
        c.px(x, y, "#c7d0e0")
    c.outline("#101420")
    return c.im


def plant():
    c = Canvas(12, 16)
    c.rect(3, 11, 8, 14, "#b5603a")
    c.rect(3, 11, 8, 11, "#d07a4e")
    c.rect(4, 14, 7, 14, "#8e4528")
    c.poly([(5, 10), (1, 6), (2, 3), (5, 8)], "#3fa653")
    c.poly([(6, 10), (10, 6), (9, 3), (6, 8)], "#3fa653")
    c.poly([(5, 10), (5, 2), (6, 2), (6, 10)], "#58c46a")
    for x, y in ((5, 4), (2, 5), (9, 5)):
        c.px(x, y, "#8fe28f")
    c.outline("#0e2a16")
    return c.im


def sheet(frames, path):
    w, h = frames[0].size
    out = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.paste(f, (i * w, 0))
    out.save(path, optimize=True)
    return out


def preview(made, dest):
    bg = (14, 20, 36, 255)
    W = max(im.width for im in made) * 8 + 20
    H = sum(im.height * 8 + im.height * 2 + 30 for im in made) + 10
    out = Image.new("RGBA", (W, H), bg)
    y = 10
    for im in made:
        small = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
        out.paste(im, (10, y), im)
        out.paste(small, (im.width + 30, y), small)
        y += small.height + 10
        big = im.resize((im.width * 8, im.height * 8), Image.NEAREST)
        out.paste(big, (10, y), big)
        y += big.height + 10
    out.convert("RGB").save(dest)


def main():
    os.makedirs(OUT, exist_ok=True)
    sheets = {
        "person.png": [person(False), person(True)],
        "budgie-green.png": [budgie(GREEN, f) for f in ("idle", "blink", "hop", "up", "level", "down")],
        "budgie-blue.png": [budgie(BLUE, f) for f in ("idle", "blink", "hop", "up", "level", "down")],
        "props.png": [mug(0), mug(1), plant()],
    }
    made = [sheet(frames, os.path.join(OUT, name)) for name, frames in sheets.items()]
    if "--preview" in sys.argv:
        preview(made, sys.argv[sys.argv.index("--preview") + 1])


if __name__ == "__main__":
    main()
