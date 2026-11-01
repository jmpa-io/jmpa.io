"""Logo, favicons and share images, all from the one approved 18x18 hoodie (A18 in art.jmpa.io .scratch/hand.py).

    python tools/gen_icons.py      # run from the repo root
"""
from PIL import Image

PAL = {".": None, "K": (23, 23, 26), "G": (58, 58, 64), "L": (96, 96, 106), "W": (170, 170, 178)}
A18 = [
    "......KKKKKK......",
    "....KKGGGGGGKK....",
    "...KGGKKKKKKGGK...",
    "...KGKKKKKKKKGK...",
    "..KGGKKKKKKKKGGK..",
    "..KGGGKKWKWKGGGK..",
    ".KGGGGGGKWKGGGGGK.",
    "KGGGGGGGKWKGGGGGGK",
    "KGGLGGGGGWGGGGLGGK",
    "KGGGGGGGGGGGGGGGGK",
    "KGKGGGGGGGGGGGGKGK",
    "KGKGGGKKKKKKGGGKGK",
    "KGKGGKGGGGGGKGGKGK",
    "KGKGGKGGGGGGKGGKGK",
    "KKKGGGKKKKKKGGGKKK",
    ".KKGGGGGGGGGGGGKK.",
    "..KKGGGGGGGGGGKK..",
    "...KKKKKKKKKKKK...",
]
assert len(A18) == 18 and all(len(r) == 18 for r in A18)

BG = {"v1": (7, 11, 22), "v2": (27, 53, 70), "v3": (15, 23, 36)}
OUT = "static/"

hood = Image.new("RGBA", (18, 18), (0, 0, 0, 0))
for y, row in enumerate(A18):
    for x, c in enumerate(row):
        if PAL[c]:
            hood.putpixel((x, y), PAL[c] + (255,))


def on(size, scale, bg=None):
    im = Image.new("RGBA", (size, size) if isinstance(size, int) else size, (bg + (255,)) if bg else (0, 0, 0, 0))
    big = hood.resize((18 * scale,) * 2, Image.NEAREST)
    im.paste(big, ((im.width - big.width) // 2, (im.height - big.height) // 2), big)
    return im


hood.save(OUT + "hoodie-18.png")
# 16/32px favicons are not integer multiples of 18, so they use nearest-neighbour; 64, 180, 192, 512 and the share image are integer scales.
hood.resize((16, 16), Image.NEAREST).save(OUT + "favicon-16x16.png")
hood.resize((32, 32), Image.NEAREST).save(OUT + "favicon-32x32.png")
on(64, 3).save(OUT + "favicon-64x64.png")
on(180, 8, BG["v1"]).save(OUT + "apple-touch-icon.png")
on(192, 8, BG["v1"]).save(OUT + "android-chrome-192x192.png")
on(512, 24, BG["v1"]).save(OUT + "android-chrome-512x512.png")
ico = [hood.resize((s, s), Image.NEAREST) for s in (16, 32, 48)]
ico[2].save(OUT + "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:2])
for k, bg in BG.items():
    on((1200, 630), 20, bg).convert("RGB").save(OUT + f"share-{k}.png")
