import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { RECURSION_LESSON } from "./seed";
import { modules } from "./test.setup";
import { sanitizeClusterSuggestions, type ClusterInput } from "../lib/aiSchemas";

const SECRET = "instructor-secret-0123456789abcdef0123456789abcdef";
const TOKEN_A = "student-token-a-0123456789abcdef0123456789abcdef";

const INPUT: ClusterInput = {
  concepts: [
    { id: "c1", label: "Call stack & frames", description: "" },
    { id: "c2", label: "Return values", description: "" },
  ],
  questions: [
    { id: "q1", content: "How does the stack unwind?", conceptId: "c1" },
    { id: "q2", content: "Where do frames go after the base case?", conceptId: "c1" },
    { id: "q3", content: "Where does the multiplication happen?", conceptId: "c2" },
    { id: "q4", content: "Why do I need return?", conceptId: "c2" },
  ],
};
const cluster = (questionIds: string[], conceptIds = ["c1"], extra: Record<string, unknown> = {}) => ({
  title: "Tracing recursive return values",
  summary: "Students don't see how values flow back up the stack",
  conceptIds,
  questionIds,
  confidence: 0.7,
  ...extra,
});

describe("sanitizeClusterSuggestions (scenario 4: model output is validated against the exact input batch)", () => {
  test("drops invented and duplicate question IDs and invalid concept IDs, keeps the rest", () => {
    const { clusters, droppedIds } = sanitizeClusterSuggestions(
      {
        clusters: [
          cluster(["q1", "q2", "q-invented", "q1"], ["c1", "c-made-up", "c1"]),
          cluster(["q2", "q3", "q4"], ["c2"]),
        ],
      },
      INPUT,
    );
    expect(clusters.map((c) => c.questionIds)).toEqual([["q1", "q2"], ["q3", "q4"]]);
    expect(clusters.map((c) => c.conceptIds)).toEqual([["c1"], ["c2"]]);
    expect(droppedIds).toBe(5);
    const all = clusters.flatMap((c) => c.questionIds);
    expect(new Set(all).size).toBe(all.length);
  });

  test("a cluster left with fewer than two real questions is dropped entirely", () => {
    const { clusters } = sanitizeClusterSuggestions({ clusters: [cluster(["q1", "fake-a", "fake-b"]), cluster(["q3", "q4"], ["c2"])] }, INPUT);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].questionIds).toEqual(["q3", "q4"]);
  });

  test("falls back to the questions' own concepts when every concept ID is invalid, and bounds text length", () => {
    const { clusters } = sanitizeClusterSuggestions(
      { clusters: [cluster(["q1", "q3"], ["nope"], { title: "T".repeat(200), summary: "S".repeat(600) })] },
      INPUT,
    );
    expect(clusters[0].conceptIds).toEqual(["c1", "c2"]);
    expect(clusters[0].title).toHaveLength(120);
    expect(clusters[0].summary).toHaveLength(500);
  });

  test("rejects malformed shapes instead of guessing", () => {
    for (const bad of [
      null,
      "not json",
      {},
      { clusters: "nope" },
      { clusters: [{ title: "x", summary: "y", conceptIds: ["c1"], questionIds: ["q1", "q2"] }] },
      { clusters: [cluster(["q1", "q2"], ["c1"], { confidence: 1.5 })] },
      { clusters: [cluster(["q1", "q2"], ["c1"], { confidence: "high" })] },
      { clusters: [cluster(["q1", "q2"], ["c1"], { title: "   " })] },
      { clusters: [cluster([1, 2] as unknown as string[])] },
    ]) {
      expect(() => sanitizeClusterSuggestions(bad, INPUT)).toThrow(/did not match/);
    }
    expect(sanitizeClusterSuggestions({ clusters: [] }, INPUT)).toEqual({ clusters: [], droppedIds: 0 });
  });
});

