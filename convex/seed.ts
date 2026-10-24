import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Doc, Id, TableNames } from "./_generated/dataModel";
import { sha256 } from "./credentials";
import { SEED_CONCEPTS, SEED_EDGES } from "./sessions";

const DEMO_CODE = "DEMO01";
const DEMO_TITLE = "Recursion: how return values propagate";
const PARTICIPANTS = 24;
const FALLBACK_CLUSTER = {
  title: "Tracing recursive return values",
  summary: "Students don't see how each call's result flows back up the call stack and is combined on the way out.",
  concepts: [3, 2], // Return values, Call stack & frames
  questionConcept: 3,
};

/** `pre` signals per concept (same order as SEED_CONCEPTS): [confused, partial, can_explain]. */
const SEED_SIGNALS: [number, number, number][] = [
  [2, 5, 17], // Base case: mostly can_explain
  [5, 10, 9], // Recursive call
  [15, 6, 3], // Call stack & frames: mostly confused
  [14, 7, 3], // Return values: mostly confused
  [6, 3, 1], // Tree recursion: only 10 of 24 answered
];

/**
 * Three paraphrase groups (stack unwinding, return values, base case), interleaved in arrival order.
 * The return-values group (concept 3) is pre-grouped into a published manual cluster so the demo has a
 * visible cluster without Claude; the other two groups stay pending for the live "Suggest clusters" step.
 */
const SEED_QUESTIONS: { concept: number; content: string }[] = [
  { concept: 2, content: "When the base case finally returns, how does the program know which call to go back to?" },
  { concept: 3, content: "In factorial(4), where does the multiplication actually happen: on the way down or on the way back up?" },
  { concept: 0, content: "How do I pick the base case? Is it always n == 0?" },
  { concept: 2, content: "What happens to all the frames after we hit the base case? Do they run again in reverse?" },
  { concept: 3, content: "Why do I need `return` in front of the recursive call? Without it I just get None." },
  { concept: 2, content: "I don't get how the stack 'unwinds'. How do we end up back in the very first call?" },
  { concept: 0, content: "What happens if I forget the base case? Does it just run forever?" },
  { concept: 3, content: "How does the result from the inner call get combined with the outer call's result?" },
  { concept: 2, content: "Does each recursive call keep its own copy of n, or do they all share one?" },
  { concept: 0, content: "Can a function have more than one base case?" },
];

async function deleteAll(ctx: MutationCtx, docs: { _id: Id<TableNames> }[]) {
  for (const doc of docs) await ctx.db.delete(doc._id);
}

async function deleteSession(ctx: MutationCtx, session: Doc<"sessions">) {
  const sessionId = session._id;
  const rooms = await ctx.db.query("rooms").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect();
  for (const room of rooms) {
    await deleteAll(ctx, await ctx.db.query("messages").withIndex("by_room_time", (q) => q.eq("roomId", room._id)).collect());
    await deleteAll(ctx, await ctx.db.query("roomMembers").withIndex("by_room", (q) => q.eq("roomId", room._id)).collect());
  }
  await deleteAll(ctx, rooms);
  for (const status of ["suggested", "published", "discarded"] as const) {
    await deleteAll(
      ctx,
      await ctx.db.query("clusters").withIndex("by_session_status", (q) => q.eq("sessionId", sessionId).eq("status", status)).collect(),
    );
  }
  await deleteAll(ctx, await ctx.db.query("aiRuns").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect());
  for (const state of ["pending", "clustered", "hidden"] as const) {
    await deleteAll(
      ctx,
      await ctx.db.query("questions").withIndex("by_session_state", (q) => q.eq("sessionId", sessionId).eq("state", state)).collect(),
    );
  }
  const concepts = await ctx.db.query("concepts").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect();
  for (const concept of concepts) {
    for (const phase of ["pre", "post"] as const) {
      await deleteAll(
        ctx,
        await ctx.db.query("signals").withIndex("by_concept_phase", (q) => q.eq("conceptId", concept._id).eq("phase", phase)).collect(),
      );
    }
  }
  await deleteAll(ctx, await ctx.db.query("participants").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect());
  await deleteAll(ctx, await ctx.db.query("conceptEdges").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect());
  await deleteAll(ctx, concepts);
  await ctx.db.delete(sessionId);
}

