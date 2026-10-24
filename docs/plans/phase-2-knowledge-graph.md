# Phase 2: KnowledgeGraph

Scope: `docs/Build_Instructions.md` §5 Phase 2. No questions, clusters, rooms, or AI. Those tables don't exist yet, so the node detail panel only reserves a spot for published clusters, to be filled in Phase 3.

## Plan

- **Backend:**
  - `sessions.getInstructorView` also returns each concept's `description`/`x`/`y` and the session's `edges`. One reactive query still drives both the list and the graph.
  - New `sessions.setActiveConcept({ sessionId, instructorSecret, conceptId })`. It checks the instructor secret and that the concept belongs to the session, then patches `activeConceptId`. Students already see the active concept pinned first.
- **Graph (`components/ConceptGraph.tsx`):**
  - Built on `@xyflow/react`, using the instructor-seeded positions. Edges are directed `prerequisite_for` arrows.
  - Node fill shows aggregate reported confidence: score = (0·confused + 0.5·partial + 1·can_explain) / N, mapped red → amber → green. Grey with "no responses" when N = 0.
  - Small samples (N < 5) get a dashed border and a "low sample" label, so the colour isn't mistaken for a solid signal. The active concept gets an indigo ring.
  - Nodes can't be dragged or connected: the graph is a view and the instructor seed is the source of truth.
- **Detail panel:** clicking a node shows its description, `n / N` per level, and a low-sample warning. It also has a "Make current topic" button (`setActiveConcept`) and the reserved published-clusters section.

## Acceptance

When a signal arrives, node colour and detail counts change without a refresh. The graph shows the 4 seeded prerequisite edges. Changing the current topic on the instructor graph re-pins it for students live.
