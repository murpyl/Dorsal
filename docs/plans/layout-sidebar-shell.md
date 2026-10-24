# Layout exploration: Sidebar Shell

Clickable mock at `/mock/sidebar-shell` (student, instructor, room). Fixture data only
(`app/mock/sidebar-shell/fixtures.ts`): one CS 61A recursion lecture, 34 participants, six
concepts, ten questions, four clusters, two rooms. No live component or Convex code changed.

## The hypothesis, and what I changed in it

"Sidebar Shell": a conventional app shell. Instructor gets a left sidebar nav with the join
code and phase switch on top; each section is a full-width page with a sticky header; Overview
is the live radar. Student gets a top app bar and a segmented Topics / Ask / Help pager with
the current topic highlighted. Room is chat-first with members collapsed into an avatar stack.

Corrections the analysis forced:

1. **Student pager moved to the bottom.** The brief puts the segmented pager under the app
   bar. On a 390 px phone held in one hand while listening, a top pager is a reach and competes
   with the current-topic strip for the most valuable pixels. The pager is now a sticky bottom
   bar (thumb zone), and the top of the screen is owned by the alias/code bar plus a blue
   "NOW · Call stack" strip that is always visible while scrolling. "Current topic highlighted"
   stays, but as a strip + hero card rather than a highlighted pager segment.
2. **Current topic is a hero, not a list item.** The brief's "topic highlighted" would still
   force the student to find it in a list. The current topic is pulled out as the first card
   with 3 big icon buttons; the rest of the lecture is a quieter list underneath with the
   compact existing-style selectors.
3. **Overview is not only the radar.** A projected overview that is "just the graph" wastes
   the sidebar shell's one advantage: there is room for a decision panel. Overview is the
   current-topic distribution (big, legible at projector distance), the graph, and a
   "Needs attention" column that summarises what changed and deep-links into Questions / Rooms
   / Graph. The sidebar carries live counts (pending questions, open rooms) so the instructor
   notices changes without leaving the current section.
4. **Members in the room are an avatar stack *and* a toggleable panel.** An avatar stack alone
   hides roles; the stack is the trigger, and the panel lists members with helper/learner role
   and the "helpers volunteered, not a credential" disclosure.

## Student (390 px)

Hierarchy, top to bottom: app bar (brand, alias, join code) → sticky "NOW" strip with the
current topic → section content → bottom pager.

- **Primary action:** answer the current topic. Three 88 px tall icon buttons (Confused /
  Partly / Can explain) directly under the hero; `aria-pressed` shows selection; pressing
  re-renders the NOW strip to "Answered: Partly get it" so the status is visible from anywhere.
- **Always visible:** alias + code, current topic, pager with an unread badge on Help.
- **One tap away:** other topics (scroll), Ask (composer), Help (published groups, rooms,
  helper opt-in).
- **Privacy:** "Only the class total is shown to your instructor, never your answer" sits
  under the big buttons. The Ask composer repeats the pseudonymity / operator-linkability /
  external-AI disclosure and the "no names or personal details" rule above the submit button;
  the helper opt-in repeats "self-declared, not an AI rating, nobody is auto-enrolled or
  contacted". Students see only their own answers, published cluster titles, and room
  occupancy (n/6) — never raw aggregate counts.
- **State changes:** topic change rewrites the NOW strip and shows a toast with an "Answer"
  action; a newly published cluster increments the Help badge and toasts with "See groups". The
  "Simulate" links at the very top drive these in the mock.
- **Keyboard:** everything is a native button/link/checkbox; a skip link jumps to the pager.

## Instructor (1440 px)

Hierarchy: 264 px sidebar (join code · phase · nav · live status · close session) → sticky
section header (course/lecture + section name + current-topic select) → full-width section.

- **Primary action by section:** Overview — pick the current topic (select in the sticky
  header, available in every section). Questions — publish a suggested cluster. Rooms — open a
  room. Results — switch phase (also in the sidebar, behind a confirmation dialog because it
  reassigns every subsequent answer).
- **Overview**: four metric cards; current-topic distribution with the shared
  `DistributionBar` + `Legend`; the real `ConceptGraph` with the "self-reported understanding,
  not measured mastery" framing and the "Text version: per-concept distribution" link; a
  "Needs attention" column of deep links.
- **Graph**: large graph + a sticky detail card for the selected node (bar, counts, N, make
  current, open room). Below: the full text table of every concept's distribution — the text
  alternative stays, and is now a first-class element instead of a footnote.
- **Questions**: two columns. Left: raw queue with checkboxes, concept tag, hide; "Cluster
  selected with Claude" is the batch action. Right: suggested clusters (edit title, publish,
  discard) and published clusters (open room). Publishing moves a card across the columns and
  toasts "Published to students".
- **Rooms**: table with member avatars, helper/learner counts, capacity meter, Nearly full /
  Full badges, and Close behind a confirmation.
- **Results**: pre vs post distribution per concept with the caveat that deltas are
  self-reported confidence, not verified learning gains.
- **Projector:** the sidebar notes which sections are projector-safe (Overview, Graph,
  Results); Questions shows raw student text and is intended for the instructor's own screen.
- **State changes:** topic change, phase change, publish, and room creation each announce via
  a polite live-region toast; sidebar badges update live.

## Peer room (1024 px)

Hierarchy: header (back, title, concept, cluster, avatar stack n/6, Leave, Close for helpers)
→ chat → check-in banner → composer.

- **Primary action:** send a message; the composer is pinned to the bottom and the chat
  fills the viewport.
- **Check-in** is a slim banner directly above the composer: "How is Call stack going now?"
  with two buttons ("I understand now" / "Still confused"), the phase it records under, and
  the reminder that only class totals reach the instructor. It can be dismissed to a one-line
  "Check in" affordance so it never blocks chat.
- **Members:** avatar stack in the header (helpers ringed teal) toggles a side panel with
  roles, "(you)", simulated markers and free seats.
- Messages carry role chips so a helper's advice reads differently from a learner's guess.

## Responsive degradation

- Student at 390 px is the design target; at wider widths it stays a centred 448 px column.
- Instructor below ~1024 px: the shell is not designed for phones; the sidebar should collapse
  to a top bar (not implemented in the mock — it is a laptop/projector surface).
- Room at narrow widths: the member panel becomes a bottom sheet; brand hides.

## Trade-offs vs. the current layout

- **Wins:** every instructor task has a home and a URL-like state; the queue and clusters are
  side by side; the current topic is unmissable for students; room chat gets the whole screen.
- **Costs:** the sidebar spends 264 px permanently, so the graph on Overview is smaller than
  in the current full-width radar. Splitting Questions from Graph means the instructor flips
  sections to see "where are the questions coming from" (mitigated by cluster badges on nodes
  and the Needs-attention links). Students lose the single-scroll "see everything" page; the
  Help tab is one tap away and relies on the badge to be noticed. The bottom pager eats ~60 px
  of a 390 px screen's height.
- **Honest weaknesses:** the Overview is dense for a projector at the back of a hall — the
  distribution card is legible but the Needs-attention column is not. The mock does not
  animate the graph recolouring or implement the collapsed-sidebar breakpoint.
