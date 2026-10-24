# Prompt history + open-ended prompts

Request: the *Push prompt* form gets an **open-ended** option (students type an answer instead of rating), and pushing a prompt no longer replaces the previous one — every push is kept with its own responses. Students only ever see the current prompt; instructors/TAs can switch between all prompts of the session and see each one's responses.

## Plan

- **Schema.** New `prompts` table (`sessionId`, `conceptId`, `kind: "rating" | "open"`, `question?`, `createdAt`; `by_session`) and `promptResponses` (`sessionId`, `promptId`, `participantId`, `level?` for rating, `text?` for open, `updatedAt`; `by_prompt`, `by_prompt_participant`). `sessions.activePromptId` points at the current prompt. `sessions.activePrompt` (the old string) becomes unused; it stays `v.optional` only so existing rows (incl. production) pass schema validation.
- **Pushing.** `sessions.setActiveConcept` gains `kind?` (default `rating`) and inserts a new `prompts` row on every call (same concept again = a new prompt), then sets `activeConceptId`/`activePromptId`; `activeHistory` is unchanged. Open-ended prompts require a question. At most `MAX_PROMPTS` (100) prompts per session. `sessions.create` and `seed.reset` create the first prompt(s).
- **Answering (current prompt only).** Rating: `signals.upsert` still writes the per-concept `pre` signal (graph unchanged) and, when the concept is the current rating prompt's concept, also upserts that prompt's response. Open-ended: new `prompts.respond({ sessionId, token, text })` (trimmed, 1–500 chars) upserts the caller's answer for the *current* prompt only and rejects when the current prompt is a rating prompt. Students can edit until the next push.
- **Queries.** `getStudentView.activePrompt` becomes `{ _id, kind, question?, myLevel?, myText? }` (own answer only). `getInstructorView.activePrompt` becomes `{ _id, kind, question? }`; `answeredCount` = responses to the current prompt. Staff-only `prompts.list` (newest first, concept label, kind, question, response count) and `prompts.responses` (rating counts + N, or open answer texts newest first, no names; simulated count labelled).
- **UI.** Push prompt form: *Rating / Open-ended* toggle; open-ended needs a question. A *View responses* link and a new **Prompts** dashboard tab with a prompt picker (current one by default) and the selected prompt's responses. Student card: open-ended prompt shows a text box + *Send answer* instead of the confidence buttons; rating prompts start unselected for each new prompt.

## Decisions

- Each push is a separate prompt, so re-asking the same concept gives a fresh response set; the concept graph still shows each student's latest rating per concept.
- Open-ended answers are shown to staff without aliases (like the moderation queue) and are never sent to Claude.
- Sessions that existed before `activePromptId` keep working as a plain rating card until the next push.

## Acceptance

`npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` clean; live: push rating then open-ended prompts, students answer, instructor switches between prompts in the Prompts tab and sees each prompt's own responses; students see only the current prompt.
