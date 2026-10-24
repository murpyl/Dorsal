import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { RECURSION_LESSON } from "./seed";
import { modules } from "./test.setup";

const SECRET = "instructor-secret-0123456789abcdef0123456789abcdef";
const TOKEN_A = "student-token-a-0123456789abcdef0123456789abcdef";
const TOKEN_B = "student-token-b-0123456789abcdef0123456789abcdef";

async function setup() {
  const t = convexTest(schema, modules);
  const { sessionId, code } = await t.mutation(api.sessions.create, { title: "Recursion", instructorSecret: SECRET, concepts: RECURSION_LESSON });
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
    const other = await t.mutation(api.sessions.create, { title: "Other", instructorSecret: SECRET, concepts: RECURSION_LESSON });
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
  test("session-page ratings are pre; only room members write post, and post never changes the graph", async () => {
    const { t, sessionId, code, instructorView } = await setup();
    await t.mutation(api.sessions.join, { code, token: TOKEN_A });
    await t.mutation(api.sessions.join, { code, token: TOKEN_B });
    const concepts = (await instructorView())!.concepts;
    const conceptId = concepts[3]._id;
    const creds = { sessionId, instructorSecret: SECRET };
    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId });
    const prePost = async () => (await t.query(api.signals.prePostByConcept, creds))!.find((c) => c.conceptId === conceptId)!;

    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId, level: "confused" });
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_B, conceptId, level: "confused" });
    expect(await prePost()).toMatchObject({ pre: { counts: { confused: 2, partial: 0, can_explain: 0 }, total: 2 }, post: { total: 0 } });
    expect(await instructorView()).not.toHaveProperty("phase");

    await t.mutation(api.participants.setHelper, { sessionId, token: TOKEN_B, conceptIds: [conceptId] });
    const roomId = await t.mutation(api.rooms.createAsHelper, { sessionId, token: TOKEN_B, conceptId });
    await expect(t.mutation(api.signals.roomCheckIn, { roomId, token: TOKEN_A, level: "can_explain" })).rejects.toThrow(/members/);
    await t.mutation(api.rooms.join, { roomId, token: TOKEN_A, role: "learner" });
    expect((await t.query(api.rooms.get, { roomId, token: TOKEN_A }))!.myLevel).toBeNull();
    await t.mutation(api.signals.roomCheckIn, { roomId, token: TOKEN_A, level: "partial" });
    await t.mutation(api.signals.roomCheckIn, { roomId, token: TOKEN_A, level: "can_explain" });
    expect((await t.query(api.rooms.get, { roomId, token: TOKEN_A }))!.myLevel).toBe("can_explain");
    expect((await t.query(api.rooms.get, { roomId, token: TOKEN_B }))!.myLevel).toBeNull();

    const after = await prePost();
    expect(after.pre).toEqual({ counts: { confused: 2, partial: 0, can_explain: 0 }, total: 2 });
    expect(after.post).toEqual({ counts: { confused: 0, partial: 0, can_explain: 1 }, total: 1 });
    expect((await instructorView())!.concepts[3]).toMatchObject({ total: 2, counts: { confused: 2, can_explain: 0 } });
    expect((await t.query(api.sessions.getStudentView, { code, token: TOKEN_A }))!.concepts[3].myLevel).toBe("confused");

    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId, level: "partial" });
    const rows = await t.run((ctx) =>
      ctx.db.query("signals").withIndex("by_concept_phase", (q) => q.eq("conceptId", conceptId)).collect(),
    );
    expect(rows.map((r) => r.phase).sort()).toEqual(["post", "pre", "pre"]);
    expect((await prePost()).post.total).toBe(1);

    const comparison = (await t.query(api.signals.prePostByConcept, creds))!;
    expect(comparison.map((c) => c.label)).toEqual(concepts.map((c) => c.label));
    expect(await t.query(api.signals.prePostByConcept, { sessionId, instructorSecret: TOKEN_A })).toBeNull();

    await t.mutation(api.rooms.close, { roomId, token: TOKEN_B });
    await expect(t.mutation(api.signals.roomCheckIn, { roomId, token: TOKEN_A, level: "confused" })).rejects.toThrow(/closed/);
    expect((await prePost()).post).toEqual({ counts: { confused: 0, partial: 0, can_explain: 1 }, total: 1 });

    await t.mutation(api.sessions.close, creds);
    await expect(t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId, level: "partial" })).rejects.toThrow();
    await expect(t.mutation(api.signals.roomCheckIn, { roomId, token: TOKEN_A, level: "confused" })).rejects.toThrow();
  });
});

