import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getInstructorSession, requireParticipant } from "./credentials";
import { level } from "./schema";

async function writeSignal(
  ctx: MutationCtx,
  sessionId: Id<"sessions">,
  participantId: Id<"participants">,
  conceptId: Id<"concepts">,
  level: Doc<"signals">["level"],
  phase: Doc<"signals">["phase"],
) {
  const existing = await ctx.db
    .query("signals")
    .withIndex("by_participant_concept_phase", (q) => q.eq("participantId", participantId).eq("conceptId", conceptId).eq("phase", phase))
    .unique();
  if (existing) await ctx.db.patch(existing._id, { level, updatedAt: Date.now() });
  else await ctx.db.insert("signals", { sessionId, conceptId, participantId, level, phase, updatedAt: Date.now() });
}

/** The student's rating on the session page; always recorded as `pre` (before peer help). */
export const upsert = mutation({
  args: { sessionId: v.id("sessions"), token: v.string(), conceptId: v.id("concepts"), level },
  handler: async (ctx, { sessionId, token, conceptId, level }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.state !== "open") throw new ConvexError("Session not found or closed");
    const participant = await requireParticipant(ctx, sessionId, token);
    const concept = await ctx.db.get(conceptId);
    if (!concept || concept.sessionId !== sessionId) throw new ConvexError("Concept not in this session");
    await writeSignal(ctx, sessionId, participant._id, conceptId, level, "pre");
  },
});

/** A room member's updated rating for the room's concept; the only way a `post` (after peer help) signal is written. */
export const roomCheckIn = mutation({
  args: { roomId: v.id("rooms"), token: v.string(), level },
  handler: async (ctx, { roomId, token, level }) => {
    const room = await ctx.db.get(roomId);
    if (!room) throw new ConvexError("Room not found");
    const session = await ctx.db.get(room.sessionId);
    if (!session || session.state !== "open") throw new ConvexError("Session not found or closed");
    const participant = await requireParticipant(ctx, room.sessionId, token);
    const member = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_participant", (q) => q.eq("roomId", roomId).eq("participantId", participant._id))
      .unique();
    if (!member) throw new ConvexError("Only room members can rate here");
    await writeSignal(ctx, room.sessionId, participant._id, room.conceptId, level, "post");
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
