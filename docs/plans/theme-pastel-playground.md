# Theme: Pastel Playground

Scope: tokens, fonts and shadcn/ui component chrome only. No Convex, schema, copy, routing, aria or component-logic changes.

- Palette (`app/globals.css`): cream page background with peach / mint / lavender / butter radial blobs pinned to the corners; white cards; charcoal text; saturated coral primary with a deep-coral text colour (5.3:1) instead of white (which would fail AA on coral). Secondary = mint, muted = lavender, accent = butter. Extra pastel tokens (`--peach`, `--mint`, `--lavender`, `--butter` + `-foreground`) are exposed as Tailwind colours.
- Shape: `--radius: 1rem` so `rounded-lg` is already 16px; cards/alerts/dialogs are `rounded-2xl` with 2px borders; buttons, inputs, badges, toggles and select triggers are pills.
- Chrome: 2px borders in a darker tint of the surface (via `currentColor/25` or the `*-foreground` token) and a flat 3–4px "sticker" shadow under cards and filled buttons that collapses on press (press feedback also nudges 2px down). Reduced motion still disables the transform.
- Type: Nunito (body, 500 default weight) + Quicksand (headings, `h1–h3` and `CardTitle`) via `next/font/google`; Geist Mono stays for the session code.
- Levels (`lib/levels.ts`, `scoreColors`): pastel fills with darker borders/text — rose → amber → emerald — so meaning and ordering are unchanged; graph nodes interpolate hue 20 → 155 in oklch.
