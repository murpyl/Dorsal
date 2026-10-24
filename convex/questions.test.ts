import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const SECRET = "instructor-secret-0123456789abcdef0123456789abcdef";
const TOKEN_A = "student-token-a-0123456789abcdef0123456789abcdef";
const TOKEN_B = "student-token-b-0123456789abcdef0123456789abcdef";
const QUESTION = "When the base case returns, how do we get back to the first call?";

async function setup() {
  const t = convexTest(schema, modules);
  const { sessionId, code } = await t.mutation(api.sessions.create, { title: "Recursion", instructorSecret: SECRET });
  await t.mutation(api.sessions.join, { code, token: TOKEN_A });
  await t.mutation(api.sessions.join, { code, token: TOKEN_B });
  const concepts = await t.run((ctx) =>
    ctx.db.query("concepts").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect(),
  );
  concepts.sort((a, b) => a.order - b.order);
  const creds = { sessionId, instructorSecret: SECRET };
  return { t, sessionId, code, concepts, creds };
}

describe("questions (scenario 3: raw questions stay in the instructor queue until published via a cluster)", () => {
  test("a submitted question is visible only in questions.listInstructor, without participant ids", async () => {
    const { t, sessionId, code, concepts, creds } = await setup();
    const questionId = await t.mutation(api.questions.submit, { sessionId, token: TOKEN_A, conceptId: concepts[2]._id, content: `  ${QUESTION}  ` });

    const queue = (await t.query(api.questions.listInstructor, creds))!;
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ _id: questionId, content: QUESTION, state: "pending", conceptLabel: "Call stack & frames", isSimulated: false });
    expect(queue[0]).not.toHaveProperty("participantId");
    expect(await t.query(api.questions.listInstructor, { sessionId, instructorSecret: TOKEN_A })).toBeNull();

    for (const token of [TOKEN_A, TOKEN_B]) {
      expect(JSON.stringify(await t.query(api.sessions.getStudentView, { code, token }))).not.toContain("base case returns");
      expect(await t.query(api.clusters.listPublished, { sessionId, token })).toEqual([]);
    }
    await expect(t.query(api.clusters.listPublished, { sessionId, token: TOKEN_A.replace("a", "x") })).rejects.toThrow();
  });

  test("a suggested cluster is still invisible to students; publishing exposes counts, never text or identities", async () => {
    const { t, sessionId, code, concepts, creds } = await setup();
    const ids = [];
    for (const content of [QUESTION, "What happens to all the frames after the base case?", "How does the stack unwind?"]) {
      ids.push(await t.mutation(api.questions.submit, { sessionId, token: TOKEN_A, conceptId: concepts[2]._id, content }));
    }
    await t.mutation(api.participants.setHelper, { sessionId, token: TOKEN_B, conceptIds: [concepts[3]._id] });

    const runId = await t.run((ctx) =>
      ctx.db.insert("aiRuns", { sessionId, operation: "clusterQuestions", model: "test", status: "running", createdAt: Date.now() }),
    );
    await t.mutation(internal.clusters.saveSuggestions, {
      sessionId,
      runId,
      latencyMs: 5,
      clusters: [{ title: "Stack unwinding", summary: "How control returns up the stack", conceptIds: [concepts[2]._id, concepts[3]._id], questionIds: ids, confidence: 0.8 }],
    });
    expect(await t.query(api.clusters.listPublished, { sessionId, token: TOKEN_B })).toEqual([]);
    const queue = (await t.query(api.questions.listInstructor, creds))!;
    expect(queue.map((q) => q.state)).toEqual(["clustered", "clustered", "clustered"]);

    const [suggested] = (await t.query(api.clusters.listInstructor, creds))!.suggested;
    expect(suggested.questions.map((q) => q.content)).toContain(QUESTION);
    await t.mutation(api.clusters.publish, { ...creds, clusterId: suggested._id });

    const published = (await t.query(api.clusters.listPublished, { sessionId, token: TOKEN_B }))!;
    expect(published).toHaveLength(1);
    expect(published[0]).toEqual({
      _id: suggested._id,
      title: "Stack unwinding",
      summary: "How control returns up the stack",
      conceptIds: [concepts[2]._id, concepts[3]._id],
      conceptLabels: ["Call stack & frames", "Return values"],
      questionCount: 3,
      helperCount: 1,
    });
    const serialized = JSON.stringify(published);
    expect(serialized).not.toContain("base case returns");
    expect(serialized).not.toContain("Student");
    for (const id of ids) expect(serialized).not.toContain(id);
    expect(JSON.stringify(await t.query(api.sessions.getStudentView, { code, token: TOKEN_B }))).not.toContain("base case returns");
  });

  test("hidden questions disappear from the queue and from published counts", async () => {
    const { t, sessionId, concepts, creds } = await setup();
    const a = await t.mutation(api.questions.submit, { sessionId, token: TOKEN_A, conceptId: concepts[0]._id, content: "Is the base case always n == 0?" });
    const b = await t.mutation(api.questions.submit, { sessionId, token: TOKEN_B, conceptId: concepts[0]._id, content: "Can there be two base cases?" });
    await t.mutation(api.clusters.createManual, { ...creds, title: "Base case", summary: "", conceptIds: [concepts[0]._id], questionIds: [a, b] });
    await t.mutation(api.questions.hide, { ...creds, questionId: a });
    expect((await t.query(api.questions.listInstructor, creds))!.map((q) => q._id)).toEqual([b]);
    expect((await t.query(api.clusters.listPublished, { sessionId, token: TOKEN_A }))![0].questionCount).toBe(1);
  });

  test("rejects empty, over-long and foreign-concept questions and non-participants", async () => {
    const { t, sessionId, concepts } = await setup();
    const submit = (args: Partial<{ token: string; content: string; conceptId: typeof concepts[number]["_id"] }>) =>
      t.mutation(api.questions.submit, { sessionId, token: TOKEN_A, conceptId: concepts[0]._id, content: "ok?", ...args });
    await expect(submit({ content: "   " })).rejects.toThrow();
    await expect(submit({ content: "x".repeat(501) })).rejects.toThrow();
    await expect(submit({ token: TOKEN_A.replace("a", "x") })).rejects.toThrow();
    const other = await t.mutation(api.sessions.create, { title: "Other", instructorSecret: SECRET });
    const [foreign] = await t.run((ctx) =>
      ctx.db.query("concepts").withIndex("by_session", (q) => q.eq("sessionId", other.sessionId)).collect(),
    );
    await expect(submit({ conceptId: foreign._id })).rejects.toThrow();
    await submit({ content: "x".repeat(500) });
  });
});

describe("questions.submit rate limit (5 per participant per 60 s)", () => {
  afterEach(() => vi.useRealTimers());

  test("the sixth question inside a minute is rejected, the window slides, other participants are unaffected", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-24T10:00:00Z"));
    const { t, sessionId, concepts } = await setup();
    const submit = (token: string, i: number) =>
      t.mutation(api.questions.submit, { sessionId, token, conceptId: concepts[1]._id, content: `Question ${i}?` });

    for (let i = 0; i < 5; i++) {
      vi.setSystemTime(Date.now() + 5_000);
      await submit(TOKEN_A, i);
    }
    await expect(submit(TOKEN_A, 5)).rejects.toThrow(/wait a minute/);
    await submit(TOKEN_B, 0);

    vi.setSystemTime(Date.now() + 30_000);
    await expect(submit(TOKEN_A, 6)).rejects.toThrow();
    vi.setSystemTime(Date.now() + 31_000);
    await submit(TOKEN_A, 7);

    const mine = await t.run((ctx) => ctx.db.query("questions").collect());
    expect(mine).toHaveLength(7);
  });
});
