# ClassPulse

Live classroom **confusion radar** (A) + **peer help** (B) + **concept knowledge graph** (F), built for a single lecture at a time (first target: a Berkeley CS 61A recursion lecture). Students join with a six-letter code, report how well they understand each concept and ask anonymous questions. The instructor sees live counts, a colour-coded concept graph, Claude-clustered misconceptions to review, and opens capacity-limited peer rooms.

- Product spec: `docs/MVP_Outline.md` · implementation plan: `docs/Build_Instructions.md` · per-phase plans: `docs/plans/`
- Two-minute judging script: `docs/demo-script.md`

## Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Session create/join, 3-state confidence signals, live instructor radar | done |
| 2 | React Flow concept graph coloured by aggregate confidence, instructor-set current topic | done |
| 3 | Anonymous questions, moderation queue, Claude clustering with instructor review (`questions.*`, `clusters.*`, `claude.clusterQuestions`) | in progress |
| 4 | Helper opt-in, peer rooms + chat, pre/post comparison (`participants.*`, `rooms.*`, `messages.*`, `signals.prePostByConcept`) | in progress |
| 5 | Deterministic seed/reset, invariant tests, this README, demo script | done |

Functions marked *in progress* are specified in `docs/plans/phase-3-4-contract.md` and are being built on separate branches; everything below describes what is on `main`.

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

Convex is the system of record. All shared state (signals, questions, clusters, rooms, messages) lives in Convex tables and reaches every connected browser through reactive `useQuery` subscriptions — there is no polling, no custom websocket server and no second database. Mutations are transactional, which is what keeps "one signal per participant/concept/phase" and (Phase 4) room capacity correct under concurrent clients.

### Tables (`convex/schema.ts`, complete for all phases)

| Table | What a row is | Key indexes |
|---|---|---|
| `sessions` | One lecture: `title`, `code`, `state` (`open`/`closed`), `phase` (`pre`/`post`), `instructorSecretHash`, `activeConceptId` | `by_code` |
| `participants` | A pseudonymous student in a session: `tokenHash`, `alias` ("Student 3"), `helperConceptIds`, `isSimulated` | `by_session`, `by_token_hash` |
| `concepts` | Instructor-seeded graph node with a fixed `x`/`y` position (no layout library) | `by_session` |
| `conceptEdges` | Directed `prerequisite_for` / `related_to` / `frequently_confused_with` edge | `by_session` |
| `signals` | One participant's current level (`confused`/`partial`/`can_explain`) for one concept in one phase | `by_concept_phase`, `by_participant_concept_phase` |
| `questions` | Raw anonymous question (`pending`/`clustered`/`hidden`) — instructor-only until published via a cluster | `by_session_state`, `by_concept`, `by_participant` |
| `clusters` | A misconception group: `title`, `summary`, `conceptIds`, `questionIds`, `status` (`suggested`/`published`/`discarded`), `source` (`ai`/`manual`) | `by_session_status` |
| `rooms`, `roomMembers`, `messages` | Peer help room per concept/cluster, its members (`helper`/`learner`) and chat | `by_session`, `by_room_participant`, `by_room_time` |
| `aiRuns` | Operational log of each Claude call: `model`, `status`, `latencyMs`, `error` — never prompt or student content | `by_session` |

### Which reactive query powers which view

| View | Route / component | Convex functions | Credential |
|---|---|---|---|
| Landing | `/` → `app/page.tsx` | `sessions.create` (mutation) returns `{ sessionId, code }`; the browser generates the instructor secret | — |
| Student cockpit | `/join/[code]` → `components/StudentCockpit.tsx`, `ConfidenceSelector` | `sessions.join` (idempotent per token) → `sessions.getStudentView` (query); `signals.upsert` (mutation) | participant token |
| Instructor radar + graph | `/instructor/[sessionId]` → `components/RadarDashboard.tsx`, `ConceptGraph` | `sessions.getInstructorView` (one query feeds metrics, per-concept distributions, graph nodes/edges and the node detail panel); `sessions.setActiveConcept` | instructor secret |
| Question composer, moderation queue, published clusters *(Phase 3, in progress)* | mounted in the two components above | `questions.submit` / `listInstructor` / `hide`, `clusters.requestSuggestions` / `listInstructor` / `listPublished` / `publish` / `discard` / `createManual` / `listForConcept` | per role |
| Helper opt-in, rooms, chat, pre/post *(Phase 4, in progress)* | `/room/[roomId]` → `PeerRoom`, plus `HelperOptIn`, `RoomList`, `PrePostComparison` | `participants.setHelper` / `me`, `rooms.*`, `messages.send` / `listByRoom`, `sessions.setPhase` / `close`, `signals.prePostByConcept` | per role |

`getStudentView` returns only the caller's own level per concept (no counts, no other participants). `getInstructorView` returns exact per-level counts and the denominator `N` for every concept; the UI flags `N < 5` as a low sample and `N = 0` as "no responses" (grey, never green).

### Credentials

