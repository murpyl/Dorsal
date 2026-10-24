import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getInstructorSession, requireParticipant } from "./credentials";
import { MIN_CLUSTER_QUESTIONS, RUN_STALE_MS } from "../lib/aiSchemas";

const MAX_INPUT_QUESTIONS = 40;

async function requireInstructor(ctx: QueryCtx, sessionId: Id<"sessions">, instructorSecret: string) {
  const session = await getInstructorSession(ctx, sessionId, instructorSecret);
  if (!session) throw new ConvexError("Instructor access required");
  return session;
}

async function getCluster(ctx: QueryCtx, sessionId: Id<"sessions">, clusterId: Id<"clusters">) {
  const cluster = await ctx.db.get(clusterId);
  if (!cluster || cluster.sessionId !== sessionId) throw new ConvexError("Cluster not in this session");
  return cluster;
}

async function sessionConcepts(ctx: QueryCtx, sessionId: Id<"sessions">) {
  return await ctx.db.query("concepts").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect();
}

async function clustersByStatus(ctx: QueryCtx, sessionId: Id<"sessions">, status: Doc<"clusters">["status"]) {
  return await ctx.db
    .query("clusters")
    .withIndex("by_session_status", (q) => q.eq("sessionId", sessionId).eq("status", status))
    .order("desc")
    .collect();
}

/** Question docs for a cluster, skipping hidden ones. */
async function clusterQuestions(ctx: QueryCtx, cluster: Doc<"clusters">) {
  const docs = await Promise.all(cluster.questionIds.map((id) => ctx.db.get(id)));
  return docs.filter((q): q is Doc<"questions"> => q !== null && q.state !== "hidden");
}

/** Instructor-facing projection of a cluster's questions: text + simulated marker, no participant IDs. */
async function clusterQuestionViews(ctx: QueryCtx, cluster: Doc<"clusters">) {
  return await Promise.all(
    (await clusterQuestions(ctx, cluster)).map(async (q) => {
      const participant = await ctx.db.get(q.participantId);
      return { _id: q._id, content: q.content, isSimulated: participant?.isSimulated ?? false };
    }),
  );
}

async function validateConceptIds(ctx: QueryCtx, sessionId: Id<"sessions">, conceptIds: Id<"concepts">[]) {
  const valid = new Set((await sessionConcepts(ctx, sessionId)).map((c) => c._id));
  const unique = [...new Set(conceptIds)];
  if (unique.length === 0 || unique.some((id) => !valid.has(id))) throw new ConvexError("Pick at least one concept from this session");
  return unique;
}

/** Keeps only questions that are still pending in this session and marks them clustered. */
async function claimPendingQuestions(ctx: MutationCtx, sessionId: Id<"sessions">, questionIds: Id<"questions">[]) {
  const claimed: Id<"questions">[] = [];
  for (const id of new Set(questionIds)) {
    const question = await ctx.db.get(id);
    if (!question || question.sessionId !== sessionId || question.state !== "pending") continue;
    await ctx.db.patch(id, { state: "clustered" });
    claimed.push(id);
  }
  return claimed;
}

function withLabels(cluster: Doc<"clusters">, labels: Map<Id<"concepts">, string>) {
  return {
    _id: cluster._id,
    title: cluster.title,
    summary: cluster.summary,
    conceptIds: cluster.conceptIds,
    conceptLabels: cluster.conceptIds.map((id) => labels.get(id) ?? "Unknown concept"),
    status: cluster.status,
    source: cluster.source,
    confidence: cluster.confidence ?? null,
    createdAt: cluster.createdAt,
  };
}

export const requestSuggestions = mutation({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string() },
  handler: async (ctx, { sessionId, instructorSecret }) => {
    await requireInstructor(ctx, sessionId, instructorSecret);
    const pending = await ctx.db
      .query("questions")
      .withIndex("by_session_state", (q) => q.eq("sessionId", sessionId).eq("state", "pending"))
      .first();
    if (!pending) throw new ConvexError("No pending questions to cluster");
    const latest = await ctx.db.query("aiRuns").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).order("desc").first();
    if (latest?.status === "running" && Date.now() - latest.createdAt < RUN_STALE_MS)
      throw new ConvexError("A suggestion run is already in progress");

    const runId = await ctx.db.insert("aiRuns", {
      sessionId,
      operation: "clusterQuestions",
      model: process.env.CLAUDE_MODEL ?? "unset",
      status: "running",
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.claude.clusterQuestions, { sessionId, runId });
    return runId;
  },
});

