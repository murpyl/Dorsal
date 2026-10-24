# Phase 1: Working live core

Scope: `docs/Build_Instructions.md` §5 Phase 1. Nothing from Phase 2+ (no graph rendering, questions, rooms, AI).

## Plan

- **Scaffold** Next.js (App Router, TS, Tailwind) in the repo root per §1; Convex as the only backend.
- **Schema** (only Phase 1 tables): `sessions`, `participants`, `concepts`, `conceptEdges`, `signals`, with the indexes from §3.
- **Credentials:** the browser generates secrets with `crypto.randomUUID()`. Convex mutations get seeded randomness, so they can't mint secrets. The server stores only SHA-256 hashes (`convex/credentials.ts`). The instructor secret lives in `localStorage` under `classpulse:instructor:<sessionId>`, and the student token under `classpulse:student:<CODE>`.
- **Functions:**
  - `sessions.create`: session + 6-char join code + 5 recursion concepts + 4 prerequisite edges.
  - `sessions.join`: reuses the participant matched by token hash, so a refresh doesn't create a duplicate.
  - `sessions.getStudentView`: the student's own levels only.
  - `sessions.getInstructorView`: returns `null` for a bad secret. Per-concept counts and N for the current phase.
  - `signals.upsert`: one row per participant/concept/phase. Convex mutations are serializable, so changing a level patches the row instead of double counting.
- **UI:**
  - `/`: create or join.
  - `/join/[code]`: student cockpit with three-state `ConfidenceSelector`; current topic pinned first.
  - `/instructor/[sessionId]`: `RadarDashboard`, live via `useQuery`. Counts shown as `n / N`, with a low-sample flag below 5.

## Acceptance

Sending a signal in browser A updates browser B without a refresh. Changing a signal does not double count it.
