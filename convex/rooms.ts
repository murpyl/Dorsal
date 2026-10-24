import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { findParticipant, getInstructorSession, requireParticipant } from "./credentials";

export const DEFAULT_CAPACITY = 6;
const MIN_CAPACITY = 2;
const MAX_CAPACITY = 12;
const role = v.union(v.literal("helper"), v.literal("learner"));

async function requireOpenSession(ctx: QueryCtx, sessionId: Id<"sessions">) {
  const session = await ctx.db.get(sessionId);
  if (!session || session.state !== "open") throw new ConvexError("Session not found or closed");
  return session;
}

async function requireConcept(ctx: QueryCtx, sessionId: Id<"sessions">, conceptId: Id<"concepts">) {
  const concept = await ctx.db.get(conceptId);
  if (!concept || concept.sessionId !== sessionId) throw new ConvexError("Concept not in this session");
  return concept;
}

async function requirePublishedCluster(ctx: QueryCtx, sessionId: Id<"sessions">, clusterId?: Id<"clusters">) {
  if (!clusterId) return null;
  const cluster = await ctx.db.get(clusterId);
  if (!cluster || cluster.sessionId !== sessionId || cluster.status !== "published")
    throw new ConvexError("Cluster must be published in this session");
  return cluster;
}

async function requireOpenRoom(ctx: QueryCtx, roomId: Id<"rooms">) {
  const room = await ctx.db.get(roomId);
  if (!room || room.status !== "open") throw new ConvexError("Room not found or closed");
  await requireOpenSession(ctx, room.sessionId);
  return room;
}

const listMembers = (ctx: QueryCtx, roomId: Id<"rooms">) =>
  ctx.db.query("roomMembers").withIndex("by_room", (q) => q.eq("roomId", roomId)).collect();

const findMembership = (ctx: QueryCtx, roomId: Id<"rooms">, participantId: Id<"participants">) =>
  ctx.db
    .query("roomMembers")
    .withIndex("by_room_participant", (q) => q.eq("roomId", roomId).eq("participantId", participantId))
    .unique();

async function openRoomsWithCounts(ctx: QueryCtx, sessionId: Id<"sessions">) {
  const rooms = await ctx.db.query("rooms").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect();
  const open = rooms.filter((r) => r.status === "open").sort((a, b) => a.createdAt - b.createdAt);
  return Promise.all(
    open.map(async (room) => {
      const [concept, members, cluster] = await Promise.all([
        ctx.db.get(room.conceptId),
        listMembers(ctx, room._id),
        room.clusterId ? ctx.db.get(room.clusterId) : null,
      ]);
      return { room, concept, members, clusterTitle: cluster?.title ?? null };
    }),
  );
}

const publicRoom = (
  room: Doc<"rooms">,
  concept: Doc<"concepts"> | null,
  members: Doc<"roomMembers">[],
  clusterTitle: string | null,
) => ({
  _id: room._id,
  title: room.title,
  conceptId: room.conceptId,
  conceptLabel: concept?.label ?? "Unknown concept",
  clusterId: room.clusterId ?? null,
  clusterTitle,
  capacity: room.capacity,
  memberCount: members.length,
  helperCount: members.filter((m) => m.role === "helper").length,
});

export const createForCluster = mutation({
  args: {
    sessionId: v.id("sessions"),
    instructorSecret: v.string(),
    conceptId: v.id("concepts"),
    clusterId: v.optional(v.id("clusters")),
    title: v.optional(v.string()),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, { sessionId, instructorSecret, conceptId, clusterId, title, capacity }) => {
    const session = await getInstructorSession(ctx, sessionId, instructorSecret);
    if (!session) throw new ConvexError("Instructor access required");
    if (session.state !== "open") throw new ConvexError("Session is closed");
    const concept = await requireConcept(ctx, sessionId, conceptId);
    const cluster = await requirePublishedCluster(ctx, sessionId, clusterId);
    const trimmed = (title ?? cluster?.title.trim().slice(0, 80) ?? concept.label).trim();
    if (!trimmed || trimmed.length > 80) throw new ConvexError("Title must be 1–80 characters");
    const cap = capacity ?? DEFAULT_CAPACITY;
    if (!Number.isInteger(cap) || cap < MIN_CAPACITY || cap > MAX_CAPACITY)
      throw new ConvexError(`Capacity must be a whole number between ${MIN_CAPACITY} and ${MAX_CAPACITY}`);
    return await ctx.db.insert("rooms", {
      sessionId,
      conceptId,
      clusterId,
      title: trimmed,
      status: "open",
      capacity: cap,
      createdAt: Date.now(),
    });
  },
});

export const createAsHelper = mutation({
  args: {
    sessionId: v.id("sessions"),
    token: v.string(),
    conceptId: v.id("concepts"),
    clusterId: v.optional(v.id("clusters")),
  },
  handler: async (ctx, { sessionId, token, conceptId, clusterId }) => {
    await requireOpenSession(ctx, sessionId);
    const participant = await requireParticipant(ctx, sessionId, token);
    const concept = await requireConcept(ctx, sessionId, conceptId);
    if (!participant.helperConceptIds.includes(conceptId))
      throw new ConvexError("Opt in as a helper for this concept before opening a room");
    const cluster = await requirePublishedCluster(ctx, sessionId, clusterId);
    const roomId = await ctx.db.insert("rooms", {
      sessionId,
      conceptId,
      clusterId,
      title: cluster?.title ?? concept.label,
      status: "open",
      capacity: DEFAULT_CAPACITY,
      createdAt: Date.now(),
    });
    await ctx.db.insert("roomMembers", { roomId, participantId: participant._id, role: "helper", joinedAt: Date.now() });
    return roomId;
  },
});