export const getClusterInput = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const concepts = await sessionConcepts(ctx, sessionId);
    concepts.sort((a, b) => a.order - b.order);
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_session_state", (q) => q.eq("sessionId", sessionId).eq("state", "pending"))
      .order("desc")
      .take(MAX_INPUT_QUESTIONS);
    return {
      concepts: concepts.map((c) => ({ id: c._id, label: c.label, description: c.description })),
      questions: questions.map((q) => ({ id: q._id, content: q.content, conceptId: q.conceptId })),
    };
  },
});

export const saveSuggestions = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    runId: v.id("aiRuns"),
    latencyMs: v.number(),
    clusters: v.array(
      v.object({
        title: v.string(),
        summary: v.string(),
        conceptIds: v.array(v.id("concepts")),
        questionIds: v.array(v.id("questions")),
        confidence: v.number(),
      }),
    ),
  },
  handler: async (ctx, { sessionId, runId, latencyMs, clusters }) => {
    const validConcepts = new Set((await sessionConcepts(ctx, sessionId)).map((c) => c._id));
    let saved = 0;
    for (const cluster of clusters) {
      const questionIds = await claimPendingQuestions(ctx, sessionId, cluster.questionIds);
      if (questionIds.length < MIN_CLUSTER_QUESTIONS) {
        for (const id of questionIds) await ctx.db.patch(id, { state: "pending" });
        continue;
      }
      await ctx.db.insert("clusters", {
        sessionId,
        title: cluster.title,
        summary: cluster.summary,
        conceptIds: cluster.conceptIds.filter((id) => validConcepts.has(id)),
        questionIds,
        status: "suggested",
        source: "ai",
        confidence: cluster.confidence,
        createdAt: Date.now(),
      });
      saved++;
    }
    await ctx.db.patch(runId, { status: "ok", latencyMs });
    return saved;
  },
});

export const markRunError = internalMutation({
  args: { runId: v.id("aiRuns"), error: v.string() },
  handler: async (ctx, { runId, error }) => {
    await ctx.db.patch(runId, { status: "error", error });
  },
});

export const listInstructor = query({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string() },
  handler: async (ctx, { sessionId, instructorSecret }) => {
    const session = await getInstructorSession(ctx, sessionId, instructorSecret);
    if (!session) return null;
    const labels = new Map((await sessionConcepts(ctx, sessionId)).map((c) => [c._id, c.label]));
    const [suggested, published, latestRun] = await Promise.all([
      clustersByStatus(ctx, sessionId, "suggested"),
      clustersByStatus(ctx, sessionId, "published"),
      ctx.db.query("aiRuns").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).order("desc").first(),
    ]);
    const expand = (clusters: Doc<"clusters">[]) =>
      Promise.all(
        clusters.map(async (c) => ({
          ...withLabels(c, labels),
          questions: await clusterQuestionViews(ctx, c),
        })),
      );
    return {
      suggested: await expand(suggested),
      published: await expand(published),
      latestRun: latestRun
        ? { status: latestRun.status, model: latestRun.model, latencyMs: latestRun.latencyMs ?? null, error: latestRun.error ?? null, createdAt: latestRun.createdAt }
        : null,
    };
  },
});

export const listPublished = query({
  args: { sessionId: v.id("sessions"), token: v.string() },
  handler: async (ctx, { sessionId, token }) => {
    await requireParticipant(ctx, sessionId, token);
    const [published, concepts, participants] = await Promise.all([
      clustersByStatus(ctx, sessionId, "published"),
      sessionConcepts(ctx, sessionId),
      ctx.db.query("participants").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect(),
    ]);
    const labels = new Map(concepts.map((c) => [c._id, c.label]));
    return await Promise.all(
      published.map(async (c) => {
        const conceptSet = new Set(c.conceptIds);
        return {
          _id: c._id,
          title: c.title,
          summary: c.summary,
          conceptIds: c.conceptIds,
          conceptLabels: c.conceptIds.map((id) => labels.get(id) ?? "Unknown concept"),
          questionCount: (await clusterQuestions(ctx, c)).length,
          helperCount: participants.filter((p) => p.helperConceptIds.some((id) => conceptSet.has(id))).length,
        };
      }),
    );
  },
});

