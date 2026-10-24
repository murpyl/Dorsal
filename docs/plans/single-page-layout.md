# Single-page layout

Request: every screen fits in one viewport; use tabs only for what cannot fit.

- **Instructor** (`RadarDashboard`, `lg:h-dvh`, no page scroll): compact header (brand, title, join code, close) → push-prompt form + a 5-up stat strip on one row → main grid: left = concept graph (fills the remaining height) with the per-concept distribution (`#per-concept`, text alternative) as a short scroll strip under it; right = tabbed panel (Concept details · Questions & clusters · Rooms · Before/after · TAs, instructor only). Clicking a graph node switches the panel to Concept. Each panel scrolls internally. Below `lg` the page stacks and scrolls normally.
- **Student** (`StudentCockpit`, `h-dvh`): header + current-prompt card stay fixed; secondary actions move into tabs (Ask · Class Q&A · Help rooms + helper opt-in · Covered (n)), each scrolling inside the remaining height.
- **Peer room** (`PeerRoom`, `md:h-dvh`): left column = members + rating card; right = chat filling the height with the composer pinned; messages scroll internally.

No Convex, schema or copy changes; aria labels and the `#per-concept` text alternative are kept.
