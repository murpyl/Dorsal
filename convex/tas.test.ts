import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { RECURSION_LESSON } from "./seed";
import { modules } from "./test.setup";

const SECRET = "instructor-secret-0123456789abcdef0123456789abcdef";
const TA1 = "ta-secret-one-0123456789abcdef0123456789abcdef";
const TA2 = "ta-secret-two-0123456789abcdef0123456789abcdef";
const STUDENT = "student-token-a-0123456789abcdef0123456789abcdef";

async function setup() {
  const t = convexTest(schema, modules);
  const { sessionId, code } = await t.mutation(api.sessions.create, { title: "Recursion", instructorSecret: SECRET, concepts: RECURSION_LESSON });
  await t.mutation(api.sessions.join, { code, token: STUDENT });
  const concepts = await t.run((ctx) => ctx.db.query("concepts").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect());
  concepts.sort((a, b) => a.order - b.order);
  const creds = { sessionId, instructorSecret: SECRET };
  const ta1 = await t.mutation(api.tas.invite, { ...creds, name: "Maya", taSecret: TA1 });
  const ta2 = await t.mutation(api.tas.invite, { ...creds, name: " Leo ", taSecret: TA2 });
  const roomId = await t.mutation(api.rooms.createForCluster, { ...creds, conceptId: concepts[1]._id, capacity: 3 });
  return { t, sessionId, code, concepts, creds, ta1, ta2, roomId };
}

