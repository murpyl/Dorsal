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
    expect(questions.every((q) => q.state === "pending" && q.sessionId === sessionId)).toBe(true);

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
  });

  test("simulated participants cannot be impersonated with a valid-length token", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(internal.seed.reset, {});
    const before = await t.run((ctx) => ctx.db.query("participants").collect());
    await t.mutation(api.sessions.join, { code, token: "simulated:DEMO01:0".padEnd(40, "x") });
    const after = await t.run((ctx) => ctx.db.query("participants").collect());
    expect(after).toHaveLength(before.length + 1);
    expect(after.find((p) => !p.isSimulated)?.alias).toBe("Student 25");
  });
});
