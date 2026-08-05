# almaguer-portfolio

Static portfolio for Chris Almaguer — data visualization designer.
No build step, no dependencies. Open `index.html` via a local server
(`python3 -m http.server`) — the Thunderhill page fetches JSON, so
`file://` will not work.

## Structure

    index.html                    nameplate + work ledger + tools
    about.html                    positioning, career spine, practice
    work/healthcare-system.html   WCAG colour standard (Vizient, NDA-safe)
    work/color-safety-lens.html   the ΔE colour-maths failure and fix
    work/lap-times.html           115 laps at Thunderhill West
    css/base.css                  design system — the only stylesheet
    js/color.js                   colour engine: CVD, CIEDE2000, WCAG
    js/theme.js                   light/dark, light by default
    js/motion.js                  reveals + scrollytelling
    assets/data/laps.json         lap data (currently a reconstruction)

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
| Lap dry/wet pair, light | min ΔE 10.7 |
| Lap dry/wet pair, dark | min ΔE 21.3 |

## Outstanding

- `assets/data/laps.json` is a **labelled reconstruction**, anchored to the
  published Tableau dashboard (115 laps, 16 sessions, 1:28.39 best on lap
  112, 2:01.14 wet). Replace with the real RaceChrono/RaceStudio export and
  set `meta.reconstruction` to `false`.
- No images yet — the site is deliberately type-driven. Drop assets in
  `assets/img/`.
- Not yet deployed. Target: GitHub Pages under `ZCreature`.
