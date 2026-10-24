# ClassPulse — two-minute demo script

Timings follow `docs/Build_Instructions.md` §9. Three browser profiles (or devices): **Instructor** on the big screen, **Student A** (the confused student) and **Student B** (the helper). Button labels below are the ones in the merged UI.

## Pre-demo checklist (10 minutes before)

1. **Re-push the backend.** The dev deployment is shared by several branches, so whatever was pushed last is live. From the checkout you are demoing: `npx convex dev --once` (then leave `npx convex dev` and `npm run dev` running). Check `npx convex env list` shows `ANTHROPIC_API_KEY` and `CLAUDE_MODEL`.
2. **Reset the demo data:** `npx convex run seed:reset`. Copy the printed `localStorage.setItem("classpulse:instructor:<sessionId>", "<secret>")` line and the `/instructor/<sessionId>` URL.
3. **Decide the Claude path now, before anyone joins.** Instructor profile: open the printed URL, paste the `localStorage.setItem(...)` line into the dev-tools console, reload, press **Suggest clusters (7 pending)** once. If it comes back `error` or takes > 20 s, plan to use the fallback in 00:35 below. Then reset again — `npx convex run seed:reset` — so the throwaway run is gone. The reset deletes every participant, helper opt-in and run of the old session, which is why steps 4–5 come *after* it.
4. **Instructor profile:** paste the *new* `localStorage.setItem(...)` line from step 3's reset, reload. Expect: 24 participants (labelled simulated), *Call stack & frames* and *Return values* red/amber, *Base case* green, **7 pending questions** in the cluster queue and **1 published cluster**, *Tracing recursive return values* (seeded, `source: manual`), no previous AI run shown.
5. **Student A and Student B profiles:** open `/join/DEMO01` in each so they are joined (aliases "Student 25" and "Student 26"). In Student B, tick *Return values* and press **Volunteer as a peer helper**. Don't clear storage or reset afterwards; a room link always carries `?code=DEMO01` so each profile keeps using its own token.

## Script

**00:00–00:15 — Instructor view.** "Each student just tells us *confused / partly get it / can explain it* for the concepts of today's lecture. The graph is the live map of self-reported understanding: node colour is the class's aggregate, N is on every node, dashed border means fewer than five answers. Right now 24 simulated students — labelled as such — have answered: call stack and return values are where they're stuck."

**00:15–00:35 — A real student acts.** Student A: pick *Call stack & frames*, type "after the base case returns, how do we get back to the first call?" and press **Send anonymously**, then tap **Confused**. Point at the instructor screen: the count and the node colour change, and the question lands in the cluster queue, with no refresh — that's a Convex reactive query, the browser only subscribes. The student's own page shows no counts and no one else's question.

**00:35–00:55 — Claude clusters.** "Eight differently worded questions are now waiting. Instead of reading them one by one we ask Claude." Press **Suggest clusters (8 pending)**. Explain while it runs (a Convex Node action scheduled in the background; the key never leaves the server): Claude gets only question text and the concept list, must answer with one structured `save_clusters` tool call, and we reject any question or concept ID it didn't receive. Open a suggested cluster: title, summary, confidence, the original questions as evidence, and the concepts it maps to.

> **Fallback if the run shows `error` or takes > 20 s:** say so plainly ("the model call failed, so we group by hand — the demo never depends on the API"). In the queue select the four stack-unwinding questions plus Student A's, press **Group selected (5) into a cluster**, title *How the stack unwinds*, summary *Students don't see how control returns to earlier frames after the base case*, concept *Call stack & frames*, then **Publish cluster**. `clusters.createManual` publishes immediately — there is no suggested cluster and nothing to approve — so **skip the Publish click in 00:55** and go straight to showing the cluster on Student A's page ("the instructor is the approval step here; with Claude it would be a suggestion we review first"). If even that is not an option, point at the seeded *Tracing recursive return values* cluster, which is already published.

**00:55–01:15 — Approve.** (Claude path only.) Press **Publish** on the suggested stack-unwinding cluster. It appears on Student A's page (title, summary, question count — never the questions themselves or who asked), and the graph's node detail for the two concepts it touches lists it — the same Claude output lights up the knowledge graph; no second AI call.

**01:15–01:40 — Peer help.** Student B's page shows the published cluster with "1 helper" — a deterministic filter on who volunteered for the concept, no AI picking people. Student B presses **Open a help room as a helper** on *Return values* (or the instructor presses **Open room** on the cluster); Student A presses **Join**. Both land on `/room/<id>?code=DEMO01`. Exchange two messages and walk the `factorial(3)` trace: `3 * factorial(2)` waits, `2 * factorial(1)` waits, `1` returns, then the products collapse upward. Capacity and membership are enforced in the mutation: a non-member's tab gets nothing from the room, a seventh person is refused.

**01:40–02:00 — Close the loop.** Instructor switches the session phase to **post**; Student A taps **I understand now** in the room. The graph updates and the instructor's pre/post panel shows *Pre (before help)* vs *Post (after help)* with N on both sides — "these are self-reported signals, not verified learning gains." Wrap: **Convex** keeps every device in sync with transactional mutations and reactive queries; **Claude** turns scattered questions into a reviewable misconception mapped onto the concept graph; **Meta's** human-connection goal is served by students actually helping each other in the room.

## If something breaks

- Dashboard says *No instructor access*: the secret isn't in this browser — redo the `localStorage.setItem` line from the seed output and reload.
- Student page stuck on *Joining* / room says you are not a member: the session was reset after the student joined; remove `classpulse:student:DEMO01` from `localStorage` (or use a private window) and reload. Room links without `?code=DEMO01` cannot find the token — use the links the app generates.
- **Suggest clusters** button is disabled: a run is still `running`; wait for it to finish or error (the queue shows the latest run's status).
- Functions missing / "Could not find function": another branch pushed to the shared deployment — run `npx convex dev --once` from this checkout again.
- Anything else: `npx convex run seed:reset`, paste the new secret, reload all profiles. It takes ten seconds.
