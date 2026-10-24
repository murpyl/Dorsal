# Lesson setup: upload notes → infer concepts → edit → create session

Request: the instructor's "create session" flow lets them upload lecture notes and related material, has Claude infer the lesson's concepts, and lets them edit the concepts (add / remove / rename / prerequisites) **before** the session exists. The created lesson replaces the hard-coded recursion concepts that `sessions.create` seeds today.

## Plan

- **Page.** New `/instructor/new` (`app/instructor/new/page.tsx`); the landing card's button links there. Three parts on one page, all draft state in React until the session is created:
  1. *Lesson*: title + material — files (PDF, `.txt`/`.md`, PNG/JPEG; ≤ 5 files, ≤ 10 MB each, ≤ 20 MB total) and/or pasted notes (≤ 20 000 chars). Disclosure: material is sent to Anthropic's Claude API to suggest concepts and deleted from storage right after.
  2. *Suggest concepts* (one Claude call). On error the message is shown and the instructor can still build the list by hand ("Add concept"); the flow never depends on the API.
  3. *Concepts editor*: per concept label (≤ 60), description (≤ 200), "Builds on" prerequisite chips (remove ×, add from a select that only offers concepts that would not create a cycle), remove concept; "Add concept". Live graph preview (existing `ConceptGraph`, zero counts) with the same layout the server will store. *Create session* (needs title + 1–12 concepts with unique non-empty labels).
- **Upload.** Convex file storage: `lessons.generateUploadUrl` (mutation) → browser POSTs each file → `storageId`s passed to the action. No new dependencies.
- **AI.** `claude.inferConcepts` (public action, `"use node"`): args `{ title, notes?, storageIds }`. Validates file count/size/type from `_storage` metadata, sends PDFs as `document` blocks (base64), text files as text `document` blocks, images as `image` blocks, plus pasted notes, and forces one `save_concepts` tool call. Always deletes the uploaded files (`finally`). Returns `{ concepts: [{ label, description, prerequisites: number[] }] }`.
  - `lib/aiSchemas.ts`: `SAVE_CONCEPTS_TOOL` + `sanitizeConceptSuggestions` (zod; trims/caps lengths, dedupes labels case-insensitively, caps at 12, maps prerequisite labels → indices, drops unknown/self/cycle-creating links). Unit-tested with canned tool output.
  - Abuse guard (the action is pre-session, so there is no instructor secret yet): each call logs an `aiRuns` row (`operation: "inferConcepts"`, no `sessionId`, no content) via `lessons.startInferRun`, which rejects when > 20 runs started in the last 10 minutes (global). `aiRuns.sessionId` becomes optional, new index `by_operation_time`.
- **Create.** `sessions.create({ title, instructorSecret, concepts: [{ label, description, prerequisites: number[] }] })` validates (1–12 concepts, lengths, unique labels, valid indices, acyclic), inserts concepts in the given order with positions from `layoutConcepts` (`lib/lessonGraph.ts`: column = longest prerequisite chain, row = position within the column; 260 × 160 px grid like the seed), inserts `prerequisite_for` edges, sets the first concept active.
- **Seed.** `SEED_CONCEPTS` / `SEED_EDGES` move to `convex/seed.ts`; `seed:reset` (simulated `DEMO01` recursion demo) is unchanged. Tests create sessions with the recursion lesson through the new `sessions.create` args.
- **Docs.** README, Build_Instructions (function table, Phase 1 bullet), MVP_Outline ("instructor-seeded concepts" now = instructor-reviewed concepts from their material), demo-script if the create step is mentioned.

## Out of scope

PPTX/DOCX parsing (export to PDF), editing concepts after the session is created, saving drafts server-side, AI-proposed edges after creation (`claude.proposeConceptLinks` stays stretch).

## Acceptance

`npm test`, `npm run lint`, `npx tsc --noEmit`, build clean. Live: one real Claude call with a sample PDF returns editable concepts; editing + create produces a session whose instructor graph shows exactly the edited concepts/edges and whose student view lists them.
