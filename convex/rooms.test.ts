import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const SECRET = "instructor-secret-0123456789abcdef0123456789abcdef";
const TOKENS = ["a", "b", "c", "d"].map((x) => `student-token-${x}-0123456789abcdef0123456789abcdef`);
const [HELPER, LEARNER, LATE, OUTSIDER] = TOKENS;

async function setup(capacity = 2) {
  const t = convexTest(schema, modules);
  const { sessionId, code } = await t.mutation(api.sessions.create, { title: "Recursion", instructorSecret: SECRET });
  for (const token of TOKENS) await t.mutation(api.sessions.join, { code, token });
  const concepts = await t.run((ctx) =>
    ctx.db.query("concepts").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect(),
  );
  concepts.sort((a, b) => a.order - b.order);
  const conceptId = concepts[3]._id;
  await t.mutation(api.participants.setHelper, { sessionId, token: HELPER, conceptIds: [conceptId] });
  const creds = { sessionId, instructorSecret: SECRET };
  const roomId = await t.mutation(api.rooms.createForCluster, { ...creds, conceptId, capacity });
  const members = () => t.run((ctx) => ctx.db.query("roomMembers").withIndex("by_room", (q) => q.eq("roomId", roomId)).collect());
  return { t, sessionId, code, concepts, conceptId, creds, roomId, members };
}

describe("rooms.join (scenario 5: capacity and duplicate membership are enforced in the mutation)", () => {
  test("a capacity-2 room takes two members, refuses the third and refuses duplicates", async () => {
    const { t, roomId, members, sessionId } = await setup(2);
    await t.mutation(api.rooms.join, { roomId, token: HELPER, role: "helper" });
    await t.mutation(api.rooms.join, { roomId, token: LEARNER, role: "learner" });
    await expect(t.mutation(api.rooms.join, { roomId, token: LATE, role: "learner" })).rejects.toThrow(/full/);
    await expect(t.mutation(api.rooms.join, { roomId, token: LEARNER, role: "learner" })).rejects.toThrow(/already/);
    await expect(t.mutation(api.rooms.join, { roomId, token: HELPER, role: "learner" })).rejects.toThrow(/already/);
    expect(await members()).toHaveLength(2);

    const list = (await t.query(api.rooms.listBySession, { sessionId, token: LATE }))!;
    expect(list[0]).toMatchObject({ memberCount: 2, capacity: 2, helperCount: 1, isMember: false, myRole: null });
    expect(JSON.stringify(list)).not.toContain("Student");

    await t.mutation(api.rooms.leave, { roomId, token: LEARNER });
    await t.mutation(api.rooms.join, { roomId, token: LATE, role: "learner" });
    expect(await members()).toHaveLength(2);
  });

  test("joining as helper requires opting in; closed rooms and foreign tokens are rejected", async () => {
    const { t, roomId, creds, members } = await setup(6);
    await expect(t.mutation(api.rooms.join, { roomId, token: LEARNER, role: "helper" })).rejects.toThrow(/Opt in/);
    await t.mutation(api.rooms.join, { roomId, token: HELPER, role: "helper" });
    await expect(t.mutation(api.rooms.join, { roomId, token: OUTSIDER.replace("d", "x"), role: "learner" })).rejects.toThrow();
    await expect(t.mutation(api.rooms.close, { roomId, token: LEARNER })).rejects.toThrow();
    await t.mutation(api.rooms.close, { roomId, instructorSecret: creds.instructorSecret });
    await expect(t.mutation(api.rooms.join, { roomId, token: LEARNER, role: "learner" })).rejects.toThrow(/closed/);
    expect(await members()).toHaveLength(1);
    expect(await t.query(api.rooms.listInstructor, creds)).toEqual([]);
  });

  test("createForCluster validates capacity and needs a published cluster when one is given", async () => {
    const { t, creds, conceptId, concepts } = await setup();
    await expect(t.mutation(api.rooms.createForCluster, { ...creds, conceptId, capacity: 1 })).rejects.toThrow();
    await expect(t.mutation(api.rooms.createForCluster, { ...creds, conceptId, capacity: 13 })).rejects.toThrow();
    await expect(t.mutation(api.rooms.createForCluster, { ...creds, conceptId, capacity: 2.5 })).rejects.toThrow();
    const q = await t.mutation(api.questions.submit, { sessionId: creds.sessionId, token: LEARNER, conceptId, content: "?" });
    const clusterId = await t.mutation(api.clusters.createManual, { ...creds, title: "T", summary: "", conceptIds: [concepts[3]._id], questionIds: [q] });
    const roomId = await t.mutation(api.rooms.createForCluster, { ...creds, conceptId, clusterId });
    expect(await t.run((ctx) => ctx.db.get(roomId))).toMatchObject({ title: "T", capacity: 6, clusterId });
    await t.mutation(api.clusters.discard, { ...creds, clusterId });
    await expect(t.mutation(api.rooms.createForCluster, { ...creds, conceptId, clusterId })).rejects.toThrow(/published/);
  });
});

