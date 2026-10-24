# Layout concept: Projector Mode

Scope: layout only. Mockup routes under `app/mock/projector/*` with fixture data (`fixtures.ts`, one CS 61A recursion lecture frozen at minute 28). No Convex, schema or live-component changes. Same Blåhaj tokens and `components/ui/*` primitives as the live screens; flat, no shadows.

Hypothesis under test: the instructor dashboard is often mirrored on the lecture-hall projector, so design it as a *presentation surface* and move anything sensitive behind an explicit, closed-by-default "instructor only" drawer. Student becomes a bottom-tab phone app with the current topic pinned.

## What the analysis changed in the hypothesis

1. **The projector is a one-way channel, so the split is "safe for the class" vs "instructor only", not "important vs secondary".** Aggregate colour, N per node and published cluster titles are *meant* to be seen by the class (the home page promises "see where the class is stuck, live"). Raw question text, Claude's unreviewed suggestions, hide/discard controls and the before/after table are not. That is the only axis the drawer uses. Session controls and the phase switch are harmless on screen, so the phase toggle stays in the metric strip (it is a lecture-flow action the instructor uses while rooms are running); only *Close session* is in the drawer, behind a confirm.
2. **"Oversized nodes" cannot be the existing `ConceptGraph` scaled up.** The live node shows label, N and a three-way breakdown tooltip at 192 px wide; at projector distance the fill colour and the label are the only things that read. `ProjectorGraph` (mock-only) reuses `scoreColors`, `understandingScore` and `LOW_SAMPLE` from `ConceptGraph` but renders 256 px nodes with a 24 px Fredoka label, N as the only number, a 2 px accent bar, and a "NOW" tag plus 8 px halo on the current topic. The level breakdown moves to the detail rail and the per-concept text cards, where it belongs.
3. **The detail rail must never be empty on a projector.** The live dashboard shows "Click a concept…" until the instructor clicks. In Projector Mode the rail defaults to the *current topic* and only changes when a node, a text-alternative card, or the "NOW" chip in the top bar is activated. Empty states are wasted projector pixels.
4. **Low samples are a privacy risk on a shared screen.** With N = 3 a "confused" node is a near-identification. The projector node keeps N (spec requirement) but drops the breakdown; the dashed border and "low sample" label already soften the colour. The breakdown is still one click away in the rail.
5. **The student's current topic cannot live only inside the Topics tab.** The binding rule is "obvious at a glance" — including while a student is on *Ask* or *Help*. So a slim "Now in lecture · Call stack" strip sits under the header on every tab (tapping it returns to Topics), and the Topics tab additionally pins the full card with the big confidence buttons. On Topics the two are deliberately redundant: the strip is the global anchor, the card is the input.
6. **"Help" was ambiguous (get help vs give help).** Kept the label — three one-word tabs are the right width at 390 px — but the tab holds *both* sides of PeerMesh in a fixed order: rooms you can join first (most students are learners), then the helper opt-in with its disclosure, then "open a room as helper" which only appears once something is ticked.
7. **QR is a placeholder.** `PseudoQr` draws a deterministic QR-looking grid from the code so the layout can be judged; a build would generate a real code for `/join/<code>` (one small dependency or a server-rendered SVG). Not hidden in the mock: the SVG's accessible name says what it is.

## Instructor · 1440 px, mirrored

Hierarchy (top → bottom):

1. **Top bar, sticky.** Left: wordmark + lecture title. Centre: the **NOW chip** (pulsing dot, 24 px topic name). Right: QR + "Join at classpulse.app/join" + the six-letter code at 60 px mono, copy-link button. This bar is the whole screen for a student walking in late.
2. **Metric strip**, one row, no cards: Joined · Responses (this phase) · Confused as a % (big, pink when > 25 %) with the raw fraction underneath · Published clusters · Help rooms open · phase toggle right-aligned. The live dashboard's four metric cards were taller than the information they carried.
3. **Hero: graph + detail rail** (`1fr 20rem`). The graph fills the row; legend and "Text version below" link sit in the figcaption. The rail shows the focused concept: distribution bar at 16 px, counts, low-sample note, then the two actions — **Make current topic** (primary, full width; replaced by "students see this pinned" when it already is current) and **Open help room for this concept** — then published cluster titles/summaries only, with a note that question text is in the drawer.
4. **Per-concept distribution** (text alternative, required) as clickable cards that focus the rail, next to **Help rooms (live)** with an open-room form, member fill bar and *Close room*.
5. **Instructor-only drawer**, fixed to the bottom edge, closed by default. The handle is a persistent status line — "6 pending questions · 2 suggested clusters to review" — with a pulsing pink dot when the queue is non-empty, so new questions announce themselves without ever showing their text. Open, it inverts to dark ("Instructor only — not for the projector. Press Esc to hide."), dims the page, and offers four tabs: *Question queue* (primary action **Suggest clusters (n pending)**, manual grouping, hide), *Clusters* (suggested → Publish / Edit / Discard; published → Open help room / Unpublish), *Before vs after* (pre/post bars per concept with their own N), *Session* (phase, Close session with confirm). Esc or the backdrop closes it.

