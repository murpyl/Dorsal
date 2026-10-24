# Theme: Swiss Modern

Scope: visual tokens only, on top of Phase 6. No Convex, copy, routing, aria or component-logic changes.

## Direction

International Typographic Style. Pure white page, black type, 1px grey rules instead of shadows or tinted surfaces, generous whitespace, 4px radius everywhere. One colour carries action: signal red `#e30613` for primary buttons and a fixed 4px rule at the top of every page. Secondary actions are black; outline buttons are 1px black and invert on hover. Bauhaus yellow and blue appear only in small doses (secondary badges, focus ring, charts).

This revises the Phase 6 assumption of a neutral primary: red is now the action colour, so the understanding levels move to flatter inks (`red-600` / `yellow-400` / `green-600`) and the concept-graph score gradient (`scoreColors`) and its legend are derived from the same red → yellow → green interpolation so colour still means data.

## Changes

1. `app/globals.css`: `:root` / `.dark` tokens (primary red, secondary black, grey rules, blue ring, `--swiss-yellow` / `--swiss-blue`), `--radius: 4px` with every step pinned, enlarged tight-tracked heading scale, white body, top rule, uppercase overline badges.
2. `app/layout.tsx`: Archivo (headings, wordmark) + Inter (body) via `next/font/google`; Geist Mono kept for codes.
3. `components/ui/*`: card = 1px border + 2px black top rule; button outline inverts; badge secondary = yellow; popups use borders, not shadows; squared skeleton.
4. `components/Brand.tsx`, `lib/levels.ts`, `components/ConceptGraph.tsx` as described above.

## Acceptance

`npm run lint && npx tsc --noEmit && npm test && npm run build` pass; `/` reads correctly at 1280px and 400px; AA contrast for body and large text.
