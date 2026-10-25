# Dorsal

Live classroom **confusion radar** (A) + **peer help** (B) + **concept knowledge graph** (F), built for a single lecture at a time (first target: a Berkeley CS 61A recursion lecture). Students join with a six-letter code, report how well they understand each concept and ask anonymous questions. The instructor sees live counts, a colour-coded concept graph, Claude-clustered misconceptions to review, and opens capacity-limited peer rooms.

- Product spec: `docs/MVP_Outline.md` · implementation plan: `docs/Build_Instructions.md` · per-phase plans: `docs/plans/`
- Two-minute judging script: `docs/demo-script.md`

## Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Session create/join, 3-state confidence signals, live instructor radar | done |
| 2 | React Flow concept graph coloured by aggregate confidence, instructor-set current topic | done |
| 3 | Anonymous questions, moderation queue, Claude clustering with instructor review (`questions.*`, `clusters.*`, `claude.clusterQuestions`) | done |
| 4 | Helper opt-in, peer rooms + chat, pre/post comparison (`participants.*`, `rooms.*`, `messages.*`, `signals.prePostByConcept`) | done |
| 5 | Deterministic seed/reset with a published fallback cluster, §8 scenario tests, this README, demo script | in progress (UI polish lands in parallel) |

Everything below describes what is on `main`; the Phase 3/4 function contract is in `docs/plans/phase-3-4-contract.md`.

## Architecture

```text
Next.js 16 App Router (client components, Tailwind, @xyflow/react)
        │  useQuery / useMutation  (convex/react, ConvexClientProvider)
        ▼
Convex deployment  ──  schema + indexes · queries · mutations · scheduler
        │  ctx.scheduler.runAfter(0, internal.claude.clusterQuestions)
        ▼
convex/claude.ts  ("use node" action)  ──►  Anthropic API (ANTHROPIC_API_KEY, CLAUDE_MODEL)
```

### Why Convex is central (not a bolt-on)

Convex is the system of record **and** the realtime layer **and** the AI orchestrator:

- All shared state (signals, questions, clusters, rooms, messages, AI run log) lives in Convex tables with explicit indexes; there is no second database, cache or websocket server. Every view is a reactive `useQuery` subscription, so a student's tap changes the instructor's graph, the moderation queue, the published-cluster list and the room roster with no polling or manual refetch.
- Mutations are transactional. "One signal per participant/concept/phase", "a question is claimed by at most one cluster", "a room never exceeds its capacity" and "ten messages per ten seconds" are each a read-check-write inside one mutation, so they stay correct under concurrent clients without locks or a job queue.
- Privacy boundaries are enforced in the functions, not in the UI: the student query simply never reads other participants' rows or pending question text, and every protected function verifies the caller's credential against the stored hash.
- Claude runs inside Convex too: a mutation records the `aiRuns` row and schedules the Node action (`ctx.scheduler.runAfter`), the action calls an internal query for its input and an internal mutation to store validated suggestions, and the instructor UI learns about the result through the same reactive query it was already subscribed to.

### Tables (`convex/schema.ts`, complete for all phases)

| Table | What a row is | Key indexes |
|---|---|---|
| `sessions` | One lecture: `title`, `code`, `state` (`open`/`closed`), `instructorSecretHash`, `activeConceptId`, `activePromptId` | `by_code` |
| `participants` | A pseudonymous student in a session: `tokenHash`, `alias` ("Student 3"), `helperConceptIds`, `isSimulated` | `by_session`, `by_token_hash` |
| `concepts` | Instructor-reviewed graph node (from the lesson setup page) with a fixed `x`/`y` position computed once at creation by `layoutConcepts` (dagre, left-to-right by prerequisite) | `by_session` |
| `conceptEdges` | Directed `prerequisite_for` / `related_to` / `frequently_confused_with` edge | `by_session` |
| `prompts` | One row per push (Push prompt form or *Make current topic*): `conceptId`, `kind` (`rating`/`open`), optional `question`; never overwritten, so staff can review each one | `by_session` |
| `promptResponses` | One participant's answer to one prompt: `level` (rating) or `text` (open-ended, ≤ 500 chars); shown to staff without names | `by_prompt`, `by_prompt_participant` |
| `signals` | One participant's current level (`confused`/`partial`/`can_explain`) for one concept in one phase: `pre` = session-page rating, `post` = rating updated inside a help room | `by_concept_phase`, `by_participant_concept_phase` |
| `questions` | Raw anonymous question (`pending`/`clustered`/`hidden`) — instructor-only until published via a cluster | `by_session_state`, `by_concept`, `by_participant` |
| `clusters` | A misconception group: `title`, `summary`, `conceptIds`, `questionIds`, `status` (`suggested`/`published`/`discarded`), `source` (`ai`/`manual`) | `by_session_status` |
| `rooms`, `roomMembers`, `messages` | Peer help room per concept/cluster, its members (`helper`/`learner`) and chat | `by_session`, `by_room_participant`, `by_room_time` |
| `aiRuns` | Operational log of each Claude call (`clusterQuestions`, or `inferConcepts` with no `sessionId`): `model`, `status`, `latencyMs`, `error` — never prompt, lecture material or student content | `by_session`, `by_operation_time` |
| `uploadGrants` | One row per issued lesson upload URL, for the global upload cap; no content — purged by cron after 1 h | `by_createdAt` |

