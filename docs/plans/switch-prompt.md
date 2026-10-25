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
