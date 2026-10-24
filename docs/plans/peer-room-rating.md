# Peer-room rating is the only "after help" signal

Request: remove the pre/post (before/after help) split from the teacher view everywhere except the peer-help comparison; students update their rating inside a peer help room, and that is the only post-help input.

## Plan

- **No session phase.** Drop `sessions.phase` and `sessions.setPhase`. `signals.phase` stays as the record of *where* a rating came from:
  - `pre` — the student's rating on the session page (`signals.upsert`, always `pre`).
  - `post` — the rating a member gives inside a help room (`signals.roomCheckIn({ roomId, token, level })`, room member + open session required, written for the room's concept).
- **Instructor view.** No phase toggle or "signals: …" header; graph, metrics and concept details read `pre` (the session-page rating) only. `PrePostComparison` stays as the single place before/after shows up ("Before vs after peer help"), with copy explaining where each side comes from. `SessionControls` keeps only *Close session*.
- **Peer room.** The check-in becomes the same 3-level `ConfidenceSelector` as the session page ("Update your rating"), pre-selected from the server (`rooms.get` returns `myLevel`, the caller's `post` level for the room's concept) so it never goes stale.
- **Seed/tests/docs.** Seed no longer sets `phase` on the session. Scenario 9 test rewritten: session-page ratings stay `pre`, only room members can write `post`, `post` never changes the graph counts. README, Build_Instructions, MVP_Outline and demo-script updated.
- **Deployment.** Existing dev-deployment sessions carry `phase`; strip it once (one-off internal mutation pushed temporarily, not committed) so the new schema validates.

## Acceptance

`npm test`, `npm run lint`, `npx tsc --noEmit`, build clean. Live: instructor dashboard has no phase toggle; a student's room rating shows up only in the "Before vs after peer help" panel.
