import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getInstructorSession, requireParticipant } from "./credentials";
import { level } from "./schema";

export const upsert = mutation({
  args: { sessionId: v.id("sessions"), token: v.string(), conceptId: v.id("concepts"), level },
  handler: async (ctx, { sessionId, token, conceptId, level }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.state !== "open") throw new ConvexError("Session not found or closed");
    const participant = await requireParticipant(ctx, sessionId, token);
    const concept = await ctx.db.get(conceptId);
    if (!concept || concept.sessionId !== sessionId) throw new ConvexError("Concept not in this session");

    const existing = await ctx.db
      .query("signals")
      .withIndex("by_participant_concept_phase", (q) =>
        q.eq("participantId", participant._id).eq("conceptId", conceptId).eq("phase", session.phase),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { level, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("signals", {
        sessionId,
        conceptId,
        participantId: participant._id,
        level,
        phase: session.phase,
        updatedAt: Date.now(),
      });
    }
  },
});

export const prePostByConcept = query({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string() },
  handler: async (ctx, { sessionId, instructorSecret }) => {
    const session = await getInstructorSession(ctx, sessionId, instructorSecret);
    if (!session) return null;
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    concepts.sort((a, b) => a.order - b.order);
    const tally = async (conceptId: typeof concepts[number]["_id"], phase: "pre" | "post") => {
      const signals = await ctx.db
        .query("signals")
        .withIndex("by_concept_phase", (q) => q.eq("conceptId", conceptId).eq("phase", phase))
        .collect();
      const counts = { confused: 0, partial: 0, can_explain: 0 };
      for (const s of signals) counts[s.level]++;
      return { counts, total: signals.length };
    };
    return Promise.all(
      concepts.map(async (c) => ({
        conceptId: c._id,
        label: c.label,
        pre: await tally(c._id, "pre"),
        post: await tally(c._id, "post"),
      })),
    );
  },
});
