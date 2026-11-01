"""Hand-drawn pixel-art Jordan, drawn from the 2023 Jeoungju caricature (the likeness reference; it is never embedded).

Every row is typed by hand as run tokens, full width, so the quiff, ears and beard can be asymmetric:

    .12      12 clear pixels          K  s22   one K, then 22 s          KK  a literal run
    ~n       n hair pixels (strand texture)       %n  n beard pixels (strand texture)
    &n / ^n  n hood pixels on the left / right of the beard (outline outside, bunched rim next to the beard)

Eyes, brows, nose and mouth are placed pixel by pixel in FACE. Hoodie colours are A18's (hand.py in art.jmpa.io).

    python tools/jordan_art.py FILE [NAMES...]    # reference + candidates contact sheet
"""
import re
import sys

PAL = {
    ".": None, "K": "#2a1408",
    "h": "#c8762a", "H": "#a85a1e", "j": "#e0a04a", "a": "#7a3e14",
    "s": "#f0c8a0", "S": "#d89a68", "p": "#b8665c",
    "b": "#c8762a", "B": "#a85a1e", "c": "#e0a04a",
    "r": "#6a3512", "w": "#f6f1e8", "E": "#6f8fb0", "e": "#1c2a3a",
    "Z": "#17171a", "G": "#3a3a40", "L": "#60606a", "W": "#aaaab2",
}
REF = "/Users/jordan.cleal/go/src/github.com/jmpa-io/jcleal.me-audit/static/img/caricatures/2023, Jeoungju, South Korea, 1 1.png"


