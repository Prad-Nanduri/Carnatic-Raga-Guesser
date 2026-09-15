# Design

The committed visual world for Ragaforge. PRODUCT.md owns product truth; this
document owns the durable visual decisions made from the Carnatic brief.

## World

A warm, editorial room — closer to a boutique cultural institution's programme
notes than a SaaS dashboard. Light theme reads as ivory/sandalwood paper under
lamplight; dark theme is the same room after dusk — deep umber, ember maroon,
candlelit gold. `prefers-color-scheme` selects between them.

## Palette (tokens in `app/globals.css`)

- `--parchment` ground, `--card` raised surface, `--sand` recessed fill,
  `--line` hairline borders.
- `--ink` body, `--ink-soft` secondary text (tinted from the palette, never
  grey).
- `--maroon` / `--maroon-deep` — the committed accent: headings, primary
  actions, emphasis. Oxblood, not saffron.
- `--gold` — antique gold; focus rings, waveform cursor, small accents only.
- `--bronze` — temple bronze; labels, ornament strokes, secondary metadata.
- `--danger` — failure states.

All colours flow through these tokens; components do not carry raw hex (client
canvases like WaveSurfer/Recharts read the same CSS vars via `themeColor`).

## Typography

- Display: **Fraunces** (next/font, `--font-display`, SOFT/WONK/opsz axes) —
  the brief's named manuscript-character serif. Headings, wordmark, stat values.
  Roman only — italics never appear in headings.
- Body/UI: **Source Sans 3** (next/font, `--font-body`) — clean neutral sans.
- Scale: wordmark 4xl, page headings 2xl (`.heading`), stat values 2xl,
  body sm–base. Labels are `.label` — uppercase, tracked, bronze.

## Motifs (line art only, authored SVG)

- `KolamRule` — kolam lattice of dots and diamond outlines; used as a divider
  and the in-progress ornament on the generation page.
- `TempleFooter` — gopuram tiered silhouette + one colophon line; home only.
- Masthead `SiteHeader` — centred wordmark, links row separated by small
  rotated-square diamonds, closed by a double rule (newspaper register).

## Component grammar

`.card` hairline panels, `.field` inputs (44px floor), `.btn-primary` (maroon
fill, ivory text) / `.btn-ghost` (hairline), `.nav-link` text links.
Sections separate by rhythm and rules, not stacked card grids. Browser chrome
is themed: selection, caret, focus-visible, scrollbars, underline offset.

## Bans (from the brief, enforced)

No saffron-to-red or purple-blue gradients, no gradient text, no lotus/Om
iconography, no stock "exotic India" imagery, no ornamental Indic script, no
icon tiles, no pure #000/#fff surfaces, no eyebrows above headings.