Primary action: *Make current topic* on the rail (the action taken most often during a lecture). Second: *Suggest clusters* inside the drawer.

State changes announce themselves through one channel — a single pill toast under the top bar, mirrored to an `aria-live` region: topic changed (the NOW chip and the node halo move at the same time), cluster published (the node's amber "n clusters" badge increments, the rail's list updates), room opened (appears in the live list), phase switched. The drawer handle count is the only passive indicator.

Keyboard: every node is a focusable `role=button` with a full-sentence label; drawer tabs, Esc, confirm dialog and toggles are the Base UI primitives already in use.

## Student · 390 px, one hand

1. **Header** (sticky): wordmark, alias, code. Under it the **Now strip** on every tab.
2. **Announcement banner** (dismissible, `aria-live`): "Your instructor published …" with a *See it* link that switches tab. The *Ask* tab shows a pink "new" badge until visited; *Help* shows the open-room count.
3. **Topics tab**: pinned current-topic card (ring, 24 px title, description, `ConfidenceSelector`, "only you see your answer"), then "Earlier & upcoming" with a *2 of 6 answered* counter and compact cards for the other concepts. Primary action: a level button on the pinned card — the first interactive element under the fold line, 56 px tall.
4. **Ask tab**: composer first (topic select defaults to the current topic, 500-char counter, *Send anonymously*, the privacy disclosure directly under the button, unchanged copy), then **What the class is asking** — published clusters with concept chips, question count, helpers opted in and the room row with Join / Open. Students never see counts beyond those already in the live `clusters.listPublished` response.
5. **Help tab**: rooms (your room highlighted with "you're in", full-width Open/Join button), then **Volunteer as a peer helper** with the disclosure sentence and 48 px tappable rows, then "Open a help room as a helper for …".
6. **Bottom tab bar**, 64 px, `role=tablist` with arrow-key navigation, safe-area padding; content has `pb-28` so nothing hides behind it.

What moved: the live cockpit is one long scroll (concepts → composer → clusters → opt-in → rooms). On a phone that puts rooms ~2,500 px down. Tabs make each destination one tap away and keep the thing students do most (signal on the current topic) at the top of the default tab.

## Peer room · 1024 px, also phones

1. **Header**: back button, "Help room · Call stack · for ‘…’", title. On < md the member list collapses to a "5 / 6" toggle button.
2. **Grid** `15rem 1fr`: member rail (aliases, role badges, you, helper disclaimer, concept description, Leave / Close) and the chat card.
3. **Check-in docked above the chat**, not below it. Tinted accent band: "How is Call stack going now?" + the two buttons + the phase it records under. After answering it collapses to a one-line "I understand now recorded … · Change" so it stops competing with the conversation but stays reachable. In the live screen this prompt is below a 24 rem chat and off-screen on phones.
4. **Chat** is the flex-grow hero; the screen is `h-dvh` so the composer is always at the bottom, 44 px input, autofocus. Helper messages carry a small "helper" tag so learners can tell who volunteered.

Primary action: the composer. Secondary: the check-in. Leave/Close are deliberately quiet (outline/destructive-tint) in the rail.

## Trade-offs vs. the current layout

- **Everything the instructor needs for moderation is behind one extra click**, and while the drawer is open the graph is dimmed. On an extended desktop (not mirrored) this is pure friction; the live single-scroll dashboard is faster there. A per-session "presenting" toggle that keeps the drawer docked open as a side panel would fix it, but is more state than this mock carries.
- **The projector surface shows aggregate confusion to the whole class.** The spec allows it and the home page promises it, but some instructors will not want a 31 % "Confused" figure on the wall. The metric strip would need a per-metric hide, or the strip itself could move into the drawer.
- **Students lose the single-scroll overview.** With tabs, a student on *Topics* does not see that two rooms are open unless they notice the badge; the banner and the badges carry that weight and are easy to miss while listening.
- **Oversized nodes cap the graph.** Six nodes fit comfortably at 1440 px; ten would need either smaller nodes (undoing the point) or panning, which is hostile on a projector. The live graph scales further.
- **Check-in-above-chat nudges harder.** Docking the prompt at the top of the room makes it unmissable, which is the goal, but it also pressures a learner to answer before they are ready. The "Change" affordance after answering is meant to lower the stakes.
- The QR is a stand-in and the drawer has no focus trap in the mock; both are implementation details, not layout decisions.
