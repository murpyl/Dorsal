# Layout concept: Control Room

Mockup routes (fixture data, local state only, no Convex):

- `/mock/control-room` — index
- `/mock/control-room/student` — 390 px phone, one hand
- `/mock/control-room/instructor` — 1440 px laptop / projector
- `/mock/control-room/room` — 1024 px peer-help room

Files: `app/mock/control-room/{fixtures.ts,page.tsx,student/page.tsx,instructor/page.tsx,room/page.tsx}`.
Nothing under `components/` or `convex/` was touched.

## The core idea

The live instructor screen today is a long vertical stack (metrics → graph → queue → rooms → pre/post). During
a lecture the instructor has to scroll between "what is the class confused about" (graph) and "what can I do about
it" (queue, rooms, phase). The Control Room keeps **signal, selection and action on screen at the same time**, like a
mixing desk: a concept rail on the left, the graph in the centre, an inspector for the selected concept on the right,
and the moderation queue as a drawer that slides up over the centre + right panes when it is needed.

The student screen today is also a stack, where the current topic can scroll out of view. The Control Room gives the
student a **sticky compact header** (code · current topic · my answer) and a **sticky bottom confidence bar** bound to
the current topic, so the one thing they are most likely to do while listening is always one tap away.

## What I kept from the hypothesis, what I changed, and why

| Hypothesis | Decision | Why |
| --- | --- | --- |
| Three persistent panes | **Kept.** 18 rem rail · fluid graph · 22 rem inspector at 1440. | The graph needs ~900 px to read; the rail and inspector each need a fixed minimum to avoid wrapping bars and counts. |
| Queue as a drawer over *all* panes | **Changed: drawer covers graph + inspector only; the concept rail stays visible.** | While grouping questions the instructor still needs to see which concepts are hot and keep arrow-key selection working. A full-width sheet hides the signal the moderation is about. |
| Inspector = counts, make-current, clusters, open room | **Kept, plus the pre/post comparison moved into the inspector.** | Pre/post is a per-concept view, so it belongs with the selected concept rather than in its own section. It now sits under the signal counts and only appears when a post set exists. |
| Rooms inside the inspector | **Kept per-concept, but added a "Live help rooms" strip under the graph.** | Rooms are a class-wide live state the instructor wants to glance at (capacity, who needs closing) without selecting each concept first. The inspector keeps the *per-topic* open/close controls. |
| Student: sticky header + sticky bottom bar | **Kept.** Added a "Current topic" card at the top of the scroll as the anchor the header links to. | The sticky elements are compact by design; the card is where the description and the "Ask about this" shortcut live. |
| Student: everything else one scroll | **Kept, reordered: current topic → ask → published clusters → other concepts → helper opt-in → rooms.** | Asking and joining a cluster room are the actions that unblock a confused student; rating the other five concepts is maintenance, not urgent. |
| Projector | **Added a "Present" toggle.** | The hypothesis had no answer for mirroring: a bottom drawer over the graph exposes raw student questions on the wall. Presenting keeps the drawer closed and hides the raw queue; the rail, graph and inspector are already count-only and safe to show. |

## Instructor (1440)

**Hierarchy**

1. Top bar: session title, phase, participants / responses / confused / published, phase toggle, Present, join code, Close session.
   The join code is the largest text on screen because it is the one thing students on the projector need to read.
2. Left rail ("Concepts"): every concept with `DistributionBar`, exact counts, N, cluster badge, low-sample flag.
   Sort toggle: lecture order / most confused first. The rail *is* the per-concept text alternative to the graph.
3. Centre: `ConceptGraph` (reused), legend above it, "Live help rooms" strip below it with seat dots and Close.
4. Right inspector: selected concept → **Make current topic** (primary, full width) → signal counts for the active
   phase → pre/post bars (when a post set exists) → clusters on this concept (publish / open room) → rooms on this concept.
5. Bottom drawer handle: "Questions & clusters" with pending / to-review / published chips and the **Suggest clusters**
   button. Open: moderation queue (left) + suggested & published clusters (right).

**Primary action**: there are two depending on moment, and they are placed where the eye already is:
*Make current topic* at the top of the inspector (because the selected concept is the context), and *Suggest clusters*
on the drawer handle (because that is where the queue lives). Both are solid primary buttons; nothing else in the
panes is solid primary.

**Selection model**: one selected concept drives the inspector. Selecting is possible from the rail (click, ↑/↓, Home,
End, Enter) and from the graph node (click). The current topic is a separate state (ring + "Current topic" badge).

**State changes announce themselves** through a status line in the top bar (`role="status"`, auto-clears):
"Current topic → Tree recursion", "Published 'Tracing recursive return values' — students can see it now",
"Opened 'Counting calls in fib's tree · room 1'", "Phase → After help (post)". The drawer handle chips update counts
live; a new Claude run pulses the Suggest button while running.

