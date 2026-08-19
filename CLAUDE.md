# CLAUDE.md

Guidance for working in this repo.

## What this is

**Okepage** (ఒకేపేజీ — "just one page") is a browser tool that lays several
photos out on A4 sheets and prints them.
Vanilla HTML/CSS/JS, **no framework, no build step, no dependencies, no
server** — `index.html` is opened straight from disk. It is also an
installable PWA that works with no network at all. Keep it that way:

- No npm packages, bundlers, transpilers or CSS frameworks.
- **No ES modules** (`import`/`export`). Scripts load as plain `<script>` tags
  in order and each one exposes a single global (`I18N`, `Store`, `Layout`,
  `Offline`).
  ES modules would break `file://` usage, which is how people run this.
- The only network request is the Google Fonts stylesheet; the service worker
  caches it after the first visit, and the page still works without it.
- The service worker is hand-written and hand-versioned. No Workbox, no
  generated precache manifest — see *Offline* below.

## Files

| File | Responsibility |
| --- | --- |
| `index.html` | The markup shell. Controls have stable `id`s; `js/app.js` looks them up once into `el`. Static text carries `data-i18n="key"`. |
| `css/app.css` | Every style. Design tokens at the top, then components, then the `@media print` block. |
| `js/i18n.js` | `I18N` — Telugu (`te`, default) and English (`en`) strings. |
| `js/store.js` | `Store` — the state, the photo operations, localStorage persistence, subscribers. |
| `js/layout.js` | `Layout` — pure geometry. No DOM access, so it is testable in plain node. |
| `js/offline.js` | `Offline` — registers the service worker and reports whether the app is cached and whether an update is waiting. No DOM access. |
| `js/app.js` | `render()` + event wiring. The only file that touches the DOM. |
| `sw.js` | The service worker. Must sit at the root so its scope covers the whole app. |
| `manifest.webmanifest` | PWA metadata — name, colours, icons, `display: standalone`. |
| `icons/` | `icon.svg` and `icon-maskable.svg` are the sources; the PNGs are rendered from them (see *Offline* below). |

## How it fits together

State lives in `Store.state`. Anything that changes it goes through a `Store`
helper, which persists the settings and notifies subscribers. `app.js`
subscribes with `render()`, which rebuilds the whole visible UI from state.
There is no partial-update path and no framework — if the UI looks stale, the
fix is that something mutated state without going through `Store`.

Two deliberate exceptions, both for performance:

- `<img>` nodes are cached per photo id in `images` (app.js) and re-parented on
  every render, so re-rendering never reloads or flashes a photo.
- Dragging a photo's crop writes `objectPosition` straight onto the cached
  `<img>` and records it with `Store.updatePhotoQuietly()` — no re-render per
  pointer move.

## Offline

`sw.js` precaches every file in its `FILES` list on install and afterwards
serves everything cache-first, refreshing each hit in the background. Google
Fonts is cached lazily in a second cache, so a first visit that is already
offline still works — it just falls back to system fonts.

**There is no build step, so nothing hashes the filenames: bump `VERSION` in
`sw.js` whenever you change a file it caches, and add new files to `FILES`.**
Without a bump, browsers keep serving the old copy forever.

Updates are never forced on a live page — a print job must not be interrupted
by a reload. A new worker installs and then waits; `Offline` notices it, the
footer offers "new version — click to reload", and only that click sends
`skip-waiting` and reloads.

`Offline.start()` no-ops on `file://`, where service workers do not exist, so
the app still runs when opened straight from a folder — it just is not
installable there.

