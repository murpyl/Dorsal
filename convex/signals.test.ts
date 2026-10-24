import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const SECRET = "instructor-secret-0123456789abcdef0123456789abcdef";
const TOKEN_A = "student-token-a-0123456789abcdef0123456789abcdef";
const TOKEN_B = "student-token-b-0123456789abcdef0123456789abcdef";

async function setup() {
  const t = convexTest(schema, modules);
  const { sessionId, code } = await t.mutation(api.sessions.create, { title: "Recursion", instructorSecret: SECRET });
  const instructorView = () => t.query(api.sessions.getInstructorView, { sessionId, instructorSecret: SECRET });
  return { t, sessionId, code, instructorView };
}

describe("signals.upsert (scenario 1: counts and denominators, no double counting)", () => {
  test("two confused → 2/2, one switches to partial → 1/2, student view hides the breakdown", async () => {
    const { t, sessionId, code, instructorView } = await setup();
    await t.mutation(api.sessions.join, { code, token: TOKEN_A });
    await t.mutation(api.sessions.join, { code, token: TOKEN_B });
    const conceptId = (await instructorView())!.concepts[0]._id;

    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId, level: "confused" });
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_B, conceptId, level: "confused" });
    let concept = (await instructorView())!.concepts[0];
    expect(concept.counts).toEqual({ confused: 2, partial: 0, can_explain: 0 });
    expect(concept.total).toBe(2);

    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_B, conceptId, level: "partial" });
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_B, conceptId, level: "partial" });
    concept = (await instructorView())!.concepts[0];
    expect(concept.counts).toEqual({ confused: 1, partial: 1, can_explain: 0 });
    expect(concept.total).toBe(2);

    const rows = await t.run((ctx) =>
      ctx.db.query("signals").withIndex("by_concept_phase", (q) => q.eq("conceptId", conceptId).eq("phase", "pre")).collect(),
    );
    expect(rows).toHaveLength(2);

    const student = await t.query(api.sessions.getStudentView, { code, token: TOKEN_B });
    expect(student?.concepts[0]).toEqual(
      expect.objectContaining({ _id: conceptId, myLevel: "partial" }),
    );
    expect(student?.concepts[0]).not.toHaveProperty("counts");
    expect(student?.concepts[0]).not.toHaveProperty("total");
  });

  test("rejects a concept from another session", async () => {
    const { t, sessionId, code } = await setup();
    await t.mutation(api.sessions.join, { code, token: TOKEN_A });
    const other = await t.mutation(api.sessions.create, { title: "Other", instructorSecret: SECRET });
    const [foreign] = await t.run((ctx) =>
      ctx.db.query("concepts").withIndex("by_session", (q) => q.eq("sessionId", other.sessionId)).collect(),
    );
    await expect(
      t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId: foreign._id, level: "confused" }),
    ).rejects.toThrow();
  });
});

describe("empty state (scenario 8: zero responses is not a division by zero)", () => {
  test("a fresh session reports total 0 and zero counts for every concept", async () => {
    const { instructorView } = await setup();
    const view = (await instructorView())!;
    expect(view.concepts).toHaveLength(5);
    expect(view.edges).toHaveLength(4);
    expect(view.participantCount).toBe(0);
    for (const c of view.concepts) {
      expect(c.total).toBe(0);
      expect(c.counts).toEqual({ confused: 0, partial: 0, can_explain: 0 });
      for (const value of [c.total, c.x, c.y, ...Object.values(c.counts)]) expect(Number.isFinite(value)).toBe(true);
    }
    expect(JSON.stringify(view)).not.toContain("null");
  });
});
