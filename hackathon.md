# Hackathon log

- **Project:** Dorsal
- **Event:** Cal Hacks 13.0
- **What it does:** Students in a lecture tap a confidence level and ask anonymous questions; the instructor sees live confusion per concept, Claude clusters the questions, and students get peer-help rooms.
- **Live app:** https://dorsaledu.vercel.app
- **Repo:** https://github.com/murpyl/Dorsal
- **Frontend:** Vercel
- **Convex deployment:** https://kindly-vulture-318.convex.cloud
- **Components:** none (no `convex/convex.config.ts`)
- **Convex features:** schema (15 tables, 23 indexes), queries, mutations, actions (`"use node"`), scheduled functions (`ctx.scheduler.runAfter`), crons, file storage, realtime `useQuery`
- **Auth:** none (hashed instructor/TA secrets and student tokens verified in `convex/credentials.ts`)
- **AI models:** none hardcoded; `convex/claude.ts` reads the model id from the `CLAUDE_MODEL` deployment env var
- **Started:** 2026-10-24T01:11:25Z
- **Last updated:** 2026-10-25T07:20:51Z

## How we use Convex

- **Live confusion radar** — students call `signals.upsert`; dashboard, concept graph and projector subscribe with `useQuery(api.sessions.getInstructorView)` and recolour without a refresh (`convex/signals.ts`, `convex/schema.ts` index `by_concept_phase`, `components/RadarDashboard.tsx`).
- **Instructor-pushed prompts** — `sessions.setActiveConcept` writes a `prompts` row; every student's card flips live (`convex/sessions.ts`, `convex/prompts.ts`, `components/StudentCockpit.tsx`).
- **Claude clustering** — `clusters.requestSuggestions` inserts an `aiRuns` row and schedules the `"use node"` internal action `claude.clusterQuestions`; results return via an internal mutation and the moderation queue updates live (`convex/clusters.ts`, `convex/claude.ts`).
- **Peer rooms + chat** — capacity and a 10-messages/10-s throttle are read-check-write inside one mutation; roster and messages are reactive (`convex/rooms.ts`, `convex/messages.ts`, index `by_room_time`).
- **Lesson upload → concepts** — PDFs go to Convex file storage via `lessons.generateUploadUrl`, `claude.inferConcepts` reads them with `ctx.storage.get`, a 15-min cron purges stale uploads (`convex/lessons.ts`, `convex/crons.ts`).
- **Demo seed** — `seed.reset` is an `internalMutation` rebuilding session `DEMO01` across all tables (`convex/seed.ts`).

Live without refresh: instructor dashboard, TA view, projector, student card, peer room, published clusters.

## Log

- 2026-10-24 01:11 `816953b` AGENTS.md, spec and build plan (`docs/`)
- 02:28 `0d831b7` Phase 1: schema, sessions/signals, join + instructor pages
- 02:41 `a7c37a8` Concept graph (`components/ConceptGraph.tsx`, `convex/sessions.ts`)
- 02:52 `7a9f125` Full schema for parallel phases (`convex/schema.ts`)
- 03:20 `9dbc740` Peer rooms, chat, pre/post (`convex/rooms.ts`, `convex/messages.ts`)
- 03:29 `9ae4a16` Questions + Claude clustering (`convex/questions.ts`, `convex/clusters.ts`, `convex/claude.ts`)
- 03:29 `51b3380` Seed/reset + convex-test suites (`convex/seed.ts`, `convex/*.test.ts`)
- 03:31 `7fe1458` Cluster output sanitizer (`lib/aiSchemas.ts`)
- 04:02 `40131ff` Integration polish, tests
- 09:28 `34ed514` Room check-in rating (`convex/rooms.ts`, `convex/schema.ts`)
- 09:56 `bc206a1` Lesson upload, concept inference, cron (`convex/lessons.ts`, `convex/crons.ts`)
- 10:02 `70c19c5` Live prompt gating (`convex/sessions.ts`, `components/StudentCockpit.tsx`)
- 10:22 `a5a6fb3` Rename ClassPulse → Dorsal
- 18:57 `1ca238b` TA role (`convex/credentials.ts`, `app/ta/[sessionId]/page.tsx`)
- 19:18 `c8e9b36` TA identity (`convex/tas.ts`, `convex/sessions.ts`)
- 23:06 `f10a465` Prompt history + open responses (`convex/prompts.ts`, `convex/schema.ts`)
- 2026-10-25 01:59 `db7d2ca` Switch-prompt UI (`components/RadarDashboard.tsx`)
- 06:44 `d03cad0` Demo-video seed (`convex/seedVideo.ts`)
- 07:20 `3883f36` Projector mode (`components/ProjectorMode.tsx`, `app/instructor/[sessionId]/projector/page.tsx`)
