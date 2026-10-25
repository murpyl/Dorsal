import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { sha256 } from "./credentials";
import { insertLesson } from "./sessions";
import { deleteSession, RECURSION_LESSON } from "./seed";

/**
 * Seed for the recorded demo video (`docs/demo-video.md`): a fuller, mid-lecture class than `seed:reset`, with no
 * published cluster so Claude's clustering is the on-camera reveal. Run with `npx convex run seedVideo:reset`.
 * Concept indexes follow RECURSION_LESSON: 0 Base case, 1 Recursive call, 2 Call stack & frames, 3 Return values, 4 Tree recursion.
 */
const VIDEO_CODE = "DORSAL";
const VIDEO_TITLE = "CS 61A · Lecture 9: Recursion";
const PARTICIPANTS = 42;

/** `pre` signals per concept: [confused, partial, can_explain]. */
const SIGNALS: [number, number, number][] = [
  [3, 9, 26], // Base case: green
  [6, 15, 17], // Recursive call: mixed
  [19, 12, 6], // Call stack & frames: red (current prompt)
  [17, 13, 6], // Return values: red
  [11, 8, 3], // Tree recursion: only 22 answered
];

/** Rating prompts already pushed, oldest first; the last one is current. */
const RATING_ORDER = [0, 1, 4, 3, 2];

const OPEN_PROMPT = {
  concept: 0,
  question: "In one sentence: why does every recursive function need a base case?",
  answers: [
    "So it knows when to stop calling itself.",
    "Without one it recurses forever and you get a RecursionError.",
    "It's the smallest input you can answer directly without recursing.",
    "It stops the recursion, like the n == 0 case in factorial.",
    "So the stack doesn't overflow.",
    "The base case is where the answer starts getting built back up.",
    "It gives the first real return value that everything else uses.",
    "Not sure, I think it's just where the function ends?",
    "Every call has to eventually reach something simple enough to return.",
    "It stops the infinite loop.",
    "Because otherwise the problem never gets smaller.",
    "So the program terminates. I'm not sure how it gets back up though.",
    "The base case returns without making another call.",
    "To handle the empty list / zero case.",
    "So there's a point where the function returns a value instead of calling itself.",
    "idk, so it doesn't crash?",
  ],
};

/**
 * Pending questions in arrival order: three clear paraphrase groups for Claude (stack unwinding, missing `return`,
 * repeated work in tree recursion), two base-case questions and one off-topic question to hide on camera.
 */
const QUESTIONS: { concept: number; content: string }[] = [
  { concept: 2, content: "When the base case finally returns, how does the program know which call to go back to?" },
  { concept: 3, content: "Why do I need `return` in front of the recursive call? Without it my function gives back None." },
  { concept: 4, content: "Why is fib(30) so slow? It feels like it computes the same thing over and over." },
  { concept: 2, content: "What happens to all the frames after we hit the base case? Do they run again in reverse?" },
  { concept: 0, content: "How do I pick the base case? Is it always n == 0?" },
  { concept: 3, content: "In factorial(4), where does the multiplication actually happen: on the way down or on the way back up?" },
  { concept: 2, content: "I don't get how the stack 'unwinds'. How do we end up back in the very first call?" },
  { concept: 3, content: "My sum_digits prints the right number but returns None. What am I missing?" },
  { concept: 4, content: "In the fib tree, does fib(2) really get called multiple times? Can we avoid that?" },
  { concept: 2, content: "Does each recursive call keep its own copy of n, or do they all share one?" },
  { concept: 0, content: "Can a function have more than one base case?" },
  { concept: 3, content: "How does the result from the inner call get combined with the outer call's result?" },
  { concept: 1, content: "Will this be on the midterm?" },
  { concept: 4, content: "How many calls does fib(5) make in total? I keep losing count drawing the tree." },
  { concept: 2, content: "Is the environment diagram the same thing as the call stack?" },
  { concept: 3, content: "If the base case returns 1, how does that 1 turn into 24 for factorial(4)?" },
];

/** An earlier, already-closed help room on Recursive call, so the before/after panel has a non-trivial row on camera. */
const EARLIER_ROOM = {
  concept: 1,
  members: [5, 11, 17, 23, 29],
  helper: 5,
  post: ["can_explain", "can_explain", "partial", "can_explain", "partial"] as const,
  messages: [
    [5, "Think of count_down(3): it prints 3, then the *same* function handles count_down(2)."],
    [11, "So the recursive call is just a normal function call on a smaller input?"],
    [5, "Exactly. Trust that it works for n - 1 and only write what to do with n."],
    [17, "Oh, that's the 'recursive leap of faith' from lecture."],
  ] as const,
};

/** Simulated helpers opted in per concept, so published clusters show "N helpers opted in". */
const HELPERS: [number, number[]][] = [
  [7, [3]],
  [13, [2, 3]],
  [31, [4]],
];

