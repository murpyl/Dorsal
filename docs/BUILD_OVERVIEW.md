# ClassPulse — Build Overview

## Product thesis

**ClassPulse is a real-time collective learning system for classrooms.** It combines:

- **A — Confusion Radar:** Students anonymously or pseudonymously submit confidence signals and questions. Instructors see aggregate uncertainty and AI-grouped misconceptions as they emerge.
- **B — PeerMesh:** Students opt in to help one another in temporary topic-specific rooms, with lightweight shared explanations and post-help checks.
- **F — KnowledgeGraph:** A live concept network shows dependencies and aggregate class-level understanding, highlights unresolved misconceptions, and changes as interventions happen.

**Core loop:** signal confusion → cluster the underlying issue → highlight affected concepts → connect peers / instructor → gather follow-up evidence → update the concept graph.

**Positioning:** Not an AI tutor, polling clone, or generic note app. The product turns individual uncertainty into collective action and instructor feedback.

## Users and permissions

| Role | Can do | Should not do |
|---|---|---|
| Student | Join a session, submit confidence/question, see class aggregate, volunteer to help, enter rooms, complete checks | View the identity of anonymous question authors, inspect other students' private confidence |
| Instructor | Create/manage sessions and concept maps, see aggregates and clusters, initiate interventions, review explanations | Reveal anonymous authors or see individual confidence by default |
| Demo operator | Seed simulated students and reset demo | Access production student data |

For the hackathon, use **anonymous per-session participation tokens** (stored client-side) plus a separate instructor secret for creating/managing sessions. Do not use this as a production access-control design: deploy proper authentication and authorization before real classroom adoption. Keep student identifiers out of public queries.

## Major experiences

### 1. Student view — `/join/[code]`
- Enter session with code; choose an alias (optional) and a random local participant token.
- See active topic, relevant concepts, and an interactive graph.
- Submit a 3-level signal: `confused`, `partial`, `can_explain` (replace previous signal for that concept).
- Ask a free-text question; show clear anonymous posting disclosure.
- Read published question clusters and request help.
- Opt into being a peer helper, join a help room, post an explanation, and complete a 1-question post-help check.

### 2. Instructor view — `/instructor/[sessionId]`
- Create a session and an initial graph (e.g., recursion → base cases → recursive calls → call stack → return values).
- View live concept nodes by percentage of signals per confidence level, response counts, and low-sample warnings.
- Review AI-suggested misconception clusters, merge/split or rename them, then publish.
- Create an intervention, publish a peer help room, and inspect pre/post confidence trends and optional comprehension checks.
- Close the session and export a concise follow-up summary.

### 3. Peer help rooms — `/room/[roomId]`
- Topic, description, live participant count, queue, chat/shared explanation, and `I understand now` / `Still confused` feedback.
- Helper role is opt-in and *self-declared*, not an AI certification of expertise.
- Set a room size cap, require joining, and give instructors moderation tools.

### 4. Concept graph
- Nodes are instructor-seeded concepts, not a graph invented entirely by an LLM.
- Directed edges represent `prerequisite_for`, `related_to`, or `frequently_confused_with`.
- Node size or border = sample count; fill = aggregate understanding; unresolved issue count = marker.
- Clicking a node opens signal distribution, grouped questions, help rooms, and changes after interventions.
- Updates stream from Convex via reactive queries without polling.

## Scoping: hackathon MVP versus later

**Must ship:** session join; 3-state signal; anonymous question submission; live instructor counts; AI clustering (or explicit deterministic fallback); concept graph with at least 5 nodes; opt-in helpers and peer rooms; pre/post response comparison; role permissions; one coherent demo flow.

**Stretch:** shared rich text explanation; graph auto-suggestions requiring instructor approval; student quiz validation; historical graph across lectures; accessible voice input; Notability sketch/diagram import when supported by a legitimate workflow.

**Do not build for MVP:** full LMS, grading engine, live video, real-time lecture transcription, unreviewed AI assessment of individual students, predictive student profiling, broad campus user directory, complex calendar integration.

## End-to-end demo scenario

1. Instructor starts `Recursion: how return values propagate` with five seeded concepts and a few dozen clearly marked simulated participant responses.
2. A real student enters a code, posts a question about the call stack, and sets confidence to `confused`.
3. Instructor dashboard and graph update immediately on a separate device.
4. Several differently worded questions appear. AI groups them under `Tracing recursive return values` and cites the underlying submitted questions; instructor reviews and publishes.
5. KnowledgeGraph highlights `call stack` and `return values` and their relationship.
6. A student volunteers as a helper; affected students join a live room, collaboratively explain a small factorial trace.
7. Students resubmit understanding or answer a short check. The graph changes and a before/after comparison is shown. Explain explicitly that this measures *signals and check outcomes*, not verified learning gains.

## Convex is central, not decorative

