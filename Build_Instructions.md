# ClassPulse — Implementation Instructions

## Goal

Build an end-to-end working hackathon MVP of **A (Confusion Radar) + B (PeerMesh) + F (KnowledgeGraph)**. Prioritize a reliably functioning real-time multi-device demo over production breadth. Use **Next.js App Router + TypeScript + Tailwind CSS + Convex**, **React Flow / `@xyflow/react`** for the concept map, and the official **Anthropic TypeScript SDK** for Claude-powered clustering, graph suggestions, and opt-in peer-help recommendations. Avoid custom websocket servers, another database, and unnecessary abstractions.

See `BUILD_OVERVIEW.md` for product behavior, sponsor mapping, safety constraints, and demo narrative.

## 0. Development principles

1. Convex is the source of truth for all shared state. Do not simulate real-time behavior by updating only local React state.
2. In every backend function, validate arguments, enforce session scopes, and restrict role-specific data.
3. Separate **public student data** from instructor-only aggregates and raw submissions.
4. Deliver a deterministic demo path even when the LLM fails or rate-limits.
5. Prefer simple, well-maintained libraries. Don't build a custom graph layout algorithm or message transport.
6. Do not attempt compatibility layers with hypothetical past versions; build for current documented APIs.

## 1. Bootstrap

Prerequisites: recent Node.js LTS, npm, Convex account, and an Anthropic API key for the AI path.

```bash
npx create-next-app@latest classpulse --typescript --tailwind --eslint --app
cd classpulse
npm install convex @xyflow/react lucide-react zod @anthropic-ai/sdk
npx convex dev
```

In a second terminal:

```bash
npm run dev
```

Use the Convex CLI's generated environment settings (`NEXT_PUBLIC_CONVEX_URL` and deployment variables) and generated `convex/_generated/api`. Register `ConvexReactClient` with `ConvexProvider` in a client component used by the root layout. Follow the official Convex Next.js quickstart; do not invent endpoint URLs.

Configure `ANTHROPIC_API_KEY` as a **Convex deployment environment variable** (e.g., `npx convex env set ANTHROPIC_API_KEY <value>` locally, then set the production deployment variable separately). Never put it in `.env.local` variables prefixed `NEXT_PUBLIC_` or expose it in a client component. Pick a current Claude model supported by your API account and configure `CLAUDE_MODEL` as a deployment environment variable; do not hardcode an unverified model ID.

The Claude-calling module must run in a Convex **Node.js action** (`"use node";` at the top of a dedicated action module, as required by Convex). Keep queries and mutations in ordinary Convex modules. Use `process.env.ANTHROPIC_API_KEY`, `Anthropic` from `@anthropic-ai/sdk`, bounded `max_tokens`, timeouts, and catch/validate all model outputs. This is a server-side integration, not a browser call.

## 2. Directory layout

```text
app/
  page.tsx                      # create/join landing page
  join/[code]/page.tsx          # student cockpit
  instructor/[sessionId]/page.tsx
  room/[roomId]/page.tsx
components/
  ConceptGraph.tsx
  ConfidenceSelector.tsx
  QuestionComposer.tsx
  ClusterQueue.tsx
  RadarDashboard.tsx
  PeerRoom.tsx
  SessionProvider.tsx
convex/
  schema.ts
  sessions.ts
  concepts.ts
  signals.ts
  questions.ts
  clusters.ts
  rooms.ts
  messages.ts
  interventions.ts
  claude.ts                     # Node.js Convex actions using Anthropic SDK
  seed.ts                       # dev-only demo seed (never public in production)
lib/
  metrics.ts
  aiSchemas.ts
```

## 3. Schema (high-level; use Convex `defineSchema`, `defineTable`, validators and indexes)

| Table | Fields | Essential indexes |
|---|---|---|
| `sessions` | title, code, state, instructorSecretHash, activeConceptId, createdAt | by_code |
| `participants` | sessionId, tokenHash, alias, isHelper, createdAt | by_session, by_token_hash |
| `concepts` | sessionId, label, description, order | by_session |
| `conceptEdges` | sessionId, fromId, toId, relation | by_session |
| `signals` | sessionId, conceptId, participantId, level, phase, updatedAt | by_concept, by_participant_concept_phase |
| `questions` | sessionId, conceptId, participantId, content, state, createdAt | by_session_state, by_concept |
| `clusters` | sessionId, title, summary, conceptIds, questionIds, status, createdAt | by_session_status |
| `rooms` | sessionId, conceptId, clusterId?, status, capacity | by_session, by_concept |
| `roomMembers` | roomId, participantId, role, joinedAt | by_room, by_room_participant |
| `messages` | roomId, authorId, body, createdAt | by_room_time |
| `interventions` | sessionId, clusterId, type, status, createdAt, completedAt? | by_session |
| `checkResponses` | sessionId, conceptId, participantId, promptId, correct?, phase | by_concept_phase |

