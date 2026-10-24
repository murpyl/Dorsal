import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getInstructorSession, requireParticipant } from "./credentials";

const MAX_LENGTH = 500;
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

export const submit = mutation({
  args: { sessionId: v.id("sessions"), token: v.string(), conceptId: v.id("concepts"), content: v.string() },
  handler: async (ctx, { sessionId, token, conceptId, content }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.state !== "open") throw new ConvexError("Session not found or closed");
    const participant = await requireParticipant(ctx, sessionId, token);
    const concept = await ctx.db.get(conceptId);
    if (!concept || concept.sessionId !== sessionId) throw new ConvexError("Concept not in this session");

    const trimmed = content.trim();
    if (!trimmed || trimmed.length > MAX_LENGTH) throw new ConvexError(`Question must be 1–${MAX_LENGTH} characters`);

    const since = Date.now() - RATE_WINDOW_MS;
    const recent = await ctx.db
      .query("questions")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .filter((q) => q.gt(q.field("createdAt"), since))
      .collect();
    if (recent.length >= RATE_LIMIT) throw new ConvexError("You're asking quickly — wait a minute before posting another question");

    return await ctx.db.insert("questions", {
      sessionId,
      conceptId,
      participantId: participant._id,
      content: trimmed,
      state: "pending",
      createdAt: Date.now(),
    });
  },
});

export const listInstructor = query({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string() },
  handler: async (ctx, { sessionId, instructorSecret }) => {
    const session = await getInstructorSession(ctx, sessionId, instructorSecret);
    if (!session) return null;

    const [pending, clustered, concepts] = await Promise.all([
      ctx.db.query("questions").withIndex("by_session_state", (q) => q.eq("sessionId", sessionId).eq("state", "pending")).collect(),
      ctx.db.query("questions").withIndex("by_session_state", (q) => q.eq("sessionId", sessionId).eq("state", "clustered")).collect(),
      ctx.db.query("concepts").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect(),
    ]);
    const conceptLabel = new Map(concepts.map((c) => [c._id, c.label]));
    const questions = [...pending, ...clustered].sort((a, b) => b.createdAt - a.createdAt);
    return await Promise.all(
      questions.map(async (q) => {
        const participant = await ctx.db.get(q.participantId);
        return {
          _id: q._id,
          conceptId: q.conceptId,
          conceptLabel: conceptLabel.get(q.conceptId) ?? "Unknown concept",
          content: q.content,
          state: q.state,
          createdAt: q.createdAt,
          isSimulated: participant?.isSimulated ?? false,
        };
      }),
    );
  },
});

export const hide = mutation({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string(), questionId: v.id("questions") },
  handler: async (ctx, { sessionId, instructorSecret, questionId }) => {
    const session = await getInstructorSession(ctx, sessionId, instructorSecret);
    if (!session) throw new ConvexError("Instructor access required");
    const question = await ctx.db.get(questionId);
    if (!question || question.sessionId !== sessionId) throw new ConvexError("Question not in this session");
    await ctx.db.patch(questionId, { state: "hidden" });
  },
});