**Keyboard**: rail is a listbox-style list with roving focus; drawer toggles with a button and closes with Escape;
every control is a real `<button>` or `Select`, no click-only divs.

**Projector**: Present hides the raw queue and locks the drawer closed ("Raw questions hidden while presenting · 5
pending"). The join code and current topic remain large.

## Student (390)

**Hierarchy**

1. Sticky header (two rows): brand · alias · code; "Now: Call stack" with a live dot and the **my answer chip**.
   Toasts for topic changes / new clusters appear as a third row inside the header and link to the relevant section.
2. "Current topic" card (anchor `#now`), ring-outlined, with description and "Ask about this".
3. Ask a question: concept `Select` defaults to the current topic; privacy disclosure (pseudonymous, external Claude
   processing) sits directly under the Send button.
4. What the class is asking: published clusters only, each with concept chips, question count, helper count, rooms with
   Join / Open / Full, and "Open a room as helper" when the student opted in for a concept in the cluster.
5. Other concepts: `ConfidenceSelector` per concept, your answer chip on the right. No class numbers anywhere.
6. Volunteer as a peer helper: checkboxes with the self-declaration / no-auto-contact disclosure right in the card.
7. Peer help rooms: full list with capacity.
8. Sticky bottom bar: "Right now, **Call stack** is…" + `ConfidenceSelector` (reused, three equal 44 px+ targets).
   Shows "Saved" for two seconds after a tap. `pb-44` on the page prevents the bar covering the last card.

**Primary action**: the bottom confidence bar for the current topic — always visible, full width, thumb-reachable.
Everything else is scroll-reachable; nothing requires a second screen except the room itself.

**Degradation at 390**: header rows truncate the topic with ellipsis before anything wraps; the composer's concept
select is capped at 14 rem; cluster rows wrap the Join button under the text; the helper list is one column.

**Privacy rules honoured**: no counts, no distributions, no other students' answers; cluster cards show question and
helper *counts* only because they are about the published cluster, not about understanding levels. Disclosures are
adjacent to the composer and the opt-in, not in a footer.

The two "Mockup controls" buttons at the bottom simulate the instructor changing topic and publishing a cluster so the
toast + bottom-bar rebinding can be clicked through.

## Peer room (1024)

**Hierarchy**

1. Header: back to session, room title + open badge, "Help room · Call stack · 5 / 6 · 1 helper · for cluster …", and
   the concept description as the room's **Goal** on the right.
2. Members rail (15 rem): helper/learner roles, empty seats shown as dashed slots so capacity is visible, helper
   disclaimer, Leave / Close (Close only for the helper; others see why they cannot).
3. Chat, filling the remaining height; messages mark helpers inline.
4. **Check-in strip** above the composer: "How is Call stack going now?" with *I understand now* / *Still confused*,
   wording tied to the current phase label. It is persistent (not a dismissible banner) because the post-help signal is
   the reason the room exists for the instructor.
5. Composer.

Below `md` the members rail collapses to a horizontal chip row above the chat.

## Trade-offs vs. the current layout

- **Density.** Three panes plus a drawer is a lot for a first-time instructor; the current stacked layout is easier to
  scan top-to-bottom. The Control Room pays off from the second session on, and is worse on a 13" laptop below
  ~1200 px (the rail would need to collapse to a tab, which this mock does not implement).
- **Two primary actions.** Make-current and Suggest-clusters compete; I accept this because they belong to different
  moments (teaching vs. moderating) and sit in different regions.
- **Drawer hides the graph.** Moderating questions covers the graph and inspector. I kept the rail visible to retain
  the signal, but the instructor still cannot see the graph while grouping. A split (graph shrinks, queue beside it)
  was rejected because the graph becomes unreadable under ~700 px.
- **Student page is longer.** The sticky header and bottom bar cost ~170 px of a 844 px viewport. Worth it for the
  one-tap current-topic rating, but it leaves less room for the clusters list, which is the second most useful section.
- **Toast-in-header** is a custom pattern; a system toast library would be more conventional. I kept it inside the
  header so announcements stay next to the "Now:" line they describe.
- **Room check-in strip is always visible.** It takes vertical space from the chat on phones. The current layout's
  banner is dismissible; the fixed strip is a deliberate bet that recording the post-help signal matters more.

## Open questions for the owner

- Should the inspector's pre/post comparison also exist as a whole-class view (current `PrePostComparison`) somewhere,
  e.g. a tab on the drawer?
- At ≤ 1200 px should the rail become a tab inside the drawer, or should the inspector collapse first?
- Is the "Present" toggle enough for projector safety, or do you want a dedicated projector URL?