Use real Convex IDs (`v.id`) for relationships. Store only a hash of access secrets, but note that a hash alone is insufficient unless every protected backend query/mutation verifies the supplied credential or authenticated identity. **For a hackathon, a single private instructor secret per session is acceptable only as a disclosed demo compromise**. For a real deployment, add a supported auth provider with instructor/course permissions. Avoid pretending client-side role flags are secure.

Do not store derived percentages redundantly until profiling shows it's necessary. Compute aggregate counts with indexed scans for small demo sessions; materialize counts later if class sizes make queries expensive.

## 4. Convex API contract

Implement these minimal functions (names can be adjusted consistently throughout frontend and backend).

| Function | Type | Behavior |
|---|---|---|
| `sessions.create` | mutation | Instructor creates session + join code |
| `sessions.join` | mutation | Validates code; creates/reuses participant |
| `sessions.getStudentView` | query | Active topic and safe session data |
| `sessions.getInstructorView` | query | Instructor credential required; returns detailed aggregate state |
| `concepts.listGraph` | query | Node/edge data with privacy-safe aggregates |
| `signals.upsert` | mutation | Upserts one level per participant/concept/phase |
| `questions.submit` | mutation | Anonymous question, length limit, rate limit |
| `questions.listInstructor` | query | Protected raw questions for review |
| `clusters.suggest` | internal mutation | Save validated AI suggestions |
| `clusters.publish` | mutation | Instructor approves a cluster |
| `rooms.createForCluster` | mutation | Instructor creates/open room |
| `rooms.join` | mutation | Atomically enforce room capacity + no duplicate membership |
| `messages.send` | mutation | Member-only, capped length, throttled |
| `messages.listByRoom` | query | Room-member-only content |
| `interventions.complete` | mutation | Close loop and create new response phase |
| `claude.clusterQuestions` | internal action | Send anonymized bounded question batch to Claude; validate and persist proposed clusters via internal mutation |
| `claude.proposeConceptLinks` | internal action | Suggest links between approved misconceptions and instructor-owned concept nodes; never auto-publish |
| `claude.suggestPeerHelp` | internal action | Suggest an opt-in help grouping using published clusters and declared helper topics, without inferring academic ability |

**Security requirement:** Never return instructor-only data or room messages from an unprotected `query`. Validate the supplied session token on every student mutation; local storage tokens are convenience credentials, not proof of real identity. Treat production auth as a separate hard requirement.

## 5. Phase-by-phase build order

### Phase 1 — Working live core (first priority)

- Create a session with five preloaded recursion concepts and four edges.
- Build `/join/[code]` with participant join and confidence selector.
- Implement `signals.upsert` using a Convex mutation, enforcing unique participant/concept/phase key.
- Build instructor radar with live `useQuery` subscriptions; expose **counts and denominators** prominently.
- Open student and instructor pages in two browser profiles and verify instant cross-device updates.

**Acceptance:** Sending a signal on browser A updates browser B without refresh; changing a signal does not double count it.

### Phase 2 — KnowledgeGraph (F)

- Render concepts and edges with `@xyflow/react`.
- Color nodes according to **aggregate reported confidence**; indicate small samples separately.
- On node click, open detail panel containing counts and related **published** clusters.
- Update graph from a Convex query; no front-end fake numbers in the actual demo.
- Allow instructor to change the active concept.

**Acceptance:** Graph color and node details change reactively when signals arrive; graph includes at least one prerequisite edge.

### Phase 3 — Questions and AI clustering (A)

