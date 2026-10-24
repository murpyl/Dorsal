import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { findParticipant, isValidSecret, getInstructorSession, sha256 } from "./credentials";
import { MAX_PROMPT_LENGTH } from "../lib/prompt";
import { canAddPrerequisite, DESCRIPTION_MAX, LABEL_MAX, layoutConcepts, MAX_CONCEPTS, type LessonConcept } from "../lib/lessonGraph";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Previously-current concept ids in the order they first became current, excluding the current one. */
export function coveredConceptIds(session: Doc<"sessions">) {
  return (session.activeHistory ?? []).map((h) => h.conceptId).filter((id) => id !== session.activeConceptId);
}

/** True when a student may rate this concept on the session page: it is current or has been current before. */
export function hasBeenActive(session: Doc<"sessions">, conceptId: Id<"concepts">) {
  return session.activeConceptId === conceptId || (session.activeHistory ?? []).some((h) => h.conceptId === conceptId);
}

const lessonConcept = v.object({ label: v.string(), description: v.string(), prerequisites: v.array(v.number()) });

function validateLesson(concepts: LessonConcept[]) {
  if (concepts.length === 0 || concepts.length > MAX_CONCEPTS) throw new ConvexError(`A lesson needs 1–${MAX_CONCEPTS} concepts`);
  const lesson: LessonConcept[] = [];
  const labels = new Set<string>();
  for (const c of concepts) {
    const label = c.label.trim();
    const description = c.description.trim();
    if (!label || label.length > LABEL_MAX) throw new ConvexError(`Concept names must be 1–${LABEL_MAX} characters`);
    if (description.length > DESCRIPTION_MAX) throw new ConvexError(`Concept descriptions must be at most ${DESCRIPTION_MAX} characters`);
    if (labels.has(label.toLowerCase())) throw new ConvexError(`Duplicate concept "${label}"`);
    labels.add(label.toLowerCase());
    lesson.push({ label, description, prerequisites: [] });
  }
  concepts.forEach((c, i) => {
    for (const p of c.prerequisites) {
      if (!Number.isInteger(p) || p < 0 || p >= concepts.length || !canAddPrerequisite(lesson, i, p))
        throw new ConvexError("Prerequisites must point to other concepts without duplicates or cycles");
      lesson[i].prerequisites.push(p);
    }
  });
  return lesson;
}

/** Inserts the lesson's concepts (in order, laid out by prerequisite depth) and prerequisite edges; returns the concept IDs. */
export async function insertLesson(ctx: MutationCtx, sessionId: Id<"sessions">, lesson: LessonConcept[]) {
  const positions = layoutConcepts(lesson);
  const conceptIds: Id<"concepts">[] = [];
  for (const [order, c] of lesson.entries()) {
    conceptIds.push(await ctx.db.insert("concepts", { sessionId, order, label: c.label, description: c.description, ...positions[order] }));
  }
  for (const [to, c] of lesson.entries()) {
    for (const from of c.prerequisites) {
      await ctx.db.insert("conceptEdges", { sessionId, fromId: conceptIds[from], toId: conceptIds[to], relation: "prerequisite_for" });
    }
  }
  return conceptIds;
}

export const create = mutation({
  args: { title: v.string(), instructorSecret: v.string(), concepts: v.array(lessonConcept) },
  handler: async (ctx, { title, instructorSecret, concepts }) => {
    const trimmed = title.trim();
    if (!trimmed || trimmed.length > 100) throw new ConvexError("Title must be 1–100 characters");
    if (!isValidSecret(instructorSecret)) throw new ConvexError("Invalid instructor secret");
    const lesson = validateLesson(concepts);

    let code: string;
    do {
      code = Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
    } while (await ctx.db.query("sessions").withIndex("by_code", (q) => q.eq("code", code)).first());

    const sessionId = await ctx.db.insert("sessions", {
      title: trimmed,
      code,
      state: "open",
      instructorSecretHash: await sha256(instructorSecret),
      createdAt: Date.now(),
    });
    const conceptIds = await insertLesson(ctx, sessionId, lesson);
    await ctx.db.patch(sessionId, { activeConceptId: conceptIds[0], activeHistory: [{ conceptId: conceptIds[0], at: Date.now() }] });
    return { sessionId, code };
  },
});

export const join = mutation({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, { code, token }) => {
    if (!isValidSecret(token)) throw new ConvexError("Invalid participant token");
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .unique();
    if (!session || session.state !== "open") throw new ConvexError("Session not found or closed");

    const existing = await findParticipant(ctx, session._id, token);
    if (existing) return { sessionId: session._id, participantId: existing._id };

    const others = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();
    const participantId = await ctx.db.insert("participants", {
      sessionId: session._id,
      tokenHash: await sha256(token),
      alias: `Student ${others.length + 1}`,
      helperConceptIds: [],
      isSimulated: false,
      createdAt: Date.now(),
    });
    return { sessionId: session._id, participantId };
  },
});

