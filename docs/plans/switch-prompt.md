# Switch the current prompt

Request: instructors and TAs can switch which prompt is current, not just which one they view.

## Plan

- `prompts.makeCurrent({ sessionId, instructorSecret, promptId })` (staff: instructor or TA secret): sets `sessions.activePromptId` to an earlier prompt of the session and `activeConceptId` to its concept. No new prompt row, so students' new answers join that prompt's existing response set; each student sees their own earlier answer to it.
- *Prompts* tab: when the viewed prompt isn't current, a **Make current** button switches students to it.
- Students still only see the current prompt.

## Acceptance

- Switching back to an earlier prompt shows it to students with their previous answer; new answers update that prompt's responses only.
- Students can't call it; TAs can.
- `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` clean.

## Follow-up: reuse the oldest prompt

- `sessions.setActiveConcept` with `kind: "rating"` reuses the concept's oldest rating prompt with the same question (both blank counts as the same) instead of inserting a new row. Open-ended pushes always insert a new prompt.

## Follow-up: concept bar

- A searchable concept dropdown (shadcn `Combobox` on Base UI: `All concepts` + every concept, filtered by a search box in the popup) sits above the dashboard side-panel tabs; clicking a graph node selects the same concept.
- *Overview* (was *Concept*): the selected concept's breakdown, or every concept's distribution for `All concepts`.
- *Prompts*, *Questions* (clusters + moderation queue), *Rooms* and *Before/after* show only the selected concept's items (client-side filter; `prompts.list` now returns `conceptId`). *TAs* stays session-wide.