def hair(x, y):
    d = (x + y // 2) % 9
    if d == 0 and (y % 3):
        return "j"
    if d == 4 and (y % 4):
        return "H"
    return "a" if (x * 3 + y * 7) % 41 == 0 else "h"


def beard(x, y):
    if (x + y // 2) % 6 == 0:
        return "B"
    if (x * 2 + y * 3) % 13 == 0:
        return "c"
    return "a" if (x * 5 + y * 3) % 19 == 0 else "b"


def hood(x, y, i, n, left):
    edge, rim = (i == 0, i >= n - 2) if left else (i == n - 1, i < 2)
    if edge:
        return "Z"
    if rim:
        return "L"
    if (x + y) % 17 == 0 and y % 2:
        return "Z"
    return "L" if (x - y) % 23 == 0 and y % 3 == 0 else "G"


def expand(row, y):
    out = []
    for t in row.split():
        m = re.fullmatch(r"([.A-Za-z])(\d+)", t)
        if t[0] in "~%&^":
            n = int(t[1:])
            for i in range(n):
                x = len(out)
                out.append(hair(x, y) if t[0] == "~" else beard(x, y) if t[0] == "%" else hood(x, y, i, n, t[0] == "&"))
        elif m:
            out += [m.group(1)] * int(m.group(2))
        else:
            out += list(t)
    return out


def raster(rows, w):
    from PIL import Image
    im = Image.new("RGBA", (w, len(rows)), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        px = expand(r, y)
        assert len(px) == w, f"row {y}: {len(px)} != {w}: {r}"
        for x, ch in enumerate(px):
            if PAL[ch]:
                im.putpixel((x, y), tuple(int(PAL[ch][i:i + 2], 16) for i in (1, 3, 5)) + (255,))
    return im


def put(im, x, y, ch):
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), tuple(int(PAL[ch][i:i + 2], 16) for i in (1, 3, 5)) + (255,))


def mirror(im, pts):
    for x, y, ch in pts:
        put(im, x, y, ch)
        put(im, im.width - 1 - x, y, ch)


# 56x64. Quiff swept up and back to the right, longer hair over the left ear, long nose, full copper beard to the chest.
A = [
    ".56",
    ".30 K ~11 K .13",
    ".24 K ~21 K .9",
    ".18 K ~30 K .6",
    ".14 K ~35 K .5",
    ".11 K ~39 K .4",
    ".9 K ~42 K .3",
    ".8 K ~43 K .3",
    ".7 K ~44 K .3",
    ".7 K ~43 K .4",
    ".6 K ~43 K .5",
    ".6 K ~42 K .6",
    ".6 K ~41 K .7",
    ".6 K ~40 K .8",
    ".6 K ~39 K .9",
    ".6 K ~15 K s11 K ~11 K .9",
    ".6 K ~13 K s15 K ~9 K .9",
    ".6 K ~11 K s19 K ~7 K .9",
    ".6 K ~10 K s21 K ~6 K .9",
    ".6 K ~9 K s22 K ~6 K .9",
    ".6 K ~9 K s22 K ~6 K .9",
    ".6 K ~9 K s22 K ~6 K .9",
    ".6 K ~5 K S3 K s22 K S3 K ~2 K .9",
    ".6 K ~4 K S4 K s22 K S4 K ~1 K .9",
    ".6 K ~4 K S4 K s22 K S4 K ~1 K .9",
    ".6 K ~4 K S4 K s22 K S4 K ~1 K .9",
    ".6 K ~3 K S5 K s22 K S5 K .10",
    ".6 K ~3 K S5 K s22 K S5 K .10",
    ".6 K ~3 K S5 K s22 K S5 K .10",
    ".6 K ~3 K S5 K s22 K S5 K .10",
    ".6 K ~4 K S4 K s22 K S4 K .11",
    ".6 K ~5 K S3 K s22 K S3 K .12",
    ".6 K ~5 K S3 K %4 s14 %4 K S3 K .12",
    ".6 K ~7 K S1 K %4 s14 %4 K S1 K .14",
    ".6 K ~9 K %5 s12 %5 K .16",
    ".6 K ~9 K %5 s12 %5 K .16",
    ".7 K ~8 K %6 s10 %6 K .16",
    ".8 K ~7 K %7 s8 %7 K .16",
    ".9 K ~6 K %8 s6 %8 K .16",
    ".10 K ~5 K %22 K .16",
    ".11 K ~4 K %22 K .16",
    ".16 K %22 K .16",
    ".15 K %24 K .15",
    ".14 K %26 K .14",
    ".9 &4 K %28 K ^4 .9",
    ".7 &6 K %28 K ^6 .7",
    ".5 &8 K %28 K ^8 .5",
    ".4 &9 K %28 K ^9 .4",
    ".3 &10 K %28 K ^10 .3",
    ".2 &11 K %28 K ^11 .2",
    ".1 &13 K %26 K ^13 .1",
    "&14 K %26 K ^14",
    "&15 K %24 K ^15",
    "&16 K %22 K ^16",
    "&17 K %20 K ^17",
    "&19 K %16 K ^19",
    "&22 K %10 K ^22",
    "&26 K4 ^26",
    "&28 ^28",
    "&28 ^28",
    "&28 ^28",
    "&28 ^28",
    "&28 ^28",
    "&28 ^28",
]


def face(im, blink, heavy=False):
    m = lambda pts, ch: mirror(im, [(x, y, ch) for x, y in pts])
    m([(x, 23) for x in range(19, 22)] + [(x, 24) for x in range(22, 26)], "a")
    if heavy:
        m([(x, 22) for x in range(19, 22)] + [(x, 25) for x in range(24, 26)], "a")
    if blink:
        m([(x, 27) for x in range(20, 25)], "K")
    else:
        m([(x, 26) for x in range(20, 25)], "K")
        m([(20, 27), (21, 27), (24, 27), (20, 28), (21, 28), (24, 28)], "w")
        m([(22, 27), (23, 27), (22, 28), (23, 28)], "E")
        m([(23, 27)], "e")
    m([(x, 29) for x in range(20, 25)], "S")
    m([(x, 30) for x in range(21, 24)] + ([(x, 31) for x in range(21, 24)] if heavy else []), "S")
    for y in range(28, 35):
        put(im, 27, y, "S")
    m([(26, 35), (27, 35)], "S")
    m([(25, 36), (26, 36)], "S")
    put(im, 27, 36, "S")
    m([(25, 37), (26, 37)], "K")
    m([(x, 38) for x in range(26, 28)], "h")
    m([(x, 39) for x in range(20, 28)], "h")
    m([(x, 40) for x in range(22, 28)], "H")
    m([(x, 41) for x in range(24, 28)], "p")
    m([(x, 42) for x in range(25, 28)], "r")


def frame(name="A", blink=False):
    im = raster(A, 56)
    face(im, blink, heavy=name in "BCD")
    if name in "CD":
        for y in range(im.height):
            for x in range(im.width):
                p = im.getpixel((x, y))
                if p[3] and p[:3] in ((200, 118, 42), (224, 160, 74)) and y < 60:
                    t = (176, 98, 36) if name == "C" else (214, 134, 52)
                    im.putpixel((x, y), t + (255,) if p[:3] == (200, 118, 42) else p)
    return im


def sheet(out, names):
    from PIL import Image
    ref = Image.open(REF).convert("RGB").crop((380, 20, 1130, 1140))
    ref = ref.resize((int(ref.width * 512 / ref.height), 512))
    cands = [frame(n) for n in names]
    W = ref.width + 20 + sum(c.width * 8 + 20 for c in cands[:1]) + 20
    row2 = sum(c.width * 4 + 20 for c in cands)
    sh = Image.new("RGB", (max(W, row2), 512 + 40 + 64 * 4 + 20), (28, 28, 34))
    sh.paste(ref, (10, 10))
    x = ref.width + 30
    big = cands[0].resize((56 * 8, 64 * 8), Image.NEAREST)
    sh.paste(big, (x, 10), big)
    x = 10
    for c in cands:
        s = c.resize((c.width * 4, c.height * 4), Image.NEAREST)
        sh.paste(s, (x, 540), s)
        x += s.width + 20
        one = c
        sh.paste(one, (x - 70, 540), one)
    sh.save(out)


if __name__ == "__main__":
    sheet(sys.argv[1], sys.argv[2:] or ["A", "B", "C", "D"])
