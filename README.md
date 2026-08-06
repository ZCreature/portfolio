# almaguer-portfolio

Static portfolio for Chris Almaguer — data visualization designer.
No build step, no dependencies. Open `index.html` via a local server
(`python3 -m http.server`) — the Thunderhill page fetches JSON, so
`file://` will not work.

## Structure

    index.html                    nameplate + work ledger + tools
    _darkidx.html                 dark-theme twin of index.html, kept in sync
                                  (differs only on the data-theme attribute)
    about.html                    positioning, career spine, practice
    work/healthcare-system.html   WCAG colour standard (Vizient, NDA-safe)
    work/color-safety-lens.html   the ΔE colour-maths failure and fix
    work/lap-times.html           115 laps at Thunderhill West
    work/gas-prices.html          global gas prices, R + Leaflet embed
    work/medical-mental-health.html  Tableau, MBI/STAI heat map
    work/overpopulation.html      7.9 billion — the alluvial broadsheet
    work/patient-flow.html        surgical dressing utilization (Vizient, 2022)
    work/editorial.html           ACBJ newsroom graphics 2018-22
    css/base.css                  design system — the only stylesheet
    js/color.js                   colour engine: CVD, CIEDE2000, WCAG
    js/theme.js                   light/dark, light by default
    js/motion.js                  reveals + scrollytelling
    js/embed.js                   lazy iframe embeds (Tableau, Leaflet)
    js/gate.js                    passphrase unlock for the encrypted page
    assets/data/laps.json         lap data (currently a reconstruction)
    assets/data/editorial.json    tearsheet manifest — scaffold, not yet wired

## Design rules

- **Interface is greyscale. Colour appears only inside data.** Status is
  carried by weight and glyphs, never hue.
- **Helvetica throughout.** One family, no webfont. Windows falls back to
  Arial, which is metrically compatible. There is no monospace Helvetica,
  so the label voice comes from caps and tracking, and anything that has
  to align in a column sets `tabular-nums` explicitly.
- **Charts carry one palette per theme.** No four-colour set clears 3:1
  against both a near-white and a near-black page, so light and dark have
  separate verified palettes with hue identity held constant.

## Verified colour claims

Re-run these before changing any chart palette — the pages state these
numbers on screen and must not contradict themselves.

| Claim | Value |
|---|---|
| Categorical ceiling (ΔE 10 floor, all modes) | 5 series; n=6 tops out at 8.5 |
| Healthcare palette, light | min ΔE 10.2, all lines ≥3:1 on paper |
| Healthcare palette, dark | min ΔE 10.3, all lines ≥3:1 on paper |
| Lap dry/wet pair, light | min ΔE 10.7 (greyscale binds) |
| Lap dry/wet pair, dark | min ΔE 15.4 (greyscale binds) |
| Tile ladder, light | min ΔE 10.2, min contrast 3.03:1 |
| Tile ladder, dark | min ΔE 10.3, min contrast 3.56:1 |

The tile ladder is the four `--tile-*` variables in `css/base.css`, and the
contrast figures are measured against `--paper-2`, the thumbnail surface the
marks actually sit on — not against `--paper`. Light `--tile-4` at 3.03:1 is the
tightest colour on the site; `css/base.css` explains why it is forced rather than
careless.

Every row above except the two healthcare ones is reproducible against
`js/color.js` — build the set, then take the minimum `deltaE00` across normal
vision, all three `simulate()` dichromacies, and `toGrey()`. The healthcare
palette lives inside the encrypted page, so its two rows cannot be re-run without
the plaintext.

## Outstanding

- `assets/data/laps.json` is a **labelled reconstruction**, anchored to the
  published Tableau dashboard (115 laps, 16 sessions, 1:28.39 best on lap
  112, 2:01.14 wet). Replace with the real RaceChrono/RaceStudio export and
  set `meta.reconstruction` to `false`.
- Images now run to roughly **3.7 MB**. The bulk is `assets/img/work/sankey/`
  (six slides at ~200–400 KB each, PNG because they are flat colour and JPEG
  rings on the type) and `assets/img/work/overpopulation.jpg` at 562 KB, a
  2400px broadsheet that compresses badly because it is fine white line art on
  black. Worth revisiting with a real encoder — `sips` cannot write WebP or
  AVIF, and there is no `pngquant`/`cwebp` on this machine.
- Every case study now follows one structure: **01 Context, 02 Process,
  03 Design, 04 Impact**. Impact sections carry a `.impact-todo` placeholder
  until Chris supplies the outcome lines; the class renders as a hatched "To
  fill" block so it cannot be mistaken for published copy.
- `work/healthcare-system.html` is the one case study still on the old
  structure. It is AES-encrypted, so restructuring it needs the plaintext and a
  re-encrypt per `BUILD.md`.
- `assets/data/editorial.json` is a **scaffold that nothing reads yet**.
  `work/editorial.html` is currently static prose. The manifest is there so the
  tearsheet grid can be driven from data once page images land in
  `assets/img/editorial/`; entries with `file: null` are meant to render as
  honest empty slots. Either wire it up or delete it — right now it is a promise
  the site does not keep.
- **Not deployed, and no domain chosen.** `og:image`, `og:url` and `canonical`
  need an absolute origin to work, so they are deliberately absent. Once the
  URL is known, add to every page `<head>`:

      <link rel="canonical" href="ORIGIN/PATH">
      <meta property="og:url" content="ORIGIN/PATH">
      <meta property="og:image" content="ORIGIN/assets/img/og.png">
      <meta property="og:image:width" content="1200">
      <meta property="og:image:height" content="630">
      <meta name="twitter:image" content="ORIGIN/assets/img/og.png">

  Until then the share card falls back to title and description with no image.
  A `robots.txt` also needs the origin for its `Sitemap:` line.
- The GitHub links in the footer point at `github.com/ZCreature`, inferred from
  the git remote on the local Color-Safety-Lens repo. Verify before publishing.