### Which reactive query powers which view

| View | Route / component | Convex functions | Credential |
|---|---|---|---|
| Landing | `/` → `app/page.tsx` | Join by code; *Set up a lesson* links to `/instructor/new` | — |
| Lesson setup | `/instructor/new` → `app/instructor/new/page.tsx` | `lessons.generateUploadUrl` (mutation) + `claude.inferConcepts` (action) suggest concepts from uploaded notes; `sessions.create` (mutation) takes the edited concepts and returns `{ sessionId, code }`; the browser generates the instructor secret | — |
| Student cockpit (*Prompt N of 5* card for the current concept, collapsed *Already covered* list) | `/join/[code]` → `components/StudentCockpit.tsx`, `ConfidenceSelector` | `sessions.join` (idempotent per token) → `sessions.getStudentView` (query: `activeConceptId`, `activePrompt` — current prompt only, with the caller's own answer — `coveredConceptIds`, own level per concept); `signals.upsert` (mutation; only the current or a previously-current concept — `sessions.activeHistory`; also records the current rating prompt's response); `prompts.respond` (answer to the current open-ended prompt) | participant token |
| Instructor radar + graph | `/instructor/[sessionId]` → `components/RadarDashboard.tsx`, `ConceptGraph` | `sessions.getInstructorView` (one query feeds metrics, graph nodes/edges with per-node level counts and the node detail panel); `sessions.setActiveConcept` (pushes a new `prompts` row: rating or open-ended); *Prompts* tab: `prompts.list`, `prompts.responses` (per-prompt counts or answer texts, no names), `prompts.makeCurrent` (switch students back to an earlier prompt; new answers join its responses) | instructor secret |
| Question composer (*Send anonymously*) | student cockpit → `QuestionComposer` | `questions.submit` (mutation; 1–500 chars, 5 per participant per 60 s) | participant token |
| Cluster queue: pending questions, *Suggest clusters (N pending)*, suggested clusters, *Group selected (N) into a cluster* | instructor dashboard → `ClusterQueue` | `questions.listInstructor` (every pending/clustered/hidden question with concept label, `isSimulated`, no participant IDs) + `clusters.listInstructor` (`suggested`, `published`, `latestRun`); mutations `questions.hide`, `clusters.requestSuggestions`, `clusters.publish`, `clusters.discard`, `clusters.createManual` | instructor secret |
| Published clusters (students) | student cockpit → `PublishedClusters` | `clusters.listPublished` — title, summary, concept labels, `questionCount`, `helperCount`; never question text or participants | participant token |
| Clusters on a graph node | instructor graph detail panel | `clusters.listForConcept` (published clusters touching that concept) | instructor secret |
| Helper opt-in (*Volunteer as a peer helper*) | student cockpit → `HelperOptIn` | `participants.me` (query), `participants.setHelper` (mutation) | participant token |
| Room list (*Open room*, *Join*, *Join as helper*, *Open a help room as a helper*) | student cockpit → `RoomList`; instructor → `RoomList` (instructor mode) | `rooms.listBySession` (student: member counts, `isMember`, `myRole`) / `rooms.listInstructor`; mutations `rooms.createForCluster` (instructor), `rooms.createAsHelper` (opted-in helper), `rooms.join`, `rooms.leave`, `rooms.close` | per role |
| Peer room + chat + *Update your rating* | `/room/[roomId]?code=<CODE>` → `PeerRoom` | `rooms.get` (members with aliases/roles, `null` for non-members), `messages.listByRoom` (`null` for non-members), `messages.send` (members only, 10 per 10 s), `signals.roomCheckIn` (members of an open room only; the only writer of `post` signals) for the in-room rating | participant token (the `?code=` query string tells the page which `localStorage` token to use) |
| Before vs after peer help (*Before* / *After*) | instructor dashboard → `PrePostComparison` | `signals.prePostByConcept` (per concept: `pre` and `post` `{ counts, total }`); `sessions.close` ends the session | instructor secret |

