import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { RECURSION_LESSON } from "./seed";
import { modules } from "./test.setup";

const SECRET = "instructor-secret-0123456789abcdef0123456789abcdef";
const TA = "ta-secret-0123456789abcdef0123456789abcdef0123456789";
const TOKEN_A = "student-token-a-0123456789abcdef0123456789abcdef";
const TOKEN_B = "student-token-b-0123456789abcdef0123456789abcdef";

async function setup() {
  const t = convexTest(schema, modules);
  const { sessionId, code } = await t.mutation(api.sessions.create, { title: "Recursion", instructorSecret: SECRET, concepts: RECURSION_LESSON });
  const creds = { sessionId, instructorSecret: SECRET };
  const concepts = (await t.query(api.sessions.getInstructorView, creds))!.concepts;
  await t.mutation(api.sessions.join, { code, token: TOKEN_A });
  await t.mutation(api.sessions.join, { code, token: TOKEN_B });
  const list = () => t.query(api.prompts.list, creds);
  const responses = (promptId: Id<"prompts">) => t.query(api.prompts.responses, { ...creds, promptId });
  const student = (token: string) => t.query(api.sessions.getStudentView, { code, token });
  return { t, sessionId, code, creds, concepts, list, responses, student };
}

describe("prompt history", () => {
  test("every push is a new prompt with its own rating responses; earlier prompts keep theirs", async () => {
    const { t, sessionId, creds, concepts, list, responses, student } = await setup();
    const first = (await list())![0];
    expect(first).toMatchObject({ number: 1, kind: "rating", current: true, responseCount: 0, conceptLabel: "Base case" });

    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId: concepts[0]._id, level: "confused" });
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_B, conceptId: concepts[0]._id, level: "can_explain" });
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_B, conceptId: concepts[0]._id, level: "partial" });

    // Same concept again: a fresh prompt that starts unanswered for the student.
    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[0]._id, question: "Pick the base case for fib" });
    expect((await student(TOKEN_A))!.activePrompt).toMatchObject({ question: "Pick the base case for fib", myLevel: null });
    expect((await t.query(api.sessions.getInstructorView, creds))!.answeredCount).toBe(0);
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId: concepts[0]._id, level: "can_explain" });
    expect((await student(TOKEN_A))!.activePrompt!.myLevel).toBe("can_explain");

    const prompts = (await list())!;
    expect(prompts.map((p) => [p.number, p.current, p.responseCount])).toEqual([
      [2, true, 1],
      [1, false, 2],
    ]);
    expect(await responses(prompts[1]._id)).toMatchObject({ kind: "rating", total: 2, counts: { confused: 1, partial: 1, can_explain: 0 } });
    expect(await responses(prompts[0]._id)).toMatchObject({ total: 1, counts: { confused: 0, partial: 0, can_explain: 1 } });
    // The graph still holds each student's latest rating per concept.
    expect((await t.query(api.sessions.getInstructorView, creds))!.concepts[0]).toMatchObject({ total: 2, counts: { can_explain: 1, partial: 1 } });
  });

  test("open-ended prompts take text answers for the current prompt only, editable until the next push", async () => {
    const { t, sessionId, creds, concepts, list, responses, student } = await setup();
    await expect(t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[1]._id, kind: "open", question: "  " })).rejects.toThrow(
      /need a question/,
    );
    await expect(t.mutation(api.prompts.respond, { sessionId, token: TOKEN_A, text: "hi" })).rejects.toThrow(/isn't open-ended/);

    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[1]._id, kind: "open", question: "What makes a call smaller?" });
    expect((await student(TOKEN_A))!.activePrompt).toMatchObject({ kind: "open", myText: null });
    await expect(t.mutation(api.prompts.respond, { sessionId, token: TOKEN_A, text: "   " })).rejects.toThrow(/1–500/);
    await expect(t.mutation(api.prompts.respond, { sessionId, token: TOKEN_A, text: "x".repeat(501) })).rejects.toThrow(/1–500/);
    await t.mutation(api.prompts.respond, { sessionId, token: TOKEN_A, text: " n gets closer to 0 " });
    await t.mutation(api.prompts.respond, { sessionId, token: TOKEN_A, text: "n - 1 each time" });
    await t.mutation(api.prompts.respond, { sessionId, token: TOKEN_B, text: "the list shrinks" });
    expect((await student(TOKEN_A))!.activePrompt!.myText).toBe("n - 1 each time");
    // Rating the open prompt's concept doesn't count as an answer to it.
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId: concepts[1]._id, level: "partial" });
    expect((await t.query(api.sessions.getInstructorView, creds))!.answeredCount).toBe(2);

    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[2]._id });
    await expect(t.mutation(api.prompts.respond, { sessionId, token: TOKEN_B, text: "late" })).rejects.toThrow(/isn't open-ended/);
    const open = (await list())!.find((p) => p.kind === "open")!;
    expect(open).toMatchObject({ number: 2, current: false, responseCount: 2, question: "What makes a call smaller?" });
    const data = (await responses(open._id))!;
    expect(data.answers.map((a) => a.text).sort()).toEqual(["n - 1 each time", "the list shrinks"]);
    expect(JSON.stringify(data)).not.toMatch(/Student|alias|participant/i);
  });

  test("history is staff-only; TAs see it; students only get the current prompt", async () => {
    const { t, sessionId, creds, concepts, list, student } = await setup();
    await t.mutation(api.tas.invite, { ...creds, name: "Maya", taSecret: TA });
    await t.mutation(api.sessions.setActiveConcept, { sessionId, instructorSecret: TA, conceptId: concepts[1]._id, kind: "open", question: "Why?" });
    expect(await t.query(api.prompts.list, { sessionId, instructorSecret: TA })).toHaveLength(2);
    expect(await t.query(api.prompts.list, { sessionId, instructorSecret: TOKEN_A })).toBeNull();
    const [, first] = (await list())!;
    expect(await t.query(api.prompts.responses, { sessionId, instructorSecret: TOKEN_A, promptId: first._id })).toBeNull();
    const view = (await student(TOKEN_A))!;
    expect(view.activePrompt).toMatchObject({ kind: "open", question: "Why?" });
    expect(JSON.stringify(view)).not.toContain(first._id);
  });
});