- Student enters an anonymous question attached to a concept.
- Save raw question to protected table; instructor sees moderation queue.
- Trigger background clustering on a short debounce, explicit instructor button, or after N questions. Prefer explicit button for the hackathon if scheduler complexity threatens reliability.
- Prompt Claude with only recent, bounded, approved-for-processing question text and valid concept IDs; strip names and avoid including user IDs or any private confidence record.
- Ask Claude for structured JSON, extract text from its content blocks, parse it, validate with Zod, reject IDs not in source input, and store a **suggestion**, not published fact. Do not trust model-supplied confidence as calibrated probability.
- Instructor reviews, optionally edits, and publishes clusters.
- Provide a manual fallback that groups a selected question set and creates the same cluster record.

Example expected model response:

```json
{
  "clusters": [
    {
      "title": "Tracing recursive return values",
      "summary": "Questions about stack unwinding and returned values",
      "conceptIds": ["VALID_CONCEPT_ID"],
      "questionIds": ["VALID_QUESTION_ID_1", "VALID_QUESTION_ID_2"],
      "confidence": 0.78
    }
  ]
}
```

**Acceptance:** At least three paraphrased questions resolve to a reviewable cluster with traceable original questions; invalid model IDs cannot be saved.

### Phase 3b — Claude-to-graph reasoning (F + Anthropic)

- After an instructor approves a cluster, optionally call `claude.proposeConceptLinks` with the approved cluster, a bounded graph neighborhood, and valid node IDs.
- Claude returns proposed concept IDs and a short explanation referencing the actual questions. Validate IDs/edge types and present proposals for instructor confirmation.
- On acceptance, update graph edges or concept-to-cluster associations using Convex mutations; all connected clients should update.
- If Claude has no reasonable mapping, display `Needs instructor mapping`. Never fabricate a prerequisite.

### Phase 4 — PeerMesh (B)

- Student can opt into helper role for a concept; never automatically assert expertise.
- Use `claude.suggestPeerHelp` only for cluster/topic-to-volunteer suggestions based on opt-in helper topic declarations and published clusters. Do not transmit student names or private confidence to Claude, and never automatically enroll or contact a student.
- Instructor or helper starts a room associated with the published cluster.
- Build member list and real-time text messages. Check room membership on read/write.
- Apply capacity and duplicate-membership rules transactionally.
- Students submit a post-help signal and optional comprehension question response.
- Build before/after comparison, with sample counts and a note that confidence is not proof of learning.

**Acceptance:** Two browser profiles join one room and exchange messages; instructor sees the help room active and graph reflects new signals.

### Phase 5 — Polish and demo resilience

- Responsive student mobile layout; full-screen instructor dashboard.
- Loading, error, empty, and disconnected states.
- Accessible contrast and keyboard navigation for graph details; text alternative to graph colors.
- Resettable **simulated** dataset with deterministic question samples; seeded responses are labeled as simulated.
- A two-minute demo script with a fallback instructor-approved cluster if model access fails.
- README explaining exactly where Convex is central and where AI runs.

## 6. Suggested UI details

**Student:** Current topic at top; three large confidence buttons; anonymous question field; list of published misconception clusters; `Get peer help` action; small accessible graph.

**Instructor:** Four metric cards (active participants, responses, currently confused, open clusters), compact distribution chart per concept, interactive graph, moderation queue, live help-room status.

**Graph semantics:** Do not interpret graph node colors as objective knowledge mastery. Label them `Self-reported understanding`. Distinguish no-response from high-confidence and show N for every node.

## 7. Track execution checklist

### Anthropic / Claude — Primary target

- [ ] Target a **named community** such as Berkeley CS 61A students, not `students` broadly.
- [ ] Gather and document evidence for a real problem: e.g., brief interviews with 3–5 students or a TA (do not fabricate testimonials).
- [ ] `@anthropic-ai/sdk` runs **server-side within a Convex Node.js action** using `ANTHROPIC_API_KEY`; show a real successful Claude invocation.
- [ ] Claude clusters differently worded questions into misconceptions, citing only valid input IDs; instructor reviews the result.
- [ ] Claude proposes traceable concept mappings and/or opt-in peer groupings. These must meaningfully improve the core A+B+F workflow, not be a bolted-on chat interface.
- [ ] Display failures honestly; validate outputs, protect student data, and keep manual fallback.
- [ ] Document model limitations (incorrect merging, fabricated relationships, bias, overconfidence) and mitigations.
- [ ] Confirm official rules for API access, eligible models, routing, and submission before claiming eligibility.



### Convex — Primary