- **Reactive `useQuery` subscriptions:** Instructor radar, graph node aggregates, open clusters, and room member lists update across devices automatically.
- **Transactional mutations:** One signal per participant/concept is updated atomically; joining and closing rooms enforces capacity/permissions; cluster moderation is consistent.
- **Actions:** External LLM calls classify/group question text; never place model API keys in browser code.
- **Scheduled functions:** Debounce/trigger clustering, close expired rooms, and produce end-of-session summaries.
- **Database:** Sessions, concepts, graph edges, signals, questions, clusters, rooms, room memberships, interventions, and event history.

AI calls are asynchronous and non-authoritative. UI remains usable if the model is slow or unavailable.

## AI clustering contract

Input: bounded batch of unanswered question IDs, text, current instructor-seeded concepts. Output: strict structured JSON of clusters with `title`, `summary`, `conceptIds`, `questionIds`, and `confidence`, with no invented question IDs. Validate IDs and structure server-side. Cluster suggestions are private until instructor approval. Small batches can use deterministic text matching as a fallback. Never claim that similarity proves conceptual equivalence.

## Privacy and safety

- Show *aggregate* signals only to instructors; do not expose raw student signals in public queries.
- Rate-limit posting; enforce reasonable text limits; add deletion/flagging and instructor moderation.
- Use pseudonymous participant tokens for MVP, and disclose that this is not the same as complete anonymity from operators.
- Suppress visual aggregate breakdowns for small groups to reduce re-identification risk (choose and document a minimum threshold, e.g. 5 signals).
- Avoid storing sensitive personal/educational records or claiming FERPA compliance without review.
- AI does not assess individual students' ability or recommend punitive interventions.
- Keep demo data labeled simulated.

## Sponsor track strategy (from Cal Hacks 13.0 Hacker Guide, accessed October 23, 2026)

| Track | Fit | What to implement and show | Caveat |
|---|---|---|---|
| **Best use of Convex** | **Primary / strongest** | Multi-device instantaneous question/signal → radar/graph → help-room updates; atomic room membership; scheduled summarization; code walkthrough of reactive subscriptions | Guide says detailed criteria `Coming soon`; confirm at event |
| **Meta: Bringing People Closer Together with AI** | **Strong if B is central** | AI detects shared confusion and actively connects real students to opt-in classmates who can explain it. Demonstrate completed human-to-human peer learning, not AI chat replacing interaction | Meta specifically evaluates essential AI integration, human connection, originality, demo |
| **Microsoft: Built for the Real World** | **Strong conditional** | Demonstrate an instructor copilot that recommends an intervention with evidence and requires human approval; report time to surface misconceptions and intervention completion; clear privacy/production path | Requires a *production-minded AI agent*, not only a dashboard and one LLM call |
| **Creao: Best Team Empowerment** | **Potential; verify platform requirement** | PeerMesh coordinates live group learning and team contribution, showing division of work, shared context and completed help sessions | Sponsor platform use/eligibility must be confirmed; conceptual overlap alone is insufficient |
| **Notability: Best Use of Notability** | **Conditional / difficult** | Actually use Notability throughout ideation and live workflow for handwritten diagrams, audio, and notes; document process and explain their role in the build | Guide explicitly judges genuine use, depth, process; a PDF upload alone is weak |
| **Cartesia: Best Use of Cartesia** | **Optional extension** | Make voice core for a hands-free accessibility-first help room: high-quality spoken explanations with interruption/turn-taking | Voice cannot be an afterthought; adding TTS solely for eligibility is weak |
| **Bitdeer AI Model Studio** | **Optional** | Run the misconception clustering or instructor recommendation model on Model Studio, demonstrate the API and results | Need actual Model Studio integration |
| **Factory Droid SDK** | **Generally not worth targeting in MVP** | Would require a real triggered Droid SDK workflow operating on artifacts with visible plans/diffs and guardrails | Merely using Droid as a development assistant does *not* qualify according to guide |
| **Fetch.ai** | **Possible but unnecessary** | Distinct peer-learning agents negotiate help-room assignment or scheduling | Requires genuine Fetch.ai use; likely scope creep |

**Recommended submission focus:** Convex + Meta. Pursue Microsoft only if the instructor agent actually plans/actions an intervention and can show approved execution. Pursue Notability only if it's truly part of the build and demo.

**Not automatically eligible:** mentioning a sponsor, using an LLM generally, using Cursor during development, or displaying simulated AI behavior does not satisfy a track's technical criteria. Recheck sponsor rules and live event announcements before submission.

## Success criteria

- A question submitted in one browser appears in instructor view without refreshing.
- At least three paraphrased questions are grouped into a traceable misconception, instructor-approved.
- Clicking the affected KnowledgeGraph node reveals those underlying questions.
- One helper and one student can join the same room and exchange messages in real time.
- Pre/post signal distributions are visible with sample counts and an honest interpretation.
- The complete flow is demonstrable in approximately two minutes.

## Source links

- Cal Hacks hacker guide: https://docs.google.com/document/d/1RQrueC9wm5u8uxtWSC2gadIchp05hVayhGUrIjxT9dE/edit
- Convex docs: https://docs.convex.dev/
- Convex Next.js quickstart: https://docs.convex.dev/quickstart/nextjs
- Convex React subscriptions: https://docs.convex.dev/client/react/overview
