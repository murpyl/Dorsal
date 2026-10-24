# Roomier spacing

Request: the UI feels cramped; add whitespace, padding and gaps across screens without changing copy, colours, branding or behaviour.

One step up on the existing Tailwind scale, applied the same way everywhere:

- **Shared primitives**: `Card` spacing 5 → 6 (`sm` 3 → 4), header gap 1 → 1.5, `CardDescription` gets `leading-relaxed`; `Tabs` gap 2 → 3; `ConfidenceSelector` gap 2 → 3; `Brand` gap 2 → 2.5.
- **Page shells**: student / peer room `p-3 sm:p-4 gap-3` → `p-4 sm:p-6 gap-5`; instructor `px-3 py-3 md:px-5 gap-3` → `p-4 md:p-6 gap-5` (inner grids gap 3 → 5, stat strip gap 2 → 3, stat tiles `px-4 py-3`, tab panel `p-3`); landing `gap-12 px-6 py-16`, card grid gap 6; lesson setup `space-y-8 py-10`, sections `p-6`; skeleton / TA / error screens padded to match.
- **Lists and rows** (rooms, clusters, published Q&A, TAs, helper topics, before/after): `CardContent` `space-y-3` → `space-y-4`, list `space-y-2` → `space-y-3`, row padding `p-3` → `p-4`.

The single-viewport layouts (`h-dvh` / `lg:h-dvh`) are kept; panels still scroll internally.
