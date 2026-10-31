<!-- markdownlint-disable MD041 MD010 -->
[![jmpa.io](https://github.com/jmpa-io/jmpa.io/actions/workflows/cicd.yml/badge.svg)](https://github.com/jmpa-io/jmpa.io/actions/workflows/cicd.yml)
[![jmpa.io](https://github.com/jmpa-io/jmpa.io/actions/workflows/README.yml/badge.svg)](https://github.com/jmpa-io/jmpa.io/actions/workflows/README.yml)

# `jmpa.io`

```diff
+ 🖥️ A tiny Windows 98 desktop, viewed through a CRT. Every icon is a program that takes you somewhere else.
```

`jmpa.io` is purely a launcher: it doesn't render a CV or any content, it just links out
to the rest of my corner of the internet ([art.jmpa.io](https://art.jmpa.io), [jcleal.me](https://jcleal.me),
[portfolio.jcleal.me](https://portfolio.jcleal.me), ...). One program, `room.exe`, opens an in-page window with an animated pixel-art room.

Click an icon to select it, double-click (or tap) to open it. The `CRT` button in the taskbar turns the CRT effect on/off (remembered).

## Adding a program

Programs live in `config.yml` under `Params.programs`. Each one shows up on the desktop and in the Start menu:

```yaml
Params:
  programs:
    - { title: art.exe, icon: palette, url: "https://art.jmpa.io" }                       # navigates away
    - { title: github, icon: folder, url: "https://github.com/jmpa-io", newtab: true }    # opens a new tab
    - { title: room.exe, icon: monitor, window: room }                                    # opens an in-page window
```

Valid `icon`s: `document`, `briefcase`, `folder`, `globe`, `monitor`, `palette` (16x16 pixel maps in `static/js/desktop.js`).

## Colours and day/night

The tray has a **Display** button (two colour inputs: Primary + Secondary, plus Reset) and a sun/moon button. Primary drives title bars, selection and Start accents; Secondary tints the wallpaper and taskbar. Contrast is kept AA in light and dark. Choices persist in `localStorage` (`palette-custom`, `scheme`) and are applied before first paint.

`static/js/palette.js` and `e2e/{playwright.config.ts,helpers/palette-helpers.ts,server.mjs}` are mirrored masters from `jcleal.me` - do not edit them here (`make e2e-sync` in `jcleal.me`).

## Running locally?

1. Using a <kbd>terminal</kbd>, run:
```bash
make serve
```

2. Using your browser, navigate to `localhost:1314`.

## CRT screen and resizable windows

The desktop is viewed through a curved CRT (`static/js/crt.js` + `static/css/crt.css`, master copies mirrored into `portfolio.jcleal.me/public/` by `make e2e-sync` in jcleal.me). Curvature is a real barrel distortion: an SVG `feDisplacementMap` fed by a generated radial map, with three passes for chromatic aberration that grows toward the edges. CSS 3D was considered but can only fake a tilted plane, so it was not built (reasoned, not measured). Filters don't change hit-testing, so `crt.js` re-targets pointer events through the inverse mapping (hover is not remapped). The Display slider scales curvature, glow and overlays (0 = flat); the CRT toggle off is fully flat. Curvature is off below 900px, on touch, and with reduced motion the flicker/band/grain stop. Measured in headless Chrome with curvature and animation on: avg 16.0ms, p95 17-18ms per frame (vsync-capped at 60fps).

Windows resize from 8 pointer-captured handles (min 220x120, clamped to the desktop), double-click the title bar to maximise/restore; below ~700px windows are full-screen with no handles.

## Testing

Playwright screenshot + interaction tests live in `e2e/` (they use your system Chrome; nothing is downloaded):

```bash
make generate-website                       # builds into dist/public
cd e2e && npm ci && SITE_DIR=../dist/public npx playwright test
npm run test:update                         # refresh the baseline screenshots in e2e/screenshots.spec.ts-snapshots/
```

`make e2e` does the install + run in one go. External requests are blocked during tests, so they work offline.

