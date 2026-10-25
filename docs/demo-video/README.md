# Dorsal demo video: script, seed data, storyboard

About 3:15 of screen time. Seven scenes. You record and edit it yourselves; this doc covers
what goes on screen, what to say, and the data that makes the numbers land.
Reference frames from a full dry run are in [`frames/`](frames/).

---

## 1. Seed data

```bash
npx convex dev --once            # push functions (needs CONVEX_DEPLOY_KEY or a logged-in dev deployment)
npx convex run seedVideo:reset   # wipes + recreates session DORSAL
```

The output is `{ sessionId, code, instructorSecret }`, plus one `localStorage.setItem(...)` line to paste
into the instructor browser's devtools console. **Re-run before every take.** Each run deletes
the old `DORSAL` session and every row that belongs to it.

What `convex/seedVideo.ts` creates:

| Thing | Value | Why it's there |
|---|---|---|
| Session | `CS 61A · Lecture 9: Recursion`, code `DORSAL` | Real course, easy-to-read code |
| Concepts | Base case → Recursive call → Call stack & frames → Return values, plus Recursive call → Tree recursion | Same five as `RECURSION_LESSON` |
| Current topic | Call stack & frames (Prompt 3 of 5) | Mid-lecture, on the hard part |
| Participants | 42, all marked `simulated` | Aggregates look like a real section |
| Rating prompts | one per concept, closed except the current one, plus an open-ended base-case prompt with 16 answers | Prompts tab has history |
| Signals (confused / partly / can explain) | Base 3/9/26 · Recursive 6/15/17 · Call stack 19/12/6 · Return 17/13/6 · Tree 11/8/3 | Graph runs green → red left to right |
| Pending questions | 16 simulated: stack unwinding, missing `return`, repeated fib work, base cases, and 1 off-topic ("Will this be on the midterm?") | Raw material for Claude, plus something to moderate |
| Published clusters | **none** | So clustering happens live |
| Helpers | several simulated volunteers per concept | Helper counts are non-zero |
| Prior room | closed Recursive call room: 5 members, 4 messages, 5 after-help ratings | Before/after has one filled row |

Numbers you should see on the instructor dashboard right after a reset:
**Participants 42 (42 simulated) · Answered now 37/42 · Confused 56 · Open clusters 0.**

### Lesson-notes fixture
Upload [`lecture-notes-recursion.md`](lecture-notes-recursion.md) in Scene 1 to show Claude
proposing concepts from course material.

---

## 2. Setup before recording

Use three browser windows with separate profiles, or use incognito windows.

| Window | Size | URL | Prep |
|---|---|---|---|
| **Instructor** | 1440×900 desktop | `/instructor/<sessionId>` | Paste the `localStorage.setItem` line from the seed output, then reload |
| **Student A** ("confused") | phone, 390×844 | `/join/DORSAL` | Fresh profile. Join **first** so A becomes *Student 43* |
| **Student B** ("helper") | phone, 390×844 | `/join/DORSAL` | Fresh profile. Join second, as *Student 44* |
| (optional) **TA** | desktop | via the invite link from the TAs tab | Scene 7 only |

- Start `npm run dev` and keep it running. Open each page once beforehand so the first compile isn't recorded.
- Hide the Next.js dev badge: run a production build with `npm run build && npm start`, or crop it out.
- Check that `ANTHROPIC_API_KEY` is set on the Convex deployment (`npx convex env list`). If it isn't, use the fallback in Scene 4.
- A good layout is the instructor on the left two-thirds and the two phones stacked on the right. You can also record each window separately and cut between them.

---

## 3. Storyboard and script

Timestamps are approximate. **SAY** is the voice-over. **DO** is the on-screen action.
**SHOW** lists the features the viewer must clearly see.

### Scene 0: Hook (0:00–0:15)
- **DO:** Instructor dashboard, full screen, a still frame of the graph.
- **SAY:** "Hello! We're Dorsal, a Convex-based Claude-native app to make professors better understand students' confusion in large lectures and reduce friction for student participation. In hundred-kid lectures, professors only find out what students are stuck on once midterm grades are released. Dorsal is a live confusion radar so they can find out DURING lecture and adjust as necessary."
- **SHOW:** Logo, session title, and the `DORSAL` join code.

### Scene 1: Lesson setup (0:15–0:35) · frame `S1b-setup-concepts`
- **DO:** On `/instructor/new`, type the title and upload `lecture-notes-recursion.md`. Click **Suggest concepts**, wait, and scroll the five suggested concepts and their prerequisite links. Optionally rename one so the instructor's edit is visible.
- **SAY:** "The instructor uploads their lecture material. Claude will propose the concepts and how they depend on each other into a graph, and the instructor edits that into the lesson map."
- **SHOW:** Material upload, the AI-suggested concept list with prerequisites, and that the list is editable.
- **CUT:** "…forty minutes into lecture." Switch to the seeded `DORSAL` session. Don't create the session for real; the seed stands in for it.

### Scene 2: The radar (0:35–0:55) · frame `S2-instructor-start`
- **DO:** Slow pan across the concept graph, left to right. Hover over the metrics.
- **SAY:** "Here we have some seed data. Each node is a concept from today's lesson, colored by how well students say they understand it. Base case is green. By the call stack it's turning red, and that's how the lecture hall feels right now. It's self-reported, with anonymous results and pseudonymous questions so students don't have to feel embarrassed about being confused."
- **SHOW:** Prerequisite edges, the red/yellow/green counts and N on each node, `CURRENT TOPIC` on Call stack & frames, the metrics strip (`42 simulated`), and the legend text "Student confidence, not measured mastery".

