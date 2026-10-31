<!-- markdownlint-disable MD041 MD010 -->
[![jmpa.io](https://github.com/jmpa-io/jmpa.io/actions/workflows/cicd.yml/badge.svg)](https://github.com/jmpa-io/jmpa.io/actions/workflows/cicd.yml)
[![jmpa.io](https://github.com/jmpa-io/jmpa.io/actions/workflows/README.yml/badge.svg)](https://github.com/jmpa-io/jmpa.io/actions/workflows/README.yml)

# `jmpa.io`

```diff
+ 🚪 The front door: one simple page linking to everywhere I live online.
```

`jmpa.io` looks and feels like [art.jmpa.io](https://art.jmpa.io) (same header, footer, type, blobs background and card
style; `static/css/jmpa.css` and the head/nav/footer partials are copied from it) but it is just a list of places:

- [art.jmpa.io](https://art.jmpa.io) - original watercolour paintings
- [jcleal.me](https://jcleal.me) - blog, about, resume, workshops
- [portfolio.jcleal.me](https://portfolio.jcleal.me)
- [startpage.jcleal.me](https://startpage.jcleal.me)
- [github.com/jmpa-io](https://github.com/jmpa-io) - opens in a new tab

The old Windows 98 desktop / CRT / resizable-window version is gone from the tree (it is in git history). The CRT
masters now live only in `portfolio.jcleal.me/public/crt.{js,css}`.

## Adding or changing a link

Everything is data-driven from `data/links.yml`. The home page cards, the header nav and the footer all read it:

```yaml
- name: art.jmpa.io          # card title
  url: https://art.jmpa.io
  tag: Art                   # card eyebrow, also the footer text label
  desc: Original watercolour paintings.
  subs: [{ name: Gallery, url: "https://art.jmpa.io/art/" }]   # optional chips
  nav: true                  # show in the header nav
  footer: text               # text | icon | omit
  icon: github               # icon name (partials/jmpa-icon.html), for footer: icon
  external: true             # target=_blank rel="noopener noreferrer"
  card: false                # footer/nav only, no card
```

Page copy (heading, tagline, etc.) is in `config.yml` under `Params`. `config.yml` also limits `module.mounts` to the
files this site uses, so stray local files can't break the build (previously only the home page was produced).

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

Specs: `links` (hrefs/targets, layout at 390/900/1600, no overflow, tab order, screenshots), `colours` (navy default,
Reset, picker, AA sweep, scheme toggle), `footer` (alignment at 5 widths, AA) and `github` (GitHub mark on every GitHub link).