export const getStudentView = query({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, { code, token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .unique();
    if (!session) return null;
    const participant = await findParticipant(ctx, session._id, token);
    if (!participant) return null;

    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();
    concepts.sort((a, b) => a.order - b.order);
    const withMyLevel = await Promise.all(
      concepts.map(async (c) => {
        const mine = await ctx.db
          .query("signals")
          .withIndex("by_participant_concept_phase", (q) =>
            q.eq("participantId", participant._id).eq("conceptId", c._id).eq("phase", "pre"),
          )
          .unique();
        return { _id: c._id, label: c.label, description: c.description, myLevel: mine?.level ?? null };
      }),
    );
    return {
      sessionId: session._id,
      title: session.title,
      state: session.state,
      activeConceptId: session.activeConceptId ?? null,
      coveredConceptIds: coveredConceptIds(session),
      activePrompt: session.activePrompt,
      alias: participant.alias,
      concepts: withMyLevel,
    };
  },
});

export const getInstructorView = query({
  args: { sessionId: v.string(), instructorSecret: v.string() },
  handler: async (ctx, { sessionId, instructorSecret }) => {
    const id = ctx.db.normalizeId("sessions", sessionId);
    if (!id) return null;
    const session = await getInstructorSession(ctx, id, instructorSecret);
    if (!session) return null;

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", id))
      .collect();
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_session", (q) => q.eq("sessionId", id))
      .collect();
    concepts.sort((a, b) => a.order - b.order);
    const published = await ctx.db
      .query("clusters")
      .withIndex("by_session_status", (q) => q.eq("sessionId", id).eq("status", "published"))
      .collect();
    const conceptCounts = await Promise.all(
      concepts.map(async (c) => {
        const signals = await ctx.db
          .query("signals")
          .withIndex("by_concept_phase", (q) => q.eq("conceptId", c._id).eq("phase", "pre"))
          .collect();
        const counts = { confused: 0, partial: 0, can_explain: 0 };
        for (const s of signals) counts[s.level]++;
        const openClusters = published.filter((k) => k.conceptIds.includes(c._id)).length;
        return { _id: c._id, label: c.label, description: c.description, x: c.x, y: c.y, counts, total: signals.length, openClusters };
      }),
    );
    const edges = await ctx.db
      .query("conceptEdges")
      .withIndex("by_session", (q) => q.eq("sessionId", id))
      .collect();
    return {
      title: session.title,
      code: session.code,
      state: session.state,
      activeConceptId: session.activeConceptId ?? null,
      coveredConceptIds: coveredConceptIds(session),
      activePrompt: session.activePrompt,
      // One `pre` signal per participant and concept, so the current concept's total is the number of participants who answered it.
      answeredCount: conceptCounts.find((c) => c._id === session.activeConceptId)?.total ?? 0,
      participantCount: participants.length,
      simulatedCount: participants.filter((p) => p.isSimulated).length,
      publishedClusterCount: published.length,
      concepts: conceptCounts,
      edges: edges.map((e) => ({ _id: e._id, fromId: e.fromId, toId: e.toId, relation: e.relation })),
    };
  },
});

export const setActiveConcept = mutation({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string(), conceptId: v.id("concepts"), question: v.optional(v.string()) },
  handler: async (ctx, { sessionId, instructorSecret, conceptId, question }) => {
    const session = await getInstructorSession(ctx, sessionId, instructorSecret);
    if (!session) throw new ConvexError("Instructor access required");
    const concept = await ctx.db.get(conceptId);
    if (!concept || concept.sessionId !== sessionId) throw new ConvexError("Concept not in this session");
    // Sessions created before activeHistory existed: their current concept was active, so it counts as covered.
    const history =
      session.activeHistory ?? (session.activeConceptId ? [{ conceptId: session.activeConceptId, at: session.createdAt }] : []);
    const activePrompt = question?.trim() || undefined;
    if (activePrompt && activePrompt.length > MAX_PROMPT_LENGTH) throw new ConvexError(`Keep the prompt under ${MAX_PROMPT_LENGTH} characters`);
    await ctx.db.patch(sessionId, {
      activeConceptId: conceptId,
      activePrompt,
      activeHistory: history.some((h) => h.conceptId === conceptId) ? history : [...history, { conceptId, at: Date.now() }],
    });
  },
});

export const close = mutation({
  args: { sessionId: v.id("sessions"), instructorSecret: v.string() },
  handler: async (ctx, { sessionId, instructorSecret }) => {
    const session = await getInstructorSession(ctx, sessionId, instructorSecret);
    if (!session) throw new ConvexError("Instructor access required");
    if (session.state !== "closed") await ctx.db.patch(sessionId, { state: "closed" });
  },
});
