<!-- markdownlint-disable MD041 MD010 -->
[![jmpa.io](https://github.com/jmpa-io/jmpa.io/actions/workflows/cicd.yml/badge.svg)](https://github.com/jmpa-io/jmpa.io/actions/workflows/cicd.yml)
[![jmpa.io](https://github.com/jmpa-io/jmpa.io/actions/workflows/README.yml/badge.svg)](https://github.com/jmpa-io/jmpa.io/actions/workflows/README.yml)

# `jmpa.io`

```diff
+ 🚪 The front door: one simple page linking to everywhere I live online.
```

`jmpa.io` is a deliberately small pixel-art page: an animated pixel scene of a guy typing at a PC (steaming mug, blinking
cursor, flickering screen) with five chunky pixel buttons, each listed once:

- [art.jmpa.io](https://art.jmpa.io) - original watercolour paintings
- [jcleal.me](https://jcleal.me) - blog, about, resume, workshops
- [portfolio.jcleal.me](https://portfolio.jcleal.me)
- [startpage.jcleal.me](https://startpage.jcleal.me)
- [github.com/jmpa-io](https://github.com/jmpa-io) - opens in a new tab

The old Windows 98 desktop / CRT / resizable-window version is gone from the tree (it is in git history). The CRT
masters now live only in `portfolio.jcleal.me/public/crt.{js,css}`.

## Adding or changing a link

Everything is data-driven from `data/links.yml`: the buttons beside the scene and the footer icons both read it:

```yaml
- name: github.com/jmpa-io   # button text
  label: GitHub jmpa-io      # optional accessible name
  url: https://github.com/jmpa-io
  icon: github               # icon name (partials/jmpa-icon.html), shown on the button or as a footer icon
  external: true             # target=_blank rel="noopener noreferrer"
  footer: icon               # footer icon (with card: false it is footer-only)
  card: false
```

Page copy (eyebrow, heading, sub text, footer tagline) is in `config.yml` under `Params`. `config.yml` also limits
`module.mounts` to the files this site uses, so stray local files can't break the build.

## The pixel scene

- `layouts/partials/jmpa-room.html` is a 96x60 grid of `<rect>`s in one inline SVG (`role="img"` with alt text,
  `shape-rendering="crispEdges"`, `image-rendering: pixelated`), shown at integer scales (3x / 5x / 7x) via `--scale`.
- All colours come from the palette CSS variables (`color-mix` of `--pal-primary`/`--pal-secondary` in `static/css/pixel.css`),
  so it follows the picker. Day is a bright room with a sun; night is a dark room lit by the monitor glow, with a moon and stars.
- Animations (typing hands, code lines, cursor, steam, screen flicker, stars) are stepped CSS and only run under
  `prefers-reduced-motion: no-preference`; otherwise a still frame is shown.
- Headings and labels use self-hosted, subset [Silkscreen](https://fonts.google.com/specimen/Silkscreen)
  (`static/fonts/silkscreen-*.woff2`, SIL OFL: `static/fonts/Silkscreen-OFL.txt`); body text stays in the system sans.
- Buttons: 4px hard border, stepped drop shadow, no blur or radius, hover/focus/active press down.

## Colours and day/night

The header has a colour picker (Primary + Secondary, plus Reset) and a sun/moon toggle. **The default is navy
`#0a2a6b` / `#2f7fae`** (passed to `Palette.init({ defaults })` in `layouts/partials/jmpa-head.html`; Reset returns to it).
Contrast stays AA in light and dark. Choices persist in `localStorage` (`palette-custom`, `scheme`) and apply before first paint.

`static/js/palette.js` and `e2e/{playwright.config.ts,helpers/palette-helpers.ts,server.mjs}` are mirrored masters from
`jcleal.me` - do not edit them here (`make e2e-sync` in `jcleal.me`). The per-site default lives in `e2e/site.ts`.

## Running locally?

1. Using a <kbd>terminal</kbd>, run:
```bash
make serve
```

2. Using your browser, navigate to `localhost:1314`.

## Testing

Playwright tests live in `e2e/` (system Chrome; nothing is downloaded, external requests are blocked):

```bash
make generate-website                       # builds into dist/public
make e2e                                    # npm ci + playwright test against dist/public
cd e2e && npm run test:update               # refresh baselines (delete the snapshot dir to force a full regen)
```

Specs: `links` (hrefs/targets, button style, layout at 390/900/1600, no overflow, tab order, screenshots), `scene`
(labelled image, pixelated integer-scale rendering, follows picker and day/night, animation and reduced-motion),
`colours` (navy default, Reset, picker, AA sweep, scheme toggle), `footer` (alignment at 5 widths, AA) and `github`
(GitHub mark on the GitHub link).