describe("switching the current prompt", () => {
  test("staff make an earlier prompt current; students see it with their earlier answer and new answers join its responses", async () => {
    const { t, sessionId, creds, concepts, list, responses, student } = await setup();
    const first = (await list())![0];
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId: concepts[0]._id, level: "confused" });
    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[1]._id, kind: "open", question: "Why recurse?" });
    await t.mutation(api.prompts.respond, { sessionId, token: TOKEN_A, text: "Smaller problem" });

    await t.mutation(api.prompts.makeCurrent, { ...creds, promptId: first._id });
    const view = (await student(TOKEN_A))!;
    expect(view.activeConceptId).toBe(concepts[0]._id);
    expect(view.activePrompt).toMatchObject({ _id: first._id, kind: "rating", myLevel: "confused" });
    expect(await list()).toHaveLength(2);

    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_B, conceptId: concepts[0]._id, level: "can_explain" });
    expect(await responses(first._id)).toMatchObject({ kind: "rating", total: 2 });
    expect((await t.query(api.sessions.getInstructorView, creds))!.answeredCount).toBe(2);
    await expect(t.mutation(api.prompts.respond, { sessionId, token: TOKEN_A, text: "late" })).rejects.toThrow(/open-ended/);

    const open = (await list())!.find((p) => p.kind === "open")!;
    await t.mutation(api.prompts.makeCurrent, { ...creds, promptId: open._id });
    expect((await student(TOKEN_A))!.activePrompt).toMatchObject({ kind: "open", myText: "Smaller problem" });
  });

  test("re-pushing a rating prompt on a concept reuses its oldest one; open-ended pushes don't", async () => {
    const { t, sessionId, creds, concepts, list, responses, student } = await setup();
    const first = (await list())![0];
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_A, conceptId: first.conceptId, level: "partial" });
    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[1]._id });
    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: first.conceptId });
    expect(await list()).toHaveLength(2);
    expect((await list())!.find((p) => p._id === first._id)!.current).toBe(true);
    expect((await student(TOKEN_A))!.activePrompt).toMatchObject({ kind: "rating", myLevel: "partial" });
    await t.mutation(api.signals.upsert, { sessionId, token: TOKEN_B, conceptId: first.conceptId, level: "confused" });
    expect(await responses(first._id)).toMatchObject({ kind: "rating", total: 2 });

    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: first.conceptId, question: "Which call stops?" });
    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: first.conceptId, kind: "open", question: "Why?" });
    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: first.conceptId, kind: "open", question: "Why?" });
    expect(await list()).toHaveLength(5);
  });

  test("only staff can switch; TAs can", async () => {
    const { t, creds, concepts, list } = await setup();
    const first = (await list())![0];
    await t.mutation(api.sessions.setActiveConcept, { ...creds, conceptId: concepts[1]._id });
    await expect(t.mutation(api.prompts.makeCurrent, { ...creds, instructorSecret: TOKEN_A, promptId: first._id })).rejects.toThrow(/Instructor access/);
    await t.mutation(api.tas.invite, { ...creds, name: "Sam", taSecret: TA });
    await t.mutation(api.prompts.makeCurrent, { ...creds, instructorSecret: TA, promptId: first._id });
    expect((await list())!.find((p) => p._id === first._id)!.current).toBe(true);
  });
});
