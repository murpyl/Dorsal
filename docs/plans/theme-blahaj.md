# Theme: Blåhaj

Scope: visual tokens only (Phase 6 polish variant). No Convex, schema, copy, routing or component-logic changes.

- Palette from the IKEA plush shark: Blåhaj blue `oklch(0.54 0.12 245)` as `--primary` (deepened a notch from #4c8fc9 so white button text clears 4.5:1), belly white-blue `#e8f1fa` page background, grey-blue card surfaces, denim `oklch(0.3 0.065 252)` text/borders; the toy's pink mouth becomes `--destructive` (muted pink, 5:1 on card) and its black eye shows up only in the wordmark.
- Plush shape: `--radius: 1.25rem`, pill buttons, diffuse two-layer `--plush-shadow` on cards/alerts, body gradient (deeper blue at the top, paler belly below) and two inline-SVG wave masks fixed to the bottom of the viewport.
- Type: Nunito (body) + Fredoka (headings, `font-heading`) via `next/font/google`; Geist Mono kept for session codes.
- Brand: inline-SVG Blåhaj (blue back, white belly, black eye, pink mouth, dorsal fin) on a pale tile.
- Levels: rose → amber → teal (`lib/levels.ts`, `scoreColors` in oklch) so meaning order is preserved and the greens sit next to the blues.
- `.dark` block carries a deep-water variant of the same tokens (not enabled by default).
