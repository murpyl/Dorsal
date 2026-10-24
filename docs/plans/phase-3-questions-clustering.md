# Phase 3: Questions + Claude misconception clustering (Confusion Radar)

Scope: `docs/Build_Instructions.md` §5 Phase 3, built as session "A" of `phase-3-4-contract.md`. Schema is frozen; this phase only adds `convex/questions.ts`, `convex/clusters.ts`, `convex/claude.ts`, `lib/aiSchemas.ts`, three components, and one import + one JSX line at each named insertion point in `StudentCockpit` / `RadarDashboard`. No rooms, helpers opt-in, seed, tests, or stretch AI calls.

## Plan (one commit per feature)

1. **Questions** (`convex/questions.ts`)
   - `submit({ sessionId, token, conceptId, content })`: open session, valid participant, concept in session, trimmed 1–500 chars, max 5 questions per participant per 60 s (`by_participant` index), inserts `state: "pending"`.
   - `listInstructor({ sessionId, instructorSecret })`: pending + clustered questions, newest first, with `conceptLabel` and `isSimulated` only (no `participantId`). Returns `null` on bad credential.
   - `hide({ sessionId, instructorSecret, questionId })`: `state: "hidden"`. Cluster readers skip hidden questions, so a hidden question disappears everywhere.

2. **Clusters + Claude** (`lib/aiSchemas.ts`, `convex/clusters.ts`, `convex/claude.ts`)
   - `lib/aiSchemas.ts`: `SAVE_CLUSTERS_INPUT_SCHEMA` (the JSON schema given to Claude), the matching Zod schema, and `sanitizeClusterSuggestions(raw, input)` which parses, drops concept/question IDs not present in the input, dedupes question IDs across clusters (first cluster wins), drops clusters left with no questions, and falls back to the questions' own concepts when a cluster's `conceptIds` are all invalid. Pure function so it can be checked without an API call.
   - `clusters.requestSuggestions`: instructor only, ≥ 1 pending question, inserts `aiRuns { operation: "clusterQuestions", model: CLAUDE_MODEL ?? "unset", status: "running" }`, `scheduler.runAfter(0, internal.claude.clusterQuestions, { sessionId, runId })`, returns `runId`. Only ever triggered by the button — no effects, polling or auto-trigger.
   - `clusters.getClusterInput` (internalQuery): concepts `{id,label,description}` + ≤ 40 newest pending questions `{id,content,conceptId}`. No participant data.
   - `clusters.saveSuggestions` (internalMutation): re-checks that questions are still pending and concepts belong to the session (the action runs outside the transaction), inserts `status: "suggested", source: "ai"` with `confidence`, marks questions `clustered`, patches the run `ok` + `latencyMs`.
   - `clusters.markRunError` (internalMutation, small addition to the contract): patches the run to `error` with a short message. Needed so the action can fail honestly.
   - `claude.clusterQuestions` (`"use node"` internalAction): model from `CLAUDE_MODEL` (clear error if unset), key from `ANTHROPIC_API_KEY`, `maxRetries: 0` and `timeout: 30_000` on the client to keep API calls minimal, `max_tokens: 1500`, one tool `save_clusters` forced via `tool_choice: { type: "tool", name: "save_clusters" }`, system prompt listing concepts and rules (only use given IDs, every question at most once, leave unrelated questions out). Any thrown error → `markRunError`.
   - `clusters.listInstructor`: suggested + published clusters with question texts, concept labels, `confidence`, `source`, plus the latest `aiRuns` row.
   - `clusters.listPublished` (student): published only → `_id, title, summary, conceptIds, conceptLabels, questionCount, helperCount` (participants whose `helperConceptIds` intersects). No identities, no question text.
   - `clusters.update` / `publish` / `discard` / `createManual` / `listForConcept` as in the contract. `discard` returns the cluster's still-clustered questions to `pending`.

3. **Student UI** (`components/QuestionComposer.tsx`, `components/PublishedClusters.tsx`)
   - Composer: concept `<select>` defaulting to the current topic, textarea with 500-char counter, disclosure that the question is posted under a pseudonymous alias (not anonymous to operators), that its text is sent to Claude (Anthropic) for grouping, and not to include personal details. Shows rate-limit / validation errors from the mutation.
   - PublishedClusters: list of published clusters (title, summary, concept labels, "N questions", "N helpers opted in"). Empty state when none.
   - Mounted in `StudentCockpit` at the two named insertion points.

4. **Instructor UI** (`components/ClusterQueue.tsx`, exports `ConceptClusters`)
   - AI status from the latest run: running (spinner text) / ok (model + latency) / error ("AI suggestions unavailable: <error>" + pointer to manual grouping). Never shows fabricated output.
   - "Suggest clusters" button, disabled while a run is in flight or there are no pending questions.
   - Suggested clusters: title/summary/concepts editable inline (`clusters.update`), underlying question texts listed, Publish / Discard.
   - Published clusters: same card, read-only summary with Edit / Discard (unpublish).
   - Moderation queue: pending + clustered questions newest first with concept label, "simulated" badge, Hide; checkboxes on pending questions → "Group selected" form → `clusters.createManual` (manual fallback).
   - `ConceptClusters`: published clusters for one concept with their question texts, replacing the placeholder in the graph detail panel.
   - Cluster-count badge on graph nodes deferred to Batch 2 (needs an extra query in `RadarDashboard`, which is beyond the insertion-point budget).

## Acceptance

Student posts ≥ 3 paraphrased questions → they appear only in the instructor queue (§8 #3) → "Suggest clusters" yields one suggested cluster citing the original questions → instructor edits/publishes → student list and graph node panel update live. A fake tool response with invented/duplicate IDs is rejected by `sanitizeClusterSuggestions` (§8 #4). With the AI run in `error`, manual grouping publishes a cluster and the demo continues (§8 #7).
