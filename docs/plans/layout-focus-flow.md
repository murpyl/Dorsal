# Layout concept: Focus Flow

Mockup routes: `/mock/focus-flow` (index), `/mock/focus-flow/student`, `/mock/focus-flow/instructor`, `/mock/focus-flow/room`.
Fixture data in `app/mock/focus-flow/fixtures.ts` (one CS 61A recursion lecture, frozen at 10:46). No live component or Convex code changes.

## Hypothesis

Students are in a lecture, phone in one hand, half-listening. The main loop is "tap how you feel about the thing being taught right now", so the
screen shows **one concept at a time** with three thumb-sized answers pinned to the bottom. The instructor is teaching, not operating software, so the
dashboard is a **two-column teach view** (graph left, live feed right) that never needs to scroll.

The hypothesis held up for the main loop on both screens. Three things in it were wrong or incomplete and were changed; they are called out below.

## Student (`/mock/focus-flow/student`, 390 px)

**Hierarchy, top to bottom**

1. Compact header: wordmark, alias, join code. One line. The code stays because students re-share it with neighbours.
2. **Concept chip rail** (horizontal, scrollable, `role=tablist`, arrow keys move). Each chip carries only the student's *own* answer as a coloured dot
   (hollow = not answered); the current topic carries a pulsing dot and the word "now". No counts of any kind appear on this screen.
3. Announcement strip (`aria-live=polite`) for state changes that arrive from the instructor: a published cluster, an opened room, a topic change.
   Each announcement is a sentence plus a "View" that moves the pager to the affected concept, and a dismiss.
4. **Focus card**: "Current topic" badge (or the "Back to current topic: Call stack" pill when the student has swiped away), concept title in display
   size, one-sentence description, the student's own answer state in words, then "What the class is asking about <concept>" — published clusters that
   touch this concept, each with its help rooms and a Join / Open / Full control. The card swipes left/right (touch) and follows the chip rail.
5. Floating pill button **"Ask · help"** anchored above the dock. Opens a bottom sheet with two tabs: *Ask a question* (topic select defaulting to the
   concept on screen, textarea, "Send anonymously", the full pseudonymity + Claude disclosure directly under the button) and *Help others* (the helper
   opt-in checklist with its "your own call, nobody is enrolled automatically" disclosure at the top).
6. **Bottom dock** (sticky): the question "How well do you follow <concept> right now?" and the three level buttons from the real `ConfidenceSelector`,
   enlarged to 68 px tall. This is the primary action: largest targets, bottom third of the screen, always visible, one tap.

**What moved and why.** The live `StudentCockpit` stacks six concept cards, a composer, published clusters, helper opt-in and the room list in one long
scroll; the current topic is only the first card. Here the current topic *is* the screen, and everything else is either one swipe (other concepts) or
one tap (ask/help) away. Published clusters and rooms are filed under the concept they belong to instead of a global list, so a student looking at
"Base case" sees the two groups and the room about base cases, and a student on "Call stack" sees honestly that nothing is published yet.

**Fixes to the hypothesis.**
- A bare "+" FAB was wrong: nobody would guess it hides *both* asking and volunteering. It became a labelled pill ("Ask · help") and the sheet is
  tabbed so the second function is discoverable the moment the sheet opens. Volunteering is a once-per-lecture action, so a second tap is acceptable.
- A pager alone breaks the "current topic obvious at a glance" rule as soon as the student swipes away. Two cues fix it: the pulsing "now" chip in the
  rail is always in view, and the focus card swaps its "Current topic" badge for a dark "Back to current topic" pill that returns in one tap.
- The hypothesis said nothing about where published clusters and rooms live. They are per-concept context inside the focus card (see above);
  an announcement strip makes new ones noticeable even when they belong to a concept that is not on screen.

**Interaction notes.** Tapping a level is instant and local (optimistic in the live app); the "Your answer: …" line updates and the chip dot
re-colours, which is the only confirmation needed. Swipe threshold 60 px so scrolling the card does not change concept. The sheet is a real Base UI
`Dialog` (focus trapped, Escape closes, backdrop click closes); tabs are Base UI `Tabs` with arrow-key navigation. All targets ≥ 44 px.

**Degradation.** At 390 px everything above is one column; at ≥ 640 px the layout stays a phone-width column centred on the page (max-w-md) and the
FAB tracks that column, because the student experience is phone-first and widening it would only stretch the buttons.

## Instructor (`/mock/focus-flow/instructor`, 1440 px, projector-aware)

**Hierarchy.** Header (title + phase · four compact metrics with denominators · join code · phase toggle · close session · **Present**). Below it a
fixed two-column body sized to the viewport (`h-dvh`, no page scroll):

- **Left, "teach view".** A segmented control switches *Live graph* ↔ *Before vs after*. The graph is the real `ConceptGraph` stretched to fill
  the remaining height. Under it, the **per-concept distribution** (the text alternative the spec requires) is a six-row table: label, "now" badge,
  published-cluster count, stacked `DistributionBar`, the three counts, N with a low-sample flag, and two row actions — *Make current* and *Room*.
  Clicking a node or a row selects the concept in both; when the selection is not the current topic a "Make “X” current" button appears next to the
  current-topic badge. Picking the topic is therefore one click from the graph or the table, never from a side panel.
