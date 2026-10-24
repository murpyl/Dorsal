import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const level = v.union(
  v.literal("confused"),
  v.literal("partial"),
  v.literal("can_explain"),
);
export const phase = v.union(v.literal("pre"), v.literal("post"));
export const relation = v.union(
  v.literal("prerequisite_for"),
  v.literal("related_to"),
  v.literal("frequently_confused_with"),
);

export default defineSchema({
  sessions: defineTable({
    title: v.string(),
    code: v.string(),
    state: v.union(v.literal("open"), v.literal("closed")),
    // Unused. Optional only so deployments whose existing sessions still carry it pass schema validation.
    phase: v.optional(phase),
    instructorSecretHash: v.string(),
    activeConceptId: v.optional(v.id("concepts")),
    /** Every concept that has been made current in this session, in the order it first became current. */
    activeHistory: v.optional(v.array(v.object({ conceptId: v.id("concepts"), at: v.number() }))),
    /** Optional one-line question the instructor/TA pushed with the current concept. */
    activePrompt: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_code", ["code"]),
  participants: defineTable({
    sessionId: v.id("sessions"),
    tokenHash: v.string(),
    alias: v.string(),
    helperConceptIds: v.array(v.id("concepts")),
    isSimulated: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_token_hash", ["tokenHash"]),
  concepts: defineTable({
    sessionId: v.id("sessions"),
    label: v.string(),
    description: v.string(),
    order: v.number(),
    x: v.number(),
    y: v.number(),
  }).index("by_session", ["sessionId"]),
  conceptEdges: defineTable({
    sessionId: v.id("sessions"),
    fromId: v.id("concepts"),
    toId: v.id("concepts"),
    relation,
  }).index("by_session", ["sessionId"]),
  signals: defineTable({
    sessionId: v.id("sessions"),
    conceptId: v.id("concepts"),
    participantId: v.id("participants"),
    level,
    phase,
    updatedAt: v.number(),
  })
    .index("by_concept_phase", ["conceptId", "phase"])
    .index("by_participant_concept_phase", ["participantId", "conceptId", "phase"]),
  questions: defineTable({
    sessionId: v.id("sessions"),
    conceptId: v.id("concepts"),
    participantId: v.id("participants"),
    content: v.string(),
    state: v.union(v.literal("pending"), v.literal("clustered"), v.literal("hidden")),
    createdAt: v.number(),
  })
    .index("by_session_state", ["sessionId", "state"])
    .index("by_concept", ["conceptId"])
    .index("by_participant", ["participantId"]),
  clusters: defineTable({
    sessionId: v.id("sessions"),
    title: v.string(),
    summary: v.string(),
    conceptIds: v.array(v.id("concepts")),
    questionIds: v.array(v.id("questions")),
    status: v.union(v.literal("suggested"), v.literal("published"), v.literal("discarded")),
    source: v.union(v.literal("ai"), v.literal("manual")),
    confidence: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_session_status", ["sessionId", "status"]),
  rooms: defineTable({
    sessionId: v.id("sessions"),
    conceptId: v.id("concepts"),
    clusterId: v.optional(v.id("clusters")),
    title: v.string(),
    status: v.union(v.literal("open"), v.literal("closed")),
    capacity: v.number(),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_concept", ["conceptId"]),
  roomMembers: defineTable({
    roomId: v.id("rooms"),
    participantId: v.id("participants"),
    role: v.union(v.literal("helper"), v.literal("learner")),
    joinedAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_participant", ["roomId", "participantId"])
    .index("by_participant", ["participantId"]),
  messages: defineTable({
    roomId: v.id("rooms"),
    authorId: v.id("participants"),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_room_time", ["roomId", "createdAt"]),
  aiRuns: defineTable({
    sessionId: v.id("sessions"),
    operation: v.literal("clusterQuestions"),
    model: v.string(),
    status: v.union(v.literal("running"), v.literal("ok"), v.literal("error")),
    latencyMs: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