`getStudentView` returns only the caller's own level per concept (no counts, no other participants) plus the current concept, the current prompt (`sessions.activePromptId` → `prompts`: rating or open-ended, optional ≤ 200-char question; every `sessions.setActiveConcept` call inserts a new prompt, so earlier prompts and their `promptResponses` are kept for staff) and the ordered list of concepts the instructor has already made current (`sessions.activeHistory`, appended once per concept by `sessions.setActiveConcept`); the student page shows one card for the current prompt, a collapsed *Already covered* list for revising earlier answers, and nothing for concepts not yet covered — `signals.upsert` rejects those server-side. `getInstructorView` returns exact per-level counts and the denominator `N` for every concept; the UI flags `N < 5` as a low sample and `N = 0` as "no responses" (grey, never green). There is no session-level phase: the session page always writes `pre` (`signals.upsert`), and the only `post` input is a room member updating their rating in the room (`signals.roomCheckIn`, for the room's concept). The graph, metrics and concept details use `pre` only; `post` appears only in the before/after peer-help panel.

### Credentials (disclosed hackathon compromise)

There are no accounts. `sessions.create` is called with a random 72-character secret the browser generates and keeps in `localStorage` under `dorsal:instructor:<sessionId>`; only its SHA-256 is stored. Students do the same with a per-code token under `dorsal:student:<code>`; `sessions.join` hashes it and reuses the existing participant on refresh. Every protected query/mutation takes the credential as an argument and checks it in `convex/credentials.ts` (`getInstructorSession`, `requireParticipant`, `findParticipant`) — a wrong credential returns `null` or throws; nothing is trusted from client-side flags.

### Where Claude runs

Claude is called **only** from `convex/claude.ts`, a Convex **Node.js action** (`"use node"`). The path, end to end:

