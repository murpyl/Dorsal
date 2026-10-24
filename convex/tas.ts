import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getStaffSession, isValidSecret, sha256 } from "./credentials";
import { TA_NAME_MAX } from "../lib/staff";

async function requireInstructor(ctx: QueryCtx, sessionId: Id<"sessions">, instructorSecret: string) {
  const staff = await getStaffSession(ctx, sessionId, instructorSecret);
  if (staff?.role !== "instructor") throw new ConvexError("Only the instructor can manage TAs");
  return staff.session;
}

const listTas = async (ctx: QueryCtx, sessionId: Id<"sessions">) =>
  (await ctx.db.query("participants").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect()).filter((p) => p.isTa && !p.revokedAt);

/** Instructor only: adds a TA with their own link secret (generated in the browser, stored here only as a hash). */
export const invite = mutation({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string(), name: v.string(), taSecret: v.string() },
  handler: async (ctx, { sessionId, instructorSecret, name, taSecret }) => {
    const session = await requireInstructor(ctx, sessionId, instructorSecret);
    const alias = name.trim();
    if (!alias || alias.length > TA_NAME_MAX) throw new ConvexError(`TA name must be 1–${TA_NAME_MAX} characters`);
    if (!isValidSecret(taSecret)) throw new ConvexError("Invalid TA secret");
    const tokenHash = await sha256(taSecret);
    const taken = await ctx.db.query("participants").withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash)).first();
    if (taken || tokenHash === session.instructorSecretHash) throw new ConvexError("That secret is already in use");
    return await ctx.db.insert("participants", {
      sessionId,
      tokenHash,
      alias,
      helperConceptIds: [],
      isSimulated: false,
      isTa: true,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string() },
  handler: async (ctx, { sessionId, instructorSecret }) => {
    const staff = await getStaffSession(ctx, sessionId, instructorSecret);
    if (staff?.role !== "instructor") return null;
    const tas = await listTas(ctx, sessionId);
    return tas.map((t) => ({ _id: t._id, name: t.alias, createdAt: t.createdAt }));
  },
});

/** Instructor only: revokes one TA's link and removes them from every room; other TAs are unaffected. */
export const revoke = mutation({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string(), taId: v.id("participants") },
  handler: async (ctx, { sessionId, instructorSecret, taId }) => {
    await requireInstructor(ctx, sessionId, instructorSecret);
    const ta = await ctx.db.get(taId);
    if (!ta || ta.sessionId !== sessionId || !ta.isTa || ta.revokedAt) throw new ConvexError("TA not found in this session");
    const seats = await ctx.db.query("roomMembers").withIndex("by_participant", (q) => q.eq("participantId", taId)).collect();
    for (const seat of seats) await ctx.db.delete(seat._id);
    await ctx.db.patch(taId, { tokenHash: "", revokedAt: Date.now() });
  },
});
