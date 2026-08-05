# SVG exports

Twenty views for review in Figma. Regenerate any time the site changes —
these are build output, not source. The site itself is the source of truth.

    svg/
      desktop/   1440px wide
        light/   index · about · healthcare-system · color-safety-lens · lap-times
        dark/    same five
      mobile/    390px wide
        light/   same five
        dark/    same five

## What survived the export

- **Text is real text.** `<text>` / `<tspan>` elements, not outlines, so you can
  select, edit and restyle in Figma.
- **Type is intact.** `"Helvetica Neue", Helvetica, Arial` at weights 400 and 700.
  Figma maps this to Helvetica Neue on macOS.
- **Charts are true vector** — the same SVG the page renders, with each series
  as its own path.
- **Both palettes.** Light and dark carry their separately verified chart
  palettes, so the dark exports are not a filter over the light ones.
- Reveal animations are forced to their resting state and all transitions
  disabled before capture, so nothing is caught mid-motion.

## Importing to Figma

Drag a whole folder in at once — Figma places each file as its own frame.
Desktop frames are 1440 wide by roughly 2800–5200 tall depending on the page.

## Regenerating

The site must be running locally first:

    cd ~/Developer/almaguer-portfolio && python3 -m http.server 8747

Then run the exporter (Chrome lays the page out, `dom-to-svg` serialises it):

    node export.mjs ~/Developer/almaguer-portfolio/exports/svg

The exporter lives in the session scratchpad rather than this repo, since it
pulls in Puppeteer and esbuild — several hundred megabytes of tooling that
shouldn't ship with a static site. Ask and I'll rebuild or relocate it.

## Known limits

- Background gradients used for placeholder fills (the ruled past-work tiles)
  export as flat fills.
- Sticky positioning is resolved at capture, so the masthead appears once at
  the top rather than pinned.