describe("TA role", () => {
  test("each TA's own link opens the instructor view and its actions; TAs are not counted as participants", async () => {
    const { t, sessionId, code, concepts, creds } = await setup();
    for (const secret of [TA1, TA2]) {
      const view = (await t.query(api.sessions.getInstructorView, { sessionId, instructorSecret: secret }))!;
      expect(view.role).toBe("ta");
      expect(view.participantCount).toBe(1);
      expect(JSON.stringify(view)).not.toContain("null");
    }
    expect((await t.query(api.sessions.getInstructorView, { sessionId, instructorSecret: SECRET }))!.role).toBe("instructor");
    await t.mutation(api.sessions.setActiveConcept, { sessionId, instructorSecret: TA1, conceptId: concepts[2]._id, question: "Why?" });
    expect((await t.query(api.sessions.getStudentView, { code, token: STUDENT }))!.activeConceptId).toBe(concepts[2]._id);
    expect(await t.query(api.rooms.listInstructor, { sessionId, instructorSecret: TA2 })).toHaveLength(1);
    expect(await t.query(api.tas.list, creds)).toEqual([
      expect.objectContaining({ name: "Maya" }),
      expect.objectContaining({ name: "Leo" }),
    ]);
    await t.mutation(api.sessions.join, { code, token: "student-token-b-0123456789abcdef0123456789abcdef" });
    expect((await t.query(api.sessions.getStudentView, { code, token: "student-token-b-0123456789abcdef0123456789abcdef" }))!.alias).toBe("Student 2");
  });

  test("only the instructor manages TAs", async () => {
    const { t, sessionId, creds, ta2 } = await setup();
    await expect(t.mutation(api.tas.invite, { sessionId, instructorSecret: TA1, name: "Sam", taSecret: `x${TA2}` })).rejects.toThrow(/Only the instructor/);
    await expect(t.mutation(api.tas.revoke, { sessionId, instructorSecret: TA1, taId: ta2 })).rejects.toThrow(/Only the instructor/);
    expect(await t.query(api.tas.list, { sessionId, instructorSecret: TA1 })).toBeNull();
    await expect(t.mutation(api.tas.invite, { ...creds, name: "  ", taSecret: `y${TA2}` })).rejects.toThrow(/name/);
    await expect(t.mutation(api.tas.invite, { ...creds, name: "Dup", taSecret: TA1 })).rejects.toThrow(/in use/);
    await expect(t.mutation(api.tas.invite, { ...creds, name: "Dup", taSecret: STUDENT })).rejects.toThrow(/in use/);
  });

  test("several TAs enter a help room, chat and close it; they cannot act as students", async () => {
    const { t, sessionId, concepts, roomId } = await setup();
    await t.mutation(api.rooms.join, { roomId, token: STUDENT, role: "learner" });
    await t.mutation(api.rooms.joinAsTa, { roomId, instructorSecret: TA1 });
    await t.mutation(api.rooms.joinAsTa, { roomId, instructorSecret: TA1 });
    await t.mutation(api.rooms.joinAsTa, { roomId, instructorSecret: TA2 });
    await expect(t.mutation(api.rooms.joinAsTa, { roomId, instructorSecret: SECRET })).rejects.toThrow(/TA access/);

    const room = (await t.query(api.rooms.get, { roomId, token: TA1 }))!;
    expect(room.myRole).toBe("ta");
    expect(room.members.map((m) => [m.alias, m.role])).toEqual([["Student 1", "learner"], ["Maya", "ta"], ["Leo", "ta"]]);
    await t.mutation(api.messages.send, { roomId, token: TA2, body: "Let's trace fact(3)" });
    expect((await t.query(api.messages.listByRoom, { roomId, token: STUDENT }))!.map((m) => m.authorAlias)).toEqual(["Leo"]);
    expect((await t.query(api.rooms.listBySession, { sessionId, token: STUDENT }))![0]).toMatchObject({ memberCount: 1, taCount: 2 });

    await expect(t.mutation(api.signals.roomCheckIn, { roomId, token: TA1, level: "can_explain" })).rejects.toThrow(/TAs/);
    await expect(t.mutation(api.signals.upsert, { sessionId, token: TA1, conceptId: concepts[0]._id, level: "confused" })).rejects.toThrow(/TAs/);
    await expect(t.mutation(api.rooms.join, { roomId, token: TA1, role: "learner" })).rejects.toThrow(/TAs/);

    await t.mutation(api.rooms.leave, { roomId, token: TA2 });
    await t.mutation(api.rooms.close, { roomId, token: TA1 });
    expect(await t.query(api.rooms.listInstructor, { sessionId, instructorSecret: TA1 })).toEqual([]);
  });

  test("TAs enter full rooms and don't count toward capacity", async () => {
    const { t, code, roomId } = await setup();
    const students = [STUDENT, ...["b", "c", "d"].map((x) => `student-token-${x}-0123456789abcdef0123456789abcdef`)];
    for (const token of students.slice(1)) await t.mutation(api.sessions.join, { code, token });
    await t.mutation(api.rooms.joinAsTa, { roomId, instructorSecret: TA1 });
    for (const token of students.slice(0, 3)) await t.mutation(api.rooms.join, { roomId, token, role: "learner" });
    await expect(t.mutation(api.rooms.join, { roomId, token: students[3], role: "learner" })).rejects.toThrow(/full/);
    await t.mutation(api.rooms.joinAsTa, { roomId, instructorSecret: TA2 });
    expect((await t.query(api.rooms.get, { roomId, token: TA2 }))!.members).toHaveLength(5);
  });

  test("revoking one TA cuts off only that TA", async () => {
    const { t, sessionId, creds, ta1, roomId } = await setup();
    await t.mutation(api.rooms.joinAsTa, { roomId, instructorSecret: TA1 });
    await t.mutation(api.rooms.joinAsTa, { roomId, instructorSecret: TA2 });
    await t.mutation(api.messages.send, { roomId, token: TA1, body: "Try the base case" });
    await t.mutation(api.tas.revoke, { ...creds, taId: ta1 });
    expect((await t.query(api.messages.listByRoom, { roomId, token: TA2 }))!.map((m) => m.authorAlias)).toEqual(["Maya"]);
    await expect(t.mutation(api.tas.revoke, { ...creds, taId: ta1 })).rejects.toThrow(/not found/);
    expect(await t.query(api.sessions.getInstructorView, { sessionId, instructorSecret: TA1 })).toBeNull();
    expect(await t.query(api.rooms.get, { roomId, token: TA1 })).toBeNull();
    await expect(t.mutation(api.messages.send, { roomId, token: TA1, body: "hi" })).rejects.toThrow();
    await expect(t.mutation(api.rooms.joinAsTa, { roomId, instructorSecret: TA1 })).rejects.toThrow(/TA access/);
    expect((await t.query(api.sessions.getInstructorView, { sessionId, instructorSecret: TA2 }))!.role).toBe("ta");
    expect((await t.query(api.rooms.get, { roomId, token: TA2 }))!.members).toHaveLength(1);
    expect(await t.query(api.tas.list, creds)).toEqual([expect.objectContaining({ name: "Leo" })]);
  });
});
