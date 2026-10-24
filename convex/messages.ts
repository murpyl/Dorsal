import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { findParticipant } from "./credentials";

const MAX_LENGTH = 500;
const THROTTLE_WINDOW_MS = 10_000;
const THROTTLE_MAX = 10;
const LIST_LIMIT = 200;

async function findMember(ctx: QueryCtx, roomId: Id<"rooms">, token: string) {
  const room = await ctx.db.get(roomId);
  if (!room) return null;
  const participant = await findParticipant(ctx, room.sessionId, token);
  if (!participant) return null;
  const membership = await ctx.db
    .query("roomMembers")
    .withIndex("by_room_participant", (q) => q.eq("roomId", roomId).eq("participantId", participant._id))
    .unique();
  return membership ? { room, participant } : null;
}

export const send = mutation({
  args: { roomId: v.id("rooms"), token: v.string(), body: v.string() },
  handler: async (ctx, { roomId, token, body }) => {
    const member = await findMember(ctx, roomId, token);
    if (!member) throw new ConvexError("Only room members can post here");
    if (member.room.status !== "open") throw new ConvexError("This room is closed");
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > MAX_LENGTH) throw new ConvexError(`Message must be 1–${MAX_LENGTH} characters`);
    const now = Date.now();
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_room_time", (q) => q.eq("roomId", roomId).gte("createdAt", now - THROTTLE_WINDOW_MS))
      .collect();
    if (recent.filter((m) => m.authorId === member.participant._id).length >= THROTTLE_MAX)
      throw new ConvexError("You're sending messages too quickly. Wait a few seconds.");
    await ctx.db.insert("messages", { roomId, authorId: member.participant._id, body: trimmed, createdAt: now });
  },
});

export const listByRoom = query({
  args: { roomId: v.id("rooms"), token: v.string() },
  handler: async (ctx, { roomId, token }) => {
    const member = await findMember(ctx, roomId, token);
    if (!member) return null;
    const newestFirst = await ctx.db
      .query("messages")
      .withIndex("by_room_time", (q) => q.eq("roomId", roomId))
      .order("desc")
      .take(LIST_LIMIT);
    const aliases = new Map<Id<"participants">, string>();
    const result = [];
    for (const m of newestFirst.reverse()) {
      if (!aliases.has(m.authorId)) aliases.set(m.authorId, (await ctx.db.get(m.authorId))?.alias ?? "Left");
      result.push({
        _id: m._id,
        body: m.body,
        createdAt: m.createdAt,
        authorAlias: aliases.get(m.authorId)!,
        isMine: m.authorId === member.participant._id,
      });
    }
    return result;
  },
});
