import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireParticipant } from "./credentials";
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