async function setup() {
  const t = convexTest(schema, modules);
  const { sessionId, code } = await t.mutation(api.sessions.create, { title: "Recursion", instructorSecret: SECRET, concepts: RECURSION_LESSON });
  await t.mutation(api.sessions.join, { code, token: TOKEN_A });
  const concepts = await t.run((ctx) =>
    ctx.db.query("concepts").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect(),
  );
  concepts.sort((a, b) => a.order - b.order);
  const creds = { sessionId, instructorSecret: SECRET };
  const ask = (content: string, concept = 2) =>
    t.mutation(api.questions.submit, { sessionId, token: TOKEN_A, conceptId: concepts[concept]._id, content });
  const newRun = () =>
    t.run((ctx) => ctx.db.insert("aiRuns", { sessionId, operation: "clusterQuestions", model: "test", status: "running", createdAt: Date.now() }));
  return { t, sessionId, code, concepts, creds, ask, newRun };
}

describe("clusters.saveSuggestions never stores IDs outside the session's pending questions", () => {
  test("ignores already-clustered and foreign questions and foreign concepts; too-small clusters are not saved", async () => {
    const { t, sessionId, concepts, creds, ask, newRun } = await setup();
    const q1 = await ask("How does the stack unwind?");
    const q2 = await ask("Where do frames go?");
    const q3 = await ask("Why return?", 3);
    const other = await t.mutation(api.sessions.create, { title: "Other", instructorSecret: SECRET, concepts: RECURSION_LESSON });
    await t.mutation(api.sessions.join, { code: other.code, token: TOKEN_A });
    const otherConcepts = await t.run((ctx) =>
      ctx.db.query("concepts").withIndex("by_session", (q) => q.eq("sessionId", other.sessionId)).collect(),
    );
    const foreignQ = await t.mutation(api.questions.submit, { sessionId: other.sessionId, token: TOKEN_A, conceptId: otherConcepts[0]._id, content: "foreign" });
    await t.mutation(api.clusters.createManual, { ...creds, title: "Already grouped", summary: "", conceptIds: [concepts[3]._id], questionIds: [q3] });

    const runId = await newRun();
    const saved = await t.mutation(internal.clusters.saveSuggestions, {
      sessionId,
      runId,
      latencyMs: 12,
      clusters: [
        { title: "Stack", summary: "s", conceptIds: [concepts[2]._id, otherConcepts[1]._id], questionIds: [q1, q2, q3, foreignQ, q1], confidence: 0.9 },
        { title: "Too small", summary: "s", conceptIds: [concepts[0]._id], questionIds: [q3, foreignQ], confidence: 0.5 },
      ],
    });
    expect(saved).toBe(1);
    const suggested = (await t.query(api.clusters.listInstructor, creds))!.suggested;
    expect(suggested).toHaveLength(1);
    expect(suggested[0].questions.map((q) => q._id).sort()).toEqual([q1, q2].sort());
    expect(suggested[0].conceptIds).toEqual([concepts[2]._id]);
    expect(suggested[0]).toMatchObject({ source: "ai", confidence: 0.9, status: "suggested" });
    const rows = await t.run((ctx) => ctx.db.query("clusters").collect());
    for (const row of rows) {
      expect(row.sessionId).toBe(sessionId);
      for (const id of row.questionIds) expect([q1, q2, q3]).toContain(id);
      expect(row.questionIds).not.toContain(foreignQ);
    }
    expect((await t.run((ctx) => ctx.db.get(foreignQ)))!.state).toBe("pending");
    const run = (await t.run((ctx) => ctx.db.get(runId)))!;
    expect(run).toMatchObject({ status: "ok", latencyMs: 12 });
  });

  test("discarding a suggestion returns its questions to pending; publish only accepts suggested clusters", async () => {
    const { t, sessionId, concepts, creds, ask, newRun } = await setup();
    const ids = [await ask("a?"), await ask("b?")];
    await t.mutation(internal.clusters.saveSuggestions, {
      sessionId,
      runId: await newRun(),
      latencyMs: 1,
      clusters: [{ title: "T", summary: "s", conceptIds: [concepts[2]._id], questionIds: ids as Id<"questions">[], confidence: 0.6 }],
    });
    const [c] = (await t.query(api.clusters.listInstructor, creds))!.suggested;
    await t.mutation(api.clusters.discard, { ...creds, clusterId: c._id });
    expect((await t.query(api.questions.listInstructor, creds))!.every((q) => q.state === "pending")).toBe(true);
    await expect(t.mutation(api.clusters.publish, { ...creds, clusterId: c._id })).rejects.toThrow();
    await expect(t.mutation(api.clusters.publish, { sessionId, instructorSecret: TOKEN_A, clusterId: c._id })).rejects.toThrow();
  });
});

