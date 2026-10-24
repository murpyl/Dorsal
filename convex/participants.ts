import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findParticipant, requireParticipant } from "./credentials";

export const setHelper = mutation({
  args: { sessionId: v.id("sessions"), token: v.string(), conceptIds: v.array(v.id("concepts")) },
  handler: async (ctx, { sessionId, token, conceptIds }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.state !== "open") throw new ConvexError("Session not found or closed");
    const participant = await requireParticipant(ctx, sessionId, token);
    const unique = [...new Set(conceptIds)];
    for (const conceptId of unique) {
      const concept = await ctx.db.get(conceptId);
      if (!concept || concept.sessionId !== sessionId) throw new ConvexError("Concept not in this session");
    }
    await ctx.db.patch(participant._id, { helperConceptIds: unique });
  },
});

export const me = query({
  args: { sessionId: v.id("sessions"), token: v.string() },
  handler: async (ctx, { sessionId, token }) => {
    const participant = await findParticipant(ctx, sessionId, token);
    if (!participant) return null;
    return { alias: participant.alias, helperConceptIds: participant.helperConceptIds };
  },
});
