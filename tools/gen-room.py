#!/usr/bin/env python3
"""Generates layouts/partials/jmpa-room.html, the pixel-room hero (one inline SVG, 108x68 grid).

Every pixel is painted into a named layer with a CSS class; each layer is merged into the fewest
rectangles and emitted as one <path> per class, so the partial stays small. Colours and animation
live in static/css/room.css (CSS variables, stepped keyframes only). Run: python3 tools/gen-room.py
"""
import os
import random

W, H = 108, 68
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'layouts', 'partials', 'jmpa-room.html')


class Layer:
    def __init__(self):
        self.g = {}

    def px(self, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            self.g[(x, y)] = c

    def rect(self, x, y, w, h, c):
        for j in range(y, y + h):
            for i in range(x, x + w):
                self.px(i, j, c)

    def span(self, y, x0, x1, c):
        for i in range(x0, x1 + 1):
            self.px(i, y, c)

    def sprite(self, x, y, rows, legend):
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch in legend:
                    self.px(x + i, y + j, legend[ch])

    def outline(self, c):
        add = []
        for (x, y) in list(self.g):
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                p = (x + dx, y + dy)
                if p not in self.g and 0 <= p[0] < W and 0 <= p[1] < H:
                    add.append(p)
        for p in add:
            self.g[p] = c


def decompose(pixels):
    """Greedy merge into rectangles: {class: [(x, y, w, h), ...]}."""
    res = {}
    by = {}
    for (x, y), c in pixels.items():
        by.setdefault(c, []).append((x, y))
    for c, pts in by.items():
        rows = {}
        for x, y in pts:
            rows.setdefault(y, []).append(x)
        open_ = {}
        out = []
        for y in range(min(rows), max(rows) + 2):
            runs = []
            for x in sorted(rows.get(y, [])):
                if runs and runs[-1][1] == x - 1:
                    runs[-1][1] = x
                else:
                    runs.append([x, x])
            cur = {(a, b) for a, b in runs}
            for k in list(open_):
                if k not in cur:
                    y0 = open_.pop(k)
                    out.append((k[0], y0, k[1] - k[0] + 1, y - y0))
            for k in cur:
                if k not in open_:
                    open_[k] = y
        res[c] = sorted(out, key=lambda r: (r[1], r[0]))
    return res


def paths(layer, ind='  '):
    lines = []
    for c, rs in sorted(decompose(layer.g).items()):
        d = ''.join(f'M{x} {y}h{w}v{h}h-{w}z' for x, y, w, h in rs)
        lines.append(f'{ind}<path class="{c}" d="{d}"/>')
    return '\n'.join(lines)


parts = []


def group(name, layer, attrs='', ind='  '):
    cls = f' class="{name}"' if name else ''
    parts.append(f'{ind}<g{cls}{attrs}>\n{paths(layer, ind + " ")}\n{ind}</g>')


def raw(s):
    parts.append(s)


# ── background: wall, floor, rug ────────────────────────────────────────────
bg = Layer()
bg.rect(0, 0, 108, 46, 'wl')
group('', bg)

fx = Layer()
fx.rect(0, 0, 108, 3, 'wc')
fx.rect(0, 3, 108, 1, 'wcd')
for x in range(6, 108, 12):
    for y in range(5, 46, 2):
        fx.px(x, y, 'wd')
        fx.px(x + 6, y + 1, 'wd')
fx.rect(0, 46, 108, 3, 'wb')
fx.rect(0, 46, 108, 1, 'wbh')
fx.rect(0, 49, 108, 19, 'fl')
for y in (54, 59, 64):
    fx.rect(0, y, 108, 1, 'fd')
for rows, xs in (((49, 53), (14, 52, 86)), ((55, 58), (31, 70, 100)), ((60, 63), (8, 47, 90)), ((65, 67), (24, 64))):
    for x in xs:
        fx.rect(x, rows[0], 1, rows[1] - rows[0] + 1, 'fd')
fx.rect(4, 57, 58, 10, 'rg2')
fx.rect(6, 58, 54, 8, 'rg')
for x in range(8, 58, 6):
    fx.rect(x, 60, 2, 1, 'rg2')
    fx.rect(x + 3, 63, 2, 1, 'rg2')
group('', fx)

# ── window ──────────────────────────────────────────────────────────────────
wf = Layer()
wf.rect(5, 5, 30, 28, 'wf')
wf.rect(5, 5, 30, 1, 'wfh')
wf.rect(5, 5, 1, 28, 'wfh')
wf.rect(3, 32, 34, 3, 'wf')
wf.rect(3, 32, 34, 1, 'wfh')
wf.rect(4, 35, 32, 1, 'wfs')
wf.rect(8, 8, 24, 22, 'sky')
wf.rect(8, 15, 24, 5, 'sky2')
wf.rect(8, 20, 24, 4, 'sky3')
for y, (a, b) in zip(range(17, 24), ((13, 14), (12, 15), (11, 16), (10, 17), (9, 18), (9, 19), (8, 20))):
    wf.span(y, a, b, 'mtn')
for y, (a, b) in zip(range(19, 24), ((24, 24), (23, 25), (22, 26), (21, 27), (20, 28))):
    wf.span(y, a, b, 'mtn')
wf.rect(8, 24, 24, 6, 'hill')
for x, y, w in ((9, 24, 7), (16, 25, 5), (24, 24, 8), (12, 27, 9), (22, 27, 6)):
    wf.rect(x, y, w, 1, 'hill2')
for x, y in ((11, 26), (14, 28), (26, 26), (29, 28), (19, 29)):
    wf.px(x, y, 'hill3')
group('window', wf)

day = Layer()
day.sprite(25, 10, ['.SS.', 'SSSS', 'SSSS', '.SS.'], {'S': 'sun'})
for x, y in ((24, 11), (29, 12), (26, 8), (27, 15)):
    day.px(x, y, 'sun')
night = Layer()
night.sprite(24, 10, ['.XXX.', 'XX...', 'XX...', 'XX...', '.XXX.'], {'X': 'moon'})
stars = {'s1': ((10, 9), (16, 12), (27, 18)), 's2': ((13, 15), (22, 9), (29, 14)), 's3': ((11, 20), (23, 17), (19, 10))}
star_l = {k: Layer() for k in stars}
for k, pts in stars.items():
    for x, y in pts:
        star_l[k].px(x, y, 'star')

clouds = Layer()
for dx in (0, -24):
    clouds.sprite(10 + dx, 11, ['..XXXX..', '.XXXXXXX', 'XXXXXXXX', 'YYYYYYYY'], {'X': 'cloud', 'Y': 'cloud2'})
    clouds.sprite(22 + dx, 20, ['.XXXX.', 'XXXXXX', 'YYYYYY'], {'X': 'cloud', 'Y': 'cloud2'})

raw('  <defs><clipPath id="room-glass"><rect x="8" y="8" width="24" height="22"/></clipPath>'
    '<clipPath id="room-term"><rect x="49" y="15" width="30" height="12"/></clipPath>'
    '<linearGradient id="room-wall" x1="0" y1="0" x2="0" y2="1"><stop class="wg0" offset="0"/><stop class="wg1" offset="1"/></linearGradient></defs>')
raw('  <g class="by-day" clip-path="url(#room-glass)">')
group('', day, '', '   ')
raw('   <g class="drift">')
parts.append(paths(clouds, '    '))
raw('   </g>\n  </g>')
raw('  <g class="by-night" clip-path="url(#room-glass)">')
group('', night, '', '   ')
for k, l in star_l.items():
    group(f'star {k}', l, '', '   ')
raw('   <g class="meteor"><path class="star" d="M14 9h1v1h-1zM13 8h1v1h-1z"/></g>')
raw('  </g>')

mull = Layer()
mull.rect(19, 8, 2, 22, 'wf')
mull.rect(8, 18, 24, 2, 'wf')
mull.rect(19, 8, 1, 22, 'wfh')
mull.rect(8, 18, 24, 1, 'wfh')
group('', mull)

# ── wall decor: sticky notes, shelf with books and a plant ─────────────────
notes = Layer()
notes.rect(37, 9, 6, 6, 'n1')
notes.rect(37, 14, 6, 1, 'n1d')
notes.rect(38, 11, 4, 1, 'nt')
notes.rect(38, 13, 3, 1, 'nt')
notes.px(39, 8, 'tape')
notes.rect(40, 17, 5, 5, 'n2')
notes.rect(40, 21, 5, 1, 'n2d')
notes.rect(41, 19, 3, 1, 'nt')
notes.rect(37, 23, 5, 5, 'n3')
notes.rect(37, 27, 5, 1, 'n3d')
notes.rect(38, 25, 3, 1, 'nt')
group('notes', notes)

shelf = Layer()
shelf.rect(84, 23, 22, 2, 'dk')
shelf.rect(84, 23, 22, 1, 'dh')
shelf.rect(86, 25, 1, 2, 'ds')
shelf.rect(103, 25, 1, 2, 'ds')
for x, y, w, h, c in ((86, 14, 3, 9, 'bk1'), (89, 16, 3, 7, 'bk2'), (92, 13, 3, 10, 'bk3'), (95, 17, 2, 6, 'bk4')):
    shelf.rect(x, y, w, h, c)
    shelf.rect(x, y + 2, w, 1, 'bkh')
shelf.rect(99, 19, 7, 1, 'ptr')
shelf.rect(100, 20, 5, 3, 'pt')
shelf.rect(100, 22, 5, 1, 'ptd')
group('shelf', shelf)

leaf = Layer()
for x, y in ((102, 18), (102, 17), (102, 16), (101, 15), (103, 15), (100, 14), (104, 14)):
    leaf.px(x, y, 'plst')
leaf.sprite(99, 11, ['.P.....P.', 'PPP.P.PPP', '.PPPPPPP.'], {'P': 'pl'})
leaf.px(100, 12, 'pld')
leaf.px(106, 12, 'pld')
group('plant', leaf)
leaf_top = Layer()
leaf_top.sprite(101, 9, ['.P.P.', 'PPPPP'], {'P': 'pl'})
leaf_top.px(102, 10, 'pld')
group('leaf-top', leaf_top)

# ── monitor halo (lit at night) ─────────────────────────────────────────────
gl = Layer()
gl.rect(40, 4, 50, 38, 'g1')
gl.rect(43, 7, 44, 32, 'g1')
gl.rect(45, 9, 40, 28, 'g1')
gl.rect(38, 45, 46, 3, 'spill')
group('glow', gl, ' aria-hidden="true"')

# ── chair and legs (under the desk) ─────────────────────────────────────────
chair = Layer()
chair.rect(8, 33, 3, 18, 'ch')
chair.rect(9, 32, 2, 1, 'ch')
chair.rect(7, 36, 1, 12, 'chd')
chair.rect(10, 33, 1, 18, 'chh')
chair.rect(9, 50, 22, 3, 'ch')
chair.rect(9, 50, 22, 1, 'chh')
chair.rect(9, 52, 22, 1, 'chd')
chair.rect(19, 53, 3, 6, 'chd')
chair.rect(11, 59, 19, 2, 'chd')
for x in (11, 20, 28):
    chair.rect(x, 61, 2, 1, 'wh')
group('chair', chair)


def legs(l):
    l.rect(13, 47, 20, 4, 'pn')
    l.rect(13, 50, 22, 1, 'pnd')
    l.rect(31, 47, 5, 5, 'pn')
    l.rect(31, 51, 4, 9, 'pn')
    l.rect(31, 51, 1, 9, 'pnd')
    l.rect(30, 60, 9, 2, 'sn')
    l.rect(30, 62, 9, 1, 'so')
    l.rect(35, 60, 4, 1, 'snh')


low = Layer()
legs(low)
low.outline('ol')
legs(low)
group('guy', low)

# ── desk ────────────────────────────────────────────────────────────────────
desk = Layer()
desk.rect(30, 45, 76, 1, 'dh')
desk.rect(30, 46, 76, 2, 'dk')
desk.rect(30, 48, 76, 1, 'ds')
desk.rect(38, 49, 3, 14, 'dk')
desk.rect(38, 49, 1, 14, 'dh')
desk.rect(40, 49, 1, 14, 'ds')
desk.rect(102, 49, 3, 14, 'dk')
desk.rect(102, 49, 1, 14, 'dh')
desk.rect(104, 49, 1, 14, 'ds')
desk.rect(41, 49, 61, 1, 'shd')
desk.rect(41, 63, 61, 2, 'shd')
group('desk', desk)

# ── cat, curled up on a cushion under the desk ──────────────────────────────
cat = Layer()
cat.rect(83, 59, 15, 3, 'cu')
cat.rect(83, 59, 15, 1, 'cuh')
cat.rect(83, 61, 15, 1, 'cud')
cat.sprite(86, 51, [
    '.T.....T.',
    '.TT...TT.',
    '.TTTTTTT.',
    'TTTTTTTTT',
    'TTTTTTTTT',
    'TTTTnTTTT',
    '.TTTTTTT.',
    'TTWWWWWTT',
    'TTWWWWWTT',
    'TWWWWWWWT',
], {'T': 'ct', 'W': 'cw', 'n': 'cn'})
for x, y in ((88, 53), (92, 53), (90, 51), (87, 55), (93, 55)):
    cat.px(x, y, 'ct2')
cat.px(87, 52, 'cin')
cat.px(93, 52, 'cin')
cat.rect(87, 58, 2, 1, 'cw2')
cat.rect(92, 58, 2, 1, 'cw2')
group('cat', cat)
eyes = Layer()
for x in (88, 92):
    eyes.px(x, 54, 'ce')
    eyes.px(x, 55, 'ced')
group('cat-eyes', eyes)
lids = Layer()
for x in (88, 92):
    lids.px(x, 54, 'ct')
    lids.px(x, 55, 'ct2')
group('cat-blink', lids)
tail_a = Layer()
tail_a.rect(95, 57, 3, 2, 'ct')
tail_a.rect(97, 55, 2, 3, 'ct')
tail_a.px(98, 55, 'ct2')
group('tail tail-a', tail_a)
tail_b = Layer()
tail_b.rect(95, 57, 3, 2, 'ct')
tail_b.rect(97, 56, 2, 1, 'ct')
tail_b.rect(98, 54, 2, 2, 'ct')
tail_b.px(99, 54, 'ct2')
group('tail tail-b', tail_b)

# ── desk lamp (warm cone only after dark) ───────────────────────────────────
lamp = Layer()
lamp.rect(92, 43, 7, 2, 'lb')
lamp.rect(95, 36, 1, 7, 'lp')
lamp.rect(94, 35, 1, 2, 'lp')
lamp.rect(90, 32, 6, 3, 'lh')
lamp.rect(89, 33, 1, 3, 'lh')
lamp.rect(90, 32, 6, 1, 'lhh')
group('lamp', lamp)
cone = Layer()
for y in range(36, 45):
    k = y - 35
    cone.rect(91 - k, y, 2 + 2 * k, 1, 'lg')
cone.rect(90, 35, 5, 1, 'lbulb')
group('lamp-on', cone)

# ── monitor ─────────────────────────────────────────────────────────────────
mon = Layer()
mon.rect(46, 10, 36, 27, 'mb')
mon.rect(46, 10, 36, 1, 'mh')
mon.rect(46, 10, 1, 27, 'mh')
mon.rect(81, 11, 1, 26, 'mbd')
mon.rect(47, 36, 34, 1, 'mbd')
mon.rect(48, 12, 32, 21, 'sc')
mon.rect(48, 12, 32, 3, 'tb')
for x, c in ((49, 'd1'), (51, 'd2'), (53, 'd3')):
    mon.px(x, 13, c)
mon.rect(60, 13, 10, 1, 'tbt')
mon.rect(48, 30, 32, 3, 'sb')
mon.rect(49, 31, 6, 1, 'sb1')
mon.rect(57, 31, 4, 1, 'sb2')
mon.rect(72, 31, 7, 1, 'sb3')
mon.px(78, 34, 'led')
mon.rect(64, 34, 2, 1, 'mh')
mon.rect(62, 37, 5, 6, 'mb')
mon.rect(62, 37, 1, 6, 'mh')
mon.rect(57, 43, 15, 2, 'mb')
mon.rect(57, 43, 15, 1, 'mh')
group('monitor', mon)

rng = random.Random(11)
CODE = [('kw', 0.22), ('fn', 0.2), ('str', 0.14), ('num', 0.08), ('dim', 0.12), ('txt', 0.24)]


def code_line(layer, y, indent):
    x = 51 + indent
    for _ in range(rng.choice((2, 3, 3, 4))):
        r, acc, cls = rng.random(), 0, 'txt'
        for c, p in CODE:
            acc += p
            if r < acc:
                cls = c
                break
        w = rng.choice((2, 3, 4, 5, 6, 8))
        if x + w > 78:
            break
        layer.rect(x, y, w, 1, cls)
        x += w + 1


# 16 lines (32px); the second copy is identical, so translating by 32px loops seamlessly
scroll = Layer()
indents = [0, 0, 2, 2, 4, 2, 4, 4, 2, 0, 0, 2, 4, 4, 2, 0]
for i in range(16):
    y = 15 + i * 2
    scroll.px(49, y, 'gt')
    code_line(scroll, y, indents[i])
for (x, y), c in list(scroll.g.items()):
    scroll.g[(x, y + 32)] = c
raw('  <g class="term" clip-path="url(#room-term)"><g class="scroll">')
parts.append(paths(scroll, '   '))
raw('  </g></g>')

term = Layer()
term.sprite(49, 27, ['X..', '.X.', 'X..'], {'X': 'pr'})
group('prompt', term)
raw('  <rect class="typing" x="53" y="28" width="14" height="1"/>')
raw('  <g class="cursor-move"><rect class="cursor" x="67" y="27" width="2" height="3"/></g>')

ps = Layer()
ps.rect(56, 17, 18, 8, 'pb')
ps.rect(57, 18, 16, 6, 'pbg')
ps.sprite(59, 19, ['....X', '...XX', 'X.XX.', 'XXX..', '.X...'], {'X': 'pk'})
ps.rect(65, 20, 6, 1, 'pk')
ps.rect(65, 22, 4, 1, 'pk')
group('pass', ps)
ps2 = Layer()
ps2.rect(48, 30, 32, 3, 'pg')
group('pass-strip', ps2)
raw('  <rect class="flicker" x="48" y="12" width="32" height="21"/>')

# ── keyboard (RGB underglow), mouse, mug ────────────────────────────────────
kb = Layer()
kb.rect(43, 42, 30, 3, 'kb')
for x in range(44, 72, 2):
    kb.px(x, 42, 'kc')
    kb.px(x + 1, 43, 'kc')
kb.rect(50, 44, 12, 1, 'kc')
kb.rect(75, 42, 3, 2, 'ms')
kb.rect(75, 44, 3, 1, 'msd')
group('kbd', kb)
rgb = Layer()
rgb.rect(43, 45, 30, 1, 'rgb')
rgb.rect(75, 45, 3, 1, 'rgb')
group('rgb-line', rgb)
rgbg = Layer()
rgbg.rect(41, 46, 38, 2, 'rgb')
group('rgb-glow', rgbg)
for n, pts in ((1, ((47, 42), (53, 43), (60, 42))), (2, ((50, 43), (57, 42), (65, 43))), (3, ((45, 43), (62, 43), (69, 42)))):
    kp = Layer()
    for x, y in pts:
        kp.px(x, y, 'kp')
    group(f'kp kp{n}', kp)

mug = Layer()
mug.rect(84, 40, 5, 5, 'mg')
mug.rect(89, 41, 1, 3, 'mg')
mug.rect(84, 40, 5, 1, 'mgd')
mug.rect(85, 41, 3, 1, 'mgc')
mug.rect(84, 43, 5, 1, 'mgs')
mug.rect(84, 44, 5, 1, 'mgd')
group('mug', mug)
raw('  <g class="mug"><g class="steam"><path class="st a" d="M85 37h1v2h-1z"/><path class="st b" d="M87 36h1v2h-1z"/><path class="st c" d="M86 34h1v2h-1z"/></g></g>')

# ── the guy: hoodie torso + hood, arm, head ─────────────────────────────────
TORSO = {31: (15, 24), 32: (14, 25), 33: (13, 26), 34: (13, 26), 35: (13, 26), 36: (13, 26)}
for y in range(37, 50):
    TORSO[y] = (12, 26)
HOOD = {28: (14, 18), 29: (12, 19), 30: (11, 19), 31: (11, 17), 32: (11, 15), 33: (11, 13)}


def torso(l):
    for y, (a, b) in TORSO.items():
        l.span(y, a, b, 'g')
    for y, (a, b) in HOOD.items():
        l.span(y, a, b, 'hd')
    for y in range(29, 33):
        l.span(y, 17, 20, 'hd')


body = Layer()
torso(body)
body.outline('ol')
torso(body)
body.rect(15, 28, 4, 1, 'hdh')
body.rect(12, 29, 3, 1, 'hdh')
body.rect(11, 30, 1, 3, 'hdh')
body.rect(12, 36, 2, 14, 'gd')
body.rect(12, 47, 15, 3, 'gd')
body.rect(12, 47, 15, 1, 'gh')
body.rect(20, 41, 7, 5, 'gd')
body.rect(20, 41, 7, 1, 'gh')
body.rect(21, 42, 1, 3, 'gh')
body.rect(25, 42, 1, 3, 'gh')
for y in range(33, 40):
    body.px(24, y, 'str')
for y in range(34, 38):
    body.px(26, y, 'str')
body.px(24, 40, 'strt')
body.px(26, 38, 'strt')
body.rect(19, 30, 5, 3, 'hdd')
group('guy', body)

ARM = {34: (17, 22), 35: (17, 22), 36: (17, 22), 37: (17, 22), 38: (18, 23), 39: (18, 23), 40: (18, 24)}


def armfill(l):
    for y, (a, b) in ARM.items():
        l.span(y, a, b, 'g')
    l.rect(19, 41, 5, 4, 'g')
    l.rect(24, 41, 14, 4, 'g')


arm = Layer()
armfill(arm)
arm.outline('ol')
armfill(arm)
arm.rect(24, 44, 14, 1, 'gd')
arm.rect(19, 44, 5, 1, 'gd')
arm.rect(17, 34, 1, 6, 'gd')
arm.rect(18, 34, 5, 1, 'gh')
arm.rect(24, 41, 13, 1, 'gh')
arm.rect(36, 41, 2, 4, 'gd')
group('arm', arm)

# three typing poses: near hand taps / lifts, the far hand answers
HANDS = {
    'h-a': ((38, 41, 4, 3), (42, 42, 3, 1), (41, 39, 4, 2), (45, 40, 1, 1)),
    'h-b': ((38, 40, 4, 3), (42, 41, 2, 1), (41, 40, 4, 2), (45, 41, 1, 2)),
    'h-c': ((38, 41, 4, 3), (42, 43, 3, 1), (41, 39, 4, 2), (45, 40, 1, 1)),
}
for n, (palm, fing, far, farf) in HANDS.items():
    h = Layer()
    h.rect(*far, 'skd')
    h.rect(*farf, 'skd')
    h.rect(*palm, 'sk')
    h.rect(*fing, 'sk')
    h.px(palm[0] + 2, palm[1] + 3, 'skd')
    group(f'hand {n}', h)

HEAD = {19: (21, 26), 20: (20, 27), 21: (19, 28), 22: (18, 29), 23: (18, 29), 24: (18, 29), 25: (18, 30), 26: (18, 30), 27: (18, 29), 28: (19, 29), 29: (20, 29), 30: (21, 28)}


def headfill(l):
    for y, (a, b) in HEAD.items():
        l.span(y, a, b, 'sk')


head = Layer()
headfill(head)
head.outline('ol')
headfill(head)
for y in (19, 20, 21, 22):
    head.span(y, HEAD[y][0], HEAD[y][1], 'hr')
head.rect(18, 23, 12, 1, 'hr')
head.rect(18, 24, 6, 6, 'hr')
head.rect(22, 18, 6, 1, 'hpb')
head.rect(21, 19, 1, 1, 'hpb')
head.rect(20, 20, 1, 2, 'hpb')
head.rect(19, 22, 1, 3, 'hpb')
head.rect(19, 24, 6, 6, 'hp')
head.rect(19, 24, 6, 1, 'hph')
head.rect(19, 29, 6, 1, 'hpd')
head.px(30, 26, 'skd')
head.rect(28, 29, 2, 1, 'skd')
head.rect(27, 24, 2, 1, 'hr')
head.rect(22, 30, 7, 1, 'skd')
head.rect(22, 31, 4, 2, 'skd')
head.px(27, 26, 'eyec')
group('head', head)
eye = Layer()
eye.px(27, 26, 'eye')
group('eye', eye)
hp = Layer()
hp.rect(21, 25, 1, 3, 'hph')
group('hp', hp)
lit = Layer()
lit.rect(27, 23, 4, 8, 'lit')
group('lit', lit)

# ── assemble ────────────────────────────────────────────────────────────────
head_txt = '''{{- /* GENERATED by tools/gen-room.py - edit that, not this. The hero: a pixel-art guy in a grey hoodie at his PC. One 108x68 grid, merged into
one <path> per colour class; colours + stepped animation come from CSS vars (css/room.css) so it follows the picker, variant and day/night. */ -}}
<figure class="room-frame">
<svg class="room" viewBox="0 0 108 68" width="108" height="68" shape-rendering="crispEdges" role="img" aria-label="Pixel art of a guy in a grey hoodie and headphones sitting at a desk, typing on a glowing keyboard. His monitor scrolls code and occasionally flashes build passed, a mug steams beside it, a cat naps on a cushion under the desk, and the window shows the sun by day and the moon and stars by night.">'''
text = head_txt + '\n' + '\n'.join(parts) + '\n</svg>\n</figure>\n'
with open(OUT, 'w') as f:
    f.write(text)
print(f'wrote {os.path.relpath(OUT)}: {len(text)} bytes')
