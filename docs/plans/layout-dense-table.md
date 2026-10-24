# Layout concept: Dense Table

Clickable mockup at `/mock/dense-table` (index → `/student`, `/instructor`, `/room`). Fixture data in `app/mock/dense-table/fixtures.ts`: one CS 61A recursion lecture, 6 concepts with prerequisite edges, N 19–34 per concept, 11 questions (3 pending, 8 clustered), 2 suggested + 2 published clusters, 2 rooms (one at 5/6), 6 chat messages. No live component or Convex code is touched.

## The hypothesis, and where the analysis changed it

> Instructors are experts; density beats whitespace. Instructor as a data table; graph as an optional toggle. Questions & clusters as a second table with inline expand rows. Keyboard-first with visible shortcuts. Student: a compact list with an inline segmented control per concept so all concepts fit on a 390 px phone; ask/help as accordions.

Kept: everything above. Changed, with reasons:

1. **Graph off by default, but table rows carry the graph's colour.** With the graph hidden the instructor loses the only "where does confusion sit in the prerequisite chain" view. The concept table is therefore ordered in prerequisite order and every row has a 1.5 px colour bar driven by `scoreColors(understandingScore())` — the same scale as the graph — so a glance down the left edge reads like the graph's colour, and the per-concept counts are always visible (spec: the text alternative must remain). `G` shows the real `ConceptGraph` above the table; selecting a node selects the row.
2. **A right rail, not a pure table.** A table answers "which row?" but not "what now?". A sticky rail shows the selected concept's pre vs post distributions with percentages, the two primary actions at full size (`Make current`, `Open room`), published clusters on that concept, and a live activity log. This is the "detail pane" the pure-table hypothesis lacked; without it every row needs its own action buttons at a size that is hard to hit on a projector.
3. **Raw questions are their own sub-table, not interleaved with clusters.** Pending questions are instructor-only and must never be projected (students see only published clusters). Mixing them into the cluster table made the table read as one list of publishable things. They sit below in a separate "Pending questions · raw text · never projected" block with checkboxes for manual grouping, and **Projector mode (`P`)** hides both that block and the cluster table entirely, enlarges the concept table and join code, and strips the action column — a single toggle makes the screen safe to mirror.
4. **Student rows are not uniform.** A list of six identical 36 px segmented controls hides the current topic. The current-topic row is taller, tinted, has a live pill and a 48 px control; a blue `NOW · Call stack` band is pinned under the header so the topic is visible even while the ask/help accordions are open. Everything still fits above the fold at 390 × 844 (header + banner + six rows ≈ 700 px).
5. **Short labels on the segmented control.** "Partly get it / Can explain it" do not fit three-up in 358 px. Labels are `Confused / Partly / Can explain`; full labels stay in `aria-label` and in the row's "your answer" readout.

## Student (390 px, one hand, while listening)

Hierarchy, top to bottom:

1. Sticky header: brand, alias, join code; a pinned **NOW · <topic>** band (primary colour) with "4/6 answered".
2. One-line status notice (new published cluster / topic change / room opened) with **View** that opens the relevant accordion and scrolls to it. Dismissable.
3. **Concept list** – the primary surface. One row per concept in lecture order: label, your current answer, inline 3-way segmented control. Current topic row: tinted, taller, description shown, 48 px targets. Footer: "Only you see your answers…".
4. Accordions: **Ask a question** (open by default), **What the class is asking** (published clusters with Join/Open per room; open by default when a cluster is new), **Help rooms**, **I can help with…** (checkbox grid).

Primary action: tapping a level on the current topic — the biggest control on the page, in the only tinted row. Secondary: ask (open accordion with topic preselected to the current topic). Students never see counts; the only numbers are their own progress (4/6), room occupancy (5/6, needed to know whether you can join) and helper opt-ins on published clusters (spec allows this for published clusters).

Privacy: the full pseudonymity + Claude disclosure sits directly under the composer's send button; the helper disclosure sits under the checkbox grid. Both are inside their section, so they are visible whenever the control is.

State changes: new published cluster → notice bar + count badge turns primary on the "What the class is asking" trigger; topic change → the NOW band and the tinted row move; room opened → appears in the published cluster card and in Help rooms (badge count).

