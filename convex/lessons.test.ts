import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { RECURSION_LESSON } from "./seed";
import { modules } from "./test.setup";
import { INFER_RATE_LIMIT, sanitizeConceptSuggestions, STALE_UPLOAD_MS, UPLOAD_RATE_LIMIT } from "../lib/aiSchemas";
import { canAddPrerequisite, layoutConcepts, MAX_CONCEPTS, removeConcept } from "../lib/lessonGraph";

const SECRET = "instructor-secret-0123456789abcdef0123456789abcdef";

describe("lesson graph helpers", () => {
  test("layout places every concept to the right of its prerequisites without overlaps", () => {
    const positions = layoutConcepts(RECURSION_LESSON);
    RECURSION_LESSON.forEach((c, i) => c.prerequisites.forEach((p) => expect(positions[i].x).toBeGreaterThan(positions[p].x)));
    positions.forEach((a, i) =>
      positions.slice(i + 1).forEach((b) => expect(Math.abs(a.x - b.x) >= 192 || Math.abs(a.y - b.y) >= 96).toBe(true)),
    );
  });

  test("prerequisites that would close a cycle, self-links and duplicates are refused", () => {
    expect(canAddPrerequisite(RECURSION_LESSON, 0, 3)).toBe(false); // Base case ← Return values would loop
    expect(canAddPrerequisite(RECURSION_LESSON, 2, 2)).toBe(false);
    expect(canAddPrerequisite(RECURSION_LESSON, 1, 0)).toBe(false);
    expect(canAddPrerequisite(RECURSION_LESSON, 4, 0)).toBe(true);
  });

  test("removing a concept drops links to it and re-points later indices", () => {
    const after = removeConcept(RECURSION_LESSON, 1);
    expect(after.map((c) => c.label)).toEqual(["Base case", "Call stack & frames", "Return values", "Tree recursion"]);
    expect(after.map((c) => c.prerequisites)).toEqual([[], [], [1], []]);
  });
});

describe("sanitizeConceptSuggestions (canned save_concepts output)", () => {
  test("cleans labels, dedupes, maps prerequisite labels and drops bad links", () => {
    const { concepts, droppedLinks } = sanitizeConceptSuggestions({
      concepts: [
        { label: "  Base case ", description: " Stops the recursion. ", prerequisites: ["Recursive call"] },
        { label: "Recursive call", description: "Smaller subproblem.", prerequisites: ["base CASE", "Recursive call", "Memoization"] },
        { label: "base case", description: "Duplicate.", prerequisites: [] },
        { label: "   ", description: "Empty label.", prerequisites: [] },
        { label: "x".repeat(80), description: "y".repeat(300), prerequisites: [] },
      ],
    });
    expect(concepts.map((c) => c.label)).toEqual(["Base case", "Recursive call", "x".repeat(60)]);
    expect(concepts[0]).toEqual({ label: "Base case", description: "Stops the recursion.", prerequisites: [1] });
    // "base CASE" would close a cycle with Base case → Recursive call; self and unknown labels are dropped too.
    expect(concepts[1].prerequisites).toEqual([]);
    expect(concepts[2].description).toHaveLength(200);
    expect(droppedLinks).toBe(3);
  });

  test("keeps at most MAX_CONCEPTS and rejects the wrong shape", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ label: `C${i}`, description: "", prerequisites: [] }));
    expect(sanitizeConceptSuggestions({ concepts: many }).concepts).toHaveLength(MAX_CONCEPTS);
    expect(() => sanitizeConceptSuggestions({ concepts: [{ label: "A" }] })).toThrow();
  });
});

