import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { RECURSION_LESSON } from "./seed";
import { modules } from "./test.setup";

const SECRET = "instructor-secret-0123456789abcdef0123456789abcdef";
const TOKEN_A = "student-token-a-0123456789abcdef0123456789abcdef";
const TOKEN_B = "student-token-b-0123456789abcdef0123456789abcdef";

async function createSession(t: ReturnType<typeof convexTest>) {
  return await t.mutation(api.sessions.create, { title: "Recursion", instructorSecret: SECRET, concepts: RECURSION_LESSON });
}

describe("sessions.join (scenario 10: refresh reuses the local participant)", () => {
  test("joining twice with the same token returns the same participant and inserts one row", async () => {
    const t = convexTest(schema, modules);
    const { sessionId, code } = await createSession(t);

    const first = await t.mutation(api.sessions.join, { code, token: TOKEN_A });
    const second = await t.mutation(api.sessions.join, { code: code.toLowerCase(), token: TOKEN_A });
    expect(second).toEqual(first);
    expect(first.sessionId).toBe(sessionId);

    const participants = await t.run((ctx) =>
      ctx.db.query("participants").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect(),
    );
    expect(participants).toHaveLength(1);
    expect(participants[0]).toMatchObject({ alias: "Student 1", isSimulated: false });
  });

  test("a different token gets its own participant", async () => {
    const t = convexTest(schema, modules);
    const { code } = await createSession(t);
    const a = await t.mutation(api.sessions.join, { code, token: TOKEN_A });
    const b = await t.mutation(api.sessions.join, { code, token: TOKEN_B });
    expect(b.participantId).not.toBe(a.participantId);
    const view = await t.query(api.sessions.getStudentView, { code, token: TOKEN_B });
    expect(view?.alias).toBe("Student 2");
  });

  test("rejects short tokens and unknown codes", async () => {
    const t = convexTest(schema, modules);
    const { code } = await createSession(t);
    await expect(t.mutation(api.sessions.join, { code, token: "short" })).rejects.toThrow();
    await expect(t.mutation(api.sessions.join, { code: "NOPE42", token: TOKEN_A })).rejects.toThrow();
  });
});

describe("credentials (scenario 2: no cross-participant or unauthenticated reads)", () => {
  test("student view is null for a wrong token and never exposes other participants' signals", async () => {
    const t = convexTest(schema, modules);
    const { sessionId, code } = await createSession(t);
    await t.mutation(api.sessions.join, { code, token: TOKEN_A });
    await t.mutation(api.sessions.join, { code, token: TOKEN_B });
    const [concept] = (await t.query(api.sessions.getStudentView, { code, token: TOKEN_A }))!.concepts;
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId: concept._id, level: "confused" });

    expect(await t.query(api.sessions.getStudentView, { code, token: TOKEN_B.replace("b", "x") })).toBeNull();
    expect(await t.query(api.sessions.getStudentView, { code, token: "short" })).toBeNull();

    const viewA = await t.query(api.sessions.getStudentView, { code, token: TOKEN_A });
    const viewB = await t.query(api.sessions.getStudentView, { code, token: TOKEN_B });
    expect(viewA?.concepts[0].myLevel).toBe("confused");
    expect(viewB?.concepts[0].myLevel).toBeNull();
    for (const c of viewB!.concepts) {
      expect(c).not.toHaveProperty("counts");
      expect(c).not.toHaveProperty("total");
      expect(c).not.toHaveProperty("participantId");
    }
    expect(JSON.stringify(viewB)).not.toContain("Student 1");
  });

  test("a token from another session cannot act in this one", async () => {
    const t = convexTest(schema, modules);
    const first = await createSession(t);
    const second = await t.mutation(api.sessions.create, { title: "Other", instructorSecret: SECRET, concepts: RECURSION_LESSON });
    await t.mutation(api.sessions.join, { code: second.code, token: TOKEN_A });
    const [concept] = await t.run((ctx) =>
      ctx.db.query("concepts").withIndex("by_session", (q) => q.eq("sessionId", first.sessionId)).collect(),
    );
    await expect(
      t.mutation(api.signals.upsert, { sessionId: first.sessionId, token: TOKEN_A, conceptId: concept._id, level: "confused" }),
    ).rejects.toThrow();
    expect(await t.query(api.sessions.getStudentView, { code: first.code, token: TOKEN_A })).toBeNull();
  });

  test("instructor view and mutations reject a wrong secret", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await createSession(t);
    const [concept] = await t.run((ctx) =>
      ctx.db.query("concepts").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect(),
    );

    expect(await t.query(api.sessions.getInstructorView, { sessionId, instructorSecret: SECRET })).not.toBeNull();
    expect(await t.query(api.sessions.getInstructorView, { sessionId, instructorSecret: TOKEN_A })).toBeNull();
    expect(await t.query(api.sessions.getInstructorView, { sessionId, instructorSecret: "" })).toBeNull();
    expect(await t.query(api.sessions.getInstructorView, { sessionId: "not-an-id", instructorSecret: SECRET })).toBeNull();
    await expect(
      t.mutation(api.sessions.setActiveConcept, { sessionId, instructorSecret: TOKEN_A, conceptId: concept._id }),
    ).rejects.toThrow();
    await t.mutation(api.sessions.setActiveConcept, { sessionId, instructorSecret: SECRET, conceptId: concept._id });
  });
});