/**
 * Wipes and recreates the simulated demo session. Internal only: run with `npx convex run seed:reset`.
 * Idempotent — every run leaves exactly one session with the given code (fresh ids and instructor secret).
 */
export const reset = internalMutation({
  args: { code: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const code = (args.code ?? DEMO_CODE).toUpperCase();
    const existing = await ctx.db.query("sessions").withIndex("by_code", (q) => q.eq("code", code)).collect();
    for (const session of existing) await deleteSession(ctx, session);

    const now = Date.now();
    const instructorSecret = crypto.randomUUID() + crypto.randomUUID();
    const sessionId = await ctx.db.insert("sessions", {
      title: DEMO_TITLE,
      code,
      state: "open",
      instructorSecretHash: await sha256(instructorSecret),
      createdAt: now,
    });

    const conceptIds: Id<"concepts">[] = [];
    for (const [order, concept] of SEED_CONCEPTS.entries()) {
      conceptIds.push(await ctx.db.insert("concepts", { sessionId, order, ...concept }));
    }
    for (const [from, to] of SEED_EDGES) {
      await ctx.db.insert("conceptEdges", { sessionId, fromId: conceptIds[from], toId: conceptIds[to], relation: "prerequisite_for" });
    }
    // Every concept has already been current (so all seeded `pre` signals are ratable); Call stack & frames is current now.
    await ctx.db.patch(sessionId, {
      activeConceptId: conceptIds[2],
      activeHistory: conceptIds.map((conceptId, i) => ({ conceptId, at: now - (conceptIds.length - i) * 60_000 })),
    });

    // Simulated participants can never be impersonated: findParticipant compares against a 64-char hex
    // SHA-256 digest, and this sentinel is not one, so no token hashes to it.
    const participantIds: Id<"participants">[] = [];
    for (let i = 0; i < PARTICIPANTS; i++) {
      participantIds.push(
        await ctx.db.insert("participants", {
          sessionId,
          tokenHash: `simulated:${i}`,
          alias: `Sim ${i + 1}`,
          helperConceptIds: [],
          isSimulated: true,
          createdAt: now - (PARTICIPANTS - i) * 60_000,
        }),
      );
    }

    let signalCount = 0;
    for (const [c, [confused, partial, canExplain]] of SEED_SIGNALS.entries()) {
      const responders = confused + partial + canExplain;
      for (let k = 0; k < responders; k++) {
        const level = k < confused ? "confused" : k < confused + partial ? "partial" : "can_explain";
        await ctx.db.insert("signals", {
          sessionId,
          conceptId: conceptIds[c],
          participantId: participantIds[(k + c * 7) % PARTICIPANTS],
          level,
          phase: "pre",
          updatedAt: now - (responders - k) * 5_000,
        });
        signalCount++;
      }
    }

    const clusteredQuestionIds: Id<"questions">[] = [];
    for (const [i, q] of SEED_QUESTIONS.entries()) {
      const clustered = q.concept === FALLBACK_CLUSTER.questionConcept;
      const questionId = await ctx.db.insert("questions", {
        sessionId,
        conceptId: conceptIds[q.concept],
        participantId: participantIds[(i * 5 + 3) % PARTICIPANTS],
        content: q.content,
        state: clustered ? "clustered" : "pending",
        createdAt: now - (SEED_QUESTIONS.length - i) * 15_000,
      });
      if (clustered) clusteredQuestionIds.push(questionId);
    }
    await ctx.db.insert("clusters", {
      sessionId,
      title: FALLBACK_CLUSTER.title,
      summary: FALLBACK_CLUSTER.summary,
      conceptIds: FALLBACK_CLUSTER.concepts.map((c) => conceptIds[c]),
      questionIds: clusteredQuestionIds,
      status: "published",
      source: "manual",
      createdAt: now - 10_000,
    });

    console.log(
      `Seeded ${code}: ${PARTICIPANTS} simulated participants, ${signalCount} pre signals, ${SEED_QUESTIONS.length - clusteredQuestionIds.length} pending questions, 1 published cluster (${clusteredQuestionIds.length} questions)`,
    );
    console.log(`Instructor URL: http://localhost:3000/instructor/${sessionId}`);
    console.log(`In that tab run: localStorage.setItem("classpulse:instructor:${sessionId}", "${instructorSecret}")`);
    return { sessionId, code, instructorSecret };
  },
});
