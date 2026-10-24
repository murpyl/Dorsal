# Phases 3–5 contract (parallel build)

Phases 3, 4 and 5-infra are built **in parallel by separate sessions**, each on its own branch/PR into `main`. This document fixes the schema (already in `convex/schema.ts`), the Convex function contract, and **file ownership** so the branches merge cleanly. Do not change another phase's files beyond the explicit insertion points below. If you must, keep the edit to a few lines and call it out in the PR.

Credentials follow the existing pattern (`convex/credentials.ts`): students pass `{ sessionId, token }`, instructors pass `{ sessionId, instructorSecret }`; every protected query returns `null`/throws if the credential is wrong. `getInstructorSession`, `requireParticipant`, `findParticipant`, `isValidSecret`, `sha256` already exist — reuse them, don't duplicate.

## File ownership

| Owner | Files (create or edit) |
|---|---|
| **Phase 3 (A)** | `convex/questions.ts`, `convex/clusters.ts`, `convex/claude.ts` (`"use node"`), `lib/aiSchemas.ts`, `components/QuestionComposer.tsx`, `components/ClusterQueue.tsx`, `components/PublishedClusters.tsx`, `docs/plans/phase-3-questions-clustering.md` |
| **Phase 4 (B)** | `convex/participants.ts`, `convex/rooms.ts`, `convex/messages.ts`, `convex/sessions.ts` (add `setPhase`, `close` only), `convex/signals.ts` (add `prePostByConcept` query only), `app/room/[roomId]/page.tsx`, `components/PeerRoom.tsx`, `components/HelperOptIn.tsx`, `components/RoomList.tsx`, `components/PrePostComparison.tsx`, `docs/plans/phase-4-peermesh.md` |
| **Phase 5 infra (C)** | `convex/seed.ts`, `convex/*.test.ts`, `vitest.config.*`, `package.json` (add `vitest`, `convex-test`, `@edge-runtime/vm`, `test` script), `README.md`, `docs/demo-script.md`, `docs/plans/phase-5-seed-tests.md` |
| **Shared, insertion points only** | `components/StudentCockpit.tsx`, `components/RadarDashboard.tsx`, `components/ConceptGraph.tsx` (A only: cluster marker on nodes) |
| **Frozen** | `convex/schema.ts` (complete; if you truly need a field, add it as `v.optional` and say so in the PR), `convex/credentials.ts`, `lib/credentials.ts`, `lib/levels.ts`, `app/page.tsx`, `app/layout.tsx` |

### Insertion points in shared components

Each phase adds **self-contained client components that run their own `useQuery`/`useMutation`** and mounts them with one JSX line (plus one import). Do not extend `sessions.getStudentView` / `sessions.getInstructorView`; add new queries in your own module instead.

`components/StudentCockpit.tsx` (props available: `view.sessionId`, `token`, `code`, `view.concepts`, `view.activeConceptId`, `view.state`):
- A: `<QuestionComposer sessionId token concepts activeConceptId />` directly under the `<header>`; `<PublishedClusters sessionId token />` after the concept list.
- B: `<HelperOptIn sessionId token concepts />` after the concept list; `<RoomList sessionId token />` after that. Final order: header, QuestionComposer, concepts, PublishedClusters, HelperOptIn, RoomList.

