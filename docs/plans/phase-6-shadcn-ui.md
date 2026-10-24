# Phase 6: shadcn/ui + design polish

Scope: visual and interaction polish only. No Convex function, schema, copy (disclosures) or behaviour changes; every `useQuery`/`useMutation` call, `aria-*` contract and test stays as is.

## Plan (one commit)

1. **shadcn/ui on Base UI.** `npx shadcn init -d` (preset `base-nova`, neutral palette, CSS variables, lucide icons). Components added under `components/ui/`: button, card, input, textarea, badge, checkbox, label, select, alert, skeleton, alert-dialog, toggle, toggle-group, separator. `lib/ui.ts` (hand-rolled class strings) is removed; `Button` variants replace it.
2. **Design tokens.** Neutral primary (near-black) instead of indigo; red / amber / emerald stay reserved for the three understanding levels so colour always means data. `--font-sans` points at Geist again. Page background `bg-muted/40` so white cards read as surfaces.
3. **Motion (per the design-engineering skill).** Pressable things scale to 0.97 on `:active` (160 ms ease-out); transitions name their properties (no `transition: all`); nothing animates longer than 250 ms; list entries stagger 30–40 ms via `@starting-style`/`animate-in`; chat bubbles fade/slide 4 px on arrival; `prefers-reduced-motion` drops the movement and keeps opacity.
4. **Screens.**
   - Home: centred brand, two cards (join / start) with proper labels, large monospace code input.
   - Student cockpit: sticky header with alias + code badge, concept cards with a highlighted "current topic" card, `ToggleGroup` confidence selector, `Select` for the question topic, `Checkbox` grid for helper opt-in, rooms as list rows with `Button` variants.
   - Instructor dashboard: header with code as a copyable badge, phase `ToggleGroup`, `AlertDialog` instead of `confirm()` for closing the session; metric cards; graph card; detail aside; cluster queue cards; distribution rows; pre/post bars.
   - Peer room: members aside, chat card with scroll area, composer, check-in card.
   - Loading: `Skeleton` layouts instead of "Loading…" text; errors in `Alert variant="destructive"`.

## Acceptance

`npm run lint && npx tsc --noEmit && npm run build && npm test` pass; every screen still exposes the same roles/labels (`aria-pressed` on level buttons, `role="status"` banner, `#per-concept` text alternative); usable at 400 px (student) and full width (instructor).