describe("AI failure path (scenario 7: the demo continues without Claude)", () => {
  // Fake timers keep the scheduled `claude.clusterQuestions` job pending, so convex/claude.ts ("use node",
  // Anthropic SDK) is never loaded and no API call can happen; the error path is driven via markRunError.
  afterEach(() => vi.useRealTimers());

  test("requestSuggestions needs a pending question, records an aiRuns row and refuses a second concurrent run", async () => {
    vi.useFakeTimers();
    const { t, sessionId, creds, ask } = await setup();
    await expect(t.mutation(api.clusters.requestSuggestions, creds)).rejects.toThrow(/No pending questions/);
    await ask("why?");
    await expect(t.mutation(api.clusters.requestSuggestions, { sessionId, instructorSecret: TOKEN_A })).rejects.toThrow();

    const runId = await t.mutation(api.clusters.requestSuggestions, creds);
    const run = (await t.run((ctx) => ctx.db.get(runId)))!;
    expect(run).toMatchObject({ sessionId, operation: "clusterQuestions", status: "running" });
    expect(typeof run.model).toBe("string");
    const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].name).toBe("claude:clusterQuestions");
    expect(scheduled[0].state.kind).toBe("pending");
    await expect(t.mutation(api.clusters.requestSuggestions, creds)).rejects.toThrow(/already in progress/);
    expect((await t.query(api.clusters.listInstructor, creds))!.latestRun).toMatchObject({ status: "running", error: null });
  });

  test("after the run errors, manual grouping publishes a cluster students can see and a retry is allowed", async () => {
    vi.useFakeTimers();
    const { t, sessionId, concepts, creds, ask } = await setup();
    const ids = [await ask("How does the stack unwind?"), await ask("Where do the frames go?"), await ask("Why return?", 3)];
    const runId = await t.mutation(api.clusters.requestSuggestions, creds);
    await t.mutation(internal.clusters.markRunError, { runId, error: "ANTHROPIC_API_KEY is not set on the Convex deployment" });

    const list = (await t.query(api.clusters.listInstructor, creds))!;
    expect(list.latestRun).toMatchObject({ status: "error", error: "ANTHROPIC_API_KEY is not set on the Convex deployment" });
    expect(list.suggested).toEqual([]);
    expect((await t.query(api.questions.listInstructor, creds))!.every((q) => q.state === "pending")).toBe(true);

    const clusterId = await t.mutation(api.clusters.createManual, {
      ...creds,
      title: "Tracing recursive return values",
      summary: "Students don't see how return values flow back up the call stack",
      conceptIds: [concepts[2]._id, concepts[3]._id],
      questionIds: ids,
    });
    const stored = (await t.run((ctx) => ctx.db.get(clusterId)))!;
    expect(stored).toMatchObject({ status: "published", source: "manual", questionIds: ids });
    const published = (await t.query(api.clusters.listPublished, { sessionId, token: TOKEN_A }))!;
    expect(published.map((c) => ({ id: c._id, n: c.questionCount }))).toEqual([{ id: clusterId, n: 3 }]);
    const forConcept = (await t.query(api.clusters.listForConcept, { ...creds, conceptId: concepts[3]._id }))!;
    expect(forConcept.map((c) => c._id)).toEqual([clusterId]);
    expect(await t.query(api.clusters.listForConcept, { ...creds, conceptId: concepts[0]._id })).toEqual([]);

    await expect(t.mutation(api.clusters.createManual, { ...creds, title: "Again", summary: "", conceptIds: [concepts[2]._id], questionIds: ids })).rejects.toThrow(/at least one pending/);
    await ask("one more?");
    const retry = await t.mutation(api.clusters.requestSuggestions, creds);
    expect(retry).not.toBe(runId);
    const runs = await t.run((ctx) => ctx.db.query("aiRuns").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect());
    expect(runs.map((r) => r.status).sort()).toEqual(["error", "running"]);
  });
});
