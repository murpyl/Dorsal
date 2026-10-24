# Live single-topic student view + ASCII ocean backgrounds

Requested by angela_wu on top of the Blåhaj theme (PR #20).

## Student page is live-only
- `components/StudentCockpit.tsx` no longer renders a card per concept. It shows only the concept the
  instructor has set as `activeConceptId`, with the three-level `ConfidenceSelector`, and swaps in real
  time as the instructor moves on (the Convex `getStudentView` query is already reactive, no backend change).
- When no concept is active the page shows a "Waiting for the instructor to start a topic…" state.
- The question box, published clusters, helper opt-in and rooms are unchanged below it.

## ASCII ocean backgrounds
- `components/AsciiOcean.tsx` (client) draws an animated ASCII scene into a fixed, `aria-hidden` `<pre>`
  behind the page at 8 fps; static single frame under `prefers-reduced-motion`.
- Five scenes, each with its own ocean shade: Swell (Blåhaj blue waves), Bubbles (aqua), Kelp forest
  (sea-green), Shoal (steel-blue fish), Abyss (indigo jellyfish + plankton). A small radiogroup switcher
  (bottom-right, persisted in `localStorage`) lets us compare them; "Off" disables the layer.
- Mounted once in `app/layout.tsx`.
