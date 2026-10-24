# Layout concept: Timeline

Mockup routes: `/mock/timeline` (index), `/mock/timeline/student`, `/mock/timeline/instructor`, `/mock/timeline/room`.
Fixture data lives in `app/mock/timeline/fixtures.ts` (CS 61A Lecture 8: Recursion, 36 students). Nothing talks to Convex; every control is local `useState`.

## The idea in one paragraph

A lecture is linear in time, so the student screen is a feed of what happened during it — topic changes, your own answers and questions, published clusters, rooms opening — with the *current* topic pinned above the feed and a composer pinned below it. The instructor's job, by contrast, is a pipeline, not a feed: raw questions turn into suggested clusters, suggestions get published, published clusters get rooms. So the instructor screen is that pipeline laid out left to right, with the graph as a collapsible overview above it. The peer room is a smaller timeline of its own (a chat), and the after-help check-in is injected into it as an event instead of living in a separate panel.

## Student (390px, one hand, while listening)

**Hierarchy**

1. Sticky header: Brand, join code, alias with answer progress (`4/6`, taps open the "all concepts" sheet).
2. **Pinned now-card** — the one thing the hypothesis requires to be obvious at a glance. Label `NOW · 4 OF 6`, topic title in Fredoka, the one-line description, and the three-level `ConfidenceSelector` at full width. Switching to `Can explain it` reveals the helper opt-in checkbox with its privacy line right there. A six-segment progress strip underneath shows where this topic sits in the lecture and the colour of each answer you gave.
3. The feed: oldest at top, newest at bottom. Row types are visually distinct by marker colour and icon: session joined, topic (grey), *you asked* (dark bubble, with where it went: "Grouped into … (published 10:46)"), *the class is asking* (amber, a published cluster), *help room opened* (teal, with a Join / Open button). A **"New since 10:45"** divider separates what you have seen from what you have not, and new items carry a `NEW` badge.
4. Sticky composer: "Ask about Tree recursion…", with the privacy disclosure directly beneath it.

**Primary action:** answering the pinned topic. It is the largest control on the screen and never scrolls away. Second: the composer (always visible, 44px high, full width). Third: Join/Open on a room event.

**Always visible vs one tap away:** the current topic, your current answer, the composer, and the privacy text are always visible. Earlier topics are a scroll away in the feed; "all six concepts at once" (with helper opt-ins for every concept) is one tap away in a bottom sheet (`components/ui/sheet.tsx`, added for this). Changing an earlier answer is a `Change` button on that topic's row, which swaps the pinned card to that topic with a "Back to Tree recursion" affordance so you never lose the present.

**What moved and why.** The live cockpit shows all six concepts as equal cards with the active one highlighted; the question composer and helper opt-in are separate sections below, and published clusters sit at the bottom. In a lecture the student almost always acts on the current topic, so that card gets the top and the rest becomes history. The composer moved to the bottom because that is where a thumb is, and because "ask about *this* topic" is the common case; the concept picker is one tap away inside the composer rather than a visible select. Published clusters and rooms became feed events because they arrive at a moment in time and the moment matters ("the class is asking X *now*").

**State changes announce themselves** three ways: a `NEW` badge on the row, the `New since …` divider, and a floating "2 new since you last looked" pill above the composer that scrolls to and clears the divider. Topic changes are events in the feed ("Moved on to Tree recursion — pinned above") *and* swap the pinned card, so the change is visible whether you are looking at the top or the bottom.

**Binding rules.** Students see only their own answers and published clusters: cluster rows show "3 questions · 4 helpers opted in" (which the live `PublishedClusters` already shows) and never a count of confused students. Privacy text sits under the composer and beside the helper checkbox. Everything is a real `<button>`, checkbox, or textarea; the sheet traps focus.

## Instructor (1440px, laptop or projector)

**Hierarchy**

1. One-line header: title, five metrics (joined, responses, confused, published, rooms), phase toggle, projector mode, close session, and the join code — large, mono, with a copy button.
2. **Overview**: "Now teaching · Tree recursion", the `ConceptGraph` (reused as-is, constrained to 18rem so it reads as an overview, collapsible), and to its right a per-concept rail that is the graph's text alternative: distribution bar, N with low-sample flag, the three counts, and a **Make current** button per concept. Selecting a rail item selects the graph node and vice versa.
3. **The pipeline**: four columns, Pending → Suggested → Published → Rooms. Each card's actions move it one column right (`Publish →`, `Open help room →`); back-moves are secondary (`Discard`, `Unpublish`, `Close room`). Columns the students can see are tinted teal and badged "students see this".
4. Before vs after peer help, reusing `DistributionBar`/`Legend` from `PrePostComparison`, with the honest "what students say, not measured learning" caption.

