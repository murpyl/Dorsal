import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const level = v.union(
  v.literal("confused"),
  v.literal("partial"),
  v.literal("can_explain"),
);
export const phase = v.union(v.literal("pre"), v.literal("post"));

export default defineSchema({
  sessions: defineTable({
    title: v.string(),
    code: v.string(),
    state: v.union(v.literal("open"), v.literal("closed")),
    phase,
    instructorSecretHash: v.string(),
    activeConceptId: v.optional(v.id("concepts")),
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
    relation: v.union(
      v.literal("prerequisite_for"),
      v.literal("related_to"),
      v.literal("frequently_confused_with"),
    ),
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
});