describe("room messages (scenario 6: members only)", () => {
  test("non-members get null from rooms.get and messages.listByRoom and cannot send", async () => {
    const { t, roomId } = await setup(6);
    await t.mutation(api.rooms.join, { roomId, token: HELPER, role: "helper" });
    await t.mutation(api.rooms.join, { roomId, token: LEARNER, role: "learner" });
    await t.mutation(api.messages.send, { roomId, token: HELPER, body: " Let's trace factorial(3) " });

    for (const token of [OUTSIDER, OUTSIDER.replace("d", "x"), "short"]) {
      expect(await t.query(api.rooms.get, { roomId, token })).toBeNull();
      expect(await t.query(api.messages.listByRoom, { roomId, token })).toBeNull();
      await expect(t.mutation(api.messages.send, { roomId, token, body: "hi" })).rejects.toThrow(/members/);
    }
    const other = await t.mutation(api.sessions.create, { title: "Other", instructorSecret: SECRET });
    await t.mutation(api.sessions.join, { code: other.code, token: OUTSIDER });
    expect(await t.query(api.messages.listByRoom, { roomId, token: OUTSIDER })).toBeNull();

    const room = (await t.query(api.rooms.get, { roomId, token: LEARNER }))!;
    expect(room).toMatchObject({ myRole: "learner", status: "open", myLevel: null, conceptLabel: "Return values" });
    expect(room.members.map((m) => [m.alias, m.role, m.isMe])).toEqual([["Student 1", "helper", false], ["Student 2", "learner", true]]);
    for (const m of room.members) expect(m).not.toHaveProperty("participantId");

    const seen = (await t.query(api.messages.listByRoom, { roomId, token: LEARNER }))!;
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ body: "Let's trace factorial(3)", authorAlias: "Student 1", isMine: false });
    expect(seen[0]).not.toHaveProperty("authorId");
    await t.mutation(api.messages.send, { roomId, token: LEARNER, body: "ok" });
    const mine = (await t.query(api.messages.listByRoom, { roomId, token: LEARNER }))!;
    expect(mine.map((m) => m.isMine)).toEqual([false, true]);
    expect((await t.query(api.messages.listByRoom, { roomId, token: HELPER }))!.map((m) => m.isMine)).toEqual([true, false]);

    const stored = await t.run((ctx) => ctx.db.query("messages").collect());
    expect(stored).toHaveLength(2);
    await expect(t.mutation(api.messages.send, { roomId, token: LEARNER, body: "   " })).rejects.toThrow();
    await expect(t.mutation(api.messages.send, { roomId, token: LEARNER, body: "x".repeat(501) })).rejects.toThrow();
  });

  test("a member who left loses access; a closed room rejects new messages but keeps history for members", async () => {
    const { t, roomId, creds } = await setup(6);
    await t.mutation(api.rooms.join, { roomId, token: HELPER, role: "helper" });
    await t.mutation(api.rooms.join, { roomId, token: LEARNER, role: "learner" });
    await t.mutation(api.messages.send, { roomId, token: LEARNER, body: "hello" });
    await t.mutation(api.rooms.leave, { roomId, token: LEARNER });
    expect(await t.query(api.messages.listByRoom, { roomId, token: LEARNER })).toBeNull();
    await expect(t.mutation(api.messages.send, { roomId, token: LEARNER, body: "still here?" })).rejects.toThrow();
    await t.mutation(api.rooms.close, { roomId, token: HELPER });
    expect(await t.query(api.rooms.listInstructor, creds)).toEqual([]);
    await expect(t.mutation(api.messages.send, { roomId, token: HELPER, body: "late" })).rejects.toThrow(/closed/);
    expect((await t.query(api.messages.listByRoom, { roomId, token: HELPER }))!).toHaveLength(1);
  });
});

describe("messages.send rate limit (10 per participant per 10 s)", () => {
  afterEach(() => vi.useRealTimers());

  test("the eleventh message inside ten seconds is rejected; others can still post; the window slides", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-24T10:00:00Z"));
    const { t, roomId } = await setup(6);
    await t.mutation(api.rooms.join, { roomId, token: HELPER, role: "helper" });
    await t.mutation(api.rooms.join, { roomId, token: LEARNER, role: "learner" });
    const send = (token: string, i: number) => t.mutation(api.messages.send, { roomId, token, body: `msg ${i}` });

    for (let i = 0; i < 10; i++) {
      vi.setSystemTime(Date.now() + 500);
      await send(HELPER, i);
    }
    await expect(send(HELPER, 10)).rejects.toThrow(/too quickly/);
    await send(LEARNER, 0);
    vi.setSystemTime(Date.now() + 4_000);
    await expect(send(HELPER, 11)).rejects.toThrow();
    vi.setSystemTime(Date.now() + 7_000);
    await send(HELPER, 12);
    expect((await t.query(api.messages.listByRoom, { roomId, token: LEARNER }))!).toHaveLength(12);
  });
});
