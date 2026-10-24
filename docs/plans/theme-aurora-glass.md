# Theme: Aurora Glass

Scope: tokens, fonts and surface styling only. No Convex, routing, copy, aria or component-logic changes.

## Direction

- **Background.** Two fixed, blurred radial-gradient layers (`body::before` / `body::after`) drift violet, teal, pink and sky pastels behind every screen. The second layer animates very slowly (36 s, transform only) and is disabled under `prefers-reduced-motion`.
- **Surfaces.** `Card`, graph nodes and outline buttons are frosted glass: translucent white (`--card: white / 62%`), `backdrop-filter: blur() saturate()`, 1 px `white / 40%` border, an inset white highlight and a large, soft violet-tinted shadow (`--shadow-glass`). Exposed as `glass` / `glass-sm` utilities.
- **Colour.** Primary is deep violet (`oklch(0.42 0.2 294)`); secondary / muted are violet tints, accent is a teal tint. Foreground is violet-ink rather than black so text sits in the palette while staying >= 4.5:1 on glass.
- **Type.** Plus Jakarta Sans for body, Outfit for headings (`h1`–`h3`, `CardTitle`), Geist Mono for codes. Loaded via `next/font/google`, wired through `@theme inline`.
- **Radius.** `--radius: 0.875rem`, so cards are ~20 px and buttons ~14 px.
- **Levels.** confused / partly / can explain become rose / amber / teal; the selected state is a pastel tint with dark text (AA) instead of a saturated fill. Graph node colours follow the same hue ramp in oklch.

## Acceptance

`npm run lint && npx tsc --noEmit && npm test && npm run build` pass; `/`, `/join/[code]` and `/room/[roomId]` render with the fonts loaded at 1280 px and 400 px.