describe("sessions.create with an instructor-edited lesson", () => {
  test("stores the concepts in order with laid-out positions, prerequisite edges and the first concept active", async () => {
    const t = convexTest(schema, modules);
    const concepts = [
      { label: " Limits ", description: "Approaching a value.", prerequisites: [] },
      { label: "Derivatives", description: "", prerequisites: [0] },
      { label: "Chain rule", description: "Derivative of a composition.", prerequisites: [1] },
    ];
    const { sessionId } = await t.mutation(api.sessions.create, { title: "Calc", instructorSecret: SECRET, concepts });
    const view = await t.query(api.sessions.getInstructorView, { sessionId, instructorSecret: SECRET });
    expect(view?.concepts.map((c) => c.label)).toEqual(["Limits", "Derivatives", "Chain rule"]);
    expect(view?.concepts.map((c) => ({ x: c.x, y: c.y }))).toEqual(layoutConcepts(concepts));
    expect(view!.concepts[2].x).toBeGreaterThan(view!.concepts[1].x);
    expect(view?.activeConceptId).toBe(view?.concepts[0]._id);
    const ids = view!.concepts.map((c) => c._id);
    expect(view?.edges.map((e) => [ids.indexOf(e.fromId), ids.indexOf(e.toId)])).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });

  test.each([
    ["no concepts", []],
    ["too many concepts", Array.from({ length: MAX_CONCEPTS + 1 }, (_, i) => ({ label: `C${i}`, description: "", prerequisites: [] }))],
    ["an empty label", [{ label: "  ", description: "", prerequisites: [] }]],
    ["duplicate labels", [{ label: "A", description: "", prerequisites: [] }, { label: "a", description: "", prerequisites: [] }]],
    ["an out-of-range prerequisite", [{ label: "A", description: "", prerequisites: [3] }]],
    ["a cycle", [{ label: "A", description: "", prerequisites: [1] }, { label: "B", description: "", prerequisites: [0] }]],
  ])("rejects %s and creates nothing", async (_, concepts) => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.sessions.create, { title: "Bad", instructorSecret: SECRET, concepts })).rejects.toThrow();
    expect(await t.run((ctx) => ctx.db.query("sessions").collect())).toHaveLength(0);
  });
});

describe("lessons.startInferRun (global rate limit, no session yet)", () => {
  afterEach(() => vi.useRealTimers());

  test(`allows ${INFER_RATE_LIMIT.runs} runs per window, then refuses until the window passes`, async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const t = convexTest(schema, modules);
    for (let i = 0; i < INFER_RATE_LIMIT.runs; i++) await t.mutation(internal.lessons.startInferRun, { model: "test" });
    await expect(t.mutation(internal.lessons.startInferRun, { model: "test" })).rejects.toThrow(/Too many/);
    vi.setSystemTime(Date.now() + INFER_RATE_LIMIT.windowMs + 1);
    const runId = await t.mutation(internal.lessons.startInferRun, { model: "test" });
    await t.mutation(internal.lessons.finishInferRun, { runId, latencyMs: 5, error: "boom" });
    const run = await t.run((ctx) => ctx.db.get(runId));
    expect(run).toMatchObject({ operation: "inferConcepts", status: "error", error: "boom" });
    expect(run?.sessionId).toBeUndefined();
  });
});

describe("lesson uploads (global cap, stale purge)", () => {
  afterEach(() => vi.useRealTimers());

  test(`refuses upload URLs after ${UPLOAD_RATE_LIMIT.files} recent files`, async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (let i = 0; i < UPLOAD_RATE_LIMIT.files; i++) await ctx.storage.store(new Blob(["x"]));
    });
    await expect(t.mutation(api.lessons.generateUploadUrl, {})).rejects.toThrow(/Too many uploads/);
  });

  test("purges uploads older than STALE_UPLOAD_MS and keeps fresh ones", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const t = convexTest(schema, modules);
    const old = await t.run((ctx) => ctx.storage.store(new Blob(["old"])));
    vi.setSystemTime(Date.now() + STALE_UPLOAD_MS + 1);
    const fresh = await t.run((ctx) => ctx.storage.store(new Blob(["fresh"])));
    await t.mutation(internal.lessons.purgeStaleUploads, {});
    const left = await t.run(async (ctx) => (await ctx.db.system.query("_storage").collect()).map((f) => f._id));
    expect(left).toEqual([fresh]);
    expect(left).not.toContain(old);
  });
});
