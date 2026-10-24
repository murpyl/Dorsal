import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { findParticipant, isValidSecret, getInstructorSession, sha256 } from "./credentials";

const SEED_CONCEPTS = [
  { label: "Base case", description: "When the function stops recursing and returns directly.", x: 0, y: 0 },
  { label: "Recursive call", description: "Calling the function on a smaller version of the problem.", x: 260, y: 0 },
  { label: "Call stack & frames", description: "Each call gets its own frame; frames stack up until a base case.", x: 520, y: 0 },
  { label: "Return values", description: "How results flow back up the stack and combine.", x: 780, y: 0 },
  { label: "Tree recursion", description: "A function that makes more than one recursive call.", x: 520, y: 160 },
];
const SEED_EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [1, 4],
];
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const create = mutation({
  args: { title: v.string(), instructorSecret: v.string() },
  handler: async (ctx, { title, instructorSecret }) => {
    const trimmed = title.trim();
    if (!trimmed || trimmed.length > 100) throw new ConvexError("Title must be 1–100 characters");
    if (!isValidSecret(instructorSecret)) throw new ConvexError("Invalid instructor secret");

    let code: string;
    do {
      code = Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
    } while (await ctx.db.query("sessions").withIndex("by_code", (q) => q.eq("code", code)).first());

    const sessionId = await ctx.db.insert("sessions", {
      title: trimmed,
      code,
      state: "open",
      phase: "pre",
      instructorSecretHash: await sha256(instructorSecret),
      createdAt: Date.now(),
    });
    const conceptIds: Id<"concepts">[] = [];
    for (const [order, concept] of SEED_CONCEPTS.entries()) {
      conceptIds.push(await ctx.db.insert("concepts", { sessionId, order, ...concept }));
    }
    for (const [from, to] of SEED_EDGES) {
      await ctx.db.insert("conceptEdges", {
        sessionId,
        fromId: conceptIds[from],
        toId: conceptIds[to],
        relation: "prerequisite_for",
      });
    }
    await ctx.db.patch(sessionId, { activeConceptId: conceptIds[0] });
    return { sessionId, code };
  },
});

export const join = mutation({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, { code, token }) => {
    if (!isValidSecret(token)) throw new ConvexError("Invalid participant token");
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .unique();
    if (!session || session.state !== "open") throw new ConvexError("Session not found or closed");

    const existing = await findParticipant(ctx, session._id, token);
    if (existing) return { sessionId: session._id, participantId: existing._id };

    const others = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();
    const participantId = await ctx.db.insert("participants", {
      sessionId: session._id,
      tokenHash: await sha256(token),
      alias: `Student ${others.length + 1}`,
      helperConceptIds: [],
      isSimulated: false,
      createdAt: Date.now(),
    });
    return { sessionId: session._id, participantId };
  },
});

export const getStudentView = query({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, { code, token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .unique();
    if (!session) return null;
    const participant = await findParticipant(ctx, session._id, token);
    if (!participant) return null;

    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();
    concepts.sort((a, b) => a.order - b.order);
    const withMyLevel = await Promise.all(
      concepts.map(async (c) => {
        const mine = await ctx.db
          .query("signals")
          .withIndex("by_participant_concept_phase", (q) =>
            q.eq("participantId", participant._id).eq("conceptId", c._id).eq("phase", session.phase),
          )
          .unique();
        return { _id: c._id, label: c.label, description: c.description, myLevel: mine?.level ?? null };
      }),
    );
    return {
      sessionId: session._id,
      title: session.title,
      state: session.state,
      activeConceptId: session.activeConceptId ?? null,
      alias: participant.alias,
      concepts: withMyLevel,
    };
  },
});

export const getInstructorView = query({
  args: { sessionId: v.string(), instructorSecret: v.string() },
  handler: async (ctx, { sessionId, instructorSecret }) => {
    const id = ctx.db.normalizeId("sessions", sessionId);
    if (!id) return null;
    const session = await getInstructorSession(ctx, id, instructorSecret);
    if (!session) return null;

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", id))
      .collect();
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_session", (q) => q.eq("sessionId", id))
      .collect();
    concepts.sort((a, b) => a.order - b.order);
    const conceptCounts = await Promise.all(
      concepts.map(async (c) => {
        const signals = await ctx.db
          .query("signals")
          .withIndex("by_concept_phase", (q) => q.eq("conceptId", c._id).eq("phase", session.phase))
          .collect();
        const counts = { confused: 0, partial: 0, can_explain: 0 };
        for (const s of signals) counts[s.level]++;
        return { _id: c._id, label: c.label, description: c.description, x: c.x, y: c.y, counts, total: signals.length };
      }),
    );
    const edges = await ctx.db
      .query("conceptEdges")
      .withIndex("by_session", (q) => q.eq("sessionId", id))
      .collect();
    return {
      title: session.title,
      code: session.code,
      state: session.state,
      phase: session.phase,
      activeConceptId: session.activeConceptId ?? null,
      participantCount: participants.length,
      concepts: conceptCounts,
      edges: edges.map((e) => ({ _id: e._id, fromId: e.fromId, toId: e.toId, relation: e.relation })),
    };
  },
});

export const setActiveConcept = mutation({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string(), conceptId: v.id("concepts") },
  handler: async (ctx, { sessionId, instructorSecret, conceptId }) => {
    const session = await getInstructorSession(ctx, sessionId, instructorSecret);
    if (!session) throw new ConvexError("Instructor access required");
    const concept = await ctx.db.get(conceptId);
    if (!concept || concept.sessionId !== sessionId) throw new ConvexError("Concept not in this session");
    await ctx.db.patch(sessionId, { activeConceptId: conceptId });
  },
});
