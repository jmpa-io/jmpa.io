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
- Everything (headings, labels, body) uses self-hosted, latin-subset [Fira Code](https://github.com/tonsky/FiraCode) 400 and 700
  (`static/fonts/firacode-*.woff2`, SIL OFL: `static/fonts/FiraCode-OFL.txt`), `font-display: swap`, both preloaded. `font-src 'self'` still holds.
- Security: the CSP is a `<meta>` tag in `jmpa-head.html` (`script-src 'self'`, no inline script/style, so the page's
  setup lives in `static/js/init.js`); the headers a meta tag can't set (HSTS, nosniff, frame, referrer, permissions)
  come from the `SecurityHeaders` response headers policy in `cf/website/template.yml`.
- Buttons: 4px hard border, stepped drop shadow, no blur or radius, hover/focus/active press down.
- No OpenTelemetry: this is a static page with no server code of its own, so there is nothing to trace; the CDN access logs
  already cover traffic, and browser telemetry would add a third-party-style beacon (CSP `connect-src 'none'`) for no gain.

## Colours and day/night

The header has a colour picker (Primary + Secondary, plus Reset) and a sun/moon toggle. **The default scheme is dark**, and the
default pair and look come from the theme variant: `params.variant` in `config.yml` (1 midnight terminal, 2 deep ocean,
3 blueprint; `?v=1|2|3` previews another without persisting). Change that one value to pick the default. `static/js/init.js`
holds each variant's default pair (passed to `Palette.init({ defaults })`; Reset returns to it); the variants' `--v-*` tokens
in `static/css/pixel.css` apply only until a visitor picks their own colours (`html[data-custom]`), then the picker's derived colours take over.
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
`colours` (navy default, Reset, picker, AA sweep, scheme toggle), `states` (hover/focus-ring contrast across the colour sweep),
`security` (CSP, no inline script/style, nothing trips it), `footer` (alignment at 5 widths, AA) and `github`
(GitHub mark on the GitHub link). `E2E_PORT=<port>` moves the test server off 4172 (build with a matching `--baseURL`).
