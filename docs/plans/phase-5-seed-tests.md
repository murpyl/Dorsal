# Phase 5 infra (C): seed/reset, invariant tests, README, demo script

Scope: the "Phase 5 infra (C)" column of `docs/plans/phase-3-4-contract.md`. No UI, no clusters/rooms/messages seeding, no Phase 3/4 functions. The only edit outside C's files is exporting `SEED_CONCEPTS` / `SEED_EDGES` from `convex/sessions.ts`.

## Plan

- **`convex/seed.ts` — `reset` (internalMutation, `{ code? }`, default `DEMO01`).** Not callable from the browser; run with `npx convex run seed:reset`.
  1. Find every session with that code and delete its rows in dependency order: messages → roomMembers → rooms, clusters, aiRuns, questions, signals, participants, conceptEdges, concepts, then the session. Each table is read via its session/room index (signals via `by_concept_phase` per concept and phase).
  2. Recreate the session (`Recursion: how return values propagate`, `phase: "pre"`, fresh random instructor secret, hash stored) with the same 5 concepts / 4 prerequisite edges as `sessions.create`.
  3. 24 participants, `isSimulated: true`, aliases `Sim 1…Sim 24`. Their `tokenHash` is the SHA-256 of a short non-secret string, so no valid token (≥ 32 chars) can ever match a simulated participant.
  4. Deterministic `pre` signals from a fixed per-concept `[confused, partial, can_explain]` table: Base case mostly `can_explain`; Call stack & frames and Return values mostly `confused`; Tree recursion only partially answered. Participant order is rotated per concept so one alias isn't "always confused".
  5. 10 pending questions in three paraphrase groups — stack unwinding (4, on *Call stack & frames*), return values (3, on *Return values*), base case (3, on *Base case*) — with staggered `createdAt` so the moderation queue order is stable.
  6. Returns `{ sessionId, code, instructorSecret }` and `console.log`s the instructor URL and the `localStorage` key `classpulse:instructor:<sessionId>` to paste the secret into.
  Idempotent: running it twice leaves exactly one `DEMO01` session (new ids each run, which is why the URL/secret are printed every time).
- **Tests — `vitest` + `convex-test` on `@edge-runtime/vm`.** `vitest.config.ts` sets `environment: "edge-runtime"`; `convex/test.setup.ts` exports the `import.meta.glob` module map. Convex's bundler skips multi-dot files, so `*.test.ts` / `test.setup.ts` are never pushed. `npm test` runs `vitest run` (no watch, no deployment). Files:
  - `convex/sessions.test.ts` — §8 scenario 10 (same token rejoins as the same participant; a different token gets a new one) and scenario 2 (wrong token → `getStudentView` null; wrong secret → `getInstructorView` null and `setActiveConcept` throws; a student's view only contains their own `myLevel`, never counts or other participants).
  - `convex/signals.test.ts` — scenario 1 (two confused → confused 2 / total 2; one switches to partial → 1 / 2; the `signals` table holds exactly two rows; student view has no breakdown) and scenario 8 (fresh session → every concept `total 0`, all counts 0, nothing NaN).
  - `convex/seed.test.ts` — `reset` twice → one `DEMO01` session, 24 simulated participants, 10 pending questions, the planned skew, and the returned secret opens `getInstructorView`.
- **`README.md`** — architecture (tables, which reactive query feeds which view, credentials, where Claude runs and the env var names), run/seed/test commands, limitations and the disclosed hackathon credential compromise. Phase 3/4 functions are marked in progress.
- **`docs/demo-script.md`** — the §9 two-minute script, preceded by the seed/reset step and including the manual-cluster fallback (`clusters.createManual`) if Claude fails.

## Acceptance

`npm test` passes offline. `npx convex run seed:reset` twice on the dev deployment leaves one `DEMO01` session and the instructor dashboard shows the seeded skew. `npm run lint && npx tsc --noEmit && npm run build` clean.