export const listForConcept = query({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string(), conceptId: v.id("concepts") },
  handler: async (ctx, { sessionId, instructorSecret, conceptId }) => {
    const session = await getInstructorSession(ctx, sessionId, instructorSecret);
    if (!session) return null;
    const labels = new Map((await sessionConcepts(ctx, sessionId)).map((c) => [c._id, c.label]));
    const published = (await clustersByStatus(ctx, sessionId, "published")).filter((c) => c.conceptIds.includes(conceptId));
    return await Promise.all(
      published.map(async (c) => ({
        ...withLabels(c, labels),
        questions: await clusterQuestionViews(ctx, c),
      })),
    );
  },
});

export const update = mutation({
  args: {
    sessionId: v.id("sessions"),
    instructorSecret: v.string(),
    clusterId: v.id("clusters"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    conceptIds: v.optional(v.array(v.id("concepts"))),
  },
  handler: async (ctx, { sessionId, instructorSecret, clusterId, title, summary, conceptIds }) => {
    await requireInstructor(ctx, sessionId, instructorSecret);
    const cluster = await getCluster(ctx, sessionId, clusterId);
    if (cluster.status === "discarded") throw new ConvexError("Cluster was discarded");
    const patch: Partial<Doc<"clusters">> = {};
    if (title !== undefined) {
      const trimmed = title.trim();
      if (!trimmed || trimmed.length > 120) throw new ConvexError("Title must be 1–120 characters");
      patch.title = trimmed;
    }
    if (summary !== undefined) {
      const trimmed = summary.trim();
      if (trimmed.length > 500) throw new ConvexError("Summary must be at most 500 characters");
      patch.summary = trimmed;
    }
    if (conceptIds !== undefined) patch.conceptIds = await validateConceptIds(ctx, sessionId, conceptIds);
    await ctx.db.patch(clusterId, patch);
  },
});

export const publish = mutation({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string(), clusterId: v.id("clusters") },
  handler: async (ctx, { sessionId, instructorSecret, clusterId }) => {
    await requireInstructor(ctx, sessionId, instructorSecret);
    const cluster = await getCluster(ctx, sessionId, clusterId);
    if (cluster.status !== "suggested") throw new ConvexError("Only suggested clusters can be published");
    await ctx.db.patch(clusterId, { status: "published" });
  },
});

export const discard = mutation({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string(), clusterId: v.id("clusters") },
  handler: async (ctx, { sessionId, instructorSecret, clusterId }) => {
    await requireInstructor(ctx, sessionId, instructorSecret);
    const cluster = await getCluster(ctx, sessionId, clusterId);
    if (cluster.status === "discarded") return;
    await ctx.db.patch(clusterId, { status: "discarded" });
    for (const question of await clusterQuestions(ctx, cluster)) {
      if (question.state === "clustered") await ctx.db.patch(question._id, { state: "pending" });
    }
  },
});

export const createManual = mutation({
  args: {
    sessionId: v.id("sessions"),
    instructorSecret: v.string(),
    title: v.string(),
    summary: v.string(),
    conceptIds: v.array(v.id("concepts")),
    questionIds: v.array(v.id("questions")),
  },
  handler: async (ctx, { sessionId, instructorSecret, title, summary, conceptIds, questionIds }) => {
    await requireInstructor(ctx, sessionId, instructorSecret);
    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length > 120) throw new ConvexError("Title must be 1–120 characters");
    if (summary.trim().length > 500) throw new ConvexError("Summary must be at most 500 characters");
    const validConcepts = await validateConceptIds(ctx, sessionId, conceptIds);
    const claimed = await claimPendingQuestions(ctx, sessionId, questionIds);
    if (claimed.length === 0) throw new ConvexError("Select at least one pending question");
    return await ctx.db.insert("clusters", {
      sessionId,
      title: trimmedTitle,
      summary: summary.trim(),
      conceptIds: validConcepts,
      questionIds: claimed,
      status: "published",
      source: "manual",
      createdAt: Date.now(),
    });
  },
});