### Scene 3: A student signals (0:55–1:25) · frames `S3b-studentA-joined`, `S4b-studentA-new-prompt`, `S4c-instructor-answered`
1. **DO (Student A):** Join `DORSAL` and land on the cockpit (*Prompt 3 of 5 · Call stack & frames*). Tap **Confused**.
   **DO (Instructor):** Participants changes 42 → 43, and the Call stack red count goes up.
   - **SAY:** "A student joins with the code under a pseudonym. One response and the professor's radar will move."
2. **DO (Student B):** Join, then tap **Can explain it** on Call stack.
3. **DO (Instructor):** In **Push prompt**, choose concept *Return values*, keep **Rating**, enter "factorial(3) returns 6. Where does the 6 come from?", and click **Push prompt**.
   **DO (Student A):** A `New prompt` badge appears with Prompt 4 of 5. Tap **Confused**. **Student B:** taps **Can explain it**.
   **DO (Instructor):** *Answered now* reads 2/44 (A and B are the first answers to the new prompt). Open the **Prompts** tab to show the history.
   - **SAY:** "The instructor moves on and pushes a check-in to students' devices. They can watch answers come in live."
- **SHOW:** Realtime updates with no refresh, the push-prompt flow, the Rating/Open-ended toggle, and the Prompts history.

### Scene 4: Anonymous questions → Claude clusters (1:25–2:10) · frames `S5d-moderation-queue`, `S5f-claude-suggestions`, `S5h-node-focused`
1. **DO (Student A):** Open the **Ask** tab, type "I don't get how the answer gets back to the first call once we hit the base case", and send it.
   - **SAY:** "Again, questions are anonymous to classmates, so nobody has to raise their hand and admit they're lost."
2. **DO (Instructor):** On the **Questions** tab, the new question sits on top of 16 others. Click **Hide** on "Will this be on the midterm?".
   - **SAY:** "There are seventeen questions here, worded seventeen different ways. The instructor can hide off-topic ones."
3. **DO:** Click **Suggest clusters** and wait 5–15 s. Expect about 3 clusters, such as *How returned values travel back up the recursion*, *Frames after the base case*, and *Repeated subproblems in naive fib*. Claude's wording varies from run to run.
   - **SAY:** "We call Claude to group them into the real misunderstandings and maps each one onto the lesson graph. These are suggestions. Instructors can review these clusters and push them back to students with help rooms"
4. **DO:** Edit one title slightly, then click **Publish** on 2–3 clusters. The `n clusters` badges show up on Call stack, Return values, and Tree recursion. Click the **Return values** node to focus the side panel.
   - **SAY:** "Publish the cluster questions and the hotspots appear on the map. The instructor now knows exactly what to re-explain."
- **SHOW:** Moderation (Hide), the suggestion review UI (edit, publish, dismiss), the cluster→concept mapping, graph badges, and node focus.
- **FALLBACK:** If Claude errors or takes more than about 20 s, cut. Tick 3–4 return-value questions and use the manual cluster form to group them under *Return values* with the same title. Then say "or the instructor can group them by hand" and publish. The rest of the video doesn't change.

### Scene 5: Peer help (2:10–2:45) · frames `S6b-studentA-classqa`, `S6c-studentB-room`, `S6e-studentA-chat`
1. **DO (Student B):** Open the **Help rooms** tab, tick *Return values* under **Volunteer as a peer helper**, and point out the "self-declared, not an AI credential" copy.
2. **DO (Student A):** The **Class Q&A** tab shows the published cluster. Raw questions and authors are not shown.
3. **DO (Instructor or Student B):** On the published Return values cluster, click **Open help room**. B joins as `helper`. A sees the room under **Help rooms**, taps it, and joins as `learner`.
4. **DO:** Chat. B: "Each call waits for the one below it. When fact(1) returns 1, fact(2) can finish: 2×1." A: "ohh so the multiplication happens on the way back up".
   - **SAY:** "Students who understand can volunteer to help and Dorsal opens a small room around that exact question. The confused student gets help in under a minute, and T.A.s can pop in and help"
- **SHOW:** Helper opt-in, the published cluster from the student's side, the room with roles, live chat, and the instructor **Rooms** tab (`S6g`).

### Scene 6: Closing the loop (2:45–3:00) · frame `S7b-before-after`
- **DO (Student A):** In the room, under **Update your rating for Return values**, tap **Can explain it**.
  **DO (Instructor):** Open the **Before/after** tab. Return values now has an After bar, and Recursive call shows the seeded N=5 after-help row.
- **SAY:** "After the help, the student updates their rating, and the instructor sees before and after for each concept."
- **SHOW:** The after-help rating, the Before/after bars with separate N values, and the caveat paragraph.

### Scene 7 (optional, +15 s): TAs (3:00–3:15) · frames `S8a-ta-invite`, `S8c-ta-in-room`
- **DO:** On the **TAs** tab, create an invite. Open the link in the TA window, open the TA dashboard, join the room, and post a message.
- **SAY:** "Course staff can be invited to watch the same radar and jump into any room."

### Outro (last 10 s)
- **DO:** Return to the full instructor graph, now with badges and less red if you re-rated.
- **SAY:** "Dorsal:  help students participate by tackling confusion as it happens because confused students don't have to swim alone."

---

## 4. Troubleshooting
- **Numbers don't match:** you didn't reset, or the students joined in the wrong order. Re-run `seedVideo:reset` and clear the student profiles' localStorage.
- **Instructor page asks for a secret:** paste the `localStorage.setItem` line again, since each reset makes a new secret and session ID.
- **No Open help room button:** the cluster isn't published yet.
- **The default 2-minute demo** (`seed:reset`, code `DEMO01`) still works as before. See [`../demo-script.md`](../demo-script.md).
