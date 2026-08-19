# Photos on one page

A single-page tool for printing many photos on one sheet of A4 — drop the
photos in, pick how many fit on a page, print. Bilingual (తెలుగు / English),
portrait or landscape.

No build step, no dependencies, no server: **open `index.html` in a browser.**

## What it does

- **Drop photos anywhere** in the window, or click to pick files.
- **Photos per page** — 1, 2, 4, 6, 9, or *Auto*, which picks the tightest
  grid the paper allows for the number of photos you dropped.
- **Portrait or landscape** A4. The grid flips with the paper, and so does the
  print dialog's page setup.
- **Fill the box** (crops to fill) or **Whole photo** (nothing cut).
- **Gap, paper-edge margin and a cutting line** in millimetres, so the sheet
  can be cut up afterwards.
- **Per photo:** drag it on the sheet to move the crop, zoom it, duplicate it,
  fill a whole sheet with it, or remove it.
- Photos overflow onto extra sheets automatically.

Photos never leave the machine — they are read straight from disk in the
browser and are gone when the tab closes. Layout settings are remembered.

## Printing

Press **Print** (or Ctrl/Cmd + P) and in the browser's print dialog set:

| Setting | Value |
| --- | --- |
| Paper | A4 |
| Margins | None |
| Scale | 100% |
| Headers and footers | Off |

The page ships an `@page` rule with the right size and orientation, so most
browsers get this right on their own.

## Project layout

```
index.html      markup shell — every control has a stable id
css/app.css     all styling, including the print rules
js/i18n.js      Telugu + English strings
js/store.js     state, photo operations, saved settings
js/layout.js    grid + page geometry in millimetres (pure functions)
js/app.js       renders the DOM and wires up the events
```

See `CLAUDE.md` for how the pieces fit together.