There are no accounts. `sessions.create` is called with a random 72-character secret the browser generates and keeps in `localStorage` under `classpulse:instructor:<sessionId>`; only its SHA-256 is stored. Students do the same with a per-code token under `classpulse:student:<code>`; `sessions.join` hashes it and reuses the existing participant on refresh. Every protected query/mutation takes the credential as an argument and checks it in `convex/credentials.ts` (`getInstructorSession`, `requireParticipant`, `findParticipant`) — a wrong credential returns `null` or throws; nothing is trusted from client-side flags.

### Where Claude runs (Phase 3)

Claude is called **only** from `convex/claude.ts`, a Convex **Node.js action** (`"use node"`) scheduled in the background by the instructor's *Suggest clusters* button (`clusters.requestSuggestions` → `ctx.scheduler.runAfter(0, internal.claude.clusterQuestions, …)`). The deployment env vars are `ANTHROPIC_API_KEY` and `CLAUDE_MODEL` (`npx convex env set ANTHROPIC_API_KEY …`); they are never `NEXT_PUBLIC_` and the browser never talks to Anthropic. The action receives ≤ 40 pending question texts and the concept list — no aliases, participant IDs, chat or confidence records — forces one `save_clusters` tool call, validates the result with Zod (`lib/aiSchemas.ts`), drops unknown question/concept IDs and stores clusters as **suggestions** that the instructor edits, publishes or discards. Each call is logged to `aiRuns`. If the call fails, the run is marked `error` and the instructor groups questions manually with `clusters.createManual`; the rest of the app is unaffected.

## Run

```bash
npm install
npx convex dev        # needs `npx convex login` or a dev CONVEX_DEPLOY_KEY; writes .env.local (NEXT_PUBLIC_CONVEX_URL) and watches convex/
npm run dev           # second terminal → http://localhost:3000
```

Create a session on `/`; the instructor tab lands on `/instructor/<sessionId>` with its secret in `localStorage`. Students open `/join/<CODE>` (ideally in a second browser profile or device).

## Seed / reset the demo session

```bash
npx convex run seed:reset            # or: npx convex run seed:reset '{"code":"ABC123"}'
```

`seed.reset` is an `internalMutation` — it cannot be called from the browser. It deletes every row of the `DEMO01` session across all tables and recreates it with the 5 recursion concepts and 4 prerequisite edges, 24 participants flagged `isSimulated: true` (aliases `Sim 1…24`), a skewed `pre` distribution (*Call stack & frames* and *Return values* mostly confused, *Base case* mostly can-explain, *Tree recursion* half-answered) and 10 pending questions in three paraphrase groups (stack unwinding, return values, base case). It is idempotent: run it twice and there is still exactly one `DEMO01` session. It prints the instructor URL and a fresh secret; paste the printed `localStorage.setItem(...)` line into the instructor tab's console, reload, and the dashboard shows the seeded data. Students join at `/join/DEMO01`.

## Tests

```bash
npm test              # vitest run, offline — mocks the Convex backend with convex-test on @edge-runtime/vm
npm run test:watch
```

`convex/*.test.ts` cover the invariants from `docs/Build_Instructions.md` §8: two confused → 2/2 and a change to partial → 1/2 with no double counting while the student view hides the breakdown (1); wrong tokens/secrets get `null` or an error and students never see another participant's signal (2); zero responses give `total 0` with no NaN (8); re-joining with the same token reuses the participant (10); plus `seed.reset` idempotency. Convex's bundler skips multi-dot files, so test files are never deployed.

```bash
npm run lint && npx tsc --noEmit && npm run build
```

## Security and privacy limitations

- **Hackathon credential compromise.** A single shared instructor secret per session, stored in `localStorage`, is the only instructor authentication; whoever holds it (or the device) is the instructor. Student tokens are likewise convenience credentials: they prove "same browser", not identity. A real deployment needs an auth provider with instructor/course roles and server-side identity checks.
- **Pseudonymous, not anonymous to operators.** Aliases hide identity from classmates and the instructor UI, but the deployment operator can see every row. We store no names, emails or grades and make no FERPA claims.
- **Aggregates only, with sample sizes.** Students see their own levels and (Phase 3) published clusters only; per-level breakdowns are suppressed student-side when `N < 5`. Instructors see exact counts with a low-sample warning. Graph colours are labelled *Self-reported understanding* — a signal, not proof of learning.
- **Simulated data is labelled.** Seeded participants carry `isSimulated: true` and are labelled in the UI; the demo never presents fake numbers as real students.
- **AI is advisory.** Claude only ever sees question text and concept IDs; its output is validated, stored as a suggestion and published by a human. Known model limitations — merging unrelated questions, over-confident titles, inventing relationships — are mitigated by ID validation, instructor review and the manual fallback, not eliminated.
- **Not yet enforced:** rate limits on signals (questions and chat are rate-limited in Phases 3–4), question deletion by the author, data retention/expiry, and anything beyond one lecture per session.
