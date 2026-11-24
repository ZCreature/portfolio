# Tile plates

Two home page tiles animate their photographs by pixel position, so each one
depends on a single exact image. If either photo is re-shot, re-exported or
cropped, check it here before shipping.

| Tile | Script | Tied to | What to redo |
|---|---|---|---|
| Healthcare dashboard design | `js/sunlight.js` | `assets/img/tools/healthcare-tile.jpg` | Move the four `SCREEN` corners onto the laptop display |
| Newsroom data visualization | `js/reprint.js` | `assets/img/tools/newsroom.jpg`, `dive-06.jpg`, `dive-19.jpg` | Check `PAGES`, then rebuild `assets/img/tools/newsroom-blank.png` |

Serve the repo root (`python3 -m http.server`) and open
`http://localhost:8000/scripts/tile-plates/`. The page imports `PAGES`,
`MARKS` and `SCREEN` straight from the two tile scripts, so the numbers live
in one place.

- **Check page boxes** matches each Data Dive page file against the photo and
  reports whether `PAGES` still holds.
- **Build patch** lifts the paper light out of the photo (photo divided by the
  page file, on clean paper only) and paints it over every mark. The preview
  should show both pages with no charts and every label in place. Save it over
  `newsroom-blank.png` and bump its `?v=` in `index.html`.
- The healthcare canvas draws `SCREEN` over its photo: the outline should sit
  on the laptop's display.
