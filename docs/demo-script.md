# ClassPulse — two-minute demo script

Timings follow `docs/Build_Instructions.md` §9. Two devices (or two browser profiles): **Instructor** on the big screen, **Student** on a phone/laptop. A third tab can act as a second student.

## Before the demo (5 minutes)

1. `npx convex dev` and `npm run dev` are running; `ANTHROPIC_API_KEY` and `CLAUDE_MODEL` are set on the deployment (`npx convex env list`).
2. **Reset the demo data:** `npx convex run seed:reset`. Copy the printed `localStorage.setItem("classpulse:instructor:<sessionId>", "<secret>")` line.
3. Instructor device: open the printed URL `/instructor/<sessionId>`, paste the `localStorage.setItem(...)` line into the dev-tools console, reload. You should see 24 participants, *Call stack & frames* and *Return values* red/amber, *Base case* green, and 10 pending questions in the moderation queue.
4. Student device: open `/join/DEMO01` once so it has joined (alias "Student 25"); clear nothing afterwards.
5. Decide now whether Claude is reachable: press *Suggest clusters* once in a throwaway run (then `seed:reset` again). If it errors, plan to use the fallback in step 3 below.

## Script

**00:00–00:15 — Instructor view.** "Each student just tells us *confused / partly / can explain* for the concepts of today's lecture. The graph is the live map of self-reported understanding: node colour is the class's aggregate, N is on every node, dashed border means fewer than five answers. Right now 24 simulated students (labelled as such) have answered — call stack and return values are where they're stuck."

**00:15–00:35 — A real student acts.** On the student device: type a question on *Call stack & frames* ("after the base case returns, how do we get back to the first call?") and tap **Confused**. Point at the instructor screen: the count and the node colour change with no refresh — that's a Convex reactive query, the browser only subscribes.

**00:35–00:55 — Claude clusters.** "Ten differently worded questions are already waiting. Instead of reading them one by one we ask Claude." Press **Suggest clusters**. Explain while it runs (a Convex Node action, scheduled in the background; the key never leaves the server): Claude gets only question text and the concept list, must answer with one structured tool call, and we reject any question or concept ID it didn't receive. Open a suggested cluster: title, summary, the original questions as evidence, and the concepts it maps to.

> **Fallback if the run shows `error` or takes > 20 s:** say so plainly ("the model call failed, so we group by hand — the demo never depends on the API"). In the moderation queue select the four stack-unwinding questions and use **Create cluster** (`clusters.createManual`) with title *Tracing recursive return values*, summary *Students don't see how return values flow back up the call stack*, concepts *Call stack & frames* + *Return values*. Continue with step 4.

**00:55–01:15 — Approve.** Edit the title if needed and **Publish** *Tracing recursive return values*. The cluster appears on the student device, and the graph marks the two concepts it touches — the same Claude output lights up the knowledge graph; no second AI call.

**01:15–01:40 — Peer help.** On the second student tab, opt in as a helper for *Return values*. The published cluster now shows "1 helper" — a deterministic filter, no AI picking people. Instructor (or the helper) opens a room for the cluster; the confused student joins; exchange two messages and walk the `factorial(3)` trace: `3 * factorial(2)` waits, `2 * factorial(1)` waits, `1` returns, then the products collapse upward. Capacity and membership are enforced in the mutation, so a seventh person is refused.

**01:40–02:00 — Close the loop.** Instructor switches the session to **post**; the student taps **I understand now** in the room. The graph updates and the pre/post comparison shows the shift with N on both sides — "these are self-reported signals, not verified learning gains." Wrap: **Convex** keeps every device in sync with transactional mutations and reactive queries; **Claude** turns scattered questions into a reviewable misconception mapped onto the concept graph; **Meta's** human-connection goal is served by students actually helping each other in the room.

## If something breaks

- Dashboard says *No instructor access*: the secret isn't in this browser — redo the `localStorage.setItem` line from the seed output and reload.
- Student page stuck on *Joining*: the session was reset after the student joined; clear `classpulse:student:DEMO01` from `localStorage` (or use a private window) and reload.
- Anything else: `npx convex run seed:reset`, paste the new secret, reload both devices. It takes ten seconds.
