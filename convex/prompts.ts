import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getInstructorSession, requireParticipant } from "./credentials";
import { currentPrompt, responseCount } from "./sessions";
import { MAX_RESPONSE_LENGTH } from "../lib/prompt";

/** A student's answer to the current open-ended prompt; editable until the next prompt is pushed. */
export const respond = mutation({
  args: { sessionId: v.id("sessions"), token: v.string(), text: v.string() },
  handler: async (ctx, { sessionId, token, text }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.state !== "open") throw new ConvexError("Session not found or closed");
    const participant = await requireParticipant(ctx, sessionId, token);
    const prompt = await currentPrompt(ctx, session);
    if (prompt?.kind !== "open") throw new ConvexError("The current prompt isn't open-ended");
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > MAX_RESPONSE_LENGTH) throw new ConvexError(`Answers must be 1–${MAX_RESPONSE_LENGTH} characters`);
    const existing = await ctx.db
      .query("promptResponses")
      .withIndex("by_prompt_participant", (q) => q.eq("promptId", prompt._id).eq("participantId", participant._id))
      .unique();
    if (existing) await ctx.db.patch(existing._id, { text: trimmed, updatedAt: Date.now() });
    else await ctx.db.insert("promptResponses", { sessionId, promptId: prompt._id, participantId: participant._id, text: trimmed, updatedAt: Date.now() });
  },
});

/** Staff: make an earlier prompt current again; new answers join its existing responses. */
export const makeCurrent = mutation({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string(), promptId: v.id("prompts") },
  handler: async (ctx, { sessionId, instructorSecret, promptId }) => {
    const session = await getInstructorSession(ctx, sessionId, instructorSecret);
    if (!session) throw new ConvexError("Instructor access required");
    const prompt = await ctx.db.get(promptId);
    if (!prompt || prompt.sessionId !== sessionId) throw new ConvexError("Prompt not in this session");
    await ctx.db.patch(sessionId, { activePromptId: promptId, activeConceptId: prompt.conceptId });
  },
});

/** Staff only: every prompt pushed in the session, newest first, with its response count. */
export const list = query({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string() },
  handler: async (ctx, { sessionId, instructorSecret }) => {
    const session = await getInstructorSession(ctx, sessionId, instructorSecret);
    if (!session) return null;
    const prompts = await ctx.db.query("prompts").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect();
    const labels = new Map<Id<"concepts">, string>();
    return Promise.all(
      prompts.reverse().map(async (p, i) => {
        if (!labels.has(p.conceptId)) labels.set(p.conceptId, (await ctx.db.get(p.conceptId))?.label ?? "Unknown concept");
        return {
          _id: p._id,
          number: prompts.length - i,
          kind: p.kind,
          question: p.question,
          conceptId: p.conceptId,
          conceptLabel: labels.get(p.conceptId)!,
          createdAt: p.createdAt,
          current: p._id === session.activePromptId,
          responseCount: await responseCount(ctx, p._id),
        };
      }),
    );
  },
});

/** Staff only: one prompt's responses — level counts for a rating prompt, answer texts (no names) for an open-ended one. */
export const responses = query({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string(), promptId: v.id("prompts") },
  handler: async (ctx, { sessionId, instructorSecret, promptId }) => {
    const session = await getInstructorSession(ctx, sessionId, instructorSecret);
    if (!session) return null;
    const prompt = await ctx.db.get(promptId);
    if (!prompt || prompt.sessionId !== sessionId) return null;
    const rows = await ctx.db.query("promptResponses").withIndex("by_prompt", (q) => q.eq("promptId", promptId)).collect();
    const counts = { confused: 0, partial: 0, can_explain: 0 };
    let simulatedCount = 0;
    const answers: { _id: Id<"promptResponses">; text: string; updatedAt: number; isSimulated: boolean }[] = [];
    for (const r of rows) {
      const isSimulated = (await ctx.db.get(r.participantId))?.isSimulated ?? false;
      if (isSimulated) simulatedCount++;
      if (r.level) counts[r.level]++;
      if (r.text !== undefined) answers.push({ _id: r._id, text: r.text, updatedAt: r.updatedAt, isSimulated });
    }
    answers.sort((a, b) => b.updatedAt - a.updatedAt);
    return { kind: prompt.kind, counts, total: rows.length, simulatedCount, answers };
  },
});