export const reset = internalMutation({
  args: { code: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const code = (args.code ?? VIDEO_CODE).toUpperCase();
    for (const s of await ctx.db.query("sessions").withIndex("by_code", (q) => q.eq("code", code)).collect()) await deleteSession(ctx, s);

    const now = Date.now();
    const minute = 60_000;
    const instructorSecret = crypto.randomUUID() + crypto.randomUUID();
    const sessionId = await ctx.db.insert("sessions", {
      title: VIDEO_TITLE,
      code,
      state: "open",
      instructorSecretHash: await sha256(instructorSecret),
      createdAt: now - 40 * minute,
    });
    const conceptIds = await insertLesson(ctx, sessionId, RECURSION_LESSON);

    const participantIds: Id<"participants">[] = [];
    for (let i = 0; i < PARTICIPANTS; i++) {
      const helper = HELPERS.find(([p]) => p === i);
      participantIds.push(
        await ctx.db.insert("participants", {
          sessionId,
          tokenHash: `simulated:${i}`,
          alias: `Sim ${i + 1}`,
          helperConceptIds: helper ? helper[1].map((c) => conceptIds[c]) : [],
          isSimulated: true,
          createdAt: now - 38 * minute + i * 2_000,
        }),
      );
    }

    // Prompt timeline: Base case rating, the open-ended Base case question, then the remaining rating prompts.
    let t = now - 35 * minute;
    const ratingPromptIds: Id<"prompts">[] = [];
    const history: { conceptId: Id<"concepts">; at: number }[] = [];
    for (const [i, c] of RATING_ORDER.entries()) {
      ratingPromptIds[c] = await ctx.db.insert("prompts", { sessionId, conceptId: conceptIds[c], kind: "rating", createdAt: t });
      history.push({ conceptId: conceptIds[c], at: t });
      t += 3 * minute;
      if (i === 0) {
        const openId = await ctx.db.insert("prompts", {
          sessionId,
          conceptId: conceptIds[OPEN_PROMPT.concept],
          kind: "open",
          question: OPEN_PROMPT.question,
          createdAt: t,
        });
        for (const [k, text] of OPEN_PROMPT.answers.entries()) {
          await ctx.db.insert("promptResponses", { sessionId, promptId: openId, participantId: participantIds[(k * 3) % PARTICIPANTS], text, updatedAt: t + 20_000 + k * 4_000 });
        }
        t += 4 * minute;
      }
    }
    await ctx.db.patch(sessionId, { activeConceptId: conceptIds[2], activePromptId: ratingPromptIds[2], activeHistory: history });

    for (const [c, [confused, partial, canExplain]] of SIGNALS.entries()) {
      const responders = confused + partial + canExplain;
      const base = history.find((h) => h.conceptId === conceptIds[c])!.at;
      for (let k = 0; k < responders; k++) {
        const level = k < confused ? "confused" : k < confused + partial ? "partial" : "can_explain";
        const participantId = participantIds[(k + c * 7) % PARTICIPANTS];
        const updatedAt = base + 10_000 + k * 3_000;
        await ctx.db.insert("signals", { sessionId, conceptId: conceptIds[c], participantId, level, phase: "pre", updatedAt });
        await ctx.db.insert("promptResponses", { sessionId, promptId: ratingPromptIds[c], participantId, level, updatedAt });
      }
    }

    for (const [i, q] of QUESTIONS.entries()) {
      await ctx.db.insert("questions", {
        sessionId,
        conceptId: conceptIds[q.concept],
        participantId: participantIds[(i * 5 + 3) % PARTICIPANTS],
        content: q.content,
        state: "pending",
        createdAt: now - (QUESTIONS.length - i) * 40_000,
      });
    }

    const roomAt = now - 20 * minute;
    const roomId = await ctx.db.insert("rooms", {
      sessionId,
      conceptId: conceptIds[EARLIER_ROOM.concept],
      title: RECURSION_LESSON[EARLIER_ROOM.concept].label,
      status: "closed",
      capacity: 6,
      createdAt: roomAt,
    });
    for (const [k, p] of EARLIER_ROOM.members.entries()) {
      const participantId = participantIds[p];
      await ctx.db.insert("roomMembers", { roomId, participantId, role: p === EARLIER_ROOM.helper ? "helper" : "learner", joinedAt: roomAt + k * 5_000 });
      await ctx.db.insert("signals", {
        sessionId,
        conceptId: conceptIds[EARLIER_ROOM.concept],
        participantId,
        level: EARLIER_ROOM.post[k],
        phase: "post",
        updatedAt: roomAt + 5 * minute + k * 5_000,
      });
    }
    for (const [k, [p, body]] of EARLIER_ROOM.messages.entries()) {
      await ctx.db.insert("messages", { roomId, authorId: participantIds[p], body, createdAt: roomAt + 60_000 + k * 30_000 });
    }

    console.log(`Seeded ${code}: ${PARTICIPANTS} simulated participants, ${QUESTIONS.length} pending questions, no published clusters`);
    console.log(`Instructor URL: http://localhost:3000/instructor/${sessionId}`);
    console.log(`In that tab run: localStorage.setItem("dorsal:instructor:${sessionId}", "${instructorSecret}")`);
    return { sessionId, code, instructorSecret };
  },
});
