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

describe("pre/post (scenario 9: phases never merge)", () => {
  test("signals stay in the phase they were recorded in; a room check-in lands in the current phase", async () => {
    const { t, sessionId, code, instructorView } = await setup();
    await t.mutation(api.sessions.join, { code, token: TOKEN_A });
    await t.mutation(api.sessions.join, { code, token: TOKEN_B });
    const concepts = (await instructorView())!.concepts;
    const conceptId = concepts[3]._id;
    const creds = { sessionId, instructorSecret: SECRET };
    const prePost = async () => (await t.query(api.signals.prePostByConcept, creds))!.find((c) => c.conceptId === conceptId)!;

    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId, level: "confused" });
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_B, conceptId, level: "confused" });
    expect(await prePost()).toMatchObject({ pre: { counts: { confused: 2, partial: 0, can_explain: 0 }, total: 2 }, post: { total: 0 } });

    await expect(t.mutation(api.sessions.setPhase, { sessionId, instructorSecret: TOKEN_A, phase: "post" })).rejects.toThrow();
    await t.mutation(api.sessions.setPhase, { ...creds, phase: "post" });
    expect((await instructorView())!.phase).toBe("post");
    expect((await instructorView())!.concepts[3].total).toBe(0);
    expect((await t.query(api.sessions.getStudentView, { code, token: TOKEN_A }))!.concepts[3].myLevel).toBeNull();

    await t.mutation(api.participants.setHelper, { sessionId, token: TOKEN_B, conceptIds: [conceptId] });
    const roomId = await t.mutation(api.rooms.createAsHelper, { sessionId, token: TOKEN_B, conceptId });
    await t.mutation(api.rooms.join, { roomId, token: TOKEN_A, role: "learner" });
    expect((await t.query(api.rooms.get, { roomId, token: TOKEN_A }))!.phase).toBe("post");
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId, level: "can_explain" });
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId, level: "can_explain" });

    const after = await prePost();
    expect(after.pre).toEqual({ counts: { confused: 2, partial: 0, can_explain: 0 }, total: 2 });
    expect(after.post).toEqual({ counts: { confused: 0, partial: 0, can_explain: 1 }, total: 1 });
    expect((await instructorView())!.concepts[3]).toMatchObject({ total: 1, counts: { can_explain: 1 } });
    const rows = await t.run((ctx) =>
      ctx.db.query("signals").withIndex("by_concept_phase", (q) => q.eq("conceptId", conceptId)).collect(),
    );
    expect(rows.map((r) => r.phase).sort()).toEqual(["post", "pre", "pre"]);

    await t.mutation(api.sessions.setPhase, { ...creds, phase: "pre" });
    expect((await instructorView())!.concepts[3].counts.confused).toBe(2);
    expect((await t.query(api.sessions.getStudentView, { code, token: TOKEN_A }))!.concepts[3].myLevel).toBe("confused");
    const comparison = (await t.query(api.signals.prePostByConcept, creds))!;
    expect(comparison.map((c) => c.label)).toEqual(concepts.map((c) => c.label));
    expect(await t.query(api.signals.prePostByConcept, { sessionId, instructorSecret: TOKEN_A })).toBeNull();

    await t.mutation(api.sessions.close, creds);
    await expect(t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId, level: "partial" })).rejects.toThrow();
    await expect(t.mutation(api.sessions.setPhase, { ...creds, phase: "post" })).rejects.toThrow();
  });
});
