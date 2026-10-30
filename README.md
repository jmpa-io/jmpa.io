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

## Running locally?

1. Using a <kbd>terminal</kbd>, run:
```bash
make serve
```

2. Using your browser, navigate to `localhost:1314`.

## Testing

Playwright screenshot + interaction tests live in `e2e/` (they use your system Chrome; nothing is downloaded):

```bash
make generate-website                       # builds into dist/public
cd e2e && npm ci && SITE_DIR=../dist/public npx playwright test
npm run test:update                         # refresh the baseline screenshots in e2e/screenshots.spec.ts-snapshots/
```

`make e2e` does the install + run in one go. External requests are blocked during tests, so they work offline.

