import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("seed.reset", () => {
  test("is idempotent and produces the documented demo dataset", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.seed.reset, {});
    const { sessionId, code, instructorSecret } = await t.mutation(internal.seed.reset, {});
    expect(code).toBe("DEMO01");

    const sessions = await t.run((ctx) => ctx.db.query("sessions").collect());
    expect(sessions).toHaveLength(1);
    expect(sessions[0]._id).toBe(sessionId);

    const participants = await t.run((ctx) => ctx.db.query("participants").collect());
    expect(participants).toHaveLength(24);
    expect(participants.every((p) => p.isSimulated && p.sessionId === sessionId)).toBe(true);
    expect(participants.map((p) => p.alias)).toContain("Sim 24");

    const questions = await t.run((ctx) => ctx.db.query("questions").collect());
    expect(questions).toHaveLength(10);
    expect(questions.every((q) => q.sessionId === sessionId)).toBe(true);
    expect(questions.filter((q) => q.state === "pending")).toHaveLength(7);
    const clustered = questions.filter((q) => q.state === "clustered");
    expect(clustered).toHaveLength(3);

    const clusters = await t.run((ctx) => ctx.db.query("clusters").collect());
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({ sessionId, title: "Tracing recursive return values", status: "published", source: "manual" });
    expect([...clusters[0].questionIds].sort()).toEqual(clustered.map((q) => q._id).sort());
    expect(await t.run((ctx) => ctx.db.query("aiRuns").collect())).toEqual([]);

    const view = (await t.query(api.sessions.getInstructorView, { sessionId, instructorSecret }))!;
    expect(view.code).toBe("DEMO01");
    expect(view.participantCount).toBe(24);
    const byLabel = Object.fromEntries(view.concepts.map((c) => [c.label, c]));
    expect(byLabel["Base case"].counts.can_explain).toBeGreaterThan(byLabel["Base case"].counts.confused);
    expect(byLabel["Call stack & frames"].counts.confused).toBeGreaterThan(byLabel["Call stack & frames"].total / 2);
    expect(byLabel["Return values"].counts.confused).toBeGreaterThan(byLabel["Return values"].total / 2);
    expect(view.concepts.every((c) => c.total <= 24)).toBe(true);
    expect(view.edges).toHaveLength(4);

    const signals = await t.run((ctx) => ctx.db.query("signals").collect());
    expect(signals.every((s) => s.sessionId === sessionId && s.phase === "pre")).toBe(true);

    // Every concept has been current, so every seeded signal is for a covered concept and students can revise any of them.
    expect(sessions[0].activeHistory!.map((h) => h.conceptId).sort()).toEqual(view.concepts.map((c) => c._id).sort());
    expect(view.activeConceptId).toBe(byLabel["Call stack & frames"]._id);
    expect(view.coveredConceptIds).toHaveLength(4);
    expect(view.coveredConceptIds).not.toContain(view.activeConceptId);
    expect(view.answeredCount).toBe(24);
    const prompts = (await t.query(api.prompts.list, { sessionId, instructorSecret }))!;
    expect(prompts.map((p) => p.conceptLabel)).toEqual(["Call stack & frames", "Tree recursion", "Return values", "Recursive call", "Base case"]);
    expect(prompts[0].current).toBe(true);
    expect(prompts.map((p) => p.responseCount)).toEqual([24, 10, 24, 24, 24]);

    const returnValues = view.concepts.find((c) => c.label === "Return values")!._id;
    const callStack = view.concepts.find((c) => c.label === "Call stack & frames")!._id;
    expect(clusters[0].conceptIds).toEqual([returnValues, callStack]);
    expect(clustered.every((q) => q.conceptId === returnValues)).toBe(true);
    const list = (await t.query(api.clusters.listInstructor, { sessionId, instructorSecret }))!;
    expect(list.suggested).toEqual([]);
    expect(list.latestRun).toBeNull();
    expect(list.published[0]).toMatchObject({ title: "Tracing recursive return values", conceptLabels: ["Return values", "Call stack & frames"] });
    expect(list.published[0].questions.every((q) => q.isSimulated)).toBe(true);
    expect((await t.query(api.questions.listInstructor, { sessionId, instructorSecret }))!).toHaveLength(10);
    expect((await t.query(api.clusters.listForConcept, { sessionId, instructorSecret, conceptId: callStack }))!).toHaveLength(1);
  });

  test("the seeded fallback cluster is published to students with counts only", async () => {
    const t = convexTest(schema, modules);
    const { sessionId, code } = await t.mutation(internal.seed.reset, {});
    const token = "student-token-a-0123456789abcdef0123456789abcdef";
    await t.mutation(api.sessions.join, { code, token });
    const published = (await t.query(api.clusters.listPublished, { sessionId, token }))!;
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({ title: "Tracing recursive return values", questionCount: 3, helperCount: 0 });
    expect(JSON.stringify(published)).not.toContain("factorial(4)");

    const student = (await t.query(api.sessions.getStudentView, { code, token }))!;
    expect(student.coveredConceptIds).toHaveLength(4);
    const treeRecursion = student.concepts.find((c) => c.label === "Tree recursion")!._id;
    await t.mutation(api.signals.upsert, { sessionId, token, conceptId: treeRecursion, level: "partial" });
    expect((await t.query(api.sessions.getStudentView, { code, token }))!.concepts.find((c) => c._id === treeRecursion)!.myLevel).toBe("partial");
  });

  test("simulated participants cannot be impersonated, even with a long code", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(internal.seed.reset, { code: "DEMO01".padEnd(40, "0") });
    const before = await t.run((ctx) => ctx.db.query("participants").collect());
    expect(before.every((p) => p.isSimulated && !/^[0-9a-f]{64}$/.test(p.tokenHash))).toBe(true);
    for (const token of [`simulated:${code}:0`, "simulated:0".padEnd(40, "x")]) {
      await t.mutation(api.sessions.join, { code, token });
    }
    const after = await t.run((ctx) => ctx.db.query("participants").collect());
    expect(after).toHaveLength(before.length + 2);
    expect(after.filter((p) => !p.isSimulated).map((p) => p.alias)).toEqual(["Student 25", "Student 26"]);
  });
});