Degradation: at 390 px nothing is horizontal except the 3-up control; below 360 px the alias hides. Accordions are the overflow strategy: rows never shrink.

## Instructor (1440 px laptop, sometimes projected)

Hierarchy:

1. Sticky header: title, phase; five inline metrics (participants, responses, confused, published, rooms); phase toggle (`1`/`2`), Graph (`G`), Projector (`P`), `?` shortcuts, Close session (confirm dialog); big join code with copy.
2. **Concept table** (primary): colour bar, label + description, N (amber + dashed bar when N < 5), stacked distribution, counts `confused · partly · can`, open-cluster badge, `Make current` / `Open room` per row. Current row tinted and badged; selected row (`J`/`K`, click, or focus) shows its shortcut keys inline on the buttons.
3. **Questions & clusters table**: status, title + summary, concepts, Qs, helpers, model confidence, actions (Publish / Edit / Discard; Open room / Edit / Unpublish). Expanding a row (chevron or title) shows the original questions with aliases and the rooms for that cluster; Edit turns the expansion into an inline form (title, summary, concept chips). "Suggest clusters" (`S`) sits above with last-run metadata and a running state.
4. **Pending questions** sub-table (raw, instructor-only) with checkboxes for manual grouping and Hide.
5. **Help rooms table**: room, concept, source cluster, members (with "1 seat"/"full" badge), helpers, opened, Close.
6. Right rail (sticky): selected concept detail, both phases with percentages, full-size primary actions, published clusters on that concept, activity log (`aria-live`).

Primary action: `Make current` on the selected concept (rail, large) — then `Publish` for suggested clusters. Keyboard: every shortcut is printed on the control it triggers (`Kbd`), `?` lists them, rows are `tabIndex=0` and focus-selects. Shortcuts are ignored while typing in inputs.

State changes: every action appends to the activity log; Publish moves the row from the amber "suggested" band to the teal "published" band and bumps the header metric; Open room adds a row to the rooms table and to the expanded cluster.

Projector mode: 17 px base text, 4 px distribution bars, join code 30 px, no descriptions, no action column, no questions/clusters/rooms/rail — only aggregate, student-safe data. At 1440 px the main column is ~1030 px and the rail 352 px; below 1280 px the rail stacks under the tables.

## Peer room (1024 px, phone or laptop)

Hierarchy: header (room title, concept, source cluster, 5/6, phase badge, Leave) → **chat** (left, 2/3) → rail with **check-in** first, then members with roles, then concept description. System lines (opened, joined, phase switched) are rendered as hairline dividers inside the chat so the room's history reads in one column. Helper aliases carry a `helper` tag on their bubbles.

Primary action: in a room the thing you do most is type, so the composer is full-width with `↵ send`. The check-in ("How is Call stack going now?") is the second action and is the first thing in the rail, tinted, with two large buttons (`I understand now` / `Still confused`) that show pressed state and confirm what phase was recorded. Close room is intentionally not a student control; the instructor closes rooms from the rooms table.

Below ~768 px the rail stacks under the chat and the check-in buttons go two-up.

## Trade-offs vs. the current layout

- **Instructor density is real but costs legibility at distance.** 14 px table rows are great on a laptop and poor on a projector; Projector mode exists precisely because the plain table fails that case. An instructor who forgets to toggle it will project raw questions.
- **Graph demoted.** Prerequisite structure is now implied by row order and colour, not drawn. For lectures where the graph is a DAG rather than a chain this loses information; the toggle is one key away but it is still a mode.
- **Student rows are small.** 36 px segments are at the low end of one-handed targets while walking a lecture; we only give the current topic 48 px. If students mostly answer about the current topic this is right; if instructors expect all six answered early, the smaller rows will see mis-taps.
- **Two tables, more chrome.** Clusters and pending questions are separated for safety and clarity; it costs vertical space and the "Group selected" manual path is a second mental model next to Claude's suggestions.
- **Shortcuts are an expert feature.** Visible `Kbd` chips help discovery but add visual noise to every button; a first-time instructor sees more glyphs than a plain layout.
- **Not tested with real data**: the mock uses fixtures and local state; no Convex reactivity or latency is represented, and the "Claude is grouping…" state is a timer.