**Primary action:** depends on the moment, which is why the columns each carry their own: *Suggest clusters with Claude (5)* at the top of Pending, *Publish* on suggestions, *Open help room* on published clusters, and *Make current* on the rail. The phase toggle is deliberately in the header, not inside Rooms — but Rooms shows a nudge ("Rooms are running. Switch signals to After help…") because that is when it matters.

**Projector mode** hides Pending and Suggested (raw text and unreviewed AI output), enlarges the join code, and makes the remaining two columns read-only.

**What moved and why.** The live dashboard stacks graph → metrics → queue → clusters → rooms vertically, so the question lifecycle is spread over two screen heights. Laying the lifecycle out horizontally makes the flow and the bottlenecks (five raw questions, two suggestions waiting) visible at once and keeps the "students see this" boundary a vertical line rather than something you have to remember. Manual grouping is checkbox-select in Pending followed by an inline form — the same mental model as clustering, without drag and drop.

**Where the hypothesis was wrong.** A truly "slim" graph strip is not useful: nodes need their labels and N to be readable on a projector. The graph is kept at a reduced height and made collapsible instead, and the rail carries the per-concept detail so collapsing the graph loses nothing. Also, "drag-like affordances" in the brief would have implied cards can move anywhere; in reality moves are one-directional with a few back-moves, so each card has one forward button and the rest are ghost buttons.

## Peer room (1024px laptop; also stacks on phone)

**Hierarchy:** header (back, room title, 5/6 · helpers · opened, seats left, Leave room) → left rail (what this room is about with the cluster summary and the original questions behind a disclosure; the check-in card; members as role-coloured pills) → chat.

**Primary action:** chatting; the composer is the only element on the bottom edge. The **check-in** is the second action and it is placed twice on purpose: as a card in the rail (always visible on laptop) and as an *event inside the chat* at 10:52 ("You have been here a few minutes. How is Base case going now?") so phone users who only see the chat still meet it. Leaving without a check-in opens a dialog offering to check in first; after a check-in, Leave is a single tap.

**Why the check-in became an event:** in the live room it is a static panel competing with the chat. In a timeline layout it belongs to the moment it is asked, and the answered state collapses into a one-line system message so the chat stays clean.

## Responsive behaviour

- Student at 390px: everything is one column; the now-card is ~230px tall so a 10:41 event is visible without scrolling on an 844px phone. The composer, pill and privacy line are in the sticky footer.
- Instructor at 1440px: graph + rail side by side, four columns in one row. Below 1280px the columns wrap 2×2 and the rail drops under the graph in a 3-column grid; projector mode keeps two columns.
- Room at 1024px: 18rem rail + chat. Below 1024px the rail stacks above the chat and both scroll with the page.

## Trade-offs vs the current layout (honest)

- **Students lose the all-concepts overview as the default view.** The six-segment strip and the sheet compensate, but a student who wants to answer all six quickly at the start of lecture now needs the sheet or six `Change` taps. The live cockpit is better for the "fill in everything" moment; the timeline is better for the 50 minutes after it.
- **Feed length grows with the lecture.** With 6 topics, a few questions and a few clusters it is fine; a 90-minute lecture with 12 topics and 8 published clusters would push early context far up. The "new since" pill helps, but we would probably need per-topic collapsing.
- **The instructor kanban is wide.** At 1280px the columns get narrow enough that long questions wrap into tall cards; below that it is a 2×2 grid and the left-to-right story weakens. The live stacked layout degrades more gracefully on a small laptop.
- **Two check-in placements** could feel like nagging if both show at once on a laptop. The chat event only appears until it is answered, and the rail card collapses into a one-liner once it is, but this needs testing with real students.
- **Timeline events depend on timestamps being meaningful.** The live schema has `createdAt` on questions, clusters and rooms, but not a per-student "seen until" marker; implementing the divider for real needs a small addition to `participants`.