describe("live prompt (phase 6: only covered concepts can be rated)", () => {
  test("upsert is rejected for a never-active concept and accepted for the current and previously-active ones", async () => {
    const { t, sessionId, code, instructorView } = await setup();
    await t.mutation(api.sessions.join, { code, token: TOKEN_A });
    const concepts = (await instructorView())!.concepts;
    const creds = { sessionId, instructorSecret: SECRET };
    const rate = (conceptId: typeof concepts[number]["_id"], level: "confused" | "partial") =>
      t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId, level });

    await expect(rate(concepts[1]._id, "confused")).rejects.toThrow(/covered/);
    await rate(concepts[0]._id, "confused");

    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[1]._id });
    await rate(concepts[1]._id, "confused");
    await rate(concepts[0]._id, "partial");
    await expect(rate(concepts[2]._id, "confused")).rejects.toThrow(/covered/);

    const view = (await instructorView())!;
    expect(view.concepts[0]).toMatchObject({ total: 1, counts: { confused: 0, partial: 1, can_explain: 0 } });
    expect(view.concepts[1]).toMatchObject({ total: 1, counts: { confused: 1 } });
    expect(view.concepts[2].total).toBe(0);
  });

  test("participation counts participants who answered the current prompt, live", async () => {
    const { t, sessionId, code, instructorView } = await setup();
    const creds = { sessionId, instructorSecret: SECRET };
    expect(await instructorView()).toMatchObject({ answeredCount: 0, participantCount: 0 });

    await t.mutation(api.sessions.join, { code, token: TOKEN_A });
    await t.mutation(api.sessions.join, { code, token: TOKEN_B });
    const concepts = (await instructorView())!.concepts;
    expect(await instructorView()).toMatchObject({ answeredCount: 0, participantCount: 2 });

    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId: concepts[0]._id, level: "confused" });
    expect((await instructorView())!.answeredCount).toBe(1);
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId: concepts[0]._id, level: "partial" });
    expect((await instructorView())!.answeredCount).toBe(1);
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_B, conceptId: concepts[0]._id, level: "can_explain" });
    expect((await instructorView())!.answeredCount).toBe(2);

    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[1]._id });
    expect(await instructorView()).toMatchObject({ answeredCount: 0, participantCount: 2, coveredConceptIds: [concepts[0]._id] });
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_B, conceptId: concepts[1]._id, level: "confused" });
    expect((await instructorView())!.answeredCount).toBe(1);
    expect((await instructorView())!.concepts[0].total).toBe(2);
  });

  test("setActiveConcept appends to activeHistory once per concept", async () => {
    const { t, sessionId, instructorView } = await setup();
    const concepts = (await instructorView())!.concepts;
    const creds = { sessionId, instructorSecret: SECRET };
    const history = async () => (await t.run((ctx) => ctx.db.get(sessionId)))!.activeHistory!.map((h) => h.conceptId);

    expect(await history()).toEqual([concepts[0]._id]);
    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[2]._id });
    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[0]._id });
    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[2]._id });
    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[2]._id });
    expect(await history()).toEqual([concepts[0]._id, concepts[2]._id]);
    const session = (await t.run((ctx) => ctx.db.get(sessionId)))!;
    expect(session.activeConceptId).toBe(concepts[2]._id);
    expect(session.activeHistory!.every((h) => Number.isFinite(h.at))).toBe(true);
    expect((await instructorView())!.coveredConceptIds).toEqual([concepts[0]._id]);
  });

  test("setActiveConcept stores a trimmed question on a new prompt, omits it when blank and rejects long ones", async () => {
    const { t, sessionId, code, instructorView } = await setup();
    const concepts = (await instructorView())!.concepts;
    const creds = { sessionId, instructorSecret: SECRET };
    await t.mutation(api.sessions.join, { code, token: TOKEN_A });
    const studentPrompt = async () => (await t.query(api.sessions.getStudentView, { code, token: TOKEN_A }))!.activePrompt!;

    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[1]._id, question: "  Why does fib(1) not recurse?  " });
    expect(await studentPrompt()).toMatchObject({ kind: "rating", question: "Why does fib(1) not recurse?" });
    expect((await instructorView())!.activePrompt).toMatchObject({ kind: "rating", question: "Why does fib(1) not recurse?" });

    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[1]._id, question: "   " });
    expect((await studentPrompt()).question).toBeUndefined();

    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[2]._id, question: "Draw the call stack" });
    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[0]._id });
    expect((await studentPrompt()).question).toBeUndefined();

    await expect(
      t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[0]._id, question: "x".repeat(201) }),
    ).rejects.toThrow(/200 characters/);
    expect((await t.run((ctx) => ctx.db.get(sessionId)))!.activeHistory!.map((h) => h.conceptId)).toEqual([
      concepts[0]._id,
      concepts[1]._id,
      concepts[2]._id,
    ]);
  });

  test("setActiveConcept keeps the previous current concept covered in a session created before activeHistory existed", async () => {
    const { t, sessionId, instructorView } = await setup();
    const concepts = (await instructorView())!.concepts;
    await t.run((ctx) => ctx.db.patch(sessionId, { activeHistory: undefined }));
    await t.mutation(api.sessions.setActiveConcept, { sessionId, instructorSecret: SECRET, conceptId: concepts[1]._id });
    const session = (await t.run((ctx) => ctx.db.get(sessionId)))!;
    expect(session.activeHistory!.map((h) => h.conceptId)).toEqual([concepts[0]._id, concepts[1]._id]);
    expect((await instructorView())!.coveredConceptIds).toEqual([concepts[0]._id]);
  });

  test("getStudentView exposes the current and covered concept ids with the student's own level and no counts", async () => {
    const { t, sessionId, code, instructorView } = await setup();
    await t.mutation(api.sessions.join, { code, token: TOKEN_A });
    await t.mutation(api.sessions.join, { code, token: TOKEN_B });
    const concepts = (await instructorView())!.concepts;
    const creds = { sessionId, instructorSecret: SECRET };
    const studentView = () => t.query(api.sessions.getStudentView, { code, token: TOKEN_A });

    expect(await studentView()).toMatchObject({ activeConceptId: concepts[0]._id, coveredConceptIds: [] });
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId: concepts[0]._id, level: "confused" });
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_B, conceptId: concepts[0]._id, level: "confused" });
    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[3]._id });
    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[1]._id });

    const view = (await studentView())!;
    expect(view.activeConceptId).toBe(concepts[1]._id);
    expect(view.coveredConceptIds).toEqual([concepts[0]._id, concepts[3]._id]);
    expect(view.concepts.map((c) => c.myLevel)).toEqual(["confused", null, null, null, null]);
    expect(view.concepts).toHaveLength(5);
    for (const c of view.concepts) {
      expect(c).not.toHaveProperty("counts");
      expect(c).not.toHaveProperty("total");
    }
    expect(view).not.toHaveProperty("answeredCount");
    expect(view).not.toHaveProperty("participantCount");
    expect(JSON.stringify(view)).not.toMatch(/"(counts|total|answered)/);
  });
});