`components/RadarDashboard.tsx` (props available: `sessionId`, `secret`, `view.phase`, `view.concepts`, `selected`):
- A: `<ClusterQueue sessionId instructorSecret concepts />` as a new `<section>` after the per-concept distribution list; in the detail `<aside>`, replace the placeholder "Question clusters → None published…" block with `<ConceptClusters sessionId instructorSecret conceptId={selected._id} />` (export it from `ClusterQueue.tsx`).
- B: a phase toggle + "Close session" control in the `<header>` right column (under the join code); `<PrePostComparison sessionId instructorSecret />` as a new `<section>` after the per-concept list (before A's ClusterQueue); `<RoomList>` instructor variant is **not** needed — put live room status inside `PrePostComparison`'s sibling `<RoomStatus sessionId instructorSecret />` (export from `RoomList.tsx`) placed next to it. Final section order: header, metrics, graph+aside, per-concept list, PrePostComparison + RoomStatus, ClusterQueue.

Add a 4th metric card only in Batch 2 (after merge) — leave the metrics grid alone.

## Convex function contract

### Phase 3 (A)

| Function | Type | Args → returns |
|---|---|---|
| `questions.submit` | mutation | `{ sessionId, token, conceptId, content }`; trims, 1–500 chars; rate limit: max 5 questions per participant per 60 s (count via `by_participant` index); inserts `state: "pending"` |
| `questions.listInstructor` | query | `{ sessionId, instructorSecret }` → pending + clustered questions with `conceptLabel`, newest first; **never** `participantId` beyond what's needed (return `isSimulated` only) |
| `questions.hide` | mutation | `{ sessionId, instructorSecret, questionId }` → `state: "hidden"` |
| `clusters.requestSuggestions` | mutation | `{ sessionId, instructorSecret }`; requires ≥ 1 pending question; inserts `aiRuns` row `{ operation: "clusterQuestions", model: process.env.CLAUDE_MODEL ?? "unset", status: "running" }` and `ctx.scheduler.runAfter(0, internal.claude.clusterQuestions, { sessionId, runId })`; returns `runId` |
| `claude.clusterQuestions` | internalAction (`"use node"`) | `{ sessionId, runId }`; loads ≤ 40 pending questions + concepts via `internal.clusters.getClusterInput`; calls Anthropic with one forced tool `save_clusters`; validates with Zod (`lib/aiSchemas.ts`), drops IDs not in the input, dedupes question IDs across clusters; persists via `internal.clusters.saveSuggestions`; on any failure patches the run to `status: "error"` with a short `error` string. Model = `process.env.CLAUDE_MODEL` (throw a clear error if unset), `max_tokens` ≤ 2048, 30 s timeout |
| `clusters.getClusterInput` | internalQuery | `{ sessionId }` → `{ concepts: {id,label,description}[], questions: {id,content,conceptId}[] }` — **no participant data** |
| `clusters.saveSuggestions` | internalMutation | `{ sessionId, runId, clusters[] , latencyMs }` → inserts `status: "suggested", source: "ai"`, marks questions `clustered`, patches run `ok` |
| `clusters.listInstructor` | query | `{ sessionId, instructorSecret }` → suggested + published clusters with their question texts and concept labels, plus the latest `aiRuns` row (`status`, `model`, `latencyMs`, `error`) |
| `clusters.listPublished` | query | `{ sessionId, token }` → published clusters only: `_id, title, summary, conceptIds, questionCount, helperCount` (helperCount = participants whose `helperConceptIds` intersects `conceptIds`; **no identities**) |
| `clusters.update` | mutation | `{ sessionId, instructorSecret, clusterId, title?, summary?, conceptIds? }` (suggested or published) |
| `clusters.publish` / `clusters.discard` | mutation | `{ sessionId, instructorSecret, clusterId }`; discard returns its questions to `pending` |
| `clusters.createManual` | mutation | `{ sessionId, instructorSecret, title, summary, conceptIds, questionIds }` → `status: "published", source: "manual"` (the fallback when Claude fails) |
| `clusters.listForConcept` | query | `{ sessionId, instructorSecret, conceptId }` → published clusters touching the concept, with question texts (feeds the graph node detail panel) |

Graph: `ConceptGraph` nodes get an optional `openClusters: number` marker (small badge). `RadarDashboard` passes it from a map built with `clusters.listInstructor` data; if A finds this too invasive, do it in Batch 2 instead.

### Phase 4 (B)

| Function | Type | Args → returns |
|---|---|---|
| `participants.setHelper` | mutation | `{ sessionId, token, conceptIds }` → replaces `helperConceptIds` (validate concepts belong to session) |
| `participants.me` | query | `{ sessionId, token }` → `{ alias, helperConceptIds }` |
| `rooms.createForCluster` | mutation | `{ sessionId, instructorSecret, conceptId, clusterId?, title?, capacity? }` → `roomId`; default capacity 6, cluster must be published if given |
| `rooms.createAsHelper` | mutation | `{ sessionId, token, conceptId, clusterId? }` → helper who opted into `conceptId` opens a room and joins as `helper` |
| `rooms.listBySession` | query | `{ sessionId, token }` (student) and `rooms.listInstructor` `{ sessionId, instructorSecret }` → open rooms with `memberCount`, `capacity`, `conceptLabel`, `clusterId`, `isMember` (student variant) |
| `rooms.get` | query | `{ roomId, token }` → `null` unless member; room + members `{ alias, role, isSimulated }` |
| `rooms.join` | mutation | `{ roomId, token, role }`; **transactional**: re-reads member count inside the mutation, rejects when `count >= capacity`, rejects duplicate membership via `by_room_participant`; closed room → error |
| `rooms.leave` | mutation | `{ roomId, token }` |
| `rooms.close` | mutation | `{ roomId, instructorSecret }` (also allowed: the helper who created it) |
| `messages.send` | mutation | `{ roomId, token, body }`; member only; 1–500 chars; max 10 messages / participant / 10 s |
| `messages.listByRoom` | query | `{ roomId, token }` → `null` unless member; last 200 by `by_room_time` with `authorAlias`, `isMine` |
| `sessions.setPhase` | mutation | `{ sessionId, instructorSecret, phase }` |
| `sessions.close` | mutation | `{ sessionId, instructorSecret }` → `state: "closed"` |
| `signals.prePostByConcept` | query | `{ sessionId, instructorSecret }` → per concept `{ conceptId, label, pre: {counts,total}, post: {counts,total} }` |

Room page `/room/[roomId]`: reads `token` from `localStorage` via `studentTokenKey(code)` — the room query must therefore return the session `code`, or the page takes `?code=` in the URL. B decides; document it. `I understand now` → `signals.upsert(level: "can_explain")`, `Still confused` → `"confused"`, both for the room's `conceptId` under the session's **current** phase (the mutation already does this).

### Phase 5 infra (C)

- `convex/seed.ts`: `reset = internalMutation({ args: { code?: v.optional(v.string()) } })`, run with `npx convex run seed:reset`. Deletes everything for the demo session (all tables, in dependency order), recreates the session with code `DEMO01` (fixed) and the same 5 recursion concepts/4 edges as `sessions.create` (import `SEED_CONCEPTS`/`SEED_EDGES` — export them from `sessions.ts`, the only edit to that file), ~24 participants with `isSimulated: true` and aliases `Sim 1…`, a skewed `pre` signal distribution (call stack / return values mostly confused), and ~10 deterministic pending questions in paraphrase groups (stack unwinding / return values / base case). Returns `{ sessionId, code, instructorSecret }` and logs the instructor URL + secret so the operator can paste the secret into `localStorage` (`classpulse:instructor:<sessionId>`). Do **not** seed clusters/rooms/messages in this batch.
- Tests: `vitest` + `convex-test` (`@edge-runtime/vm` environment) in `convex/*.test.ts`; cover manual scenarios 1, 2, 8, 10 from `docs/Build_Instructions.md` §8 against the Phase 1–2 functions. `npm test` must pass without a deployment.
- `README.md`: architecture section (tables, which query powers which view, where Claude runs, env var names), run/seed/test commands, limitations. `docs/demo-script.md`: the 2-minute script from §9 with the manual-cluster fallback step.

## Shared rules for every session

- Follow `AGENTS.md` and the binding UX/privacy rules in `docs/Build_Instructions.md` §3–§6 (no identities in student-facing queries, `N < 5` suppression student-side, colours labelled "Self-reported understanding", simulated participants labelled).
- Write your `docs/plans/phase-*.md` first and commit it with the code.
- Run `npm run lint && npx tsc --noEmit && npm run build` before pushing. The `LayoutProps` type error from `tsc` disappears once `next build`/`next dev` has generated `next-env.d.ts`.
- `npx convex dev --once` pushes functions to the **shared** hosted dev deployment (needs `CONVEX_DEPLOY_KEY`). Other sessions push to the same deployment, so another branch's functions may appear/disappear while you test — re-push before testing and don't debug "missing function" errors for long.
- Don't add dependencies beyond those named here. Don't implement stretch features (`proposeConceptLinks`, `suggestPeerHelp`, instructor agent, checks).