The icon PNGs are rendered from the two SVGs with headless Chrome; regenerate
them if the artwork changes:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
render() {   # $1 svg, $2 size, $3 out.png
  printf '<style>html,body{margin:0}img{display:block;width:%spx;height:%spx}</style><img src="file://%s/%s">' \
    "$2" "$2" "$PWD" "$1" > /tmp/icon.html
  "$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=$2,$2 \
    --screenshot="$3" file:///tmp/icon.html
}
render icons/icon.svg 512 icons/icon-512.png
render icons/icon.svg 192 icons/icon-192.png
render icons/icon.svg 180 icons/apple-touch-icon.png
render icons/icon-maskable.svg 512 icons/icon-maskable-512.png
```

The maskable icon keeps the sheet inside the safe circle (80% of the canvas);
the plain one lets it run larger.

## Geometry rules

Everything is in **millimetres** until the last moment, because that is what
the printer works in. `Layout.compute()` returns mm plus the px values the
drag maths needs (`Layout.PX_PER_MM` is 96/25.4).

- A4 is 210 × 297 mm. Landscape swaps width and height.
- A preset (`p2`, `p4`, `p6`, `p9`) stores its grid for **portrait** paper;
  landscape swaps its columns and rows — see `Layout.presetGrid()`.
- `auto` derives the grid from the photo count and the printable area's aspect
  ratio, then drops any row or column that would come out completely empty.
- `app.js` writes the result into CSS custom properties on `#sheets`
  (`--page-w`, `--grid-cols`, `--cell-gap`, …). The CSS never hardcodes a size.

## Printing

The screen preview scales one sheet down to fit the stage
(`--scale` on `#sheets`). Printing must undo exactly that:

- `@media print` in `css/app.css` strips the transform and every layout
  wrapper, so `.sheet` prints at its true mm size.
- Anything with `data-print="ui"` is hidden when printing.
- The `<style id="page-rule">` element is rewritten each render with
  `@page { size: A4 <orientation>; margin: 0 }`.

If you touch the print path, verify it — a broken print is invisible on screen.

## Language

Exactly one language shows at a time; there is no "both" mode. Static text uses
`data-i18n="key"` and is filled by `I18N.apply(lang)` (called only when the
language actually changes). Dynamic text calls `I18N.t('key', ...args)` —
those entries are functions. Add a key to **both** `te` and `en`.

Telugu is the default and uses Noto Sans Telugu, which has no 800 weight; the
`--weight-heading` token drops to 700 under `html[lang="te"]`.

## Verifying a change

Open `index.html` and try it. To check it headlessly (macOS):

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless --disable-gpu --window-size=1600,1000 \
  --virtual-time-budget=4000 --screenshot=/tmp/shot.png \
  "file://$PWD/index.html"
```

That only shows the empty state, since real photos need a file drop. Service
workers need a real origin, so offline behaviour has to be checked over HTTP
(`python3 -m http.server` in the repo root) rather than from `file://` — and
remember that a stale worker will keep serving old files until `VERSION`
changes.

 To see a
full sheet, copy `index.html` to a throwaway `preview.test.html`, append a
script that seeds fake photos, and screenshot or print that instead:

```js
Store.set({ photos: [{ id: 't1', url: canvas.toDataURL(), fit: 'cover', x: 50, y: 50, zoom: 100 }] });
```

Add `--print-to-pdf=/tmp/out.pdf --no-pdf-header-footer` to check the print
path; the PDF's MediaBox must be 595×842pt for portrait, 842×595 for
landscape. **Delete the throwaway file afterwards** — it is not part of the app.

`js/layout.js` is pure and can be exercised directly:

```bash
node -e "const Layout = eval(require('fs').readFileSync('js/layout.js','utf8') + ';Layout');
console.log(Layout.compute({orientation:'landscape',preset:'auto',margin:5,gap:2}, 6));"
```

## Conventions

- Descriptive names over terse ones; comments explain *why*, not *what*.
- Keep `Layout` free of DOM access and `Store` free of rendering.
- New settings that should survive a reload go in `PERSISTED` in `store.js`.
- Photos are blob URLs. Copies share one URL, so only revoke it when the last
  copy is gone (`Store.removePhoto`).