- **Right, live feed** (27 rem). Sticky top: *Suggest clusters (n pending)* with Claude's last-run status, then filter tabs All / Questions / Clusters /
  Rooms with counts. The list is reverse-chronological and mixes raw questions (checkbox for manual grouping, concept, alias, Hide), **Claude
  suggestions** (tinted card with Publish / Edit / Discard, confidence marked "not calibrated", original questions in a disclosure), published
  clusters (with *Open help room*), room events (opened, nearly full, with *Close room*) and topic changes. Sticky bottom: "Group selected (n)" which
  turns into the manual-cluster form. The feed scrolls inside its own column, like chat; the page never does.

**Primary action.** While teaching there is no single primary action — the instructor *reads* the graph and reacts. The two actions the feed exists
for are *Suggest clusters* (full-width at the top, disabled when nothing is pending) and *Publish* on a suggestion (filled button on the tinted card).
Everything else is secondary (outline/ghost).

**What moved and why.** The live `RadarDashboard` is a long page: metrics, graph + detail card, cluster queue, moderation queue, per-concept cards,
pre/post, rooms. An instructor mid-sentence cannot scroll to find the moderation queue. Here the graph never leaves the screen, the text alternative
sits directly under it, and every event that needs a decision lands in one place on the right. The concept detail card is gone: the table row carries
the same numbers, and the published clusters for a concept are visible as the amber count on the node/row and in the feed's *Clusters* filter.
Pre/post comparison is a view toggle, not a card lower down, because it matters after the help phase, not during the explanation.

**Fix to the hypothesis: the projector.** A two-column teach view puts *raw student questions* on the projector the moment the laptop is mirrored.
That breaks the "students never see raw questions" rule and the moderation intent. The **Present** toggle collapses the feed to a 12 rem counts rail
(questions waiting, suggestions, rooms open) and enlarges the join code; raw text and the suggestion cards disappear until the instructor stops
presenting. Metrics also hide because their "confused 42 of 147" wording is instructor-facing, not class-facing.

**State changes.** New feed items enter at the top with the theme's 4 px enter transition and the list is `aria-live=polite`; publishing a suggestion
immediately inserts a "Published to students" item so the instructor sees the consequence of the click; the current-topic badge and the graph's
"CURRENT TOPIC" node update together.

**Degradation.** Designed for 1280–1920 px. Below ~1100 px the two columns would need to stack and the no-scroll promise is gone; the mockup does not
try to solve tablet/phone instructor use, which the spec treats as a laptop scenario.

## Peer room (`/mock/focus-flow/room`, 1024 px, also phone)

**Hierarchy.** One-line header: back button, room title, concept badge, "5 / 6 in room", parent cluster. Body is a `h-dvh` two-column grid:

- **Left, chat** (primary). A pinned system note repeats the concept description and the "helpers volunteered themselves; nothing is verified"
  disclosure, so the room's purpose is on screen without a sidebar. Messages show alias, a *helper* tag on helpers' messages, and time. The composer is
  pinned at the bottom; Send is a 40 px button.
- **Right sidebar (≥ 768 px).** *Check-in* card first — "How is Recursive case going now?" with *I understand now* / *Still confused* (teal/rose, the
  level colours), the phase it records under, and a "Recorded … change any time" confirmation. Below it the member list with roles and simulated
  badges, the helper disclaimer, *Leave room*, and a note that a helper or the instructor can close the room (the signed-in student is a learner, so
  no Close button is shown rather than a disabled one).
- **Phone (< 768 px).** The sidebar is dropped and the check-in moves to a strip directly above the composer, in the thumb zone and visible every time
  the student goes to type; members are summarised by the "5 / 6" count in the header.

**Primary action.** Chatting. The check-in is the room's *outcome* and is kept persistently visible but visually quieter than the chat; it never
blocks it. It is the only per-student signal written from this screen, and the copy repeats which phase it lands in.

**What moved and why.** The live `PeerRoom` scrolls: header, then members + chat, then the check-in card underneath the chat, which on a phone is
below the fold while typing. Focus Flow pins the chat to the viewport and gives the check-in a fixed home (sidebar on laptop, above the composer on
phone).

## Trade-offs versus the current layout (honest)

- **Student overview is gone.** The current cockpit shows every concept's buttons at once; a student who wants to answer all six after the lecture
  needs six swipes here. Focus Flow optimises for the live lecture at the cost of that batch case.
- **Hidden secondary actions.** Asking and volunteering are one tap further away than today. The labelled pill mitigates but does not eliminate the
  discoverability cost; volunteering in particular may see fewer opt-ins without a prompt.
- **Narrow feed, dense work.** Editing a cluster title/summary or reading a long raw question in a 27 rem column is cramped compared with the current
  full-width queue. Manual grouping of many questions is slower because selected items can scroll out of view.
- **No-scroll promise is fragile.** The instructor layout is tuned for ~900 px tall viewports; at 768 px the graph shrinks and six concept rows plus
  caption still fit, but a lecture with 10+ concepts needs the table to scroll or paginate.
- **Present mode is a manual step.** If the instructor forgets to toggle it before mirroring, raw questions are on the wall — the same exposure the
  current layout has, but this design's right column makes them more prominent.
- **Lost affordances.** The current graph detail card lists cluster titles and original questions next to the node; here that detail lives in the
  feed's Clusters filter, one click away instead of in view.
