import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { INFER_RATE_LIMIT } from "../lib/aiSchemas";

/** Upload URL for one lesson file; the browser POSTs the file there and passes the returned storageId to claude.inferConcepts. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const getFiles = internalQuery({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, { storageIds }) =>
    await Promise.all(
      storageIds.map(async (id) => {
        const file = await ctx.db.system.get("_storage", id);
        return file ? { storageId: id, size: file.size, contentType: file.contentType ?? "" } : null;
      }),
    ),
});

export const startInferRun = internalMutation({
  args: { model: v.string() },
  handler: async (ctx, { model }) => {
    const now = Date.now();
    const recent = await ctx.db
      .query("aiRuns")
      .withIndex("by_operation_time", (q) => q.eq("operation", "inferConcepts").gt("createdAt", now - INFER_RATE_LIMIT.windowMs))
      .take(INFER_RATE_LIMIT.runs);
    if (recent.length >= INFER_RATE_LIMIT.runs) throw new ConvexError("Too many concept suggestions right now. Wait a few minutes or add concepts by hand.");
    return await ctx.db.insert("aiRuns", { operation: "inferConcepts", model, status: "running", createdAt: now });
  },
});

export const finishInferRun = internalMutation({
  args: { runId: v.id("aiRuns"), latencyMs: v.number(), error: v.optional(v.string()) },
  handler: async (ctx, { runId, latencyMs, error }) => {
    await ctx.db.patch(runId, { status: error ? "error" : "ok", latencyMs, error });
  },
});