- [ ] Reactive queries power student + instructor + knowledge graph views.
- [ ] Atomic mutations prevent duplicate/conflicting signals and room joins.
- [ ] At least one real background action/scheduled job powers clustering or recap.
- [ ] Demo changes across two devices with no manual refresh.
- [ ] Show schema/functions in README and explain why Convex simplifies synchronization.

### Meta — Strong target

- [ ] AI groups separate student questions into a shared misconception.
- [ ] AI makes a human-to-human match or proposes peer-help connections; humans opt in and control contact.
- [ ] Demo shows students help one another and close the loop.
- [ ] Explicitly measure connections or completed peer sessions, not just generated responses.
- [ ] Explain the AI's essential role in matching fragmented questions to shared learning needs.

### Microsoft — Conditional target

- [ ] Add an instructor **agent** that proposes a targeted intervention based on clusters, graph state, and current rooms.
- [ ] Agent action is constrained and instructor-approved; log recommendation, decision, outcome.
- [ ] Demonstrate a realistic changed scenario (students remain confused after a first explanation) and replanning.
- [ ] Report measurable usefulness (time to surface issues, help-room completion, follow-up responses).
- [ ] Document security, data minimization, rollback/failure behavior, and realistic deployment plan.

### Notability — Only if genuinely used

- [ ] Use Notability meaningfully for ideation/process and, if feasible, handwritten diagrams shared into the workflow.
- [ ] Document handwriting, audio, diagrams, PDFs, and Smart Notes features actually used; don't claim use that didn't occur.
- [ ] Explain why the product benefits specifically from Notability.

### Cartesia / Bitdeer — Stretch only

- [ ] Cartesia: build a voice-first accessibility flow, not merely a read-aloud button.
- [ ] Bitdeer: call Model Studio for genuine clustering or interventions and show actual inference.

**Do not claim track eligibility based on conceptual overlap alone.** Check sponsor starter packs, submission requirements, and published criteria during the event.

## 8. Verification and tests

Manual test scenarios:

1. 2 users vote `confused` for the same concept → numerator 2 / denominator 2; one user changes to `partial` → numerator confused 1 / total 2.
2. A student cannot fetch another participant's private raw signal or unpublished question.
3. Anonymous question appears only in the instructor moderation queue until published via cluster.
4. Invalid or duplicate question IDs in model output are rejected.
5. Two simultaneous joins to last available room spot do not exceed capacity.
6. Nonmembers cannot read or write help-room messages.
7. AI API fails → instructor can manually publish a cluster; overall demo continues.
8. An empty concept graph or zero responses doesn't produce division-by-zero or misleading green nodes.
9. Pre/post comparison keeps response phases separate.
10. Refreshing a student page reuses the same local participant without duplicate identity records.

Where possible, use Convex's testing helpers or a simple integration test suite for the mutation invariants. At minimum manually verify them using two separate browser profiles.

## 9. Two-minute judging script

- **00:00–00:15:** Instructor view. Explain the live misunderstanding map.
- **00:15–00:35:** Student posts an anonymous question and votes confused. Show graph update on second screen.
- **00:35–00:55:** Two more questions arrive; invoke **Claude** clustering via a Convex action. Show linked original evidence and instructor review.
- **00:55–01:15:** Approve `Tracing recursive return values` cluster; affected nodes light up.
- **01:15–01:40:** Helper opts in; students join a room and resolve a factorial trace collaboratively.
- **01:40–02:00:** Post-help signals/checks update graph; state sponsor alignment: **Convex** synchronizes the class, **Claude** interprets shared misconceptions and suggests peer-help/graph links, **Meta** is served by actual peer interaction.

## 10. Deliverables

- Hosted web app and working Convex deployment.
- GitHub repository with README, setup, env var names (not secrets), architecture and limitations.
- Reliable reset/seed demo controls accessible only to operator.
- Optional short video showing two devices updating live.
- Submission tailored to **Convex + Anthropic + Meta**; optionally Microsoft only after its agent acceptance checklist is satisfied.

## References

- Hackathon guide: https://docs.google.com/document/d/1RQrueC9wm5u8uxtWSC2gadIchp05hVayhGUrIjxT9dE/edit
- Next.js + Convex: https://docs.convex.dev/quickstart/nextjs
- Convex reactive React hooks: https://docs.convex.dev/client/react/overview
- Convex docs: https://docs.convex.dev/
- React Flow: https://reactflow.dev/

- Anthropic Claude API docs: https://docs.anthropic.com/en/api/overview
