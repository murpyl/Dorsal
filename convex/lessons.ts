import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { INFER_RATE_LIMIT, STALE_UPLOAD_MS, UPLOAD_RATE_LIMIT } from "../lib/aiSchemas";

/** Upload URL for one lesson file; the browser POSTs the file there and passes the returned storageId to claude.inferConcepts. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const recent = await ctx.db
      .query("uploadGrants")
      .withIndex("by_createdAt", (q) => q.gt("createdAt", now - UPLOAD_RATE_LIMIT.windowMs))
      .take(UPLOAD_RATE_LIMIT.files);
    if (recent.length >= UPLOAD_RATE_LIMIT.files) throw new ConvexError("Too many uploads right now. Wait a few minutes or add concepts by hand.");
    await ctx.db.insert("uploadGrants", { createdAt: now });
    return await ctx.storage.generateUploadUrl();
  },
});

/** Storage only ever holds in-flight lesson uploads, so anything older than STALE_UPLOAD_MS was never consumed by inferConcepts. Also drops expired upload grants. */
export const purgeStaleUploads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_UPLOAD_MS;
    const stale = await ctx.db.system
      .query("_storage")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", cutoff))
      .take(500);
    await Promise.all(stale.map((f) => ctx.storage.delete(f._id)));
    const grants = await ctx.db
      .query("uploadGrants")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(500);
    await Promise.all(grants.map((g) => ctx.db.delete(g._id)));
  },
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