export const listBySession = query({
  args: { sessionId: v.id("sessions"), token: v.string() },
  handler: async (ctx, { sessionId, token }) => {
    const participant = await findParticipant(ctx, sessionId, token);
    if (!participant) return null;
    const rooms = await openRoomsWithCounts(ctx, sessionId);
    return rooms.map(({ room, concept, members, clusterTitle }) => {
      const mine = members.find((m) => m.participantId === participant._id);
      return { ...publicRoom(room, concept, members, clusterTitle), isMember: !!mine, myRole: mine?.role ?? null };
    });
  },
});

export const listInstructor = query({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string() },
  handler: async (ctx, { sessionId, instructorSecret }) => {
    const session = await getInstructorSession(ctx, sessionId, instructorSecret);
    if (!session) return null;
    const rooms = await openRoomsWithCounts(ctx, sessionId);
    return rooms.map(({ room, concept, members, clusterTitle }) => publicRoom(room, concept, members, clusterTitle));
  },
});

export const get = query({
  args: { roomId: v.id("rooms"), token: v.string() },
  handler: async (ctx, { roomId, token }) => {
    const room = await ctx.db.get(roomId);
    if (!room) return null;
    const participant = await findParticipant(ctx, room.sessionId, token);
    if (!participant) return null;
    const mine = await findMembership(ctx, roomId, participant._id);
    if (!mine) return null;
    const [session, concept, memberRows, cluster, myRating] = await Promise.all([
      ctx.db.get(room.sessionId),
      ctx.db.get(room.conceptId),
      listMembers(ctx, roomId),
      room.clusterId ? ctx.db.get(room.clusterId) : null,
      ctx.db
        .query("signals")
        .withIndex("by_participant_concept_phase", (q) => q.eq("participantId", participant._id).eq("conceptId", room.conceptId).eq("phase", "post"))
        .unique(),
    ]);
    if (!session) return null;
    memberRows.sort((a, b) => a.joinedAt - b.joinedAt);
    const members = await Promise.all(
      memberRows.map(async (m) => {
        const p = await ctx.db.get(m.participantId);
        return { alias: p?.alias ?? "Left", role: m.role, isSimulated: p?.isSimulated ?? false, isMe: m.participantId === participant._id };
      }),
    );
    return {
      _id: room._id,
      title: room.title,
      status: room.status,
      capacity: room.capacity,
      clusterId: room.clusterId ?? null,
      clusterTitle: cluster?.title ?? null,
      conceptId: room.conceptId,
      conceptLabel: concept?.label ?? "Unknown concept",
      conceptDescription: concept?.description ?? "",
      sessionId: room.sessionId,
      sessionState: session.state,
      myLevel: myRating?.level ?? null,
      myRole: mine.role,
      members,
    };
  },
});

export const join = mutation({
  args: { roomId: v.id("rooms"), token: v.string(), role },
  handler: async (ctx, { roomId, token, role }) => {
    const room = await requireOpenRoom(ctx, roomId);
    const participant = await requireParticipant(ctx, room.sessionId, token);
    if (role === "helper" && !participant.helperConceptIds.includes(room.conceptId))
      throw new ConvexError("Opt in as a helper for this concept to join as a helper");
    if (await findMembership(ctx, roomId, participant._id)) throw new ConvexError("You are already in this room");
    const members = await listMembers(ctx, roomId);
    if (members.length >= room.capacity) throw new ConvexError("Room is full");
    await ctx.db.insert("roomMembers", { roomId, participantId: participant._id, role, joinedAt: Date.now() });
  },
});

export const leave = mutation({
  args: { roomId: v.id("rooms"), token: v.string() },
  handler: async (ctx, { roomId, token }) => {
    const room = await ctx.db.get(roomId);
    if (!room) throw new ConvexError("Room not found");
    const participant = await requireParticipant(ctx, room.sessionId, token);
    const mine = await findMembership(ctx, roomId, participant._id);
    if (mine) await ctx.db.delete(mine._id);
  },
});

export const close = mutation({
  args: { roomId: v.id("rooms"), instructorSecret: v.optional(v.string()), token: v.optional(v.string()) },
  handler: async (ctx, { roomId, instructorSecret, token }) => {
    const room = await ctx.db.get(roomId);
    if (!room) throw new ConvexError("Room not found");
    let allowed = false;
    if (instructorSecret) allowed = !!(await getInstructorSession(ctx, room.sessionId, instructorSecret));
    if (!allowed && token) {
      const participant = await findParticipant(ctx, room.sessionId, token);
      const mine = participant && (await findMembership(ctx, roomId, participant._id));
      allowed = mine?.role === "helper";
    }
    if (!allowed) throw new ConvexError("Only the instructor or a helper in this room can close it");
    if (room.status === "open") await ctx.db.patch(roomId, { status: "closed" });
  },
});