1. Instructor presses **Suggest clusters** → `clusters.requestSuggestions` (mutation) checks the secret, refuses if there are no pending questions or a run is already `running`, inserts an `aiRuns` row (`operation: "clusterQuestions"`, `model`, `status: "running"`) and schedules `internal.claude.clusterQuestions` with `ctx.scheduler.runAfter(0, …)`. The button is disabled while `latestRun.status === "running"`.
2. The action reads its batch through `clusters.getClusterInput` (internal query): up to 40 pending questions as `{ id, content, conceptId }` plus the session's concepts `{ id, label, description }`.
3. One Anthropic `messages.create` call with a single `save_clusters` tool and `tool_choice: { type: "tool", name: "save_clusters" }` — the model cannot answer in prose, only with the tool's JSON.
4. `lib/aiSchemas.ts` → `sanitizeClusterSuggestions` parses the tool input with Zod (title/summary strings, `confidence` 0–1, 2–40 question IDs) and then checks it against the exact input batch: question IDs that were not sent or appear twice are dropped, concept IDs that are not in the session are dropped (falling back to the questions' own concepts), clusters left with fewer than two real questions are dropped. A malformed shape throws and the run is marked `error`.
5. `clusters.saveSuggestions` (internal mutation) re-validates inside the transaction — it only claims questions that are still `pending` in this session — and stores each cluster with `status: "suggested"`, `source: "ai"`; the `aiRuns` row becomes `ok` with `latencyMs`.
6. The instructor **publishes** (students now see the cluster through `clusters.listPublished`), **discards** (questions return to `pending`) or ignores the suggestion. Nothing the model produced is shown to students without this step.

If anything fails (`clusters.markRunError`), the run shows `error` in the cluster queue with the message, the questions stay pending, and the instructor groups them by hand: select questions → *Group selected (N) into a cluster* → `clusters.createManual`, which publishes directly with `source: "manual"`. The seed also ships one such manual cluster so the demo has a published cluster even when the API is down.

**Env vars.** `ANTHROPIC_API_KEY` and `CLAUDE_MODEL` are Convex deployment environment variables (`npx convex env set ANTHROPIC_API_KEY sk-…`, `npx convex env set CLAUDE_MODEL claude-…`); they are never `NEXT_PUBLIC_` and the browser never talks to Anthropic. The only browser-side variable is `NEXT_PUBLIC_CONVEX_URL` (written by `npx convex dev`). `CONVEX_DEPLOY_KEY` is used only by the CLI in CI/agent environments.

**Lesson setup (concept suggestions).** Before a session exists the instructor uploads lecture material (PDF, text/Markdown, PNG/JPEG; ≤ 5 files, 10 MB each, 20 MB total) to Convex file storage and/or pastes notes, then presses **Suggest concepts**. `claude.inferConcepts` (public action, one Claude call, forced `save_concepts` tool) sends the files as `document`/`image` blocks plus the title and notes, validates the output with `sanitizeConceptSuggestions` (≤ 12 concepts, unique labels, prerequisite labels mapped to indices, unknown/self/cycle links dropped) and returns it to the page; it always deletes the uploaded files. Uploads that never reach the action (a failed batch, or a direct call) are deleted by the `lessons.purgeStaleUploads` cron after an hour, and `lessons.generateUploadUrl` refuses new URLs after 100 were issued in 10 minutes (counted in `uploadGrants`, purged by the same cron). Nothing is saved until the instructor has edited the list (rename, describe, add, remove, set *Builds on* prerequisites — cycles are refused) and pressed **Create session**, which calls `sessions.create` with the concepts; the server re-validates them (1–12, unique, acyclic) and lays them out. With no secret yet to check, `lessons.startInferRun` caps inference globally at 20 runs per 10 minutes and logs each run in `aiRuns`. If the call fails, concepts can be added by hand.

**What is sent to Claude, and what is not.** Sent: the text of pending questions, their question IDs and concept IDs, and the concept labels/descriptions. Not sent: aliases, participant IDs or tokens, confidence signals, room chat, the session title/code, anything about the instructor, or any prior model output. `aiRuns` stores model name, status, latency and the error string — never the prompt or the questions.

**Model limitations and mitigations** (Anthropic checklist, `docs/Build_Instructions.md` §7):

| Risk | Mitigation |
|---|---|
| Merging unrelated questions into one cluster | Questions are shown verbatim inside the suggestion so the instructor can see what was grouped; discard returns them to the queue; manual grouping is always available. |
| Fabricated or duplicated question/concept IDs | Dropped by `sanitizeClusterSuggestions` against the exact input batch, then again by `saveSuggestions`, which only claims pending questions of this session (tested in `convex/clusters.test.ts`). |
| Over-confident titles/summaries | Stored as `suggested`, never auto-published; `confidence` is displayed, titles/summaries are length-capped, and the UI labels them as Claude suggestions pending review. |
| Prose instead of structured output, or a malformed shape | Forced `tool_use` plus Zod; a parse failure marks the run `error` rather than storing anything. |
| API outage, missing key, latency | The run is logged with its error, the button re-enables, and the manual path and the seeded fallback cluster keep the demo moving. |

## Run

```bash
npm install
npx convex dev        # needs `npx convex login` or a dev CONVEX_DEPLOY_KEY; writes .env.local (NEXT_PUBLIC_CONVEX_URL) and watches convex/
npm run dev           # second terminal → http://localhost:3000
```

Create a session on `/`; the instructor tab lands on `/instructor/<sessionId>` with its secret in `localStorage`. Students open `/join/<CODE>` (ideally in a second browser profile or device).

## Seed / reset the demo session

```bash
npx convex dev --once                # push the current convex/ first if the deployment is shared with other branches
npx convex run seed:reset            # or: npx convex run seed:reset '{"code":"ABC123"}'
```

`seed.reset` is an `internalMutation` — it cannot be called from the browser. It deletes every row of the `DEMO01` session across all tables (rooms, messages, clusters, aiRuns, questions, signals, participants, edges, concepts) and recreates it with the 5 recursion concepts and 4 prerequisite edges (`RECURSION_LESSON` in `convex/seed.ts`, inserted through the same `insertLesson` as `sessions.create`), 24 participants flagged `isSimulated: true` (aliases `Sim 1…24`), a skewed `pre` distribution (*Call stack & frames* and *Return values* mostly confused, *Base case* mostly can-explain, *Tree recursion* half-answered) and 10 questions in three paraphrase groups: the four stack-unwinding and three base-case questions are **pending** (for the live *Suggest clusters* moment) and the three return-value questions are already grouped into one **published** manual cluster, *Tracing recursive return values* (concepts *Return values* + *Call stack & frames*), so students see a published cluster even if Claude is unavailable. It is idempotent: run it twice and there is still exactly one `DEMO01` session with one cluster and seven pending questions. It prints the instructor URL and a fresh secret; paste the printed `localStorage.setItem(...)` line into the instructor tab's console, reload, and the dashboard shows the seeded data. Students join at `/join/DEMO01`.

## Tests

```bash
npm test              # vitest run, offline — mocks the Convex backend with convex-test on @edge-runtime/vm
npm run test:watch
```

`convex/*.test.ts` cover the scenarios from `docs/Build_Instructions.md` §8 against the real functions:

| File | Scenarios |
|---|---|
| `prompts.test.ts` | every push is a new prompt with its own rating responses (earlier prompts keep theirs, the graph keeps the latest per concept); open-ended answers only for the current open prompt, 1–500 chars, editable until the next push, shown without names; history is staff-only (TAs included); staff (incl. TAs) can make an earlier prompt current again, students then see their earlier answer and new answers join that prompt |
| `sessions.test.ts`, `signals.test.ts` | (6) `signals.upsert` rejects a never-current concept and accepts the current or a previously-current one; `answeredCount`/`coveredConceptIds` track the live prompt; `setActiveConcept` appends to `activeHistory` once per concept and stores the trimmed ≤ 200-char question on a new prompt; (1) two confused → 2/2, change to partial → 1/2 with no double counting while the student view hides the breakdown; (2) wrong tokens/secrets get `null`/error and students never see another participant's signal; (8) zero responses → `total 0`, no NaN; (10) re-joining with the same token reuses the participant; (9) session-page ratings stay `pre`, only room members can write `post` via `signals.roomCheckIn`, and `post` never changes the graph counts |
| `questions.test.ts` | (3) a submitted question appears only in `questions.listInstructor` (without participant IDs); `clusters.listPublished` and `sessions.getStudentView` never contain pending question text; after `clusters.publish` students see the cluster with `questionCount` but no participant data; hidden questions are excluded; the 5-per-60 s rate limit (fake `Date`) |
| `lessons.test.ts` | Lesson setup: `layoutConcepts`/`canAddPrerequisite`/`removeConcept`; `sanitizeConceptSuggestions` cleans canned `save_concepts` output (dedupe, caps, cycle/unknown links dropped, wrong shape throws); `sessions.create` stores edited concepts in order with edges and rejects empty/duplicate/cyclic lessons; `lessons.startInferRun` global rate limit |
| `clusters.test.ts` | (4) `sanitizeClusterSuggestions` drops invented/duplicate question IDs and invalid concept IDs, rejects malformed shapes; `clusters.saveSuggestions` never stores IDs outside the session's pending questions; (7) `requestSuggestions` refuses with no pending questions, records an `aiRuns` row and refuses a concurrent run; after `markRunError`, `createManual` publishes a cluster students can see and a retry is allowed |
| `rooms.test.ts` | (5) capacity and duplicate membership enforced in `rooms.join`, helper role needs opt-in, closed rooms reject joins; (6) non-members get `null` from `rooms.get`/`messages.listByRoom` and cannot send, members can send/read with aliases only; the 10-per-10 s message rate limit |
| `seed.test.ts` | `seed.reset` is idempotent; 24 simulated participants; 7 pending + 3 clustered questions; exactly one published manual fallback cluster, visible to students with counts only |

The tests never load `convex/claude.ts` (excluded in `convex/test.setup.ts`) and make no Anthropic calls; the AI error path is exercised through `clusters.markRunError`. Convex's bundler skips multi-dot files, so test files are never deployed.

```bash
npm run lint && npx tsc --noEmit && npm run build
```

## Security and privacy limitations

- **Hackathon credential compromise (disclosed).** A single shared instructor secret per session, stored in `localStorage`, is the only instructor authentication; whoever holds it (or the device) is the instructor. Student tokens are likewise `localStorage` convenience credentials: they prove "same browser", not identity, and a room link carries the session code (`/room/<id>?code=DEMO01`) only so the page can pick the right token. A real deployment needs an auth provider with instructor/course roles and server-side identity checks.
- **Pseudonymous, not anonymous to operators.** Aliases hide identity from classmates and the instructor UI, but the deployment operator can see every row. We store no names, emails or grades and make no FERPA claims.
- **Aggregates only, with sample sizes.** Students see their own levels and published clusters (title, summary, counts) only; per-level breakdowns are suppressed student-side when `N < 5`. Instructors see exact counts with a low-sample warning. Graph colours are labelled *Self-reported understanding* — a signal, not proof of learning.
- **Simulated data is labelled.** Seeded participants carry `isSimulated: true` and are labelled in the UI; the demo never presents fake numbers as real students.
- **AI is advisory.** Claude only ever sees question text and concept IDs; its output is validated, stored as a suggestion and published by a human. Known model limitations — merging unrelated questions, over-confident titles, inventing relationships — are mitigated by ID validation, instructor review and the manual fallback (see the table above), not eliminated.
- **Peer rooms are pseudonymous and unmoderated** beyond the instructor's ability to close a room; messages are kept until the session is reset.
- **Not yet enforced:** rate limits on signals (questions and chat are rate-limited), question deletion by the author, data retention/expiry, and anything beyond one lecture per session.
